'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { AuthSplit } from '@/components/layout/auth-split'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateEmail, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate(): boolean {
    const e: FieldErrors = {}
    const emailErr = validateEmail(form.email)
    if (emailErr) e.email = emailErr
    if (!form.password) e.password = 'Senha é obrigatória.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      router.push('/dashboard')
      router.refresh()
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  return (
    <AuthSplit>
      <div className="space-y-7">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta para continuar</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email" type="email" maxLength={255} autoComplete="email"
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              aria-invalid={!!errors.email}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password" type={showPassword ? 'text' : 'password'} maxLength={128}
                autoComplete="current-password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                aria-invalid={!!errors.password}
                className={errors.password ? 'border-destructive pr-9' : 'pr-9'}
              />
              <button
                type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">Criar conta</Link>
        </p>
      </div>
    </AuthSplit>
  )
}
