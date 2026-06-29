'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, AppWindow, ArrowRight, Copy, Check } from 'lucide-react'
import { validateName, validateScopes, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { PageHeader } from '@/components/layout/page-header'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { ScopeBadge } from '@/components/dashboard/scope-badge'
import { Modal } from '@/components/ui/modal'
import { RedirectUriList } from '@/components/dashboard/redirect-uri-list'

const SCOPES = ['openid', 'profile', 'email']

interface App { id: string; name: string; clientId: string; company: { name: string }; _count: { users: number }; scopes: string[] }
interface Company { id: string; name: string }

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', companyId: '', redirectUris: [''] as string[], scopes: ['openid', 'profile'] as string[] })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [createdSecret, setCreatedSecret] = useState('')

  useEffect(() => {
    fetch('/api/apps').then(r => r.json()).then(d => { if (Array.isArray(d)) setApps(d) })
    fetch('/api/companies').then(r => r.json()).then(d => { if (Array.isArray(d)) setCompanies(d.filter((c: { role: string }) => c.role === 'owner')) })
  }, [])

  function validate(): boolean {
    const e: FieldErrors = {}
    const nameErr = validateName(form.name, 'Nome do app')
    if (nameErr) e.name = nameErr
    if (!form.companyId) e.companyId = 'Selecione uma empresa.'
    const validUris = form.redirectUris.map(u => u.trim()).filter(Boolean)
    if (validUris.length === 0) e.redirectUris = 'Adicione ao menos uma URI de redirecionamento.'
    const scopeErr = validateScopes(form.scopes)
    if (scopeErr) e.scopes = scopeErr
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const redirectUris = form.redirectUris.map(u => u.trim()).filter(Boolean)
      const res = await fetch('/api/apps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, companyId: form.companyId, redirectUris, scopes: form.scopes }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setCreatedSecret(data.clientSecret)
      setApps(p => [data, ...p])
      setForm({ name: '', companyId: '', redirectUris: [''], scopes: ['openid', 'profile'] })
      setShowCreate(false)
    } catch { toast.error('Erro ao criar app.') }
    finally { setLoading(false) }
  }

  function toggleScope(s: string) {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aplicações"
        subtitle={`${apps.length} aplicaç${apps.length !== 1 ? 'ões' : 'ão'} cadastrada${apps.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => { setShowCreate(true); setCreatedSecret('') }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nova aplicação
          </button>
        }
      />

      {/* Modal: Client Secret recém-criado */}
      <Modal open={!!createdSecret} onClose={() => setCreatedSecret('')} title="App criado com sucesso!" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Salve o <strong>Client Secret</strong> agora. Ele não será exibido novamente.</p>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <code className="text-xs font-mono break-all text-amber-800 dark:text-amber-200">{createdSecret}</code>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(createdSecret); toast.success('Copiado!') }}
            className="w-full h-9 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
            Copiar Secret
          </button>
        </div>
      </Modal>

      {/* Modal: Nova aplicação */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}) }} title="Nova aplicação" description="Configure sua nova aplicação OAuth2">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <input type="text" maxLength={100} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Minha aplicação"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Empresa *</label>
            <select value={form.companyId} onChange={e => setForm(p => ({ ...p, companyId: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecionar...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {formErrors.companyId && <p className="text-xs text-destructive">{formErrors.companyId}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URIs de redirecionamento *</label>
            <RedirectUriList
              uris={form.redirectUris}
              onChange={uris => setForm(p => ({ ...p, redirectUris: uris }))}
              error={formErrors.redirectUris}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Escopos *</label>
            <div className="flex gap-4">
              {SCOPES.map(s => (
                <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded accent-indigo-600" />
                  {s}
                </label>
              ))}
            </div>
            {formErrors.scopes && <p className="text-xs text-destructive">{formErrors.scopes}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar aplicação'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormErrors({}) }}
              className="px-4 h-9 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>

      {apps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AppWindow className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum app encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {apps.map(app => <AppCard key={app.id} app={app} />)}
        </div>
      )}
    </div>
  )
}

function AppCard({ app }: { app: App }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(app.clientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
      <div className="flex items-center gap-3">
        <AppAvatar name={app.name} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{app.name}</p>
          <p className="text-xs text-muted-foreground truncate">{app.company?.name}</p>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-2.5 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client_ID</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-mono text-foreground truncate flex-1">{app.clientId}</p>
          <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {app.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
      </div>

      <Link href={`/dashboard/apps/${app.id}`}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
        Gerenciar <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
