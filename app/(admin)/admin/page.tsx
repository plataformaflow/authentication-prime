import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Building2, AppWindow, Activity } from 'lucide-react'

export default async function AdminPage() {
  const since30 = new Date(); since30.setDate(since30.getDate() - 30)
  const [totalOwners, totalCompanies, totalApps, totalUsers, totalEvents] = await Promise.all([
    prisma.owner.count(), prisma.company.count(), prisma.oAuthApp.count(), prisma.appUser.count(),
    prisma.authEvent.count({ where: { createdAt: { gte: since30 } } }),
  ])
  const recentOwners = await prisma.owner.findMany({
    orderBy: { createdAt: 'desc' }, take: 5,
    select: { id: true, name: true, email: true, isAdmin: true, createdAt: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Owners', value: totalOwners, href: '/admin/users', icon: Users },
          { label: 'Empresas', value: totalCompanies, href: '/admin/companies', icon: Building2 },
          { label: 'Apps', value: totalApps, href: '/admin/apps', icon: AppWindow },
          { label: 'Eventos (30d)', value: totalEvents, href: '/admin', icon: Activity },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="bg-card border border-border rounded-xl p-6 hover:border-ring/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4 text-sm">Últimos usuários registrados</h2>
        <div className="space-y-3">
          {recentOwners.map(o => (
            <div key={o.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-xs text-muted-foreground">{o.email}</p>
              </div>
              {o.isAdmin && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
