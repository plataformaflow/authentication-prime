export type FieldErrors = Record<string, string>

export function validateName(value: string, label = 'Nome'): string | null {
  if (!value.trim()) return `${label} é obrigatório.`
  if (value.trim().length < 2) return `${label} deve ter ao menos 2 caracteres.`
  if (value.length > 100) return `${label} deve ter no máximo 100 caracteres.`
  return null
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'E-mail é obrigatório.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail inválido.'
  if (value.length > 255) return 'E-mail deve ter no máximo 255 caracteres.'
  return null
}

export function validatePassword(value: string, label = 'Senha'): string | null {
  if (!value) return `${label} é obrigatória.`
  if (value.length < 8) return `${label} deve ter ao menos 8 caracteres.`
  if (value.length > 128) return `${label} deve ter no máximo 128 caracteres.`
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return `${label} deve conter letras e números.`
  return null
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Confirmação de senha é obrigatória.'
  if (password !== confirm) return 'As senhas não coincidem.'
  return null
}

export function validateUsername(value: string): string | null {
  if (!value.trim()) return 'Usuário é obrigatório.'
  if (value.length < 3) return 'Usuário deve ter ao menos 3 caracteres.'
  if (value.length > 30) return 'Usuário deve ter no máximo 30 caracteres.'
  if (!/^[a-z0-9_.‐]+$/.test(value)) return 'Usuário pode conter apenas letras minúsculas, números, pontos, hífens e underscores.'
  return null
}

export function validateDescription(value: string): string | null {
  if (value.length > 500) return 'Descrição deve ter no máximo 500 caracteres.'
  return null
}

export function validateLogoUrl(value: string): string | null {
  if (!value) return null
  if (value.length > 500) return 'URL deve ter no máximo 500 caracteres.'
  try { new URL(value) } catch { return 'URL inválida.' }
  return null
}

export function validateRedirectUris(value: string): string | null {
  const lines = value.split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length === 0) return 'Informe ao menos uma URI de redirecionamento.'
  if (lines.length > 10) return 'Máximo de 10 URIs de redirecionamento.'
  for (const line of lines) {
    try { new URL(line) } catch { return `URI inválida: ${line}` }
  }
  return null
}

export function validateScopes(scopes: string[]): string | null {
  if (!scopes || scopes.length === 0) return 'Selecione ao menos um escopo.'
  return null
}

export function apiErrorMessage(err: unknown, fallback = 'Erro inesperado.'): string {
  if (!err || typeof err !== 'object') return fallback
  const e = err as Record<string, unknown>
  if (typeof e.error === 'string') return e.error
  if (typeof e.message === 'string') return e.message
  return fallback
}
