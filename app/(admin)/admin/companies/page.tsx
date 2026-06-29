import { prisma } from '@/lib/prisma'

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { name: true, email: true } }, _count: { select: { apps: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-muted-foreground">{companies.length} empresas registradas</p>
      </div>
      <div className="space-y-3">
        {companies.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.cnpj} · {c._count.apps} app{c._count.apps !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{c.owner.name}</p>
                <p className="text-xs text-muted-foreground">{c.owner.email}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
