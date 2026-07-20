import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import Link from 'next/link'
import { Building2, AppWindow, Mail } from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireSession()
  const owner = await prisma.owner.findUnique({
    where: { id: session.ownerId },
    select: { name: true, email: true },
  })
  const [companiesCount, appsCount, invitesCount] = await Promise.all([
    prisma.company.count({ where: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } }),
    prisma.oAuthApp.count({ where: { company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } } }),
    prisma.companyInvite.count({ where: { fromOwner: { id: session.ownerId }, status: 'pending' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {owner?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">{owner?.email}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Empresas', value: companiesCount, href: '/dashboard/companies', icon: Building2 },
          { label: 'Aplicativos', value: appsCount, href: '/dashboard/apps', icon: AppWindow },
          { label: 'Convites', value: invitesCount, href: '/dashboard/companies', icon: Mail },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={href} href={href} className="bg-card border border-border rounded-xl p-6 hover:border-ring/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
