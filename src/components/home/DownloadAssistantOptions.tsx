import type { ReactNode } from 'react'
import DownloadNote, { Ltr, Nowrap } from './DownloadNote'
import DownloadOptionCard from './DownloadOptionCard'

type PlatformLinks = Record<string, string | undefined>

type AssistantButton = {
  key: string
  icon: string
  title: string
  desc: ReactNode
}

type AssistantPlatformConfig = {
  /** מה עושים בקובץ שהורד (מוצג מתחת ל-ASSISTANT_LEAD_TITLE) */
  lead: ReactNode
  buttons: AssistantButton[]
  /** הערה שאין לה מקום אחר (מוצגת אחרי הכפתורים) */
  note?: { icon: string; text: ReactNode; onlyWithMultipleButtons?: boolean }
}

// הנוסח תואם את מסכי המסייע ואת docs/download_assistant.md בריפו של אוצריא.
// לא להוסיף כאן שלבים שהמסייע מסביר בעצמו (בחירת המחשב, היקף ההורדה, glib-networking, עמוד הסיום).
// העובדה החשובה בכל החלונות — שורה מודגשת נפרדת מעל ההסבר הספציפי למערכת.
// הרווח שלפני כל קו מפריד ב-lead אינו נשבר (nbsp): בטקסט ממורכז קו בתחילת שורה נראה כתבליט.
const ASSISTANT_LEAD_TITLE = 'זה מסייע ההורדה, לא תוכנת ההתקנה.'

const ASSISTANT_CONFIG: Record<string, AssistantPlatformConfig> = {
  Windows: {
    lead: 'הפעילו אותו, והוא יוריד את אוצריא ויכין התקנה\u00a0— למחשב הזה או למחשב בלי אינטרנט.',
    buttons: [
      { key: 'assistant', icon: 'install_desktop', title: 'מסייע ההורדה של אוצריא', desc: <><bdi dir="ltr">Windows 10 / 11</bdi>, כולל מחשבי ARM</> }
    ]
  },
  macOS: {
    lead: <>פתחו את <Nowrap>ה-<Ltr>ZIP</Ltr></Nowrap> שהורד והפעילו את המסייע שבתוכו&nbsp;— משם הוא ינחה אתכם.</>,
    buttons: [
      { key: 'assistant', icon: 'laptop_mac', title: 'מסייע ההורדה של אוצריא', desc: 'macOS 12 ומעלה, Intel ו-Apple Silicon' }
    ],
    // החסימה מופיעה לפני שהמסייע נפתח — רק האתר יכול להסביר אותה
    note: {
      icon: 'shield',
      text: 'בפתיחה הראשונה macOS יחסום את המסייע, כי אינו חתום אצל Apple. אשרו "פתח בכל זאת" בהגדרות המערכת.'
    }
  },
  Linux: {
    lead: <>חלצו את <Nowrap>ה-<Ltr>tar.gz</Ltr></Nowrap> שהורד והפעילו את <Ltr>Otzaria-Download-Assistant</Ltr> שבתיקייה&nbsp;— משם הוא ינחה אתכם.</>,
    buttons: [
      { key: 'assistantX64', icon: 'computer', title: 'מסייע ההורדה (x64)', desc: 'מעבד Intel או AMD — רוב המחשבים' },
      { key: 'assistantArm64', icon: 'memory', title: 'מסייע ההורדה (ARM64)', desc: 'מעבד ARM' }
    ],
    // שני קבצים נפרדים, והבחירה ביניהם קודמת להפעלת המסייע
    note: {
      icon: 'terminal',
      onlyWithMultipleButtons: true,
      text: <>לא בטוחים? הריצו בטרמינל <Ltr>uname -m</Ltr>: <Ltr>x86_64</Ltr> פירושו x64, ו-<Ltr>aarch64</Ltr> פירושו ARM64.</>
    }
  }
}

/** האם יש ב-release מסייע הורדה לפלטפורמה (Windows / macOS / Linux) */
export function hasDownloadAssistant(platform: string, links: PlatformLinks): boolean {
  const config = ASSISTANT_CONFIG[platform]
  return !!config && config.buttons.some((button) => links[button.key])
}

export default function DownloadAssistantOptions({ platform, links }: { platform: string; links: PlatformLinks }) {
  const config = ASSISTANT_CONFIG[platform]
  if (!config) return null
  const buttons = config.buttons.filter((button) => links[button.key])
  const showNote = config.note && (!config.note.onlyWithMultipleButtons || buttons.length > 1)

  return (
    <>
      <DownloadNote variant="lead" title={ASSISTANT_LEAD_TITLE}>{config.lead}</DownloadNote>

      {buttons.map((button, index) => (
        <DownloadOptionCard
          key={button.key}
          href={links[button.key] as string}
          icon={button.icon}
          title={button.title}
          desc={button.desc}
          emphasis={index === 0 ? 'primary' : 'tonal'}
        />
      ))}

      {showNote && config.note && <DownloadNote icon={config.note.icon}>{config.note.text}</DownloadNote>}
    </>
  )
}

// מסייע ה-Windows יודע להכין גם יעד Android (סוג מחשב אחר ← Android), והוא עצמו מסביר
// מה עושים עם ה-APK ועם קובצי הספרייה.
export function AndroidAssistantNotice({ href }: { href: string }) {
  return (
    <div role="note" className="mt-1 flex gap-3 rounded-lg bg-tile/40 p-3 text-on-surface sm:p-4">
      <span aria-hidden="true" className="material-symbols-outlined mt-px shrink-0 text-[22px] text-on-tile">wifi_off</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">אין אינטרנט במכשיר?</p>
        <p className="mt-1 text-sm leading-relaxed">
          אפשר להכין התקנה במחשב Windows בעזרת מסייע ההורדה: בחרו בו &quot;סוג מחשב אחר&quot; ואז Android.
        </p>
        <a
          href={href}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-card-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">download</span>
          <span>הורדת המסייע ל-Windows</span>
        </a>
      </div>
    </div>
  )
}
