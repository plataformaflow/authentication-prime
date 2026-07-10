'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Sun, Moon, Eye, EyeOff, AlertTriangle, X, ShieldAlert, LogIn } from 'lucide-react'
import { validateUsername, type FieldErrors, apiErrorMessage } from '@/lib/validation'

export default function OAuthLoginPage() {
  return <Suspense><OAuthLoginForm /></Suspense>
}

function OAuthLoginForm() {
  const searchParams = useSearchParams()

  // Always starts light; toggle is session-only
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    return () => {
      const saved = localStorage.getItem('theme')
      document.documentElement.classList.toggle('dark', saved === 'dark')
    }
  }, [])
  function toggleTheme() {
    setIsDark(prev => {
      document.documentElement.classList.toggle('dark', !prev)
      return !prev
    })
  }

  const [appInfo, setAppInfo] = useState<{
    appName: string; companyName: string
    companyLogoUrl?: string | null; appLogoUrl?: string | null; appId: string
  } | null>(null)
  const [validationError, setValidationError] = useState<{ message: string; code: string } | null>(null)
  const [validating, setValidating] = useState(true)
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  const clientId = searchParams.get('client_id') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const scope = searchParams.get('scope') ?? 'openid'
  const state = searchParams.get('state') ?? ''
  const codeChallenge = searchParams.get('code_challenge') ?? ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? ''

  useEffect(() => {
    if (!clientId) { setValidationError({ message: 'Parâmetro client_id ausente na requisição.', code: 'missing_client_id' }); setValidating(false); return }
    if (!redirectUri) { setValidationError({ message: 'Parâmetro redirect_uri ausente na requisição.', code: 'missing_redirect_uri' }); setValidating(false); return }
    fetch(`/api/oauth/app-info?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })}`)
      .then(r => r.json())
      .then(d => { if (d.error) setValidationError({ message: d.error, code: d.code ?? 'error' }); else setAppInfo(d) })
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      setRedirecting(true)
      window.location.href = data.redirect
    } catch { toast.error('Erro ao conectar com o servidor.') }
    finally { setLoading(false) }
  }

  if (validating) {
    return (
      <PageShell isDark={isDark} onToggle={toggleTheme}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#d4a847] border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    )
  }

  if (validationError) {
    return (
      <PageShell isDark={isDark} onToggle={toggleTheme}>
        <div className="bg-white dark:bg-[#13151f] rounded-2xl shadow-2xl shadow-black/10 p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-[#1a2550] dark:text-white text-lg">Requisição inválida</p>
            <p className="text-sm text-slate-500 mt-1">{validationError.message}</p>
          </div>
          <code className="w-full text-left bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-red-500">
            erro: {validationError.code}
          </code>
          <p className="text-xs text-slate-400">Se você é desenvolvedor, verifique os parâmetros da requisição OAuth2.</p>
        </div>
      </PageShell>
    )
  }

  if (redirecting) {
    return (
      <PageShell isDark={isDark} onToggle={toggleTheme}>
        <div className="bg-white dark:bg-[#13151f] rounded-2xl shadow-2xl shadow-[#1a2550]/10 dark:shadow-black/40 px-8 py-12 flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-[3px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
            <svg className="absolute w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-base font-bold text-[#1a2550] dark:text-white">Login realizado com sucesso!</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Redirecionando...</p>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell isDark={isDark} onToggle={toggleTheme}>
      {/* Card */}
      <div className="bg-white dark:bg-[#13151f] rounded-2xl shadow-2xl shadow-[#1a2550]/10 dark:shadow-black/40 overflow-hidden">
        <div className="px-8 pt-8 pb-7 space-y-6">

          {/* Logo pair: company → app */}
          <div className="flex items-center justify-center gap-5">
            <LogoCircle src={appInfo?.companyLogoUrl} fallbackLetter={appInfo?.companyName.charAt(0) ?? '?'} />

            {/* Dashed arrow */}
            <div className="flex items-center gap-1">
              <span className="w-2 h-[2px] bg-slate-300 rounded-full" />
              <span className="w-2 h-[2px] bg-slate-300 rounded-full" />
              <span className="w-2 h-[2px] bg-slate-300 rounded-full" />
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <LogoCircle src={appInfo?.appLogoUrl} fallbackLetter={appInfo?.appName.charAt(0) ?? '?'} />
          </div>

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-[#1a2550] dark:text-white leading-tight">
              Bem-vindo de volta!
            </h1>
            {appInfo && (
              <>
                <p className="text-[15px] text-slate-600 dark:text-slate-300">
                  Acesse sua conta do{' '}
                  <span className="text-indigo-600 font-semibold">{appInfo.appName}</span>
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{appInfo.companyName}</p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2550] dark:text-slate-200">Usuário</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" maxLength={30} autoComplete="username" autoFocus
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                  placeholder="seu.usuario"
                  aria-invalid={!!errors.username}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1117] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
                />
              </div>
              {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#1a2550] dark:text-slate-200">Senha</label>
                <button type="button" onClick={() => setShowResetModal(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type={showPassword ? 'text' : 'password'} maxLength={128} autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className="w-full h-12 pl-10 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1117] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-13 rounded-xl bg-[#1a2f6b] hover:bg-[#152560] active:scale-[0.98] text-white text-base font-semibold transition-all disabled:opacity-60 shadow-md shadow-[#1a2f6b]/30 flex items-center justify-center gap-2.5 mt-1" style={{height:'52px'}}>
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Divider + footer */}
        <div className="px-8 pb-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <PrimeAuthShieldSmall />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autenticação segura por <span className="font-semibold text-[#1a2550] dark:text-slate-200">Prime Auth</span>
            </p>
          </div>
        </div>
      </div>

      {/* Scopes */}
      {scope && (
        <div className="text-center mt-5 space-y-1">
          <p className="text-xs text-slate-500">Esta aplicação solicitará acesso a:</p>
          <p className="text-xs font-semibold text-indigo-600">{scope}</p>
        </div>
      )}

      {/* Reset password modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#13151f] rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="font-semibold text-sm text-[#1a2550] dark:text-white">Redefinição de senha</p>
                </div>
                <button onClick={() => setShowResetModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Para redefinir sua senha, entre em contato com o{' '}
                <strong className="text-[#1a2550] dark:text-white">administrador do sistema</strong> ou com a{' '}
                <strong className="text-[#1a2550] dark:text-white">equipe de TI</strong> responsável por esta aplicação.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                Eles poderão gerar um link seguro de redefinição e enviá-lo para você.
              </div>
              <button onClick={() => setShowResetModal(false)}
                className="mt-5 w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}

// ─── Page shell with background decorations ──────────────────────────────────

function PageShell({ children, isDark, onToggle }: { children: React.ReactNode; isDark: boolean; onToggle: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#e8edf8] dark:bg-[#0a0c12] overflow-hidden p-4">

      {/* Decoration: gold arc top-left */}
      <svg className="absolute top-0 left-0 w-48 h-48 pointer-events-none" viewBox="0 0 200 200" fill="none">
        <path d="M-20 160 Q60 60 180 -20" stroke="#d4a847" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M-20 190 Q80 80 200 -10" stroke="#d4a847" strokeWidth="1" strokeLinecap="round" opacity="0.25"/>
      </svg>

      {/* Decoration: dark navy + gold corner bottom-right */}
      <svg className="absolute bottom-0 right-0 w-52 h-52 pointer-events-none" viewBox="0 0 220 220" fill="none">
        <path d="M220 60 L220 220 L60 220 Q220 220 220 60Z" fill="#1a2f6b" opacity="0.9"/>
        <path d="M220 40 Q160 120 80 220" stroke="#d4a847" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <path d="M220 70 Q170 140 100 220" stroke="#d4a847" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
      </svg>

      {/* Theme toggle */}
      <button onClick={onToggle}
        className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 transition-colors z-10"
        title={isDark ? 'Modo claro' : 'Modo escuro'}>
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Content */}
      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  )
}

// ─── Logo circle (app/company) ────────────────────────────────────────────────

function LogoCircle({ src, fallbackLetter }: { src?: string | null; fallbackLetter: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1e2030] border-2 border-slate-100 dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden shrink-0">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xl font-bold text-[#1a2f6b] dark:text-indigo-400">{fallbackLetter.toUpperCase()}</span>
      )}
    </div>
  )
}

// ─── Prime Auth shield SVG ────────────────────────────────────────────────────


function PrimeAuthShieldSmall() {
  return (
    <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 6 L54 15 L54 32 C54 44 44 54 32 58 C20 54 10 44 10 32 L10 15 Z" fill="#1a2f6b"/>
      <path d="M32 9 L51 17 L51 32 C51 42 43 51 32 55 C21 51 13 42 13 32 L13 17 Z" fill="none" stroke="#d4a847" strokeWidth="1.5"/>
      <circle cx="32" cy="24" r="5" fill="#d4a847"/>
      <path d="M20 40 C20 34 25.5 30 32 30 C38.5 30 44 34 44 40" fill="#d4a847"/>
      <path d="M24 35 L29 40 L41 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

