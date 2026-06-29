'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Building2, Search, BarChart2, Pencil, Trash2 } from 'lucide-react'
import { validateName, validateLogoUrl, validateDescription, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { PageHeader } from '@/components/layout/page-header'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { Modal } from '@/components/ui/modal'

interface Company {
  id: string; name: string; cnpj: string; logoUrl?: string; description?: string
  role: 'owner' | 'member'; _count: { apps: number }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [form, setForm] = useState({ name: '', cnpj: '', logoUrl: '', description: '' })
  const [requestCnpj, setRequestCnpj] = useState('')
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { fetch('/api/companies').then(r => r.json()).then(setCompanies).catch(() => {}) }, [])

  const myCompanies = companies.filter(c => c.role === 'owner')
  const memberCompanies = companies.filter(c => c.role === 'member')

  function validateForm(): boolean {
    const e: FieldErrors = {}
    const nameErr = validateName(form.name, 'Nome da empresa')
    if (nameErr) e.name = nameErr
    if (!form.cnpj.trim()) e.cnpj = 'CNPJ é obrigatório.'
    const logoErr = validateLogoUrl(form.logoUrl)
    if (logoErr) e.logoUrl = logoErr
    const descErr = validateDescription(form.description)
    if (descErr) e.description = descErr
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const res = await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Empresa criada!')
      setCompanies(p => [{ ...data, role: 'owner' as const }, ...p])
      setShowCreate(false)
      setForm({ name: '', cnpj: '', logoUrl: '', description: '' })
      setFormErrors({})
    } catch { toast.error('Erro ao criar empresa.') }
    finally { setLoading(false) }
  }

  async function handleRequest(ev: React.FormEvent) {
    ev.preventDefault()
    if (!requestCnpj.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/companies/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnpj: requestCnpj }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success(`Solicitação enviada para ${data.companyName}!`)
      setShowRequest(false)
      setRequestCnpj('')
    } catch { toast.error('Erro ao solicitar acesso.') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Erro ao excluir empresa.'); return }
      toast.success('Empresa excluída.')
      setCompanies(p => p.filter(c => c.id !== id))
    } catch { toast.error('Erro ao excluir empresa.') }
    finally { setDeleteId(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        subtitle={`${companies.length} empresa${companies.length !== 1 ? 's' : ''} no total`}
        action={
          <>
            <button onClick={() => setShowRequest(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
              <Search className="w-3.5 h-3.5" /> Solicitar acesso
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova empresa
            </button>
          </>
        }
      />

      {/* Modal: Nova empresa */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormErrors({}) }} title="Nova empresa" description="Preencha os dados para criar uma empresa">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome *</label>
            <input type="text" maxLength={100} value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Nome da empresa"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CNPJ *</label>
            <input type="text" maxLength={18} value={form.cnpj}
              onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
              placeholder="00.000.000/0001-00"
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {formErrors.cnpj && <p className="text-xs text-destructive">{formErrors.cnpj}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL do logotipo</label>
            <input type="url" maxLength={500} value={form.logoUrl}
              onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {formErrors.logoUrl && <p className="text-xs text-destructive">{formErrors.logoUrl}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <textarea maxLength={500} value={form.description} rows={3}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descrição da empresa..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{form.description.length}/500</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar empresa'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setFormErrors({}) }}
              className="px-4 h-9 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Solicitar acesso */}
      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Solicitar acesso" description="Informe o CNPJ da empresa que deseja acessar" size="sm">
        <form onSubmit={handleRequest} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CNPJ da empresa</label>
            <input type="text" placeholder="00.000.000/0001-00" maxLength={18} value={requestCnpj}
              onChange={e => setRequestCnpj(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Enviando...' : 'Solicitar'}
            </button>
            <button type="button" onClick={() => setShowRequest(false)}
              className="px-4 h-9 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <>
          {myCompanies.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Minhas empresas <span className="ml-1 text-foreground">{myCompanies.length}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myCompanies.map(c => (
                  <CompanyCard key={c.id} company={c}
                    onDelete={() => setDeleteId(c.id)}
                    deleting={deleteId === c.id}
                    onConfirmDelete={() => handleDelete(c.id)}
                    onCancelDelete={() => setDeleteId(null)}
                  />
                ))}
              </div>
            </section>
          )}
          {memberCompanies.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Membro de <span className="ml-1 text-foreground">{memberCompanies.length}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memberCompanies.map(c => (
                  <CompanyCard key={c.id} company={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function CompanyCard({ company: c, onDelete, deleting, onConfirmDelete, onCancelDelete }: {
  company: Company
  onDelete?: () => void
  deleting?: boolean
  onConfirmDelete?: () => void
  onCancelDelete?: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
      <div className="flex items-center gap-3">
        <AppAvatar name={c.name} logoUrl={c.logoUrl} size="md" className="rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{c.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{c.cnpj}</span>
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
              {c._count.apps} app{c._count.apps !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {deleting ? (
        <div className="flex items-center gap-2 pt-1">
          <p className="text-xs text-destructive flex-1">Confirmar exclusão?</p>
          <button onClick={onConfirmDelete} className="text-xs text-white bg-destructive hover:bg-red-600 px-2 py-1 rounded-md">Excluir</button>
          <button onClick={onCancelDelete} className="text-xs border border-border px-2 py-1 rounded-md hover:bg-muted">Cancelar</button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <Link href={`/dashboard/companies/${c.id}`}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
            <BarChart2 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          {c.role === 'owner' && (
            <div className="flex items-center gap-1">
              <Link href={`/dashboard/companies/${c.id}`}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button onClick={onDelete}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
