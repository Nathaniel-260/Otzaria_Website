// צורת הדף — השהיית השאלות למתנדבים: המסלול המהיר, התרגול והשאלות שבבדיקת עמוד. בדיקת העמודים עצמה (שורות,
// עוגנים, דיווחים) נשארת פתוחה, ומנהל המודול אינו מושפע. מחזירים את השאלות ב-ITEMS_PAUSED = false.
export const ITEMS_PAUSED = true;
export const PAUSED_MSG = 'השאלות של צורת הדף מושהות זמנית. בדיקת עמודים (שורות ועוגנים) פתוחה כרגיל.';

/** g — מ-requireTzuratSession */
export const itemsPaused = (g) => ITEMS_PAUSED && !g?.isAdmin;
