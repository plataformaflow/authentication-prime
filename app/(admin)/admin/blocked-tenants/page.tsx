import { prisma } from '@/lib/prisma'
import { BlockedTenantsClient } from './blocked-tenants-client'

export default async function AdminBlockedTenantsPage() {
  const tenants = await prisma.blockedTenant.findMany({ orderBy: { createdAt: 'desc' } })
  return <BlockedTenantsClient initialTenants={JSON.parse(JSON.stringify(tenants))} />
}
