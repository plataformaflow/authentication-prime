'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AppWindow, Users, CheckCircle2, XCircle, UserRound, Users2, Clock, ArrowRight, Trash2, Send } from 'lucide-react'
import { validateEmail, apiErrorMessage } from '@/lib/validation'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { StatCard } from '@/components/dashboard/stat-card'
import { AuthLineChart, AppBarChart } from '@/components/dashboard/analytics-charts'

interface CompanyDetail {
  id: string; name: string; cnpj: string; logoUrl?: string; description?: string; role: string
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

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [tab, setTab] = useState<'analytics' | 'members'>('analytics')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteEmailError, setInviteEmailError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/companies/${id}`).then(r => r.json()).then(d => { if (!d.error) setCompany(d) })
    fetch(`/api/analytics/company/${id}`).then(r => r.json()).then(d => { if (!d.error) setAnalytics(d) })
  }, [id])

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

  if (!company) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Carregando...</div>

  const isOwner = company.role === 'owner'

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">CNPJ: {company.cnpj}</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-700 dark:text-indigo-400">
                {company.apps.length} aplicaç{company.apps.length !== 1 ? 'ões' : 'ão'}
              </span>
              <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-700 dark:text-emerald-400">
                {company.members.length} membro{company.members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/apps"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
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
          {([['analytics', 'Análises'] as const, ['members', 'Membros'] as const]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="space-y-5">
          {analytics ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Últimos 30 dias</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">Carregando dados...</div>
          )}

          {/* Apps list */}
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
                  className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" disabled={inviting}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
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
    </div>
  )
}
