import { prisma } from '@/lib/prisma'
import { AdminUsersClient } from './admin-users-client'

export default async function AdminUsersPage() {
  const owners = await prisma.owner.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, phone: true, isAdmin: true, createdAt: true, _count: { select: { companies: true } } },
  })

  return <AdminUsersClient initialOwners={JSON.parse(JSON.stringify(owners))} />
}
