'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Sun, Moon, Eye, EyeOff, Lock, User, ShieldAlert, X, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { validateUsername, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function OAuthLoginPage() {
  return <Suspense><OAuthLoginForm /></Suspense>
}

function OAuthLoginForm() {
  const searchParams = useSearchParams()
  const { theme, toggle } = useTheme()
  const [appInfo, setAppInfo] = useState<{ appName: string; companyName: string; logoUrl?: string; appId: string } | null>(null)
  const [validationError, setValidationError] = useState<{ message: string; code: string } | null>(null)
  const [validating, setValidating] = useState(true)
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  const clientId = searchParams.get('client_id') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const scope = searchParams.get('scope') ?? 'openid'
  const state = searchParams.get('state') ?? ''
  const codeChallenge = searchParams.get('code_challenge') ?? ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? ''

  useEffect(() => {
    if (!clientId) {
      setValidationError({ message: 'Parâmetro client_id ausente na requisição.', code: 'missing_client_id' })
      setValidating(false)
      return
    }
    if (!redirectUri) {
      setValidationError({ message: 'Parâmetro redirect_uri ausente na requisição.', code: 'missing_redirect_uri' })
      setValidating(false)
      return
    }
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
    fetch(`/api/oauth/app-info?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setValidationError({ message: d.error, code: d.code ?? 'error' })
        else setAppInfo(d)
      })
      .catch(() => setValidationError({ message: 'Não foi possível verificar a aplicação.', code: 'network_error' }))
      .finally(() => setValidating(false))
  }, [clientId, redirectUri])

  function validate(): boolean {
    const e: FieldErrors = {}
    const usernameErr = validateUsername(form.username)
    if (usernameErr) e.username = usernameErr
    if (!form.password) e.password = 'Senha é obrigatória.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/oauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      window.location.href = data.redirect
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] dark:bg-[#0a0c12]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] dark:bg-[#0a0c12] p-4">
        <div className="w-full max-w-sm bg-white dark:bg-[#13151f] rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">Requisição inválida</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{validationError.message}</p>
            </div>
            <div className="bg-muted rounded-xl px-4 py-3 text-xs font-mono text-muted-foreground w-full text-left">
              <span className="text-red-500">erro:</span> {validationError.code}
            </div>
            <p className="text-xs text-muted-foreground">
              Se você é desenvolvedor, verifique os parâmetros da requisição OAuth2.
            </p>
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
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f8] dark:bg-[#0a0c12] p-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white dark:bg-[#13151f] rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

          <div className="p-8 space-y-7">
            {/* App identity */}
            <div className="flex flex-col items-center text-center space-y-3">
              {appInfo?.logoUrl ? (
                <img
                  src={appInfo.logoUrl}
                  alt={appInfo.appName}
                  className="h-14 w-14 rounded-xl object-cover shadow-sm border border-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              )}

              <div className="space-y-0.5">
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {appInfo ? `Entrar no ${appInfo.appName}` : 'Autenticar'}
                </h1>
                {appInfo && (
                  <p className="text-xs text-muted-foreground">{appInfo.companyName}</p>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={30}
                    autoComplete="username"
                    autoFocus
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                    placeholder="seu.usuario"
                    aria-invalid={!!errors.username}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-[#f8f9fb] dark:bg-[#0f1117] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 placeholder:text-muted-foreground/50"
                  />
                </div>
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    maxLength={128}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    className="w-full h-11 pl-9 pr-10 rounded-xl border border-border bg-[#f8f9fb] dark:bg-[#0f1117] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Autenticando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 flex items-center justify-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
            <p className="text-xs text-muted-foreground">
              Autenticação segura por <span className="font-semibold text-foreground">Prime Auth</span>
            </p>
          </div>
        </div>

        {/* Scope hint */}
        {scope && scope !== 'openid' && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Esta aplicação solicitará acesso a:{' '}
            <span className="font-medium text-foreground">{scope}</span>
          </p>
        )}
      </div>

      {/* Reset password modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#13151f] rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Redefinição de senha</p>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Para redefinir sua senha, entre em contato com o{' '}
                <strong className="text-foreground">administrador do sistema</strong> ou com a{' '}
                <strong className="text-foreground">equipe de TI</strong> responsável por esta aplicação.
              </p>

              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Eles poderão gerar um link seguro de redefinição e enviá-lo para você.
              </div>

              <button
                onClick={() => setShowResetModal(false)}
                className="mt-5 w-full h-10 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
