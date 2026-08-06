'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AuthSplit } from '@/components/layout/auth-split'
import { validateEmail, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function requestCode(ev: React.FormEvent) {
    ev.preventDefault()
    const emailErr = validateEmail(email)
    if (emailErr) { setErrors({ email: emailErr }); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      if (!res.ok) { const data = await res.json().catch(() => null); toast.error(apiErrorMessage(data)); return }
      toast.success('Se esse e-mail existir, enviamos um código.')
      setStep('code')
      setCooldown(30)
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  async function verifyCode(ev: React.FormEvent) {
    ev.preventDefault()
    if (code.length !== 6) { setErrors({ code: 'O código tem 6 dígitos.' }); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      router.push(`/reset-password?token=${data.token}`)
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  return (
    <AuthSplit>
      <div className="space-y-7">
        {step === 'email' ? (
          <>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Esqueceu a senha?</h2>
              <p className="text-sm text-muted-foreground mt-1">Informe seu e-mail de login e enviaremos um código de verificação.</p>
            </div>
            <form onSubmit={requestCode} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-email" className="text-sm font-medium">E-mail</label>
                <input id="fp-email" type="email" maxLength={255} autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Digite o código</h2>
              <p className="text-sm text-muted-foreground mt-1">Enviamos um código de 6 dígitos para <strong className="text-foreground">{email}</strong>.</p>
            </div>
            <form onSubmit={verifyCode} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-code" className="text-sm font-medium">Código de verificação</label>
                <input id="fp-code" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code"
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 px-3 rounded-lg border border-input bg-background text-center text-lg font-semibold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>
              <button type="button" disabled={cooldown > 0 || loading}
                onClick={() => requestCode({ preventDefault() {} } as React.FormEvent)}
                className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
              </button>
            </form>
          </>
        )}
        <p className="text-sm text-center text-muted-foreground">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Entrar</Link>
        </p>
      </div>
    </AuthSplit>
  )
}
