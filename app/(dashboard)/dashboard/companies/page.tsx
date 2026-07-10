'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Building2, Search, BarChart2, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { validateName, validateLogoUrl, validateDescription, type FieldErrors, apiErrorMessage } from '@/lib/validation'
import { PageHeader } from '@/components/layout/page-header'
import { AppAvatar } from '@/components/dashboard/app-avatar'
import { Modal } from '@/components/ui/modal'

interface Company {
  id: string; name: string; cnpj?: string; cpf?: string; logoUrl?: string; description?: string
  role: 'owner' | 'member'; _count: { apps: number }
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [form, setForm] = useState({ name: '', docType: 'cnpj' as 'cnpj' | 'cpf', cnpj: '', cpf: '', logoUrl: '', description: '' })
  const [requestDoc, setRequestDoc] = useState({ type: 'cnpj' as 'cnpj' | 'cpf', value: '' })
  const [formErrors, setFormErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => { fetch('/api/companies').then(r => r.json()).then(setCompanies).catch(() => {}) }, [])

  const myCompanies = companies.filter(c => c.role === 'owner')
  const memberCompanies = companies.filter(c => c.role === 'member')

  function validateForm(): boolean {
    const e: FieldErrors = {}
    const nameErr = validateName(form.name, 'Nome da empresa')
    if (nameErr) e.name = nameErr
    if (form.docType === 'cnpj' && !form.cnpj.trim()) e.cnpj = 'CNPJ é obrigatório.'
    if (form.docType === 'cpf' && !form.cpf.trim()) e.cpf = 'CPF é obrigatório.'
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
      const payload = { name: form.name, logoUrl: form.logoUrl, description: form.description, ...(form.docType === 'cnpj' ? { cnpj: form.cnpj } : { cpf: form.cpf }) }
      const res = await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Empresa criada!')
      setCompanies(p => [{ ...data, role: 'owner' as const }, ...p])
      setShowCreate(false)
      setForm({ name: '', docType: 'cnpj', cnpj: '', cpf: '', logoUrl: '', description: '' })
      setFormErrors({})
    } catch { toast.error('Erro ao criar empresa.') }
    finally { setLoading(false) }
  }

  async function handleRequest(ev: React.FormEvent) {
    ev.preventDefault()
    if (!requestDoc.value.trim()) return
    setLoading(true)
    try {
      const payload = requestDoc.type === 'cnpj' ? { cnpj: requestDoc.value } : { cpf: requestDoc.value }
      const res = await fetch('/api/companies/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success(`Solicitação enviada para ${data.companyName}!`)
      setShowRequest(false)
      setRequestDoc({ type: 'cnpj', value: '' })
    } catch { toast.error('Erro ao solicitar acesso.') }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/companies/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Erro ao excluir empresa.'); return }
      toast.success('Empresa excluída.')
      setCompanies(p => p.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch { toast.error('Erro ao excluir empresa.') }
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{form.docType === 'cnpj' ? 'CNPJ' : 'CPF'} *</label>
              <div className="flex rounded-lg border border-input overflow-hidden text-xs">
                <button type="button" onClick={() => setForm(p => ({ ...p, docType: 'cnpj' }))}
                  className={`px-2.5 py-1 transition-colors ${form.docType === 'cnpj' ? 'bg-indigo-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                  CNPJ
                </button>
                <button type="button" onClick={() => setForm(p => ({ ...p, docType: 'cpf' }))}
                  className={`px-2.5 py-1 transition-colors ${form.docType === 'cpf' ? 'bg-indigo-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                  CPF
                </button>
              </div>
            </div>
            {form.docType === 'cnpj' ? (
              <input type="text" maxLength={18} value={form.cnpj}
                onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            ) : (
              <input type="text" maxLength={14} value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                placeholder="000.000.000-00"
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
            {formErrors.cnpj && <p className="text-xs text-destructive">{formErrors.cnpj}</p>}
            {formErrors.cpf && <p className="text-xs text-destructive">{formErrors.cpf}</p>}
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
      <Modal open={showRequest} onClose={() => { setShowRequest(false); setRequestDoc({ type: 'cnpj', value: '' }) }} title="Solicitar acesso" description="Informe o CNPJ ou CPF da empresa que deseja acessar" size="sm">
        <form onSubmit={handleRequest} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{requestDoc.type === 'cnpj' ? 'CNPJ' : 'CPF'} da empresa</label>
              <div className="flex rounded-lg border border-input overflow-hidden text-xs">
                <button type="button" onClick={() => setRequestDoc(p => ({ ...p, type: 'cnpj', value: '' }))}
                  className={`px-2.5 py-1 transition-colors ${requestDoc.type === 'cnpj' ? 'bg-indigo-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                  CNPJ
                </button>
                <button type="button" onClick={() => setRequestDoc(p => ({ ...p, type: 'cpf', value: '' }))}
                  className={`px-2.5 py-1 transition-colors ${requestDoc.type === 'cpf' ? 'bg-indigo-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                  CPF
                </button>
              </div>
            </div>
            <input type="text"
              placeholder={requestDoc.type === 'cnpj' ? '00.000.000/0001-00' : '000.000.000-00'}
              maxLength={requestDoc.type === 'cnpj' ? 18 : 14}
              value={requestDoc.value}
              onChange={e => setRequestDoc(p => ({ ...p, value: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Enviando...' : 'Solicitar'}
            </button>
            <button type="button" onClick={() => { setShowRequest(false); setRequestDoc({ type: 'cnpj', value: '' }) }}
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
                    onDelete={() => setDeleteTarget({ id: c.id, name: c.name })}
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

      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          label="empresa"
          description="Todas as aplicações, usuários e dados desta empresa serão excluídos permanentemente."
          items={['Todas as aplicações da empresa', 'Todos os usuários dessas aplicações', 'Membros e convites', 'Histórico de atividade']}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function CompanyCard({ company: c, onDelete }: {
  company: Company
  onDelete?: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
      <div className="flex items-center gap-3">
        <AppAvatar name={c.name} logoUrl={c.logoUrl} size="md" className="rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{c.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {(c.cnpj || c.cpf) && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{c.cnpj ?? c.cpf}</span>}
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
              {c._count.apps} app{c._count.apps !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

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
    </div>
  )
}

function DeleteConfirmModal({ name, label, description, items, onConfirm, onClose }: {
  name: string; label: string; description: string; items: string[]
  onConfirm: () => Promise<void>; onClose: () => void
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
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>

          {step === 1 ? (
            <>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-medium text-destructive">O que será excluído permanentemente:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  {items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)}
                  className="flex-1 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-medium transition-colors">
                  Continuar
                </button>
                <button onClick={onClose}
                  className="px-4 h-10 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
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
                <p className="text-sm font-semibold bg-muted rounded-lg px-3 py-2 font-mono">{name}</p>
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
                  className="px-4 h-10 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
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
