'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Settings, Users, BarChart3, Copy, Check, RefreshCw, Trash2, CheckCircle2, XCircle,
  Users2, Zap, Plus, KeyRound, AlertTriangle, UserPlus, X, Mail, Shield,
  ArrowRightLeft, ImageIcon, Activity, Clock, Pencil, ChevronDown, Download, Globe, Eye, EyeOff,
  Webhook, Wand2,
} from 'lucide-react'
import { validateName, validateTenantSlug, slugify, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { ScopeBadge } from '@/components/dashboard/scope-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Modal } from '@/components/ui/modal'
import { RedirectUriList } from '@/components/dashboard/redirect-uri-list'

const SCOPES = ['openid', 'profile', 'email']

interface AppPerms { canViewAnalytics: boolean; canCreateUsers: boolean; canEditUsers: boolean; canDeleteUsers: boolean; maxUsers: number | null }
interface AppDetail {
  id: string; name: string; logoUrl?: string; description?: string
  clientId?: string; clientSecret?: string | null; scopes: string[]; redirectUris?: string[]
  tenantSlug?: string | null; applyTenantAfterLogin?: boolean; defaultRedirectUri?: string | null; tenantDomain?: string | null
  userWebhookEnabled?: boolean; userWebhookUrl?: string | null; userWebhookSecret?: string | null
  provisionalPasswordEnabled?: boolean
  provisionalPasswordDefault?: string | null
  company: { id: string; name: string }; createdAt: string
  _access: 'full' | 'collaborator'
  _permissions?: AppPerms
}
type Tab = 'analytics' | 'profile' | 'api' | 'users' | 'collaborators' | 'activity'
type AnalyticsData = { loginSuccess: number; loginFailed: number; tokenIssued: number; activeUsers: number; totalUsers: number; successRate: number }

export function AppDetailClient({ id, initialApp, initialAnalytics }: {
  id: string
  initialApp: AppDetail
  initialAnalytics: AnalyticsData | null
}) {
  const router = useRouter()
  const [app, setApp] = useState<AppDetail>(initialApp)
  const [tab, setTab] = useState<Tab>('analytics')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function handleDelete() {
    const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir.'); return }
    toast.success('App excluído.')
    router.push('/dashboard/apps')
  }

  const isFull = app._access === 'full'
  const perms = app._permissions ?? { canViewAnalytics: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: true, maxUsers: null }

  const tabs: [Tab, string, React.ElementType][] = [
    ...(isFull || perms.canViewAnalytics ? [['analytics', 'Análises', BarChart3] as [Tab, string, React.ElementType]] : []),
    ['profile', 'Perfil', ImageIcon] as [Tab, string, React.ElementType],
    ...(isFull ? [['api', 'API', KeyRound] as [Tab, string, React.ElementType]] : []),
    ['users', 'Usuários', Users] as [Tab, string, React.ElementType],
    ...(isFull ? [
      ['collaborators', 'Colaboradores', UserPlus] as [Tab, string, React.ElementType],
      ['activity', 'Atividade', Activity] as [Tab, string, React.ElementType],
    ] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/dashboard/apps" className="hover:text-foreground transition-colors">Aplicações</Link>
          <span>/</span>
          <span className="text-foreground">{app.name}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppAvatar name={app.name} logoUrl={app.logoUrl} size="lg" />
            <div>
              <h1 className="text-2xl font-bold">{app.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{app.company.name}</span>
                <span className="text-muted-foreground">·</span>
                <div className="flex gap-1">
                  {app.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
                </div>
                {app.description && <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-xs">{app.description}</span>}
              </div>
            </div>
          </div>
          {isFull && (
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' && <AppAnalyticsTab appId={id} initialData={initialAnalytics} />}
      {tab === 'profile' && <AppProfileTab app={app} onUpdate={setApp} />}
      {tab === 'api' && isFull && <AppApiTab app={app} onUpdate={setApp} />}
      {tab === 'users' && (
        <AppUsersTab appId={id} canCreate={isFull || perms.canCreateUsers} canEdit={isFull || perms.canEditUsers} canDelete={isFull || perms.canDeleteUsers} maxUsers={isFull ? null : perms.maxUsers}
          provisionalPasswordEnabled={app.provisionalPasswordEnabled ?? false} />
      )}
      {tab === 'collaborators' && isFull && <AppCollaboratorsTab appId={id} />}
      {tab === 'activity' && isFull && <AppActivityTab appId={id} appName={app.name} />}
      {tab === 'api' && isFull && (
        <AppTransferSection appId={id} currentCompanyId={app.company.id} currentCompanyName={app.company.name}
          onTransferred={(newCompany) => setApp(p => p ? { ...p, company: newCompany } : p)} />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          name={app.name}
          label="aplicação"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}

// ─── Delete Confirm Modal ────────────────────────────────────────────────────

function DeleteConfirmModal({ name, label, onConfirm, onClose }: {
  name: string; label: string
  onConfirm: () => void; onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-destructive" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Excluir {label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Esta ação é <strong>irreversível</strong>. Todos os dados serão perdidos.</p>
            </div>
          </div>

          {step === 1 ? (
            <>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-medium text-destructive">O que será excluído:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  {label === 'aplicação' ? (
                    <>
                      <li>Todos os usuários da aplicação</li>
                      <li>Tokens, códigos e sessões ativas</li>
                      <li>Colaboradores e convites</li>
                      <li>Histórico de atividade</li>
                    </>
                  ) : (
                    <>
                      <li>Todas as aplicações da empresa</li>
                      <li>Todos os usuários dessas aplicações</li>
                      <li>Membros e convites da empresa</li>
                      <li>Histórico de atividade</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)}
                  className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-medium transition-colors">
                  Continuar
                </button>
                <button onClick={onClose}
                  className="px-4 h-10 rounded-xl border border-border text-sm hover:bg-muted transition-all">
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Para confirmar, digite o nome da {label}:
                </p>
                <p className="text-sm font-semibold text-foreground bg-muted rounded-lg px-3 py-2 font-mono">{name}</p>
                <input
                  autoFocus
                  type="text"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder={`Digite "${name}"`}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  disabled={typed !== name || confirming}
                  className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {confirming ? 'Excluindo...' : `Excluir ${label}`}
                </button>
                <button onClick={onClose}
                  className="px-4 h-10 rounded-xl border border-border text-sm hover:bg-muted transition-all">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Tab ────────────────────────────────────────────────────────────

function AppProfileTab({ app, onUpdate }: { app: AppDetail; onUpdate: (a: AppDetail) => void }) {
  const [form, setForm] = useState({ name: app.name, logoUrl: app.logoUrl ?? '', description: app.description ?? '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    const e: FieldErrors = {}
    const nameErr = validateName(form.name, 'Nome')
    if (nameErr) e.name = nameErr
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), logoUrl: form.logoUrl.trim(), description: form.description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...app, name: data.name, logoUrl: data.logoUrl, description: data.description })
      toast.success('Perfil atualizado!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-muted-foreground" /> Perfil da aplicação</h3>

        {/* Preview */}
        <div className="flex items-center gap-4 p-3 bg-muted rounded-xl">
          <AppAvatar name={form.name || app.name} logoUrl={form.logoUrl || undefined} size="lg" />
          <div>
            <p className="font-semibold text-sm">{form.name || '(sem nome)'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{form.description || 'Sem descrição'}</p>
          </div>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome *</label>
            <input type="text" maxLength={100} value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL do logotipo</label>
            <input type="url" maxLength={500} value={form.logoUrl} placeholder="https://..."
              onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</label>
            <textarea maxLength={500} rows={3} value={form.description} placeholder="Descrição da aplicação..."
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            <span className="text-xs text-muted-foreground">{form.description.length}/500</span>
          </div>
          <button type="submit" disabled={saving}
            className="w-full h-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── API Tab ─────────────────────────────────────────────────────────────────

function AppApiTab({ app, onUpdate }: { app: AppDetail; onUpdate: (a: AppDetail) => void }) {
  const [form, setForm] = useState({
    redirectUris: (app.redirectUris ?? []).length > 0 ? app.redirectUris! : [''],
    scopes: app.scopes,
  })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  function toggleScope(s: string) {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))
  }

  function copyClientId() {
    navigator.clipboard.writeText(app.clientId ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copySecretValue() {
    if (!app.clientSecret) return
    navigator.clipboard.writeText(app.clientSecret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  async function handleRotate() {
    if (!confirm('Rotacionar o Client Secret invalidará integrações existentes. Continuar?')) return
    const res = await fetch(`/api/apps/${app.id}/rotate-secret`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error('Erro ao rotacionar.'); return }
    onUpdate({ ...app, clientSecret: data.clientSecret })
    toast.success('Secret rotacionado!')
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    const e: FieldErrors = {}
    const validUris = form.redirectUris.map(u => u.trim()).filter(Boolean)
    if (validUris.length === 0) e.redirectUris = 'Adicione ao menos uma URI de redirecionamento.'
    setFormErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUris: validUris, scopes: form.scopes }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...app, redirectUris: data.redirectUris, scopes: data.scopes })
      toast.success('Configurações de API salvas!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Credentials */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-muted-foreground" /> Credenciais</h3>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Client ID</label>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <code className="text-sm font-mono text-foreground flex-1 truncate">{app.clientId}</code>
            <button onClick={copyClientId} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Client Secret</label>
          {app.clientSecret ? (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <code className="text-sm font-mono text-foreground flex-1 break-all">{app.clientSecret}</code>
              <button onClick={copySecretValue} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                {secretCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Token gerado antes desta atualização — rotacione para poder visualizá-lo aqui.</p>
          )}
        </div>
        <button onClick={handleRotate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Rotacionar Client Secret
        </button>
      </div>

      {/* API settings */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" /> Configurações de API</h3>
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URIs de redirecionamento</label>
            <RedirectUriList
              uris={form.redirectUris}
              onChange={uris => setForm(p => ({ ...p, redirectUris: uris }))}
              clientId={app.clientId}
              scopes={form.scopes}
              error={formErrors.redirectUris}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Escopos</label>
            <div className="flex gap-3">
              {SCOPES.map(s => (
                <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded accent-indigo-600" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-sm transition-all disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      </div>

      <AppTenantSection app={app} onUpdate={onUpdate} />
      <AppUserWebhookSection app={app} onUpdate={onUpdate} />
      <AppProvisionalPasswordSection app={app} onUpdate={onUpdate} />
    </div>
  )
}

// ─── User Webhook Section ────────────────────────────────────────────────────
// Notifica um sistema externo (hoje só o Prime Visita) sempre que um AppUser
// é criado nesta aplicação — desativado por padrão, só pode ser ativado com
// tenant + URL + token já definidos (ver validação equivalente em
// api/apps/[id]/route.ts).

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function AppUserWebhookSection({ app, onUpdate }: { app: AppDetail; onUpdate: (a: AppDetail) => void }) {
  const [enabled, setEnabled] = useState(app.userWebhookEnabled ?? false)
  const [url, setUrl] = useState(app.userWebhookUrl ?? '')
  const [secret, setSecret] = useState(app.userWebhookSecret ?? '')
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const hasTenant = !!app.tenantSlug
  // Reflete o que está SALVO (não o rascunho do formulário) — sincronizar
  // deve usar a configuração já ativa, não uma edição ainda não confirmada.
  const canSync = !!app.tenantSlug && !!app.userWebhookEnabled && !!app.userWebhookUrl && !!app.userWebhookSecret

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (enabled && !hasTenant) { setError('Defina um identificador de tenant antes de ativar essa opção.'); return }
    if (enabled && (!url || !secret)) { setError('Informe a URL e o token antes de ativar.'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWebhookEnabled: enabled, userWebhookUrl: url, userWebhookSecret: secret }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...app, userWebhookEnabled: data.userWebhookEnabled, userWebhookUrl: data.userWebhookUrl, userWebhookSecret: data.userWebhookSecret })
      toast.success('Webhook de usuários salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/apps/${app.id}/sync-users-webhook`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success(`${data.synced} de ${data.total} usuário(s) sincronizado(s).`)
    } catch { toast.error('Erro ao sincronizar.') }
    finally { setSyncing(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Webhook className="w-4 h-4 text-muted-foreground" /> Webhook de usuários</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Notifica automaticamente a URL abaixo sempre que um usuário novo é criado nesta aplicação. Não é um webhook
        público — não aparece em nenhuma documentação, é uma integração interna só entre esta aplicação e o sistema
        de destino.
      </p>
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={enabled}
            onChange={e => { setEnabled(e.target.checked); setError('') }}
            className="mt-0.5 rounded accent-indigo-600" />
          <span>
            <span className="font-medium">Enviar novos usuários automaticamente</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Desativado por padrão.</span>
          </span>
        </label>
        {!hasTenant && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Defina um identificador de tenant (acima) antes de ativar.
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL do webhook</label>
          <input type="url" value={url} placeholder="https://seu-dominio.com/api/webhooks/..."
            onChange={e => { setUrl(e.target.value.trim()); setError('') }}
            className="w-full h-10 px-3 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token de segurança</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type={showSecret ? 'text' : 'password'} value={secret} placeholder="Token enviado como Authorization: Bearer"
                onChange={e => { setSecret(e.target.value.trim()); setError('') }}
                className="w-full h-10 px-3 pr-9 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
              <button type="button" onClick={() => setShowSecret(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button type="button" onClick={() => { setSecret(generateWebhookSecret()); setShowSecret(true); setError('') }}
              title="Gerar token aleatório"
              className="shrink-0 flex items-center gap-1.5 px-3 h-10 text-xs border border-input rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Wand2 className="w-3.5 h-3.5" /> Gerar
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-sm transition-all disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar webhook'}
          </button>
          <button type="button" onClick={handleSync} disabled={syncing || !canSync}
            title={!canSync ? 'Salve o webhook ativado, com URL e token, primeiro.' : undefined}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizando...' : 'Sincronizar usuários'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Provisional Password Section ────────────────────────────────────────────

function AppProvisionalPasswordSection({ app, onUpdate }: { app: AppDetail; onUpdate: (a: AppDetail) => void }) {
  const [enabled, setEnabled] = useState(app.provisionalPasswordEnabled ?? false)
  const [defaultPassword, setDefaultPassword] = useState(app.provisionalPasswordDefault ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (enabled && (!defaultPassword || defaultPassword.length < 8)) {
      setError('Defina uma senha provisória padrão com ao menos 8 caracteres antes de ativar.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provisionalPasswordEnabled: enabled, provisionalPasswordDefault: defaultPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...app, provisionalPasswordEnabled: data.provisionalPasswordEnabled, provisionalPasswordDefault: data.provisionalPasswordDefault })
      toast.success('Configuração salva!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-muted-foreground" /> Senha provisória</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Quando ativado, o botão &quot;Reset senha&quot; na aba &quot;Usuários&quot; passa a aplicar a senha provisória padrão abaixo
        diretamente ao usuário, em vez de gerar um link. No próximo login, a tela de autenticação avisa o usuário e oferece a
        opção de definir uma senha definitiva na hora, ou adiar para depois.
      </p>
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={enabled}
            onChange={e => { setEnabled(e.target.checked); setError('') }}
            className="mt-0.5 rounded accent-indigo-600" />
          <span>
            <span className="font-medium">Ativar senha provisória</span>
            <span className="block text-xs text-muted-foreground mt-0.5">Desativado por padrão.</span>
          </span>
        </label>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Senha provisória padrão</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} maxLength={128} value={defaultPassword}
              placeholder="Ao menos 8 caracteres"
              onChange={e => { setDefaultPassword(e.target.value); setError('') }}
              className="w-full h-10 px-3 pr-9 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-sm transition-all disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}

// ─── Tenant Section ──────────────────────────────────────────────────────────

function AppTenantSection({ app, onUpdate }: { app: AppDetail; onUpdate: (a: AppDetail) => void }) {
  const [tenantSlug, setTenantSlug] = useState(app.tenantSlug ?? '')
  const [applyTenantAfterLogin, setApplyTenantAfterLogin] = useState(app.applyTenantAfterLogin ?? false)
  const [defaultRedirectUri, setDefaultRedirectUri] = useState(app.defaultRedirectUri ?? '')
  const [tenantDomain, setTenantDomain] = useState(app.tenantDomain ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const redirectUris = app.redirectUris ?? []

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    const slugErr = validateTenantSlug(tenantSlug)
    if (slugErr) { setError(slugErr); return }
    if (applyTenantAfterLogin && !tenantSlug) { setError('Defina um identificador de tenant antes de ativar essa opção.'); return }
    if (defaultRedirectUri && !redirectUris.includes(defaultRedirectUri)) { setError('O URI padrão precisa ser uma das URIs de redirecionamento cadastradas.'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug, applyTenantAfterLogin, defaultRedirectUri, tenantDomain }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...app, tenantSlug: data.tenantSlug, applyTenantAfterLogin: data.applyTenantAfterLogin, defaultRedirectUri: data.defaultRedirectUri, tenantDomain: data.tenantDomain })
      setDefaultRedirectUri(data.defaultRedirectUri ?? '')
      setTenantDomain(data.tenantDomain ?? '')
      toast.success('Configurações de tenant salvas!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> Tenant</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Defina um identificador único de tenant para esta aplicação. Ele pode ser aplicado como subdomínio no redirecionamento após o login.
      </p>
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificador do tenant</label>
          <input type="text" maxLength={63} value={tenantSlug} placeholder="minha-empresa"
            onChange={e => { setTenantSlug(slugify(e.target.value)); setError('') }}
            className="w-full h-10 px-3 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {tenantSlug && !error && (
            <p className="text-xs text-muted-foreground">Prévia: <code className="font-mono">{tenantSlug}.{tenantDomain || 'suaaplicacao.com'}</code></p>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={applyTenantAfterLogin}
            onChange={e => setApplyTenantAfterLogin(e.target.checked)}
            className="mt-0.5 rounded accent-indigo-600" />
          <span>
            <span className="font-medium">Aplicar tenant após login</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Após um login bem-sucedido em uma das URIs de redirecionamento definidas, o usuário será redirecionado com o tenant aplicado como subdomínio.
            </span>
          </span>
        </label>

        <div className="space-y-1.5 pt-1 border-t border-border">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 block">Domínio para o tenant</label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Domínio-base onde o tenant é aplicado (ex.: <code className="font-mono">primevisita.com.br</code> → <code className="font-mono">teste.primevisita.com.br</code>).
            Deixe em branco para usar o host da URI de redirecionamento padrão — mas isso produz resultado errado se esse host já tiver seu próprio subdomínio
            (ex.: <code className="font-mono">app.primevisita.com.br</code> viraria <code className="font-mono">teste.app.primevisita.com.br</code>). Defina aqui sempre que a aplicação viver num subdomínio fixo.
          </p>
          <input type="text" maxLength={253} value={tenantDomain} placeholder="primevisita.com.br"
            onChange={e => { setTenantDomain(e.target.value.trim().toLowerCase()); setError('') }}
            className="w-full h-10 px-3 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
        </div>

        <div className="space-y-1.5 pt-1 border-t border-border">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 block">URI de redirecionamento padrão</label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Usada quando alguém acessa o link de login pelo tenant, sem informar os parâmetros de OAuth2 manualmente.
          </p>
          <select value={defaultRedirectUri}
            onChange={e => { setDefaultRedirectUri(e.target.value); setError('') }}
            disabled={redirectUris.length === 0}
            className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all disabled:opacity-60">
            <option value="">Nenhuma</option>
            {redirectUris.map(uri => <option key={uri} value={uri}>{uri}</option>)}
          </select>
          {tenantSlug && defaultRedirectUri && (
            <p className="text-xs text-muted-foreground">
              Link de login: <code className="font-mono break-all">/oauth2/{tenantSlug}</code>
            </p>
          )}
        </div>

        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-sm transition-all disabled:opacity-60">
          {saving ? 'Salvando...' : 'Salvar tenant'}
        </button>
      </form>
    </div>
  )
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

type AppUser = { id: string; name: string; username: string; mustChangePassword: boolean; createdAt: string; createdByOwner?: { id: string; name: string } | null }

function AppUsersTab({ appId, canCreate, canEdit, canDelete, maxUsers, provisionalPasswordEnabled }: { appId: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; maxUsers: number | null; provisionalPasswordEnabled: boolean }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [editForm, setEditForm] = useState({ name: '', username: '' })
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [editLoading, setEditLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [provisionalOnCreate, setProvisionalOnCreate] = useState(false)
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [resetResult, setResetResult] = useState<{ type: 'link' | 'provisional'; value: string; userName: string } | null>(null)
  const [resetResultCopied, setResetResultCopied] = useState(false)

  useEffect(() => { fetch(`/api/apps/${appId}/users`).then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d) }) }, [appId])

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    const e: FieldErrors = {}
    if (!form.name.trim() || form.name.length < 2) e.name = 'Nome deve ter ao menos 2 caracteres.'
    if (!form.username.trim() || form.username.length < 3) e.username = 'Usuário deve ter ao menos 3 caracteres.'
    if (!form.password || form.password.length < 8) e.password = 'Senha deve ter ao menos 8 caracteres.'
    setFormErrors(e)
    if (Object.keys(e).length > 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/apps/${appId}/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, provisionalPassword: provisionalOnCreate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Usuário criado!')
      setUsers(p => [data, ...p])
      setShowCreate(false)
      setForm({ name: '', username: '', password: '' })
      setProvisionalOnCreate(false)
    } catch { toast.error('Erro ao criar usuário.') }
    finally { setLoading(false) }
  }

  async function handleDelete(userId: string) {
    const res = await fetch(`/api/apps/${appId}/users/${userId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir usuário.'); return }
    toast.success('Usuário excluído.')
    setUsers(p => p.filter(u => u.id !== userId))
  }

  function openEdit(u: AppUser) {
    setEditUser(u)
    setEditForm({ name: u.name, username: u.username })
    setEditErrors({})
  }

  async function handleEdit(ev: React.FormEvent) {
    ev.preventDefault()
    const e: FieldErrors = {}
    if (!editForm.name.trim() || editForm.name.length < 2) e.name = 'Nome deve ter ao menos 2 caracteres.'
    if (!editForm.username.trim() || editForm.username.length < 3) e.username = 'Usuário deve ter ao menos 3 caracteres.'
    setEditErrors(e)
    if (Object.keys(e).length) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/apps/${appId}/users/${editUser!.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, username: editForm.username }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setUsers(p => p.map(u => u.id === editUser!.id ? { ...u, name: data.name, username: data.username } : u))
      toast.success('Usuário atualizado.')
      setEditUser(null)
    } catch { toast.error('Erro ao editar usuário.') }
    finally { setEditLoading(false) }
  }

  async function handleResetPassword(userId: string, userName: string) {
    const res = await fetch(`/api/apps/${appId}/users/${userId}/reset-password`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(apiErrorMessage(data, 'Erro ao redefinir senha.')); return }
    if (data.provisional) {
      setUsers(p => p.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u))
      setResetResult({ type: 'provisional', value: data.password, userName })
    } else {
      setResetResult({ type: 'link', value: data.link, userName })
    }
    setResetResultCopied(false)
  }

  const atLimit = maxUsers !== null && users.length >= maxUsers

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} usuário{users.length !== 1 ? 's' : ''}
          {maxUsers !== null && <span className="ml-1 text-xs">/ limite: {maxUsers}</span>}
        </p>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} disabled={atLimit}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> Novo usuário
          </button>
        )}
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}) }} title="Novo usuário" description="Crie um usuário para esta aplicação" size="sm">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          {([{ key: 'name', label: 'Nome completo', type: 'text', max: 100, placeholder: 'João Silva' }, { key: 'username', label: 'Usuário', type: 'text', max: 30, placeholder: 'joaosilva' }, { key: 'password', label: 'Senha', type: 'password', max: 128, placeholder: '••••••••' }] as const).map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium">{f.label}</label>
              <input type={f.type} maxLength={f.max} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: f.key === 'username' ? e.target.value.toLowerCase() : e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
              {formErrors[f.key] && <p className="text-xs text-destructive">{formErrors[f.key]}</p>}
            </div>
          ))}
          {provisionalPasswordEnabled && (
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={provisionalOnCreate}
                onChange={e => setProvisionalOnCreate(e.target.checked)}
                className="mt-0.5 rounded accent-indigo-600" />
              <span>
                <span className="font-medium">Senha provisória</span>
                <span className="block text-xs text-muted-foreground mt-0.5">O usuário verá um aviso no login e poderá definir uma senha definitiva.</span>
              </span>
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 h-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormErrors({}); setProvisionalOnCreate(false) }}
              className="px-4 h-10 text-sm border border-border rounded-xl hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetResult} onClose={() => setResetResult(null)}
        title={resetResult?.type === 'provisional' ? 'Senha provisória definida' : 'Link de redefinição de senha'}
        description={resetResult ? `Para ${resetResult.userName}` : ''} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {resetResult?.type === 'provisional'
              ? <>Informe esta senha ao usuário. No próximo login, ele verá o aviso de senha provisória e poderá definir uma senha definitiva.</>
              : <>Copie o link e envie para o usuário. Expira em <strong className="text-foreground">24 horas</strong> e só pode ser usado uma vez.</>}
          </p>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs font-mono break-all text-foreground leading-relaxed select-all">{resetResult?.value}</p>
          </div>
          <button onClick={() => { if (!resetResult) return; navigator.clipboard.writeText(resetResult.value); setResetResultCopied(true); setTimeout(() => setResetResultCopied(false), 2000) }}
            className={`w-full h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${resetResultCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {resetResultCopied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> {resetResult?.type === 'provisional' ? 'Copiar senha' : 'Copiar link'}</>}
          </button>
        </div>
      </Modal>

      {/* Edit user modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Editar usuário" size="sm">
        <form onSubmit={handleEdit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <input type="text" maxLength={100} value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Usuário</label>
            <input type="text" maxLength={30} value={editForm.username}
              onChange={e => setEditForm(p => ({ ...p, username: e.target.value.toLowerCase() }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all" />
            {editErrors.username && <p className="text-xs text-destructive">{editErrors.username}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={editLoading}
              className="flex-1 h-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60">
              {editLoading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setEditUser(null)}
              className="px-4 h-10 text-sm border border-border rounded-xl hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {users.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Nenhum usuário
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">Usuário</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">Criado por</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2.5">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                          {u.mustChangePassword && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Senha provisória</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {u.createdByOwner ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Pencil className="w-3 h-3" /> {u.createdByOwner.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button onClick={() => openEdit(u)}
                              className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Editar
                            </button>
                          )}
                          {(canEdit || canDelete) && (
                            <button onClick={() => handleResetPassword(u.id, u.name)}
                              className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-muted transition-colors">
                              Reset senha
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(u.id)}
                              className="text-xs px-2.5 py-1 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-sm font-bold shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    {u.mustChangePassword && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">Senha provisória</span>
                    )}
                  </div>
                  {u.createdByOwner && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Criado por {u.createdByOwner.name}
                    </p>
                  )}
                  {(canEdit || canDelete) && (
                    <div className="flex flex-wrap gap-2">
                      {canEdit && (
                        <button onClick={() => openEdit(u)}
                          className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                      )}
                      {(canEdit || canDelete) && (
                        <button onClick={() => handleResetPassword(u.id, u.name)}
                          className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">
                          Reset senha
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(u.id)}
                          className="text-xs px-3 py-1.5 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Collaborators Tab ───────────────────────────────────────────────────────

type CollabEntry = {
  id: string
  canViewAnalytics: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  maxUsers: number | null
  owner: { id: string; name: string; email: string }
}

function AppCollaboratorsTab({ appId }: { appId: string }) {
  const [collaborators, setCollaborators] = useState<CollabEntry[]>([])
  const [invites, setInvites] = useState<Array<{ id: string; toEmail: string; createdAt: string }>>([])
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/apps/${appId}/collaborators`).then(r => r.json()).then(d => {
      if (d.collaborators) setCollaborators(d.collaborators)
      if (d.invites) setInvites(d.invites)
    })
  }, [appId])

  async function handleInvite(ev: React.FormEvent) {
    ev.preventDefault()
    if (!email.includes('@')) { setEmailError('E-mail inválido.'); return }
    setEmailError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/apps/${appId}/collaborators`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setInvites(p => [data.invite, ...p.filter(i => i.id !== data.invite.id)])
      toast.success('Convite enviado! O colaborador precisa aceitar antes de ter acesso.')
      setEmail('')
    } catch { toast.error('Erro ao convidar.') }
    finally { setLoading(false) }
  }

  async function handleRemove(entryId: string, isInvite: boolean) {
    const res = await fetch(`/api/apps/${appId}/collaborators/${entryId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao remover.'); return }
    if (isInvite) setInvites(p => p.filter(i => i.id !== entryId))
    else setCollaborators(p => p.filter(c => c.id !== entryId))
    toast.success(isInvite ? 'Convite cancelado.' : 'Colaborador removido.')
  }

  async function handlePatchPerm(collabId: string, patch: Partial<Pick<CollabEntry, 'canViewAnalytics' | 'canCreateUsers' | 'canEditUsers' | 'canDeleteUsers' | 'maxUsers'>>) {
    const res = await fetch(`/api/apps/${appId}/collaborators/${collabId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(apiErrorMessage(data)); return }
    setCollaborators(p => p.map(c => c.id === collabId ? { ...c, ...data } : c))
    toast.success('Permissões atualizadas.')
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Convidar colaborador</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Colaboradores podem gerenciar usuários e renomear esta aplicação. Configure as permissões individualmente abaixo.
        </p>
        <form onSubmit={handleInvite} noValidate className="flex gap-2">
          <input type="email" placeholder="e-mail do colaborador" maxLength={255} value={email}
            onChange={e => { setEmail(e.target.value); setEmailError('') }}
            className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 px-3 h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
            <UserPlus className="w-3.5 h-3.5" /> {loading ? '...' : 'Convidar'}
          </button>
        </form>
        {emailError && <p className="text-xs text-destructive">{emailError}</p>}
      </div>

      {collaborators.length > 0 && (
        <div className="space-y-2">
          {collaborators.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-bold shrink-0">
                    {c.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.owner.name}</p>
                    <p className="text-xs text-muted-foreground">{c.owner.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditId(editId === c.id ? null : c.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleRemove(c.id, false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Permission badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.canViewAnalytics ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground line-through'}`}>
                  Análises
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.canCreateUsers ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'bg-muted text-muted-foreground line-through'}`}>
                  Criar usuários{c.canCreateUsers && c.maxUsers ? ` (máx ${c.maxUsers})` : ''}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.canEditUsers ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400' : 'bg-muted text-muted-foreground line-through'}`}>
                  Editar usuários
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.canDeleteUsers ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-muted text-muted-foreground line-through'}`}>
                  Excluir usuários
                </span>
              </div>

              {/* Inline permission editor */}
              {editId === c.id && (
                <CollabPermEditor collab={c} onSave={patch => { handlePatchPerm(c.id, patch); setEditId(null) }} onCancel={() => setEditId(null)} />
              )}
            </div>
          ))}
        </div>
      )}

      {invites.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">Convites pendentes</div>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{inv.toEmail}</p>
                  <p className="text-xs text-muted-foreground">Aguardando aceitação</p>
                </div>
              </div>
              <button onClick={() => handleRemove(inv.id, true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {collaborators.length === 0 && invites.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <UserPlus className="w-6 h-6 mx-auto mb-2 opacity-30" />
          Nenhum colaborador ainda.
        </div>
      )}
    </div>
  )
}

function CollabPermEditor({ collab, onSave, onCancel }: {
  collab: CollabEntry
  onSave: (patch: Partial<Pick<CollabEntry, 'canViewAnalytics' | 'canCreateUsers' | 'canEditUsers' | 'canDeleteUsers' | 'maxUsers'>>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    canViewAnalytics: collab.canViewAnalytics ?? true,
    canCreateUsers: collab.canCreateUsers ?? false,
    canEditUsers: collab.canEditUsers ?? false,
    canDeleteUsers: collab.canDeleteUsers ?? false,
    maxUsers: collab.maxUsers?.toString() ?? '',
  })

  function handleSave() {
    onSave({
      canViewAnalytics: form.canViewAnalytics,
      canCreateUsers: form.canCreateUsers,
      canEditUsers: form.canEditUsers,
      canDeleteUsers: form.canDeleteUsers,
      maxUsers: form.canCreateUsers && form.maxUsers ? parseInt(form.maxUsers) : null,
    })
  }

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissões</p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.canViewAnalytics} onChange={e => setForm(p => ({ ...p, canViewAnalytics: e.target.checked }))} className="rounded accent-indigo-600" />
        Pode ver análises
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.canCreateUsers} onChange={e => setForm(p => ({ ...p, canCreateUsers: e.target.checked, maxUsers: e.target.checked ? p.maxUsers : '' }))} className="rounded accent-indigo-600" />
        Pode criar usuários
      </label>
      {form.canCreateUsers && (
        <div className="flex items-center gap-2 pl-6">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Limite de usuários</label>
          <input type="number" min={1} max={100000} value={form.maxUsers}
            onChange={e => setForm(p => ({ ...p, maxUsers: e.target.value }))}
            placeholder="Sem limite"
            className="w-28 h-8 px-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.canEditUsers} onChange={e => setForm(p => ({ ...p, canEditUsers: e.target.checked }))} className="rounded accent-indigo-600" />
        Pode editar usuários (nome e usuário)
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.canDeleteUsers} onChange={e => setForm(p => ({ ...p, canDeleteUsers: e.target.checked }))} className="rounded accent-indigo-600" />
        Pode excluir usuários
      </label>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave}
          className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
          Salvar
        </button>
        <button onClick={onCancel}
          className="px-3 h-8 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Activity Tab ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  'user.create':           'Criou usuário',
  'user.delete':           'Excluiu usuário',
  'user.update':           'Editou usuário',
  'user.reset_password':   'Resetou senha de',
  'app.rename':            'Renomeou app',
  'app.update':            'Atualizou configurações',
  'collaborator.add':      'Adicionou colaborador',
  'collaborator.remove':   'Removeu colaborador',
}


type AuditLog = {
  id: string
  action: string
  targetId?: string | null
  targetName?: string | null
  meta?: string | null
  actor: { id: string; name: string; email: string }
  createdAt: string
}

type AuditActor = { id: string; name: string }

function buildDetails(log: AuditLog): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  rows.push({ label: 'Ação', value: ACTION_LABELS[log.action] ?? log.action })
  rows.push({ label: 'Ator', value: `${log.actor.name} (${log.actor.email})` })
  if (log.targetName) rows.push({ label: 'Alvo', value: log.targetName })
  if (log.targetId)   rows.push({ label: 'ID do alvo', value: log.targetId })
  try {
    if (log.meta) {
      const m = JSON.parse(log.meta) as Record<string, unknown>
      if (m.username)  rows.push({ label: 'Username', value: String(m.username) })
      if (m.email)     rows.push({ label: 'E-mail', value: String(m.email) })
      if (m.fields && Array.isArray(m.fields)) {
        const fieldLabels: Record<string, string> = { name: 'nome', username: 'username', mustChangePassword: 'trocar senha' }
        rows.push({ label: 'Campos alterados', value: (m.fields as string[]).map(f => fieldLabels[f] ?? f).join(', ') })
      }
      if (m.permanent) rows.push({ label: 'Exclusão', value: 'Permanente — todos os tokens e sessões foram revogados' })
    }
  } catch { /* meta not JSON */ }
  return rows
}

function ActivityRow({ log, forceOpen }: { log: AuditLog; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false)
  const isOpen = forceOpen ?? open
  const label  = ACTION_LABELS[log.action] ?? log.action
  const when   = new Date(log.createdAt)
  const details = buildDetails(log)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground mb-1">
            {label}
          </span>
          <p className="text-sm font-medium">
            {log.actor.name}
            {log.targetName && <span className="text-muted-foreground font-normal"> → <span className="font-medium text-foreground">{log.targetName}</span></span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {when.toLocaleDateString('pt-BR')} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 mt-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-3 ml-0 border-t border-border/60 bg-muted/20">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-3">
            {details.map(({ label: l, value }) => (
              <div key={l}>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</dt>
                <dd className="text-sm text-foreground break-all">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data e hora</dt>
              <dd className="text-sm text-foreground">
                {when.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às{' '}
                {when.toLocaleTimeString('pt-BR')}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

function AppActivityTab({ appId, appName }: { appId: string; appName: string }) {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [actors,  setActors]  = useState<AuditActor[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf')
  const [exportDetailed, setExportDetailed] = useState(false)

  const [filters, setFilters] = useState({ from: '', to: '', actorId: '', action: '' })

  function buildQuery(extra?: Record<string, string>) {
    const p = new URLSearchParams()
    const f = { ...filters, ...extra }
    if (f.from)    p.set('from',    f.from)
    if (f.to)      p.set('to',      f.to)
    if (f.actorId) p.set('actorId', f.actorId)
    if (f.action)  p.set('action',  f.action)
    return p.toString() ? `?${p}` : ''
  }

  function load() {
    setLoading(true)
    fetch(`/api/apps/${appId}/audit${buildQuery()}`)
      .then(r => r.json())
      .then(d => {
        if (d.logs)   setLogs(d.logs)
        if (d.actors) setActors(d.actors)
      })
      .finally(() => setLoading(false))
  }

  // initial load (no filters)
  useEffect(() => {
    fetch(`/api/apps/${appId}/audit`)
      .then(r => r.json())
      .then(d => {
        if (d.logs)   setLogs(d.logs)
        if (d.actors) setActors(d.actors)
      })
      .finally(() => setLoading(false))
  }, [appId])

  async function handleExportCsv() {
    setExporting(true)
    try {
      if (exportDetailed) {
        // Build detailed CSV client-side from already-loaded logs
        const res  = await fetch(`/api/apps/${appId}/audit${buildQuery()}`)
        const data = await res.json() as { logs: AuditLog[] }
        const logsData = data.logs ?? []
        const rows = [
          ['Data', 'Hora', 'Ação', 'Ator', 'E-mail do ator', 'Alvo', 'ID do alvo', 'Username', 'Campos alterados', 'Detalhes adicionais'],
          ...logsData.map(l => {
            const d = new Date(l.createdAt)
            let username = '', fields = '', extra = ''
            try {
              if (l.meta) {
                const m = JSON.parse(l.meta) as Record<string, unknown>
                if (m.username) username = String(m.username)
                if (m.fields && Array.isArray(m.fields)) fields = (m.fields as string[]).join(', ')
                if (m.email)   extra = `e-mail: ${m.email}`
                if (m.permanent) extra = 'exclusão permanente'
              }
            } catch { /* noop */ }
            return [
              d.toLocaleDateString('pt-BR'),
              d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              ACTION_LABELS[l.action] ?? l.action,
              l.actor.name, l.actor.email,
              l.targetName ?? '', l.targetId ?? '',
              username, fields, extra,
            ]
          }),
        ]
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `atividade-${appName}-detalhado.csv`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const res  = await fetch(`/api/apps/${appId}/audit${buildQuery({ export: 'csv' })}`)
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `atividade-${appName}.csv`; a.click()
        URL.revokeObjectURL(url)
      }
    } finally { setExporting(false) }
  }

  async function handleExportPdf() {
    setExporting(true)
    try {
      const res  = await fetch(`/api/apps/${appId}/audit${buildQuery()}`)
      const data = await res.json() as { logs: AuditLog[] }
      const logsData = data.logs ?? []

      const rows = logsData.map(l => {
        const d = new Date(l.createdAt)
        const details = buildDetails(l)
        return { when: `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, label: ACTION_LABELS[l.action] ?? l.action, actor: l.actor.name, target: l.targetName ?? '—', details }
      })

      const detailCol = exportDetailed
        ? '<th>Detalhes</th>'
        : ''
      const detailCell = (r: typeof rows[0]) => exportDetailed
        ? `<td><div class="detail-grid">${r.details.filter(d => !['Ação','Ator','Alvo'].includes(d.label)).map(d => `<div><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`).join('')}</div></td>`
        : ''

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Histórico de Atividade — ${appName}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11px;color:#111;margin:24px}
  h1{font-size:15px;font-weight:700;color:#2563eb;margin:0 0 4px}
  .sub{color:#6b7280;font-size:10px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#f5f8ff;color:#1e3a8a;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;text-align:left;border-bottom:2px solid #e2e8f0}
  td{padding:6px 8px;border-bottom:1px solid #eef1f9;vertical-align:top}
  .badge{display:inline-block;font-size:9px;font-weight:600;background:#f5f8ff;color:#1e3a8a;padding:2px 6px;border-radius:9999px}
  .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:4px;padding:4px 0 2px;border-top:1px solid #eef1f9}
  .detail-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
  .detail-value{font-size:9px;color:#111;word-break:break-all}
  tr:last-child td{border-bottom:none}
  @media print{body{margin:12px}@page{margin:16mm}}
</style></head><body>
<h1>Histórico de Atividade — ${appName}</h1>
<p class="sub">Exportado em ${new Date().toLocaleString('pt-BR')} — ${rows.length} registro${rows.length !== 1 ? 's' : ''}${exportDetailed ? ' · detalhado' : ''}</p>
<table>
  <thead><tr><th>Data/hora</th><th>Ação</th><th>Ator</th><th>Alvo</th>${detailCol}</tr></thead>
  <tbody>
    ${rows.map(r => `<tr>
      <td style="white-space:nowrap">${r.when}</td>
      <td><span class="badge">${r.label}</span></td>
      <td>${r.actor}</td>
      <td>${r.target}</td>
      ${detailCell(r)}
    </tr>`).join('')}
  </tbody>
</table>
</body></html>`

      const win = window.open('', '_blank')
      if (!win) return
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 400)
    } finally { setExporting(false) }
  }

  function handleExport() {
    if (exportFormat === 'pdf') handleExportPdf()
    else handleExportCsv()
  }

  const ALL_ACTIONS = Object.keys(ACTION_LABELS)

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 min-w-[130px]">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <input type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}
              className="h-9 w-full px-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60" />
          </div>
          <div className="space-y-1 min-w-[130px]">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <input type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}
              className="h-9 w-full px-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60" />
          </div>
          <div className="space-y-1 min-w-[150px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Ator</label>
            <select value={filters.actorId} onChange={e => setFilters(p => ({ ...p, actorId: e.target.value }))}
              className="h-9 w-full px-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60">
              <option value="">Todos</option>
              {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1 min-w-[170px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Ação</label>
            <select value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}
              className="h-9 w-full px-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60">
              <option value="">Todas</option>
              {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={load}
              className="h-9 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-lg shadow-sm transition-all">
              Filtrar
            </button>
            <button onClick={() => { setFilters({ from: '', to: '', actorId: '', action: '' }); setTimeout(load, 0) }}
              className="h-9 px-3 text-sm border border-border rounded-xl hover:bg-muted transition-colors">
              Limpar
            </button>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none h-9 px-1">
              <input
                type="checkbox"
                checked={exportDetailed}
                onChange={e => setExportDetailed(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span className="text-muted-foreground whitespace-nowrap">Detalhado</span>
            </label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button onClick={handleExport} disabled={exporting}
                className="h-9 px-3 text-sm hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-60 border-r border-border">
                <Download className="w-3.5 h-3.5" />
                {exporting ? 'Exportando...' : `Exportar ${exportFormat.toUpperCase()}`}
              </button>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as 'pdf' | 'csv')}
                className="h-9 px-2 text-xs bg-transparent border-0 focus:outline-none cursor-pointer"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-sm text-muted-foreground shadow-sm">
          Carregando atividade...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl text-center py-12 text-muted-foreground text-sm shadow-sm">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Nenhuma atividade encontrada.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {logs.map(log => <ActivityRow key={log.id} log={log} forceOpen={exportDetailed || undefined} />)}
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function AppAnalyticsTab({ appId, initialData }: { appId: string; initialData: AnalyticsData | null }) {
  const [data, setData] = useState<AnalyticsData | null>(initialData)

  useEffect(() => {
    if (initialData) return
    fetch(`/api/analytics/app/${appId}`).then(r => r.json()).then(d => { if (!d.error) setData(d) })
  }, [appId, initialData])

  if (!data) return <p className="text-sm text-muted-foreground">Carregando dados...</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <StatCard label="Logins bem-sucedidos" value={data.loginSuccess} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100 dark:bg-emerald-900/40" />
      <StatCard label="Logins com falha" value={data.loginFailed} icon={XCircle} iconColor="text-rose-600" iconBg="bg-rose-100 dark:bg-rose-900/40" />
      <StatCard label="Tokens emitidos" value={data.tokenIssued} icon={Zap} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/40" />
      <StatCard label="Usuários ativos (30d)" value={data.activeUsers} icon={Users2} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/40" />
      <StatCard label="Total de usuários" value={data.totalUsers} icon={Users} iconColor="text-violet-600" iconBg="bg-violet-100 dark:bg-violet-900/40" />
      <StatCard label="Taxa de sucesso" value={`${data.successRate}%`} icon={CheckCircle2} iconColor="text-teal-600" iconBg="bg-teal-100 dark:bg-teal-900/40" />
    </div>
  )
}

// ─── Transfer Section ────────────────────────────────────────────────────────

function AppTransferSection({ appId, currentCompanyId, currentCompanyName, onTransferred }: {
  appId: string
  currentCompanyId: string
  currentCompanyName: string
  onTransferred: (company: { id: string; name: string }) => void
}) {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [otherDoc, setOtherDoc] = useState<{ type: 'cnpj' | 'cpf'; value: string }>({ type: 'cnpj', value: '' })
  const [loading, setLoading] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<{ toCompany: { id: string; name: string }; status: string } | null>(null)

  const isOther = selectedCompanyId === '__other__'

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => { if (Array.isArray(d)) setCompanies(d.filter((c: { id: string }) => c.id !== currentCompanyId)) })
    fetch(`/api/apps/${appId}/transfer`).then(r => r.json()).then(d => { if (d && d.status) setPendingRequest(d) })
  }, [appId, currentCompanyId])

  async function handleTransfer(ev: React.FormEvent) {
    ev.preventDefault()
    if (!selectedCompanyId) return
    if (isOther && !otherDoc.value.trim()) return
    setLoading(true)
    try {
      const body = isOther
        ? { [otherDoc.type]: otherDoc.value.trim() }
        : { toCompanyId: selectedCompanyId }
      const res = await fetch(`/api/apps/${appId}/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      if (data.transferred) {
        toast.success('Aplicação transferida!')
        onTransferred(data.app.company)
        setSelectedCompanyId('')
        setOtherDoc({ type: 'cnpj', value: '' })
      } else {
        setPendingRequest(data.request)
        toast.success('Solicitação enviada! Aguardando aprovação do dono da empresa destino.')
      }
    } catch { toast.error('Erro ao transferir.') }
    finally { setLoading(false) }
  }

  async function handleCancelRequest() {
    const res = await fetch(`/api/apps/${appId}/transfer`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao cancelar.'); return }
    setPendingRequest(null)
    toast.success('Solicitação cancelada.')
  }

  const canSubmit = selectedCompanyId && (!isOther || otherDoc.value.trim().length >= 11)

  return (
    <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-semibold">Transferir aplicação</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Mova para outra empresa. Se pertencer a outro dono, ele precisará aprovar.
        <br />Empresa atual: <strong className="text-foreground">{currentCompanyName}</strong>
      </p>
      {pendingRequest ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Aguardando aprovação de <strong className="ml-1">{pendingRequest.toCompany.name}</strong>
          </div>
          <button onClick={handleCancelRequest} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            Cancelar solicitação
          </button>
        </div>
      ) : (
        <form onSubmit={handleTransfer} className="space-y-3">
          <div className="flex gap-2">
            <select value={selectedCompanyId} onChange={e => { setSelectedCompanyId(e.target.value); setOtherDoc({ type: 'cnpj', value: '' }) }}
              className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione a empresa destino...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.role !== 'owner' ? '(requer aprovação)' : ''}</option>
              ))}
              <option value="__other__">Outra empresa...</option>
            </select>
            <button type="submit" disabled={!canSubmit || loading}
              className="flex items-center gap-1.5 px-3 h-9 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50">
              <ArrowRightLeft className="w-3.5 h-3.5" /> {loading ? '...' : 'Transferir'}
            </button>
          </div>

          {isOther && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Informe o documento da empresa destino:</p>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-input overflow-hidden text-xs">
                  <button type="button" onClick={() => setOtherDoc(p => ({ ...p, type: 'cnpj', value: '' }))}
                    className={`px-3 py-1.5 transition-colors ${otherDoc.type === 'cnpj' ? 'bg-amber-600 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
                    CNPJ
                  </button>
                  <button type="button" onClick={() => setOtherDoc(p => ({ ...p, type: 'cpf', value: '' }))}
                    className={`px-3 py-1.5 transition-colors ${otherDoc.type === 'cpf' ? 'bg-amber-600 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}>
                    CPF
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={otherDoc.value}
                  onChange={e => setOtherDoc(p => ({ ...p, value: e.target.value }))}
                  placeholder={otherDoc.type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">A transferência será solicitada ao dono da empresa encontrada.</p>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
