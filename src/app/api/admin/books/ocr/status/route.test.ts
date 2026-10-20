import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

vi.mock("@/lib/roles", () => ({
  hasBookLibraryAccess: (role: string) =>
    role === "admin_books" || role === "admin" || role === "admin_books_only",
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ocr/staleJobs", () => ({
  reapStaleOcrJobs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Book", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("@/models/Page", () => ({
  default: { countDocuments: vi.fn().mockResolvedValue(0) },
}));

vi.mock("@/models/OcrJob", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("@/models/OcrWorkerState", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("@/models/OcrConflict", () => ({
  default: { countDocuments: vi.fn().mockResolvedValue(0) },
}));

import { GET } from "./route";

function makeRequest(bookId: string) {
  return { url: `http://localhost/api/admin/books/ocr/status?bookId=${bookId}` } as Request;
}

describe("GET /api/admin/books/ocr/status - auth", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
  });

  // רגרסיה: לפני התיקון הראוט החזיר 401 גם למשתמש מחובר בלי הרשאה (במקום 403).
  it("returns 401 when there is no session at all", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const res = await GET(makeRequest("507f1f77bcf86cd799439011"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when a session exists but the role lacks access", async () => {
    getServerSessionMock.mockResolvedValue({ user: { role: "user" } });

    const res = await GET(makeRequest("507f1f77bcf86cd799439011"));

    expect(res.status).toBe(403);
  });
});

// שרשרת mongoose: findOne(...).sort(...).select(...).lean() / findOne(...).select(...).lean()
function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.sort = vi.fn(() => q);
  q.select = vi.fn(() => q);
  q.lean = vi.fn().mockResolvedValue(result);
  return q;
}

describe("GET /api/admin/books/ocr/status - ספק local", () => {
  const BOOK_ID = "507f1f77bcf86cd799439011";
  const JOB_ID = "64b7f0c2a1b2c3d4e5f6000a";
  type Mocked = { findOne: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn>; countDocuments: ReturnType<typeof vi.fn> };
  let Book: Mocked, Page: Mocked, OcrJob: Mocked, OcrWorkerState: Mocked, OcrConflict: Mocked;

  beforeEach(async () => {
    vi.stubEnv("OCR_WORKER_SECRET", "s".repeat(48));
    vi.stubEnv("OCR_WORKER_ID", "worker-1");
    getServerSessionMock.mockReset();
    getServerSessionMock.mockResolvedValue({ user: { role: "admin_books" } });
    Book = (await import("@/models/Book")).default as unknown as Mocked;
    Page = (await import("@/models/Page")).default as unknown as Mocked;
    OcrJob = (await import("@/models/OcrJob")).default as unknown as Mocked;
    OcrWorkerState = (await import("@/models/OcrWorkerState")).default as unknown as Mocked;
    OcrConflict = (await import("@/models/OcrConflict")).default as unknown as Mocked;
    Book.findById.mockReturnValue(chain({ _id: BOOK_ID, name: "ספר" }));
    Page.countDocuments.mockReset();
    Page.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    OcrConflict.countDocuments.mockReset();
    OcrConflict.countDocuments.mockResolvedValue(3);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("מחזיר את כל שדות ה-local, את זמינות העובד ואת מספר ההתנגשויות הפתוחות", async () => {
    const seen = new Date(Date.now() - 30_000);
    const pageErrors = Array.from({ length: 60 }, (_, i) => ({ pageNumber: i + 1, message: `שגיאה ${i + 1}` }));
    const jobQuery = chain({
      _id: { toString: () => JOB_ID },
      status: "paused_runner",
      method: "local",
      model: "",
      existingTextMode: "skip",
      splitColumns: false,
      totalPages: 20,
      processedPages: 7,
      successPages: 0,
      failedPages: 0,
      currentPageNumber: 0,
      error: "",
      startedByName: "מנהל",
      createdAt: new Date("2026-10-20T08:00:00Z"),
      options: { lm: "rabbinic", defaultScript: "square" },
      workerState: "paused_runner",
      progressPhase: "ocr",
      progressPagesTotal: 18,
      workerMessage: "Runner paused",
      lastSeenAt: seen,
      cancelRequested: false,
      decision: null,
      pageErrors,
    });
    OcrJob.findOne.mockReturnValue(jobQuery);
    OcrWorkerState.findOne.mockReturnValue(chain({ lastSeenAt: seen }));

    const res = await GET(makeRequest(BOOK_ID));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.worker).toEqual({ configured: true, lastSeenAt: seen.toISOString(), availability: "online" });
    expect(OcrWorkerState.findOne).toHaveBeenCalledWith({ workerId: "worker-1" });
    expect(body.conflictsOpen).toBe(3);
    expect(OcrConflict.countDocuments).toHaveBeenCalledWith({ job: expect.anything(), status: "open" });
    // pageMap ונתיבי קבצים לא נשלפים בכלל
    expect((jobQuery.select as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ pageMap: 0, inputPath: 0, resultPath: 0, pageErrors: { $slice: 50 } });

    expect(body.job).toMatchObject({
      id: JOB_ID,
      status: "paused_runner",
      method: "local",
      existingTextMode: "skip",
      options: { lm: "rabbinic", defaultScript: "square" },
      workerState: "paused_runner",
      progress: { phase: "ocr", pagesDone: 7, pagesTotal: 18 },
      workerMessage: "Runner paused",
      lastSeenAt: seen.toISOString(),
      cancelRequested: false,
      decision: null,
      resultOutcome: null,
      summary: { applied: 0, failed: 0, conflicts: 0, missing: 0 },
      ackAt: null,
      cancelReason: null,
      cancelledByName: null,
    });
    expect(body.job.pageErrors).toHaveLength(50);
    expect(body.job).not.toHaveProperty("inputPath");
    expect(body.job).not.toHaveProperty("pageMap");
  });

  it("עובד שלא פנה מעולם / תצורה חסרה; עבודת ocrwin לא סופרת התנגשויות", async () => {
    OcrJob.findOne.mockReturnValue(chain({ _id: { toString: () => JOB_ID }, status: "completed", method: "ocrwin", totalPages: 5 }));
    OcrWorkerState.findOne.mockReturnValue(chain(null));

    const body = await (await GET(makeRequest(BOOK_ID))).json();
    expect(body.worker).toEqual({ configured: true, lastSeenAt: null, availability: "never" });
    expect(body.conflictsOpen).toBe(0);
    expect(OcrConflict.countDocuments).not.toHaveBeenCalled();
    expect(body.job.progress).toEqual({ phase: null, pagesDone: 0, pagesTotal: 5 });

    vi.stubEnv("OCR_WORKER_SECRET", "");
    Page.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    const noCfg = await (await GET(makeRequest(BOOK_ID))).json();
    expect(noCfg.worker).toEqual({ configured: false, lastSeenAt: null, availability: "never" });
  });

  it("תוצאות מתנגשות ונדחות מוחזרות בלי נתיבי קבצים", async () => {
    const at = new Date("2026-10-20T09:00:00Z");
    const jobQuery = chain({
      _id: { toString: () => JOB_ID },
      status: "completed",
      method: "local",
      totalPages: 3,
      resultConflicts: [{ sha256: "a".repeat(64), receivedAt: at, bytes: 120, path: "x/rejected-a.json", reviewedAt: null }],
      resultRejections: [{ sha256: "b".repeat(64), receivedAt: at, bytes: 9, path: "x/rejected-b.json", reason: "validation_failed", details: "pages[0]: missing" }],
    });
    OcrJob.findOne.mockReturnValue(jobQuery);
    OcrWorkerState.findOne.mockReturnValue(chain(null));

    const body = await (await GET(makeRequest(BOOK_ID))).json();
    expect((jobQuery.select as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      "resultConflicts.path": 0,
      "resultRejections.path": 0,
    });
    expect(body.job.resultConflicts).toEqual([
      { sha256: "a".repeat(64), receivedAt: at.toISOString(), bytes: 120, reviewedAt: null, reviewedByName: "" },
    ]);
    expect(body.job.resultRejections).toEqual([
      { sha256: "b".repeat(64), receivedAt: at.toISOString(), bytes: 9, reason: "validation_failed", details: "pages[0]: missing" },
    ]);
  });

  it("עובד שלא פנה יותר משתי דקות → offline", async () => {
    OcrJob.findOne.mockReturnValue(chain(null));
    OcrWorkerState.findOne.mockReturnValue(chain({ lastSeenAt: new Date(Date.now() - 10 * 60_000) }));
    const body = await (await GET(makeRequest(BOOK_ID))).json();
    expect(body.job).toBeNull();
    expect(body.worker.availability).toBe("offline");
  });
});
