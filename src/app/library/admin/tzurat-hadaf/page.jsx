'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import TzuratAdmin from '@/components/tzuratHadaf/admin/TzuratAdmin'
import { hasTzuratAdminAccess } from '@/lib/roles'

// ניהול צורת הדף (CONTRACT.md: /library/admin/tzurat-hadaf): מנהל כללי ומנהל ספרים בלבד.
// ה-proxy כבר חוסם את שאר התפקידים; הבדיקה כאן — להפניה נקייה ולא להצגת מסך ריק.

export default function TzuratHadafAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const allowed = hasTzuratAdminAccess(session?.user?.role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login?callbackUrl=/library/admin/tzurat-hadaf')
    else if (status === 'authenticated' && !allowed) router.push('/library/admin')
  }, [status, allowed, router])

  if (status === 'loading' || !allowed) return <LoadingSpinner message="טוען..." />
  return <TzuratAdmin />
}
