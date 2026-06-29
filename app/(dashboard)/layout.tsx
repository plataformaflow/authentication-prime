import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const owner = await prisma.owner.findUnique({
    where: { id: session.ownerId },
    select: { name: true, email: true },
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={owner?.name ?? 'Usuário'}
        userEmail={owner?.email ?? ''}
        isAdmin={session.isAdmin}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={owner?.name ?? 'Usuário'}
          userEmail={owner?.email ?? ''}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
