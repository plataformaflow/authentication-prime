'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldBan, Trash2, Plus } from 'lucide-react'
import { slugify, validateTenantSlug, apiErrorMessage } from '@/lib/validation'

interface BlockedTenant { id: string; slug: string; reason: string | null; createdAt: string }

export function BlockedTenantsClient({ initialTenants }: { initialTenants: BlockedTenant[] }) {
  const [tenants, setTenants] = useState<BlockedTenant[]>(initialTenants)
  const [slug, setSlug] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    const err = validateTenantSlug(slug)
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/blocked-tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setTenants(p => [data, ...p])
      setSlug('')
      setReason('')
      toast.success('Tenant bloqueado.')
    } catch { toast.error('Erro ao bloquear tenant.') }
    finally { setSaving(false) }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/admin/blocked-tenants/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao remover.'); return }
    setTenants(p => p.filter(t => t.id !== id))
    toast.success('Bloqueio removido.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenants bloqueados</h1>
        <p className="text-sm text-muted-foreground">
          Identificadores de tenant que não podem ser usados por nenhuma aplicação.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-lg">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldBan className="w-4 h-4 text-muted-foreground" /> Bloquear novo tenant</h3>
        <form onSubmit={handleAdd} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificador</label>
            <input type="text" maxLength={63} value={slug} placeholder="ex: admin, api, teste"
              onChange={e => { setSlug(slugify(e.target.value)); setError('') }}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo (opcional)</label>
            <input type="text" maxLength={300} value={reason} placeholder="Ex.: reservado para uso interno"
              onChange={e => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
          </div>
          <button type="submit" disabled={saving || !slug}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1a2f6b] hover:bg-[#152560] text-white rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
            <Plus className="w-3.5 h-3.5" /> {saving ? 'Bloqueando...' : 'Bloquear'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {tenants.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <ShieldBan className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Nenhum tenant bloqueado.
          </div>
        ) : tenants.map(t => (
          <div key={t.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <p className="font-mono font-medium text-sm">{t.slug}</p>
              <p className="text-xs text-muted-foreground">{t.reason || 'Sem motivo informado'}</p>
            </div>
            <button onClick={() => handleRemove(t.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
