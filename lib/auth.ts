import { redirect } from 'next/navigation'
import { getSession, type SessionData } from './session'

// Conta admin única e fixa da plataforma — sempre que este e-mail loga ou se
// registra, vira (ou permanece) admin automaticamente. Não impede que outros
// owners também sejam promovidos a admin manualmente pelo painel.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'workzeca@gmail.com'

export async function requireSession(loginPath = '/login'): Promise<SessionData> {
  const session = await getSession()
  if (!session) redirect(loginPath)
  return session
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession()
  if (!session.isAdmin) redirect('/dashboard')
  return session
}
