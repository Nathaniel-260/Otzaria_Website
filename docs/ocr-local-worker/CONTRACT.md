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
- כל קריאה מאומתת מעדכנת "נראה לאחרונה" של העובד (`OcrWorkerState.lastSeenAt`); דיווח מצב
  (`POST /jobs/{id}/status`) לעבודה פעילה מעדכן גם את `lastSeenAt` של העבודה. לתצוגה בלבד.

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

השירות שומר את המעטפה בקבלה הראשונה ומשווה אליה בכל סבב (hash על כל המעטפה, `JobRepository.Manifest`
בשירות). כל שינוי בה, כולל **צורת** `options`, מחנה את העבודה אצלו כ-`manifest_conflict` (HANDOVER 3.1
פריט 10). לכן האתר שולח לכל עבודה תמיד את אותה צורה:

- `options` הוא תמיד אובייקט, אף פעם לא חסר ולא `null`. הוא נבנה רק ממה שנשמר ברשומה בעת היצירה, בסדר
  מפתחות קבוע (`lm`, `defaultScript`). עבודה חדשה נשמרת עם שני המפתחות מפורשים (ברירות המחדל ממולאות
  ב-`normalizeLocalRequest`). רשומה בלי `options` תישלח תמיד כ-`{}`. אין ל-`OptionsSchema` ברירות מחדל
  של Mongoose, ואף מסלול (דיווח, ביטול, החלה, ניקוי, מיגרציה) לא כותב לשדות המעטפה אחרי המעבר ל-`queued`.
- `createdAt` ו-`expectedUpdatedAt` נשלחים ב-`toISOString()` (UTC עם מילישניות). השירות משווה ביניהם
  כרגעים ולא כטקסט.
- `jobId` הוא ObjectId בן 24 תווי hex קטנים, ולכן תמיד תואם לתבנית `^[A-Za-z0-9_-]{1,64}$` ואינו יכול
  להיות שם התקן של Windows. `schemaVersion` תמיד 1, ו-`taskType` תמיד `ocr`.
- המעטפה מופיעה רק בפריטי `GET /jobs`. `GET /jobs/{id}` מחזיר מצב בלבד, בלי מעטפה.

`Retry-After` נשלח תמיד כמספר שניות: `300` ב-`503 storage_unavailable`, `30` ב-`503 apply_in_progress`
ו-`3600` בשער השבת.
השירות מגביל כל `Retry-After` לשעה (`ErrorClassifier.MaxRetryAfter`). ב-`/input` הוא דוחה רק את ההורדה
של אותה עבודה (HANDOVER 3.1 פריט 9).

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
- **hash אחר** אחרי נעילה → `409 result_conflict`. הקובץ נשמר לבירור (`resultConflicts`), אלא אם יש כבר
  20 התנגשויות שלא סומנו כנבדקו (אז התשובה זהה, אבל הקובץ לא נשמר).
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

### מגבלות וקבלה סלחנית בצד האתר, מעבר לסכמה (סקירה W09)

- **אורך טקסט עמוד: עד 2,000,000 יחידות UTF-16** (`MAX_PAGE_TEXT_CHARS` ב-`src/lib/ocr/localResultValidate.js`, נמדד ב-`String.length`; בדיוק 2,000,000 מתקבל). זה אותו גבול ואותה יחידה שהשירות אוכף **מגרסה 1.0.141** (commit `247aed3` בריפו השירות): `ResultValidator.MaxPageTextUnits = 2_000_000` ב-`Validation/Validators.cs` (`.NET string.Length`, אותה ספירה כמו `String.length`), ו-`result.schema.json` מתעד אותה ב-`$comment` של `pages[].text` (בלי `maxLength`, שסופר נקודות קוד ולא יחידות UTF-16).
- **עמוד חורג מהשירות מגיע כשגיאת עמוד, לא כ-422:** `ResultFinalizer.Load` בשירות (`Execution/ResultFinalizer.cs`) הופך כל עמוד מעל הגבול, לפני האימות וההקפאה, לעמוד **בלי `text`** עם ה-`metadata` שלו ו-`error {code: "page_text_too_long"}`, שומר את שאר העמודים, וממיר `success` ל-`partial`. האתר מקבל אותו ככל שגיאת עמוד: העמוד לא נכתב, נרשם ב-`pageErrors` עם הקוד, וה-ack הוא `accepted` עם ה-`outcome` שנשלח (`partial` שבו אף עמוד לא נקלט נסגר באתר כ-`failed`/`no_pages_succeeded`, וה-ack נשאר `partial`). קודי שגיאת העמוד שהשירות שולח: `layout_failed`, `not_processed` (bridge, עם `text: ""`) ו-`page_text_too_long`; האתר אינו מסנן לפי קוד ומציג אותו כפי שהוא.
- **חריגה שבכל זאת מגיעה** (קובץ שהוקפא בגרסת שירות קודמת ל-1.0.141 — `DeliverySender` אינו מאמת מחדש קובץ שכבר הוקפא) דוחה את **כל** התוצאה: `422 validation_failed` עם `page <idx> text too long` ב-`details` (עד 5 שגיאות ראשונות), ולא נכתב אף עמוד. השירות מסווג 422 כקבוע ומחנה את העבודה (`needs_attention`) למפעיל.
- **null בשדות אופציונליים** (`metadata`, `pages[].metadata`, `error`, `pages[].text` כשיש `error`): לפי HANDOVER סעיף 3.1 פריט 11 ו-`pipeline-contract.md`, תוצאה של השירות **אינה מכילה** חבר אופציונלי שערכו `null` — הוא מושמט. השירות עצמו עדיין סובל `null` כזה בקובץ של ה-handler ומשמיט אותו בהקפאה (קובץ ה-outbox נכתב מחדש מהמסמך המאומת), כך שרק הקובץ המוקפא נשלח לאתר. האתר מקבל `null` כזה כאילו חסר (הקלה מכוונת, עקרון Postel; קבלתו אינה כותבת עמוד שגוי). ערכים **בתוך** `metadata` (של הספר או של עמוד) עשויים להיות `null` גם בשירות הנוכחי (למשל `gpu.name`) — האתר אינו בודק את תוכן ה-`metadata` כלל. כך גם `pages[].pageId` — שדה שאינו בסכמה ובשירות כלל; האתר בודק אותו רק אם נשלח כמחרוזת, וכותב תמיד לעמוד לפי ה-`pageMap` של העבודה. אין להקשיח בלי תיאום עם השירות.
- **`error.code` ריק ברמת התוצאה ב-`partial`/`cancelled`:** האתר דורש `code` לא ריק רק ב-`failed` (ובכל `error` ברמת עמוד); ב-`partial`/`cancelled` אובייקט `error` עם `code` ריק מתקבל. לפי HANDOVER סעיף 3.1 פריט 11 לכל `error` בתוצאה יש `code` לא ריק בכל `outcome`, והשירות (`top-level error without code` ב-`Validators.cs`) מסרב להקפיא תוצאה שמפרה זאת — אבל קובץ שהוקפא בגרסה ישנה יותר עדיין עשוי להישלח כמו שהוא. האתר סלחני בכוונה ולא כותב דבר שגוי; לא להקשיח.
- **`Retry-After` על `/result`** (`503 apply_in_progress` — 30, `storage_unavailable` — 300, שער השבת — 3600): השירות הנוכחי (1.0.142) עוצר בעקבותיו את **כל** מסירות התוצאות, לא רק של אותה עבודה, ושומר את ההמתנה גם לאחר אתחול (מ-1.0.141; תקרה של שעה; HANDOVER סעיף 3.1 פריט 9, `DeliverySender.cs`). לכן הערכים כאן קצרים בכוונה.

## קודים שהאתר הוסיף או שינה ביחס לטבלת HANDOVER

| קוד | נתיב | סיבה |
|---|---|---|
| `403 worker_api_disabled` | כל הנתיבים | סוד חסר או חלש, או `OCR_WORKER_ID` לא תקין, בשרת. התוכנית המקורית הציעה 503; נבחר 403 כי השירות מסווג 401/403 כבעיית תצורה (מתריע למפעיל), ואילו 503 היה נבלע כתקלה זמנית בלי התראה. בלי `Retry-After`. |
| `401 unauthorized` | כל הנתיבים | Bearer חסר או שגוי. |
| `404 input_unavailable` | `/input` | הקובץ נמחק (ניקוי) או אבד. קבוע אצל השירות → `needs_attention`. |
| `409 input_corrupt` | `/input` | גודל הקובץ בדיסק שונה מהרשום. קבוע → `needs_attention`. |
| `503 storage_unavailable` | `/input`, `/result` | שורש האחסון חסר (דיסק לא מחובר). זמני, עם `Retry-After: 300`. |
| `410 job_closed` | `/result` | תוצאה לעבודה סגורה שלא בוטלה במפורש ואין לה תוצאה נעולה. נשמרת ב-`resultRejections` (עד 20 דחיות לעבודה; מעבר לכך אותה תשובה בלי שמירת הקובץ). |
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
