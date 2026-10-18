import Skeleton from '@/components/ui/Skeleton'
import { cx } from '@/components/ui/cx'
import PluginGrid, { type PluginGridColumns } from '@/components/plugins/PluginGrid'

/**
 * שלד של PluginCard — אותו מבנה ואותן מידות (אייקון, שם, שורת מטא, תיאור בשתי שורות, שני כפתורים),
 * כדי שהחלפת השלד בכרטיס לא תזיז את הדף. דקורטיבי (aria-hidden דרך Skeleton); את ההכרזה
 * "טוען…" נותן ההורה (PluginGridSkeleton / loading.jsx). Server Component.
 */
export function PluginCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('flex h-full flex-col gap-3 rounded-(--card-radius) bg-(--card-bg) p-4 sm:p-5', className)}
    >
      <div className="flex items-start gap-4">
        <Skeleton className="size-(--plugin-icon-size-md) shrink-0 sm:size-(--plugin-icon-size-lg)" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1">
          <Skeleton shape="text" className="w-3/4 text-title-md" />
          <Skeleton shape="text" className="w-2/3 text-label-md" />
        </div>
      </div>
      <div className="flex flex-col gap-2 text-body-sm">
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-5/6" />
      </div>
      <div className="mt-auto flex gap-2 pt-1">
        <Skeleton className="h-(--button-height-sm) flex-1" />
        <Skeleton className="h-(--button-height-sm) flex-1" />
      </div>
    </div>
  )
}

/**
 * רשת שלדים — אותה רשת כמו PluginGrid, עם הכרזה אחת לקורא המסך (role=status + טקסט נסתר).
 * label — הטקסט המוכרז ("טוען תוספים...").
 */
export function PluginGridSkeleton({ count = 6, columns = 'full', label = 'טוען תוספים...', className }: {
  count?: number
  columns?: PluginGridColumns
  label?: string
  className?: string
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      <PluginGrid columns={columns}>
        {Array.from({ length: count }, (_, index) => (
          <PluginCardSkeleton key={index} />
        ))}
      </PluginGrid>
    </div>
  )
}

export default PluginCardSkeleton
