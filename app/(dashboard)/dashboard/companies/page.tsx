import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { CompaniesClient } from './companies-client'

export default async function CompaniesPage() {
  const session = await requireSession()
  const ownerId = session.ownerId

  const [owned, member, me] = await Promise.all([
    prisma.company.findMany({
      where: { ownerId },
      include: { _count: { select: { apps: true } }, members: { select: { id: true, owner: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findMany({
      where: { members: { some: { ownerId } } },
      include: { _count: { select: { apps: true } }, owner: { select: { name: true, email: true } }, members: { select: { id: true, owner: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.owner.findUnique({ where: { id: ownerId }, select: { email: true } }),
  ])

  const companies = [
    ...owned.map(c => ({ ...c, role: 'owner' })),
    ...member.map(c => ({ ...c, role: 'member' })),
  ]

  const [invites, myRequests] = await Promise.all([
    me
      ? prisma.companyInvite.findMany({
          where: { toEmail: me.email, status: 'pending', type: 'invite' },
          include: { company: { select: { id: true, name: true, cnpj: true, logoUrl: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.companyInvite.findMany({
      where: { fromOwnerId: ownerId, type: 'request' },
      include: { company: { select: { id: true, name: true, cnpj: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <CompaniesClient
      initialCompanies={JSON.parse(JSON.stringify(companies))}
      initialInvites={JSON.parse(JSON.stringify(invites))}
      initialMyRequests={JSON.parse(JSON.stringify(myRequests))}
    />
  )
}
