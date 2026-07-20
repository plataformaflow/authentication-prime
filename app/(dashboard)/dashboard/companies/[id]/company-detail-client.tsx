'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AppWindow, Users, CheckCircle2, XCircle, UserRound, Users2, Clock, ArrowRight, Trash2, Send, Settings, ImageIcon, KeyRound, AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react'
import { validateEmail, apiErrorMessage } from '@/lib/validation'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { StatCard } from '@/components/dashboard/stat-card'
import { AuthLineChart, AppBarChart } from '@/components/dashboard/analytics-charts'

interface CompanyDetail {
  id: string; name: string; cnpj?: string; cpf?: string; logoUrl?: string; description?: string; role: string
  apps: Array<{ id: string; name: string; _count: { users: number; authEvents: number } }>
  members: Array<{ id: string; owner: { id: string; name: string; email: string } }>
}

interface Analytics {
  totalSuccess: number
  totalFailed: number
  activeUsers: number
  dailyData: Array<{ date: string; success: number; failed: number }>
  apps: Array<{ appName: string; success: number; failed: number }>
}

export function CompanyDetailClient({ id, initialCompany, initialAnalytics }: {
  id: string
  initialCompany: CompanyDetail
  initialAnalytics: Analytics
}) {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyDetail>(initialCompany)
  const [analytics] = useState<Analytics>(initialAnalytics)
  const [tab, setTab] = useState<'analytics' | 'members' | 'settings'>('analytics')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEmailError, setInviteEmailError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleInvite(ev: React.FormEvent) {
    ev.preventDefault()
    const err = validateEmail(inviteEmail)
    if (err) { setInviteEmailError(err); return }
    setInviteEmailError('')
    setInviting(true)
    try {
      const res = await fetch(`/api/companies/${id}/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Convite enviado!')
      setInviteEmail('')
    } catch { toast.error('Erro ao enviar convite.') }
    finally { setInviting(false) }
  }

  async function handleRemoveMember(memberId: string) {
    const res = await fetch(`/api/companies/${id}/members/${memberId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao remover membro.'); return }
    toast.success('Membro removido.')
    setCompany(p => p ? { ...p, members: p.members.filter(m => m.id !== memberId) } : p)
    setRemovingId(null)
  }

  async function handleDelete() {
    if (!confirm('Excluir empresa? Esta ação é irreversível.')) return
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erro ao excluir empresa.'); return }
    toast.success('Empresa excluída.')
    router.push('/dashboard/companies')
  }

  const isOwner = company.role === 'owner'
  const tabs = [
    ['analytics', 'Análises'] as const,
    ['members', 'Membros'] as const,
    ...(isOwner ? [['settings', 'Configurações'] as const] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/dashboard/companies" className="hover:text-foreground transition-colors">Empresas</Link>
          <span>/</span>
          <span className="text-foreground">{company.name}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg shrink-0">
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {company.cnpj && <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">CNPJ: {company.cnpj}</span>}
                {company.cpf && <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">CPF: {company.cpf}</span>}
                <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-700 dark:text-indigo-400">
                  {company.apps.length} aplicaç{company.apps.length !== 1 ? 'ões' : 'ão'}
                </span>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-700 dark:text-emerald-400">
                  {company.members.length} membro{company.members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/apps"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors">
              <AppWindow className="w-3.5 h-3.5" /> Ver aplicações
            </Link>
            {isOwner && (
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Últimos 30 dias</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Logins bem-sucedidos" value={analytics.totalSuccess}
                icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100 dark:bg-emerald-900/40" />
              <StatCard label="Logins falhos" value={analytics.totalFailed}
                icon={XCircle} iconColor="text-rose-600" iconBg="bg-rose-100 dark:bg-rose-900/40" />
              <StatCard label="Usuários ativos" value={analytics.activeUsers}
                icon={Users2} iconColor="text-indigo-600" iconBg="bg-indigo-100 dark:bg-indigo-900/40" />
              <StatCard label="Taxa de sucesso" value={`${analytics.totalSuccess + analytics.totalFailed > 0 ? Math.round(analytics.totalSuccess / (analytics.totalSuccess + analytics.totalFailed) * 100) : 0}%`}
                icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/40" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Autenticações por dia</h3>
              <AuthLineChart data={analytics.dailyData} />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Logins por aplicação</h3>
              <AppBarChart apps={analytics.apps} />
            </div>
          </div>

          {company.apps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aplicações</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.apps.map(app => (
                  <Link key={app.id} href={`/dashboard/apps/${app.id}`}
                    className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <AppAvatar name={app.name} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app._count.users} usuário{app._count.users !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          {isOwner && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Convidar por e-mail</h3>
              <form onSubmit={handleInvite} noValidate className="flex gap-2">
                <input type="email" placeholder="E-mail do usuário" maxLength={255} value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteEmailError('') }}
                  className="flex-1 h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all"
                />
                <button type="submit" disabled={inviting}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#1a2f6b] hover:bg-[#152560] text-white rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
                  <Send className="w-3.5 h-3.5" /> {inviting ? '...' : 'Convidar'}
                </button>
              </form>
              {inviteEmailError && <p className="text-xs text-destructive mt-1">{inviteEmailError}</p>}
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Membros atuais</h3>
            </div>
            {company.members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Nenhum membro
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">Membro</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">E-mail</th>
                    {isOwner && <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2.5">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {company.members.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                            {m.owner.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{m.owner.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{m.owner.email}</td>
                      {isOwner && (
                        <td className="px-5 py-3 text-right">
                          {removingId === m.id ? (
                            <span className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-white bg-destructive hover:bg-red-600 px-2 py-1 rounded-md">Confirmar</button>
                              <button onClick={() => setRemovingId(null)} className="text-xs border border-border px-2 py-1 rounded-md hover:bg-muted">Cancelar</button>
                            </span>
                          ) : (
                            <button onClick={() => setRemovingId(m.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <UserRound className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && isOwner && (
        <CompanySettingsTab company={company} onUpdate={setCompany} onDelete={handleDelete} />
      )}
    </div>
  )
}

function CompanySettingsTab({
  company,
  onUpdate,
  onDelete,
}: {
  company: CompanyDetail
  onUpdate: (c: CompanyDetail) => void
  onDelete: () => void
}) {
  const [form, setForm] = useState({ name: company.name, logoUrl: company.logoUrl ?? '', description: company.description ?? '' })
  const [loading, setLoading] = useState(false)

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (form.name.trim().length < 2) { toast.error('Nome deve ter ao menos 2 caracteres.'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), logoUrl: form.logoUrl.trim() || '', description: form.description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      onUpdate({ ...company, name: data.name, logoUrl: data.logoUrl, description: data.description })
      toast.success('Empresa atualizada!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Logo preview */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Informações da empresa</h3>
        </div>

        {/* Preview da logo */}
        <div className="flex items-center gap-4">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{form.name || 'Nome da empresa'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prévia do avatar</p>
          </div>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome *</label>
            <input
              type="text" maxLength={100} value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL da logo</label>
            <input
              type="url" maxLength={500} value={form.logoUrl} placeholder="https://empresa.com/logo.png"
              onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all"
            />
            <p className="text-xs text-muted-foreground">A imagem será exibida na tela de login OAuth desta empresa.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</label>
            <textarea
              maxLength={300} rows={2} value={form.description} placeholder="Descrição opcional..."
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/60 transition-all"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-10 bg-[#1a2f6b] hover:bg-[#152560] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1a2f6b]/20 transition-all disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      <CompanyApiKeySection companyId={company.id} />

      {/* Zona de perigo */}
      <div className="bg-card border border-destructive/30 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Zona de perigo</h3>
        <p className="text-xs text-muted-foreground">
          Excluir a empresa removerá permanentemente todas as aplicações, usuários e dados associados. Esta ação não pode ser desfeita.
        </p>
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-destructive border border-destructive/40 rounded-lg hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Excluir empresa
        </button>
      </div>
    </div>
  )
}

function CompanyApiKeySection({ companyId }: { companyId: string }) {
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [rotating, setRotating] = useState(false)

  async function handleRotate() {
    if (!confirm('Gerar uma nova chave invalidará a anterior imediatamente. Continuar?')) return
    setRotating(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/api-key/rotate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setNewKey(data.apiKey)
      toast.success('Chave gerada!')
    } catch { toast.error('Erro ao gerar chave.') }
    finally { setRotating(false) }
  }

  function copy() {
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Chave de API da empresa</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Dá acesso de leitura (via API) aos usuários de todas as aplicações desta empresa, independente de qual tenant/aplicação foi usado no login — não é vinculada a uma aplicação específica.
      </p>
      {newKey && (
        <div className="space-y-2">
          <label className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Salve agora — não será exibida novamente!
          </label>
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <code className="text-xs font-mono text-amber-800 dark:text-amber-200 flex-1 truncate">{newKey}</code>
            <button onClick={copy} className="shrink-0 text-amber-700 dark:text-amber-300 hover:opacity-80 transition-opacity">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
      <button onClick={handleRotate} disabled={rotating}
        className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-60">
        <RefreshCw className="w-3.5 h-3.5" /> {rotating ? 'Gerando...' : 'Gerar / rotacionar chave'}
      </button>
    </div>
  )
}
