import { redirect } from 'next/navigation'
import { getSession, type SessionData } from './session'

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
