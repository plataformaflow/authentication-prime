import { prisma } from '@/lib/prisma'

export default async function AdminAppsPage() {
  const apps = await prisma.oAuthApp.findMany({
    orderBy: { createdAt: 'desc' },
    include: { company: { select: { name: true } }, _count: { select: { users: true, authEvents: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aplicativos</h1>
        <p className="text-sm text-muted-foreground">{apps.length} apps registrados</p>
      </div>
      <div className="space-y-3">
        {apps.map(app => (
          <div key={app.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.company.name} · {app._count.users} usuário{app._count.users !== 1 ? 's' : ''} · {app._count.authEvents} eventos</p>
              </div>
              <code className="text-xs text-muted-foreground font-mono">{app.clientId.slice(0, 12)}...</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
