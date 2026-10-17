import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'

/** "קהילת עורכי אוצריא": הסבר קצר ושתי פעולות — ראשית (המשתמשים) ומשנית (התחברות) */
export default function CommunitySection() {
  return (
    <Section labelledBy="community-heading" spacing="top" container="narrow" containerClassName="flex flex-col items-center">
      <SectionHeading
        id="community-heading"
        title="קהילת עורכי אוצריא"
        subtitle="לצורך עדכון והרחבת מאגר ספריית אוצריא עובדים מתנדבים רבים מכל העולם. הצטרפו אליהם והיו שותפים בשימור והנגשת המורשת התורנית!"
        spacing="none"
        className="mb-6"
      />
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button href="/library/users" icon="people">צפה במשתמשים</Button>
        <Button href="/auth/login" variant="outlined" icon="add">התחבר לקהילה</Button>
      </div>
    </Section>
  )
}
