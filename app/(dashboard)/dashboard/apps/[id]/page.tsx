'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Settings, Users, BarChart3, Copy, Check, RefreshCw, Trash2, CheckCircle2, XCircle, Users2, Zap, Plus, KeyRound, AlertTriangle } from 'lucide-react'
import { validateName, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { ScopeBadge } from '@/components/dashboard/scope-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Modal } from '@/components/ui/modal'
import { RedirectUriList } from '@/components/dashboard/redirect-uri-list'

const SCOPES = ['openid', 'profile', 'email']

interface AppDetail {
  id: string; name: string; clientId: string; scopes: string[]; redirectUris: string[]
  company: { id: string; name: string }; createdAt: string
}

export default function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [app, setApp] = useState<AppDetail | null>(null)
  const [tab, setTab] = useState<'analytics' | 'settings' | 'users'>('analytics')
  const [form, setForm] = useState({ name: '', redirectUris: [] as string[], scopes: [] as string[] })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [newSecret, setNewSecret] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/apps/${id}`).then(r => r.json()).then(d => {
      if (!d.error) {
        setApp(d)
        setForm({ name: d.name, redirectUris: d.redirectUris.length > 0 ? d.redirectUris : [''], scopes: d.scopes })
      }
    })
  }, [id])

  function validateForm(): boolean {
    const e: FieldErrors = {}
    const nameErr = validateName(form.name, 'Nome')
    if (nameErr) e.name = nameErr
    const validUris = form.redirectUris.map(u => u.trim()).filter(Boolean)
    if (validUris.length === 0) e.redirectUris = 'Adicione ao menos uma URI de redirecionamento.'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    try {
      const redirectUris = form.redirectUris.map(u => u.trim()).filter(Boolean)
      const res = await fetch(`/api/apps/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, redirectUris, scopes: form.scopes }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('App atualizado!')
      setApp(data)
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  async function handleRotate() {
    if (!confirm('Rotacionar o Client Secret invalidará integrações existentes. Continuar?')) return
    const res = await fetch(`/api/apps/${id}/rotate-secret`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error('Erro ao rotacionar.'); return }
    setNewSecret(data.clientSecret)
    toast.success('Secret rotacionado!')
  }

  async function handleDelete() {
    if (!confirm('Excluir app? Esta ação é irreversível.')) return
    const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir.'); return }
    toast.success('App excluído.')
    router.push('/dashboard/apps')
  }

  function toggleScope(s: string) {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))
  }

  function copyClientId() {
    if (!app) return
    navigator.clipboard.writeText(app.clientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!app) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Carregando...</div>

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
            <AppAvatar name={app.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold">{app.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{app.company.name}</span>
                <span className="text-muted-foreground">·</span>
                <div className="flex gap-1">
                  {app.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {([['analytics', 'Análises', BarChart3] as const, ['settings', 'Configurações', Settings] as const, ['users', 'Usuários', Users] as const]).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'settings' && (
        <div className="space-y-4">
          {/* Credentials */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
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

          {/* Settings form */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" /> Configurações</h3>
            <form onSubmit={handleSave} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome</label>
                <input type="text" maxLength={100} value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
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
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'users' && <AppUsersTab appId={id} />}
      {tab === 'analytics' && <AppAnalyticsTab appId={id} />}
    </div>
  )
}

function AppUsersTab({ appId }: { appId: string }) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; username: string; mustChangePassword: boolean; createdAt: string }>>([])
  const [showCreate, setShowCreate] = useState(false)
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
    if (!confirm('Excluir usuário?')) return
    const res = await fetch(`/api/apps/${appId}/users/${userId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir usuário.'); return }
    toast.success('Usuário excluído.')
    setUsers(p => p.filter(u => u.id !== userId))
  }

  async function handleResetPassword(userId: string, userName: string) {
    const res = await fetch(`/api/apps/${appId}/users/${userId}/reset-password`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error('Erro ao gerar link.'); return }
    setResetLink({ link: data.link, userName })
    setResetLinkCopied(false)
  }

  function copyResetLink() {
    if (!resetLink) return
    navigator.clipboard.writeText(resetLink.link)
    setResetLinkCopied(true)
    setTimeout(() => setResetLinkCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo usuário
        </button>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}) }} title="Novo usuário" description="Crie um usuário para esta aplicação" size="sm">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          {([{ key: 'name', label: 'Nome completo', type: 'text', max: 100, placeholder: 'João Silva' }, { key: 'username', label: 'Usuário', type: 'text', max: 30, placeholder: 'joaosilva' }, { key: 'password', label: 'Senha', type: 'password', max: 128, placeholder: '••••••••' }] as const).map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium">{f.label}</label>
              <input type={f.type} maxLength={f.max} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: f.key === 'username' ? e.target.value.toLowerCase() : e.target.value }))}
                aria-invalid={!!formErrors[f.key]}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {formErrors[f.key] && <p className="text-xs text-destructive">{formErrors[f.key]}</p>}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormErrors({}) }}
              className="px-4 h-9 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </form>
      </Modal>
      {/* Modal: Reset link */}
      <Modal
        open={!!resetLink}
        onClose={() => setResetLink(null)}
        title="Link de redefinição de senha"
        description={resetLink ? `Gerado para ${resetLink.userName}` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copie o link abaixo e envie para o usuário. Ele expira em <strong className="text-foreground">24 horas</strong> e só pode ser usado uma vez.
          </p>
          <div className="bg-muted rounded-xl p-3 space-y-2">
            <p className="text-xs font-mono break-all text-foreground leading-relaxed select-all">
              {resetLink?.link}
            </p>
          </div>
          <button
            onClick={copyResetLink}
            className={`w-full h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              resetLinkCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {resetLinkCopied ? (
              <><Check className="w-4 h-4" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copiar link</>
            )}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            O usuário precisará acessar este link para definir uma nova senha.
          </p>
        </div>
      </Modal>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Nenhum usuário
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">Usuário</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">Username</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{u.name}</span>
                      {u.mustChangePassword && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Trocar senha</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">@{u.username}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleResetPassword(u.id, u.name)}
                        className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-muted transition-colors">
                        Reset senha
                      </button>
                      <button onClick={() => handleDelete(u.id)}
                        className="text-xs px-2.5 py-1 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AppAnalyticsTab({ appId }: { appId: string }) {
  const [data, setData] = useState<{ loginSuccess: number; loginFailed: number; tokenIssued: number; activeUsers: number; totalUsers: number; successRate: number } | null>(null)

  useEffect(() => { fetch(`/api/analytics/app/${appId}`).then(r => r.json()).then(d => { if (!d.error) setData(d) }) }, [appId])

  if (!data) return <p className="text-sm text-muted-foreground">Carregando dados...</p>

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <StatCard label="Logins bem-sucedidos" value={data.loginSuccess} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100 dark:bg-emerald-900/40" />
      <StatCard label="Logins com falha" value={data.loginFailed} icon={XCircle} iconColor="text-rose-600" iconBg="bg-rose-100 dark:bg-rose-900/40" />
      <StatCard label="Tokens emitidos" value={data.tokenIssued} icon={Zap} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/40" />
      <StatCard label="Usuários ativos (30d)" value={data.activeUsers} icon={Users2} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/40" />
      <StatCard label="Total de usuários" value={data.totalUsers} icon={Users} iconColor="text-violet-600" iconBg="bg-violet-100 dark:bg-violet-900/40" />
      <StatCard label="Taxa de sucesso" value={`${data.successRate}%`} icon={CheckCircle2} iconColor="text-teal-600" iconBg="bg-teal-100 dark:bg-teal-900/40" />
    </div>
  )
}
