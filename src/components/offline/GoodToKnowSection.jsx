import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import IconTile from '@/components/ui/IconTile'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'

// מונחים לועזיים עם מספרים — בבידוד (bdi), אחרת "10 / 11" מתהפך בשורה עברית
const ITEMS = [
  {
    icon: 'computer',
    q: 'מה צריך כדי להשתמש בכלי?',
    a: (
      <>
        מחשב <bdi dir="ltr" className="whitespace-nowrap">Windows 10 / 11</bdi> (64 סיביות) או <bdi dir="ltr" className="whitespace-nowrap">macOS 10.15</bdi> ומעלה, וכונן USB עם
        מקום פנוי. הכלי בודק שיש מספיק מקום לפני ההורדה. הממשק בעברית ובאנגלית.
      </>
    )
  },
  {
    icon: 'folder_open',
    q: 'צריך להתקין אותו?',
    a: 'לא. ב-Windows זה קובץ אחד שאתה מפעיל ישירות. ב-macOS פתח את קובץ ה-zip והפעל את היישום. בדרך כלל לא צריך הרשאות מנהל. שמור את הכלי על הכונן: העדכונים נשמרים בתיקייה OtzariaData שלצדו.'
  },
  {
    icon: 'verified_user',
    q: 'האם העדכון בטוח?',
    a: 'שום דבר לא יורד ולא מותקן בלי אישורך. כל קובץ עדכון נבדק לפני שהוא מוחל, והספרייה הקיימת נשארת שלמה עד שהעדכון מסתיים. אם ההורדה נקטעת, היא ממשיכה מאותה נקודה.'
  },
  {
    icon: 'devices',
    q: 'יש לי כמה מחשבים בלי אינטרנט. צריך להוריד לכל אחד?',
    a: 'לא. כונן אחד מספיק לכמה מחשבים. חבר אותו לכל מחשב בתורו, ועדכן.'
  },
  {
    icon: 'block',
    q: 'למה צריך לסגור את אוצריא?',
    a: 'אי אפשר לעדכן את אוצריא בזמן שהיא פתוחה. אם שכחת לסגור אותה, הכלי יזהה את זה ויתריע לפני העדכון.'
  },
  {
    icon: 'laptop_mac',
    q: 'ב-macOS הכלי לא נפתח. מה לעשות?',
    a: 'בפתיחה הראשונה macOS עשוי לחסום את הכלי. פתח את הגדרות המערכת ← פרטיות ואבטחה, ואשר את הפתיחה. מאז הכלי ייפתח כרגיל.'
  },
  {
    icon: 'wifi',
    q: 'אפשר להשתמש בו גם במחשב מחובר?',
    a: 'כן. במחשב עם אינטרנט הכלי מעדכן את אוצריא כרגיל. הוא גם מעדכן את עצמו, והעדכון שלו עובר על הכונן כמו כל השאר.'
  }
]

// שאלות ותשובות קצרות — רשימת הגדרות (dl) בכרטיס אחד, עם קו מפריד בין פריט לפריט.
// כל התשובות גלויות (בלי אקורדיון): הן קצרות, ומי שמגיע לכאן בא לקרוא אותן.
export default function GoodToKnowSection({ repoUrl }) {
  return (
    <Section labelledBy="faq-heading" container="narrow">
      <SectionHeading id="faq-heading" title="טוב לדעת" />
      <Card padding="none">
        <dl className="divide-y divide-outline-variant">
          {ITEMS.map((item) => (
            <div key={item.q} className="flex gap-3 p-4 sm:gap-4 sm:p-5 xl:p-6">
              <IconTile icon={item.icon} size="sm" />
              <div className="min-w-0 pt-1.5">
                <dt className="text-title-sm text-on-surface sm:text-title-md">{item.q}</dt>
                <dd className="mt-1 text-body-sm text-on-surface-variant sm:text-body-md">{item.a}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>
      <div className="mt-6 flex justify-center">
        <Button href={`${repoUrl}/issues`} external variant="outlined" icon="bug_report">
          דיווח על תקלה בכלי
        </Button>
      </div>
    </Section>
  )
}
