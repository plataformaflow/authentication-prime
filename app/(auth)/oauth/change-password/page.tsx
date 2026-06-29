'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { validatePassword, validateConfirmPassword, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function ChangePasswordPage() {
  return <Suspense><ChangePasswordForm /></Suspense>
}

function ChangePasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('access_token') ?? ''
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const e: FieldErrors = {}
    if (!form.oldPassword) e.oldPassword = 'Senha atual é obrigatória.'
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
      const res = await fetch('/api/oauth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success('Senha alterada com sucesso!')
      router.push('/oauth/login')
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold">Alterar senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina sua nova senha de acesso</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {([
            { key: 'oldPassword', label: 'Senha atual', auto: 'current-password' },
            { key: 'newPassword', label: 'Nova senha', auto: 'new-password' },
            { key: 'confirm', label: 'Confirmar nova senha', auto: 'new-password' },
          ] as const).map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-medium">{f.label}</label>
              <input
                type="password" maxLength={128} autoComplete={f.auto}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                aria-invalid={!!errors[f.key]}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
