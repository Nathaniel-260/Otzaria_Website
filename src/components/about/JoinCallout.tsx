import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'

/** סיום הדף: קריאה להצטרפות ופעולה ראשית אחת. בלי ריפוד תחתון — המרווח עד הפוטר הוא ה-mt שלו */
export default function JoinCallout() {
  return (
    <Section labelledBy="join-heading" spacing="top" container="narrow" containerClassName="flex flex-col items-center text-center">
      <SectionHeading id="join-heading" title="מוכנים להצטרף אלינו?" size="md" spacing="none" className="mb-6" />
      <Button href="/library" size="lg" icon="library_books">התחל לערוך</Button>
    </Section>
  )
}
