'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { AuthSplit } from '@/components/layout/auth-split'
import { toast } from 'sonner'
import { validateName, validateEmail, validatePassword, validateConfirmPassword, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const e: FieldErrors = {}
    const nameErr = validateName(form.name)
    if (nameErr) e.name = nameErr
    const emailErr = validateEmail(form.email)
    if (emailErr) e.email = emailErr
    const passErr = validatePassword(form.password)
    if (passErr) e.password = passErr
    const confirmErr = validateConfirmPassword(form.password, form.confirm)
    if (confirmErr) e.confirm = confirmErr
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
      router.refresh()
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  const [showPwd, setShowPwd] = useState(false)

  return (
    <AuthSplit>
      <div className="space-y-7">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
          <p className="text-sm text-muted-foreground mt-1">Preencha os dados para se registrar</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Nome completo</label>
            <input id="name" type="text" maxLength={100} autoComplete="name"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium">E-mail</label>
            <input id="reg-email" type="email" maxLength={255} autoComplete="email"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-pwd" className="text-sm font-medium">Senha</label>
            <div className="relative">
              <input id="reg-pwd" type={showPwd ? 'text' : 'password'} maxLength={128} autoComplete="new-password"
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
            <label htmlFor="reg-confirm" className="text-sm font-medium">Confirmar senha</label>
            <input id="reg-confirm" type="password" maxLength={128} autoComplete="new-password"
              value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Entrar</Link>
        </p>
      </div>
    </AuthSplit>
  )
}
