'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, ShieldOff } from 'lucide-react'

interface Owner { id: string; name: string; email: string; phone?: string; isAdmin: boolean; createdAt: string; _count: { companies: number } }

export function AdminUsersClient({ initialOwners }: { initialOwners: Owner[] }) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners)

  async function toggleAdmin(id: string) {
    const res = await fetch(`/api/admin/users/${id}/toggle-admin`, { method: 'PATCH' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Erro.'); return }
    setOwners(p => p.map(o => o.id === id ? { ...o, isAdmin: data.isAdmin } : o))
    toast.success('Status atualizado.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{owners.length} owners registrados</p>
      </div>
      <div className="space-y-3">
        {owners.map(o => (
          <div key={o.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{o.name}</p>
                {o.isAdmin && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Admin</span>}
              </div>
              <p className="text-xs text-muted-foreground">{o.email} · {o._count.companies} empresa{o._count.companies !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => toggleAdmin(o.id)} className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border transition-colors ${o.isAdmin ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-border hover:bg-muted'}`}>
              {o.isAdmin ? <><ShieldOff className="w-3.5 h-3.5" /> Remover admin</> : <><Shield className="w-3.5 h-3.5" /> Tornar admin</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
