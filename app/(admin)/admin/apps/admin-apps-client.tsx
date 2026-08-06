'use client'

import { useMemo, useState } from 'react'
import { Search, AppWindow, UserCircle2 } from 'lucide-react'

interface AdminApp {
  id: string
  name: string
  clientId: string
  userCount: number
  eventCount: number
  company: { id: string; name: string; cnpj: string | null; cpf: string | null }
  isMine: boolean
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

function matches(app: AdminApp, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (app.name.toLowerCase().includes(q)) return true
  if (app.company.name.toLowerCase().includes(q)) return true
  const qDigits = onlyDigits(query)
  if (qDigits) {
    if (app.company.cnpj && onlyDigits(app.company.cnpj).includes(qDigits)) return true
    if (app.company.cpf && onlyDigits(app.company.cpf).includes(qDigits)) return true
  }
  return false
}

export function AdminAppsClient({ apps }: { apps: AdminApp[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => apps.filter(a => matches(a, query)), [apps, query])
  const mine = filtered.filter(a => a.isMine)
  const others = filtered.filter(a => !a.isMine)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aplicativos</h1>
        <p className="text-sm text-muted-foreground">{apps.length} apps registrados</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nome, empresa ou CNPJ/CPF..."
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <AppSection
        title="Minhas aplicações"
        icon={UserCircle2}
        apps={mine}
        emptyLabel={query ? 'Nenhuma aplicação sua encontrada.' : 'Você ainda não tem aplicações.'}
      />
      <AppSection
        title="Aplicações de outros usuários"
        icon={AppWindow}
        apps={others}
        emptyLabel={query ? 'Nenhuma aplicação encontrada.' : 'Nenhuma outra aplicação registrada.'}
      />
    </div>
  )
}

function AppSection({ title, icon: Icon, apps, emptyLabel }: {
  title: string
  icon: React.ElementType
  apps: AdminApp[]
  emptyLabel: string
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" /> {title}
        <span className="text-xs font-normal text-muted-foreground">({apps.length})</span>
      </h2>
      {apps.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{app.name}</p>
                    {app.isMine && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-full shrink-0">Sua</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {app.company.name}
                    {(app.company.cnpj || app.company.cpf) && <> · {app.company.cnpj ?? app.company.cpf}</>}
                    {' · '}{app.userCount} usuário{app.userCount !== 1 ? 's' : ''} · {app.eventCount} eventos
                  </p>
                </div>
                <code className="text-xs text-muted-foreground font-mono shrink-0">{app.clientId.slice(0, 12)}...</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
