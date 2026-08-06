import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { AdminAppsClient } from './admin-apps-client'

export default async function AdminAppsPage() {
  const session = await getSession()

  const apps = await prisma.oAuthApp.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true, cnpj: true, cpf: true, ownerId: true, members: { select: { ownerId: true } } } },
      _count: { select: { users: true, authEvents: true } },
    },
  })

  const mapped = apps.map(app => ({
    id: app.id,
    name: app.name,
    clientId: app.clientId,
    userCount: app._count.users,
    eventCount: app._count.authEvents,
    company: { id: app.company.id, name: app.company.name, cnpj: app.company.cnpj, cpf: app.company.cpf },
    isMine: !!session && (app.company.ownerId === session.ownerId || app.company.members.some(m => m.ownerId === session.ownerId)),
  }))

  return <AdminAppsClient apps={mapped} />
}
