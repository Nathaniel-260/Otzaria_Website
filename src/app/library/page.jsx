import Header from '@/components/layout/Header'
import Hero from '@/components/layout/Hero'
import StatsSection from '@/components/layout/StatsSection'
import ContributeSection from '@/components/layout/ContributeSection'

export const metadata = {
  title: 'ספריית אוצריא – עריכה משותפת של ספרי קודש',
  description: 'פרויקט ספריית אוצריא: עריכה משותפת של ספרי קודש. הצטרפו, ערכו והוסיפו ספרים חדשים למאגר התורני החינמי.',
}

export default function LibraryHome() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <Hero />
        
        <StatsSection /> 
        
        <ContributeSection />
      </main>
    </div>
  )
}
