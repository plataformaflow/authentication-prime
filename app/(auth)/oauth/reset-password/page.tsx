'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'
import { validatePassword, validateConfirmPassword, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const e: FieldErrors = {}
    const passErr = validatePassword(form.newPassword, 'Nova senha')
    if (passErr) e.newPassword = passErr
    const confirmErr = validateConfirmPassword(form.newPassword, form.confirm)
    if (confirmErr) e.confirm = confirmErr
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/oauth/reset-password?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Senha redefinida com sucesso!')
      router.push('/oauth/login')
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] dark:bg-[#0a0c12] p-4">
        <div className="w-full max-w-sm bg-white dark:bg-[#13151f] rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">Redefinição de senha</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para redefinir sua senha, entre em contato com o <strong className="text-foreground">administrador do sistema</strong> ou com a <strong className="text-foreground">equipe de TI</strong> responsável por esta aplicação.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 w-full text-left leading-relaxed">
              Eles poderão gerar um link seguro de redefinição e enviá-lo para você.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] dark:bg-[#0a0c12] p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#13151f] rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />
          <div className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold text-foreground">Nova senha</h1>
              <p className="text-sm text-muted-foreground">Crie uma senha segura para sua conta</p>
            </div>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova senha</label>
                <input
                  type="password" maxLength={128} autoComplete="new-password" value={form.newPassword}
                  onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                  aria-invalid={!!errors.newPassword}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-[#f8f9fb] dark:bg-[#0f1117] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
                {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmar senha</label>
                <input
                  type="password" maxLength={128} autoComplete="new-password" value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  aria-invalid={!!errors.confirm}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-[#f8f9fb] dark:bg-[#0f1117] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full h-11 mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </div>
          <div className="px-8 pb-6 flex items-center justify-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-2.5 h-2.5 text-white" />
            </div>
            <p className="text-xs text-muted-foreground">
              Autenticação segura por <span className="font-semibold text-foreground">Prime Auth</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
