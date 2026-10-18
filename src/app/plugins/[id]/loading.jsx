import PluginDetailSkeleton from '@/components/plugins/detail/PluginDetailSkeleton'

// fallback מיידי למעבר לעמוד תוסף (הדף force-dynamic — שולף מה-DB בכל בקשה). שלד באותו מבנה כמו
// ראש העמוד, במקום שלד הרשת הכללי של החנות (src/app/plugins/loading.jsx).
export default function PluginDetailLoading() {
  return <PluginDetailSkeleton />
}
