# OCR מקומי — חוזה ה-API מול שירות העובד (`/api/worker/v1`)

**מקור האמת לחוזה אינו בריפו הזה.** החוזה נקבע בריפו השירות `OtzariaTaskAgent`:

- `docs/HANDOVER.md`, סעיף 3 ("Site API contract"), כולל 3.1 (שינויים מאז המסירה הראשונה).
- `contracts/*.schema.json` (`job-envelope`, `status`, `result`, `ack`) ו-`contracts/examples/*.json`.
- המפרט `Otzaria_Task_Agent_Spec_HE.md` (סעיפים 3–4).
- הלקוח בפועל: `src/OtzariaTaskAgent.Core/Site/SiteClient.cs`; אתר הדמה `tools/FakeSite`.

המסמך הזה מסכם את מה שהאתר מממש, כולל קודי השגיאה שהאתר הוסיף או בחר. אסור לשנות קוד סטטוס, שם
שדה או מבנה JSON באחד מהנתיבים האלה בלי לבדוק מול הלקוח ב-C#. השירות מסווג תשובות לפי הסטטוס
(ראו "סיווג אצל השירות"), וסטטוס "קרוב" עלול להפוך תקלה זמנית לעצירת עבודה, או להפך.
מדריך התפעול: [`OPERATIONS.md`](OPERATIONS.md).

## כללים לכל הנתיבים

- `Authorization: Bearer <OCR_WORKER_SECRET>`. השוואה קבועת-זמן; הסוד לעולם לא ב-URL או בלוג.
- כל תשובה היא JSON (`application/json; charset=utf-8`) עם `Cache-Control: no-store`, גם שגיאות:
  `{"error":"<code>", ...}`. החריג היחיד: גוף ה-PDF ב-`/input`.
- אין הפניות (3xx): `/api/worker` אינו נתיב מוגן ב-withAuth. השירות לא עוקב אחרי הפניות.
- כל עבודה שייכת ל-`workerId` שנקבע ביצירתה (`OCR_WORKER_ID`). עבודה של עובד אחר, עבודה שעדיין
  ב-`preparing` (אין לה קלט) ומזהה שאינו ObjectId בן 24 תווי hex קטנים — כולן `404 not_found`.
- כל קריאה מאומתת מעדכנת "נראה לאחרונה" (`OcrWorkerState`, ולעבודה `lastSeenAt`), לתצוגה בלבד.

## הנתיבים

| נתיב | תשובה תקינה | שגיאות |
|---|---|---|
| `GET /jobs?limit=100&cursor=<opaque>` | `200 {"items":[…], "nextCursor": "<opaque>" \| null}` — כל העבודות הלא-סגורות של העובד (כל המצבים הפעילים חוץ מ-`preparing`), מהישנה לחדשה, עד `limit` (ברירת מחדל ומקסימום 100). כל פריט: המעטפה (`job-envelope.schema.json`) ועוד `cancelRequested` ו-`siteState`. | `400 bad_request` (limit/cursor לא תקינים) |
| `GET /jobs/{id}` | `200 {"jobId","state","cancelRequested","closed","ack"?}` — `ack` (ארבעת השדות בדיוק) רק אם נשמר ack. | `404 not_found` |
| `GET /jobs/{id}/input` | `200` גוף ה-PDF בזרימה, `Content-Type: application/pdf`, `Content-Length`, `X-Content-SHA256` (= `inputSha256`). מוגש גם לעבודה שבוטלה, כל עוד הקובץ קיים. | `404 not_found`, `404 input_unavailable`, `409 input_corrupt`, `503 storage_unavailable` (+`Retry-After`) |
| `POST /jobs/{id}/status` | `200 {"cancelRequested": bool}` — לפי מצב ה-DB אחרי העדכון, גם לדיווח ישן או לעבודה סגורה. | `400 bad_request`, `413 payload_too_large`, `422 invalid_report` (+`field`), `403 wrong_worker`, `404 not_found` |
| `POST /jobs/{id}/result` | `200 {"ack","jobId","resultSha256","outcome"}` — בדיוק ארבעה שדות (`ack.schema.json`), רק אחרי שמירה עמידה וטיפול בכל העמודים. | ראו טבלת השגיאות של הקליטה |

### המעטפה

`schemaVersion` (1), `jobId`, `taskType` (`ocr`), `workerId`, `createdAt` (= יצירת העבודה), `inputSha256`,
`options` (`lm`: `rabbinic`/`modern`/`off`, `defaultScript`: `square`/`rashi`), ו-`pageMap`: לכל עמוד ב-PDF
`{pdfPageIndex (1..N), pageId (מזהה ה-Page), pageNumber, expectedUpdatedAt, imageSha256}`. ה-PDF מכיל רק את
העמודים לעיבוד, לפי סדר `pageNumber`. המעטפה אינה משתנה לאורך חיי העבודה.

### `state` / `siteState`

| מצב העבודה באתר | `state` | `closed` |
|---|---|---|
| `queued` | `queued` | `false` |
| `running`, `pausing`, `paused_runner`, `delivery_pending`, `needs_attention`, `applying` | `in_progress` | `false` |
| `completed`, `failed` | `closed` | `true` |
| `cancelled` | `cancelled` | `true` |

### דיווח מצב

- גוף לפי `status.schema.json`. `message` נשלח רק ב-`needs_attention`, בפורמט `"<reason>: <טקסט קבוע>"`.
  מחרוזת ריקה או פורמט אחר נדחים ב-`422 invalid_report` (`field: "message"`).
- `workerId` בגוף שונה מ-`OCR_WORKER_ID` → `403 wrong_worker` (בעיית תצורה).
- הדיווח מתקבל רק אם `reportSeq` גדול מהשמור, העבודה פעילה, לא הוחלט עליה (`decision:null`), והיא לא
  ב-`preparing` או `applying`. דיווח ישן או כפול לא דורס חדש ולא פותח עבודה סגורה; התשובה עדיין 200.
- המצבים `completed`/`failed`/`cancelled` בדיווח לא סוגרים עבודה. רק תוצאה סוגרת.

### קליטת תוצאה

- כותרת `X-Result-SHA256` (64 hex; אותיות גדולות מתקבלות, ה-ack מחזיר קטנות). גוף UTF-8 JSON עד 100MiB.
- **אותו hash שוב** → `200 already_received` עם אותו `outcome`, בלי להחיל דבר (גם אחרי ניקוי הקבצים).
- **hash אחר** אחרי נעילה → `409 result_conflict`. הקובץ נשמר לבירור (`resultConflicts`).
- **תוצאה אחרי ביטול מפורש** → `200 {"ack":"cancelled", …, "outcome":"cancelled"}` בלי קשר ל-outcome שנשלח.
  הטקסט לא מוחל; שליחה חוזרת מקבלת את אותה תשובה.
- כל עמוד מוחל בעדכון מותנה ב-`expectedUpdatedAt`. עמוד שהשתנה נרשם כהתנגשות ולא נדרס.

| קוד | `error` | מתי | `Retry-After` |
|---|---|---|---|
| 400 | `bad_hash_header` | כותרת `X-Result-SHA256` חסרה או לא תקינה | |
| 400 | `hash_mismatch` | ה-sha256 של הגוף שהתקבל שונה מהכותרת | |
| 400 | `invalid_result` | הגוף אינו JSON תקין ב-UTF-8 | |
| 404 | `not_found` | עבודה לא מוכרת או של עובד אחר (לא נוצרת רשומה) | |
| 408 | `upload_incomplete` | **תוספת:** ההעלאה נקטעה לפני סוף הגוף | |
| 409 | `result_conflict` | hash אחר מזה שכבר ננעל | |
| 410 | `job_closed` | **תוספת:** העבודה אינה פעילה, לא בוטלה במפורש ואין לה תוצאה נעולה (למשל סגירה ידנית במסד), ולכן אינה מקבלת תוצאה | |
| 413 | `result_too_large` | מעל 100MiB (לפי `Content-Length` או תוך כדי קריאה) | |
| 422 | `validation_failed` | הפרת `result.schema.json` או אי-התאמה לעבודה (`jobId`, `inputSha256`, עמודים); `details` מפרט | |
| 500 | `internal_error` | חריגה לא צפויה (בלי טקסט החריגה). שליחה חוזרת ממשיכה מאותה נקודה | |
| 503 | `apply_in_progress` | קליטה של אותה תוצאה כבר רצה (lease בתוקף) | 30 |
| 503 | `storage_unavailable` | **תוספת:** שורש האחסון חסר, או שגיאת אחסון בשמירה (דיסק מלא, הרשאות וכו') | 300 |

## קודים שהאתר הוסיף או שינה ביחס לטבלת HANDOVER

| קוד | נתיב | סיבה |
|---|---|---|
| `403 worker_api_disabled` | כל הנתיבים | סוד חסר או חלש, או `OCR_WORKER_ID` לא תקין, בשרת. התוכנית המקורית הציעה 503; נבחר 403 כי השירות מסווג 401/403 כבעיית תצורה (מתריע למפעיל), ואילו 503 היה נבלע כתקלה זמנית בלי התראה. בלי `Retry-After`. |
| `401 unauthorized` | כל הנתיבים | Bearer חסר או שגוי. |
| `404 input_unavailable` | `/input` | הקובץ נמחק (ניקוי) או אבד. קבוע אצל השירות → `needs_attention`. |
| `409 input_corrupt` | `/input` | גודל הקובץ בדיסק שונה מהרשום. קבוע → `needs_attention`. |
| `503 storage_unavailable` | `/input`, `/result` | שורש האחסון חסר (דיסק לא מחובר). זמני, עם `Retry-After: 300`. |
| `410 job_closed` | `/result` | תוצאה לעבודה סגורה שלא בוטלה במפורש ואין לה תוצאה נעולה. נשמרת ב-`resultRejections`. |
| `408 upload_incomplete` | `/result` | ההעלאה נקטעה. זמני אצל השירות → שליחה חוזרת. |
| `403 wrong_worker` | `/status` | `workerId` בגוף שונה מהמוגדר. |
| `503 shabbat` | כל הנתיבים | שער השבת (`src/proxy.js`) בשבת ויו"ט, עם `Retry-After: 3600`. ראו OPERATIONS סעיף 6. |

## סיווג אצל השירות (לפי HANDOVER סעיף 3)

- **401/403, גוף HTML או 3xx** → בעיית תצורה/אימות: העבודה מוחזקת, התראה, ניסיון חוזר.
- **408/429/5xx/רשת** → זמני: backoff של 10/30/60/300/900 שניות עם jitter, מכבד `Retry-After`.
- **שאר 4xx** (400/404/409/413/422) → דחייה: העבודה נעצרת ב-`needs_attention` למפעיל, והקובץ נשמר.
- תשובה שאינה ack תקין (שדה חסר, `outcome` שונה מזה שנשלח) → `invalid_ack`, העבודה לא נסגרת.

## זמני תגובה

- בקרה (`/jobs`, `/jobs/{id}`, `/status`): פחות מ-30 שניות. השאילתות מאונדקסות, ועמוד של 100 עבודות
  כפול 2000 עמודים נכנס ב-64MiB.
- `/result`: התשובה עשויה לקחת עד 10 דקות (החלה על עד 2000 עמודים; `maxDuration = 600`). השירות
  ממתין עד `Site:TransferTimeoutMinutes` (10). nginx חייב לאפשר זאת (OPERATIONS סעיף 3).
- `/input`: זרימה מהדיסק, בלי טעינה לזיכרון. השירות מפיל העברה בלי בייטים 60 שניות.

## בדיקות

- `src/app/api/worker/v1/e2e.test.js` — E2E דרך הראוטים: יצירה, רשימה, קלט, דיווחים, תוצאה, שליחה חוזרת
  בלי כתיבה כפולה, ביטול, התנגשות עם עריכה אנושית וקריסה באמצע החלה.
- טסטי ראוט לכל נתיב (`src/app/api/worker/v1/**/route.test.js`) וטסטי הלוגיקה ב-`src/lib/ocr/*.test.mjs`
  (כולל קריסה בכל גבול של סדר הקליטה ב-`localApply.crash.int.test.mjs`).
- `scripts/ocr-local-fake-worker.mjs` — לקוח HTTP אמיתי מול שרת רץ (OPERATIONS סעיף 8).
