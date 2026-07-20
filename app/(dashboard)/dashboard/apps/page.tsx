import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { AppsClient } from './apps-client'

export default async function AppsPage() {
  const session = await requireSession()
  const ownerId = session.ownerId

  const appInclude = { company: { select: { id: true, name: true, logoUrl: true, cnpj: true, cpf: true } }, _count: { select: { users: true } } } as const

  const [ownedApps, collabEntries, ownerCompanies, transferRequests, me] = await Promise.all([
    prisma.oAuthApp.findMany({
      where: { company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
      include: appInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appCollaborator.findMany({
      where: { ownerId },
      include: { app: { include: appInclude } },
    }),
    prisma.company.findMany({ where: { ownerId }, select: { id: true, name: true } }),
    prisma.appTransferRequest.findMany({
      where: { status: 'pending', toCompany: { ownerId } },
      include: {
        app: { select: { id: true, name: true } },
        toCompany: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.owner.findUnique({ where: { id: ownerId }, select: { email: true } }),
  ])

  const ownedIds = new Set(ownedApps.map(a => a.id))
  const collabApps = collabEntries
    .filter(e => !ownedIds.has(e.app.id))
    .map(e => ({
      ...e.app,
      _role: 'collaborator' as const,
      _permissions: {
        canViewAnalytics: e.canViewAnalytics,
        canCreateUsers: e.canCreateUsers,
        canEditUsers: e.canEditUsers,
        canDeleteUsers: e.canDeleteUsers ?? false,
        maxUsers: e.maxUsers,
      },
    }))

  const apps = [
    ...ownedApps.map(a => ({ ...a, _role: 'owner' as const })),
    ...collabApps,
  ]

  const invites = me
    ? await prisma.appCollaboratorInvite.findMany({
        where: { toEmail: me.email, status: 'pending' },
        include: {
          app: { select: { id: true, name: true, logoUrl: true, company: { select: { id: true, name: true, logoUrl: true } } } },
          fromOwner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <AppsClient
      initialApps={JSON.parse(JSON.stringify(apps))}
      initialCompanies={ownerCompanies}
      initialTransferRequests={JSON.parse(JSON.stringify(transferRequests))}
      initialInvites={JSON.parse(JSON.stringify(invites))}
    />
  )
}
