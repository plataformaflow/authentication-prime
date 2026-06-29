import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import DashboardNav from '@/components/dashboard-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.isAdmin) redirect('/dashboard')
  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav isAdmin={true} />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
