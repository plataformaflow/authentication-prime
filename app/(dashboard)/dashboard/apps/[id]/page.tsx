'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Settings, Users, BarChart3, Copy, Check, RefreshCw, Trash2, CheckCircle2, XCircle,
  Users2, Zap, Plus, KeyRound, AlertTriangle, UserPlus, X, Mail, Shield,
  ArrowRightLeft, ImageIcon, Activity, Clock, Pencil,
} from 'lucide-react'
import { validateName, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { ScopeBadge } from '@/components/dashboard/scope-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Modal } from '@/components/ui/modal'
import { RedirectUriList } from '@/components/dashboard/redirect-uri-list'

const SCOPES = ['openid', 'profile', 'email']

interface AppPerms { canViewAnalytics: boolean; canCreateUsers: boolean; canEditUsers: boolean; canDeleteUsers: boolean; maxUsers: number | null }
interface AppDetail {
  id: string; name: string; logoUrl?: string; description?: string
  clientId?: string; scopes: string[]; redirectUris?: string[]
  company: { id: string; name: string }; createdAt: string
  _access: 'full' | 'collaborator'
  _permissions?: AppPerms
}
type Tab = 'analytics' | 'profile' | 'api' | 'users' | 'collaborators' | 'activity'

export default function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [app, setApp] = useState<AppDetail | null>(null)
  const [tab, setTab] = useState<Tab>('analytics')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetch(`/api/apps/${id}`).then(r => r.json()).then(d => {
      if (!d.error) setApp(d)
    })
  }, [id])

  async function handleDelete() {
    const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir.'); return }
    toast.success('App excluído.')
    router.push('/dashboard/apps')
  }

  if (!app) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Carregando...</div>

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
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' && <AppAnalyticsTab appId={id} />}
      {tab === 'profile' && <AppProfileTab app={app} onUpdate={setApp} />}
      {tab === 'api' && isFull && <AppApiTab app={app} onUpdate={setApp} />}
      {tab === 'users' && (
        <AppUsersTab appId={id} canCreate={isFull || perms.canCreateUsers} canEdit={isFull || perms.canEditUsers} canDelete={isFull || perms.canDeleteUsers} maxUsers={isFull ? null : perms.maxUsers} />
      )}
      {tab === 'collaborators' && isFull && <AppCollaboratorsTab appId={id} />}
      {tab === 'activity' && isFull && <AppActivityTab appId={id} />}
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
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
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
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm shadow-[#1a2550]/5">
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
            className="w-full h-10 bg-[#1a2f6b] hover:bg-[#152560] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
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
  const [newSecret, setNewSecret] = useState('')
  const [copied, setCopied] = useState(false)

  function toggleScope(s: string) {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))
  }

  function copyClientId() {
    navigator.clipboard.writeText(app.clientId ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRotate() {
    if (!confirm('Rotacionar o Client Secret invalidará integrações existentes. Continuar?')) return
    const res = await fetch(`/api/apps/${app.id}/rotate-secret`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error('Erro ao rotacionar.'); return }
    setNewSecret(data.clientSecret)
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
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm shadow-[#1a2550]/5">
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
        {newSecret && (
          <div className="space-y-2">
            <label className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Novo Client Secret — salve agora!
            </label>
            <code className="text-xs font-mono bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg block break-all text-amber-800 dark:text-amber-200">
              {newSecret}
            </code>
          </div>
        )}
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
            className="px-4 py-2 text-sm bg-[#1a2f6b] hover:bg-[#152560] text-white rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

type AppUser = { id: string; name: string; username: string; mustChangePassword: boolean; createdAt: string; createdByOwner?: { id: string; name: string } | null }

function AppUsersTab({ appId, canCreate, canEdit, canDelete, maxUsers }: { appId: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; maxUsers: number | null }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [editForm, setEditForm] = useState({ name: '', username: '' })
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [editLoading, setEditLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState<{ link: string; userName: string } | null>(null)
  const [resetLinkCopied, setResetLinkCopied] = useState(false)

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
      const res = await fetch(`/api/apps/${appId}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Usuário criado!')
      setUsers(p => [data, ...p])
      setShowCreate(false)
      setForm({ name: '', username: '', password: '' })
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
    if (!res.ok) { toast.error('Erro ao gerar link.'); return }
    setResetLink({ link: data.link, userName })
    setResetLinkCopied(false)
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
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 h-10 bg-[#1a2f6b] hover:bg-[#152560] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormErrors({}) }}
              className="px-4 h-10 text-sm border border-border rounded-xl hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetLink} onClose={() => setResetLink(null)} title="Link de redefinição de senha"
        description={resetLink ? `Gerado para ${resetLink.userName}` : ''} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copie o link e envie para o usuário. Expira em <strong className="text-foreground">24 horas</strong> e só pode ser usado uma vez.
          </p>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs font-mono break-all text-foreground leading-relaxed select-all">{resetLink?.link}</p>
          </div>
          <button onClick={() => { if (!resetLink) return; navigator.clipboard.writeText(resetLink.link); setResetLinkCopied(true); setTimeout(() => setResetLinkCopied(false), 2000) }}
            className={`w-full h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${resetLinkCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {resetLinkCopied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar link</>}
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
              className="flex-1 h-10 bg-[#1a2f6b] hover:bg-[#152560] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
              {editLoading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setEditUser(null)}
              className="px-4 h-10 text-sm border border-border rounded-xl hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm shadow-[#1a2550]/5">
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
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Trocar senha</span>
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
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">Trocar senha</span>
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
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm shadow-[#1a2550]/5">
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
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm shadow-[#1a2550]/5">
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
  'user.create': 'Criou usuário',
  'user.delete': 'Excluiu usuário',
  'user.update': 'Editou usuário',
  'user.reset_password': 'Resetou senha de',
  'app.rename': 'Renomeou app para',
  'app.update': 'Atualizou configurações',
  'collaborator.add': 'Adicionou colaborador',
  'collaborator.remove': 'Removeu colaborador',
}

function AppActivityTab({ appId }: { appId: string }) {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; targetName?: string; actor: { name: string; email: string }; createdAt: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/apps/${appId}/audit`).then(r => r.json()).then(d => { if (Array.isArray(d)) setLogs(d) }).finally(() => setLoading(false))
  }, [appId])

  if (loading) return (
    <div className="bg-card border border-border rounded-2xl px-5 py-10 text-center text-sm text-muted-foreground shadow-sm shadow-[#1a2550]/5">
      Carregando atividade...
    </div>
  )

  if (logs.length === 0) return (
    <div className="bg-card border border-border rounded-2xl text-center py-12 text-muted-foreground text-sm shadow-sm shadow-[#1a2550]/5">
      <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
      Nenhuma atividade registrada ainda.
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm shadow-[#1a2550]/5">
      {logs.map(log => {
        const label = ACTION_LABELS[log.action] ?? log.action
        const when = new Date(log.createdAt)
        return (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{log.actor.name}</span>
                {' '}<span className="text-muted-foreground">{label}</span>
                {log.targetName && <span className="font-medium"> {log.targetName}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {when.toLocaleDateString('pt-BR')} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function AppAnalyticsTab({ appId }: { appId: string }) {
  const [data, setData] = useState<{ loginSuccess: number; loginFailed: number; tokenIssued: number; activeUsers: number; totalUsers: number; successRate: number } | null>(null)

  useEffect(() => { fetch(`/api/analytics/app/${appId}`).then(r => r.json()).then(d => { if (!d.error) setData(d) }) }, [appId])

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
