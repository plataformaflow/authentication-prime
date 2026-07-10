'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, AppWindow, ArrowRight, Copy, Check, Building2, ChevronDown, ChevronRight, ArrowRightLeft, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { validateName, validateScopes, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { PageHeader } from '@/components/layout/page-header'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { ScopeBadge } from '@/components/dashboard/scope-badge'
import { Modal } from '@/components/ui/modal'
import { RedirectUriList } from '@/components/dashboard/redirect-uri-list'

const SCOPES = ['openid', 'profile', 'email']

interface CompanyInfo { id: string; name: string; logoUrl?: string | null; cnpj?: string | null; cpf?: string | null }
interface AppPerms { canViewAnalytics: boolean; canCreateUsers: boolean; maxUsers: number | null }
interface App {
  id: string; name: string; clientId: string; logoUrl?: string | null
  company: CompanyInfo; _count: { users: number }; scopes: string[]
  _role: 'owner' | 'collaborator'
  _permissions?: AppPerms
}
interface Company { id: string; name: string }
interface CollabInvite {
  id: string; toEmail: string; status: string; createdAt: string
  app: { id: string; name: string; logoUrl?: string | null; company: { id: string; name: string; logoUrl?: string | null } }
  fromOwner: { id: string; name: string; email: string }
}

type PageTab = 'apps' | 'invites'

function censureCPF(cpf: string) {
  // Format: 000.000.000-00 → ***.000.***-**
  const clean = cpf.replace(/[^\d]/g, '')
  if (clean.length !== 11) return cpf
  return `***.${clean.slice(3, 6)}.***-**`
}

export default function AppsPage() {
  const [tab, setTab] = useState<PageTab>('apps')
  const [apps, setApps] = useState<App[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [invites, setInvites] = useState<CollabInvite[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', companyId: '', redirectUris: [''] as string[], scopes: ['openid', 'profile'] as string[] })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [createdSecret, setCreatedSecret] = useState('')
  const [transferRequests, setTransferRequests] = useState<Array<{ id: string; appId: string; app: { id: string; name: string }; toCompany: { id: string; name: string }; requestedBy: { name: string; email: string } }>>([])

  useEffect(() => {
    fetch('/api/apps').then(r => r.json()).then(d => { if (Array.isArray(d)) setApps(d) })
    fetch('/api/companies').then(r => r.json()).then(d => { if (Array.isArray(d)) setCompanies(d.filter((c: { role: string }) => c.role === 'owner')) })
    fetch('/api/apps/transfer-requests').then(r => r.json()).then(d => { if (Array.isArray(d)) setTransferRequests(d) })
    fetch('/api/apps/invites').then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d) })
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

  async function handleTransferAction(appId: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/apps/${appId}/transfer`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    if (!res.ok) { toast.error('Erro ao processar solicitação.'); return }
    setTransferRequests(p => p.filter(r => r.appId !== appId))
    if (action === 'approve') {
      fetch('/api/apps').then(r => r.json()).then(d => { if (Array.isArray(d)) setApps(d) })
      toast.success('Transferência aprovada!')
    } else {
      toast.success('Transferência rejeitada.')
    }
  }

  async function handleInviteAction(inviteId: string, appId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/apps/${appId}/collaborators/invites/${inviteId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (!res.ok) { toast.error('Erro ao processar convite.'); return }
    setInvites(p => p.filter(i => i.id !== inviteId))
    if (action === 'accept') {
      fetch('/api/apps').then(r => r.json()).then(d => { if (Array.isArray(d)) setApps(d) })
      toast.success('Convite aceito! Você agora é colaborador.')
    } else {
      toast.success('Convite recusado.')
    }
  }

  function toggleScope(s: string) {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))
  }

  const ownerApps = apps.filter(a => a._role === 'owner')
  const collabApps = apps.filter(a => a._role === 'collaborator')

  const grouped = ownerApps.reduce<Record<string, { company: CompanyInfo; apps: App[] }>>((acc, app) => {
    const cid = app.company.id
    if (!acc[cid]) acc[cid] = { company: app.company, apps: [] }
    acc[cid].apps.push(app)
    return acc
  }, {})
  const groups = Object.values(grouped)
  const singleGroup = groups.length === 1

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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['apps', 'Aplicações'], ['invites', `Convites${invites.length > 0 ? ` (${invites.length})` : ''}`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'invites' ? (
        <InvitesTab invites={invites} onAction={handleInviteAction} />
      ) : (
        <>
          {/* Solicitações de transferência recebidas */}
          {transferRequests.length > 0 && (
            <div className="space-y-2">
              {transferRequests.map(req => (
                <div key={req.id} className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Solicitação de transferência</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <strong>{req.requestedBy.name}</strong> quer transferir <strong>{req.app.name}</strong> para <strong>{req.toCompany.name}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleTransferAction(req.appId, 'approve')}
                      className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                      Aprovar
                    </button>
                    <button onClick={() => handleTransferAction(req.appId, 'reject')}
                      className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-muted transition-colors">
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <AppWindow className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum app encontrado.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.length > 0 && (
                <div className="space-y-4">
                  {groups.map(({ company, apps: groupApps }) => (
                    <CompanyGroup key={company.id} company={company} apps={groupApps} defaultOpen={singleGroup && collabApps.length === 0} />
                  ))}
                </div>
              )}

              {collabApps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Associado</p>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{collabApps.length} app{collabApps.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {collabApps.map(app => <AppCard key={app.id} app={app} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

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
    </div>
  )
}

// ─── Company group header ─────────────────────────────────────────────────────

function CompanyGroup({ company, apps, defaultOpen }: { company: CompanyInfo; apps: App[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const doc = company.cnpj ? company.cnpj : company.cpf ? censureCPF(company.cpf) : null

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left group">
        {/* Company logo */}
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border bg-background flex items-center justify-center">
          {company.logoUrl
            ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
            : <Building2 className="w-4 h-4 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors truncate">{company.name}</p>
          {doc && <p className="text-[11px] text-muted-foreground font-mono">{company.cnpj ? `CNPJ ${doc}` : `CPF ${doc}`}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-muted-foreground bg-background border border-border rounded-full px-2.5 py-0.5">
            {apps.length} app{apps.length !== 1 ? 's' : ''}
          </span>
          <Link href={`/dashboard/companies/${company.id}`} onClick={e => e.stopPropagation()}
            className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block">
            Ver empresa →
          </Link>
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Apps grid */}
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {apps.map(app => <AppCard key={app.id} app={app} />)}
        </div>
      )}
    </div>
  )
}

// ─── App card ─────────────────────────────────────────────────────────────────

function AppCard({ app }: { app: App }) {
  const [copied, setCopied] = useState(false)
  const isCollab = app._role === 'collaborator'

  function copy() {
    navigator.clipboard.writeText(app.clientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 transition-colors ${isCollab ? 'border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-700' : 'border-border hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
      <div className="flex items-center gap-3">
        <AppAvatar name={app.name} logoUrl={app.logoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{app.name}</p>
            {isCollab && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">
                Associado
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{app._count.users} usuário{app._count.users !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {!isCollab && (
        <div className="bg-muted rounded-lg p-2.5 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client_ID</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-mono text-foreground truncate flex-1">{app.clientId}</p>
            <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {isCollab && app._permissions && (
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${app._permissions.canViewAnalytics ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground line-through'}`}>
            Análises
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${app._permissions.canCreateUsers ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'bg-muted text-muted-foreground line-through'}`}>
            Criar usuários{app._permissions.canCreateUsers && app._permissions.maxUsers ? ` (máx ${app._permissions.maxUsers})` : ''}
          </span>
        </div>
      )}

      {!isCollab && (
        <div className="flex flex-wrap gap-1">
          {app.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
        </div>
      )}

      <Link href={`/dashboard/apps/${app.id}`}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
        {isCollab ? 'Acessar' : 'Gerenciar'} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ─── Invites tab ──────────────────────────────────────────────────────────────

function InvitesTab({ invites, onAction }: {
  invites: CollabInvite[]
  onAction: (inviteId: string, appId: string, action: 'accept' | 'reject') => void
}) {
  if (invites.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum convite pendente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invites.map(invite => (
        <div key={invite.id} className="flex items-start gap-4 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 shrink-0">
            {/* Company logo */}
            <div className="w-9 h-9 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
              {invite.app.company.logoUrl
                ? <img src={invite.app.company.logoUrl} alt="" className="w-full h-full object-cover" />
                : <Building2 className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            {/* App logo */}
            <AppAvatar name={invite.app.name} logoUrl={invite.app.logoUrl} size="sm" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{invite.app.name}</p>
            <p className="text-xs text-muted-foreground truncate">{invite.app.company.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Convidado por <span className="font-medium text-foreground">{invite.fromOwner.name}</span>
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button onClick={() => onAction(invite.id, invite.app.id, 'accept')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar
            </button>
            <button onClick={() => onAction(invite.id, invite.app.id, 'reject')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Recusar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

