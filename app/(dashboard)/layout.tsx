import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const owner = await prisma.owner.findUnique({
    where: { id: session.ownerId },
    select: { name: true, email: true },
  })

  return (
    <DashboardShell
      userName={owner?.name ?? 'Usuário'}
      userEmail={owner?.email ?? ''}
      isAdmin={session.isAdmin}
    >
      {children}
    </DashboardShell>
  )
}
