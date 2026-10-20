import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import IconTile from '@/components/ui/IconTile'
import { cx } from '@/components/ui/cx'

/**
 * "דיווח למפתח" — בתחתית העמוד, במשטח טונלי: מי שהגיע עד כאן ונתקל בבעיה מוצא את הדרך לדווח.
 * הנוסח — הכותרת (title) והטקסט של הכפתור שהיה בראש העמוד. החלון עצמו (PluginReportModal) — בעמוד.
 */
export default function PluginReportCallout({ onReport, className }: { onReport: () => void; className?: string }) {
  return (
    <Card
      tone="tonal"
      padding="md"
      className={cx('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="flex items-center gap-3">
        <IconTile icon="flag" size="sm" />
        <p className="text-body-md text-on-surface">דיווח על תקלה או בעיה למפתח התוסף</p>
      </div>
      <Button variant="outlined" size="md" icon="flag" onClick={onReport} className="shrink-0">
        דיווח למפתח
      </Button>
    </Card>
  )
}
