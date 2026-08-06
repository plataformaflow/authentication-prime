'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { AuthSplit } from '@/components/layout/auth-split'
import { validatePassword, validateConfirmPassword, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  function validate(): boolean {
    const e: FieldErrors = {}
    const passErr = validatePassword(form.password)
    if (passErr) e.password = passErr
    const confirmErr = validateConfirmPassword(form.password, form.confirm)
    if (confirmErr) e.confirm = confirmErr
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!token) { toast.error('Link inválido. Solicite a redefinição novamente.'); return }
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Senha redefinida! Entre com a nova senha.')
      router.push('/login')
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  if (!token) {
    return (
      <AuthSplit>
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">Link inválido</h2>
          <p className="text-sm text-muted-foreground">Solicite a redefinição de senha novamente.</p>
          <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Esqueci a senha</Link>
        </div>
      </AuthSplit>
    )
  }

  return (
    <AuthSplit>
      <div className="space-y-7">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Nova senha</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha uma nova senha para sua conta.</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="rp-pwd" className="text-sm font-medium">Nova senha</label>
            <div className="relative">
              <input id="rp-pwd" type={showPwd ? 'text' : 'password'} maxLength={128} autoComplete="new-password"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full h-9 px-3 pr-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rp-confirm" className="text-sm font-medium">Confirmar nova senha</label>
            <input id="rp-confirm" type="password" maxLength={128} autoComplete="new-password"
              value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </AuthSplit>
  )
}
