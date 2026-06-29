import { NextResponse } from 'next/server'
import { getSession, type SessionData } from './session'

export async function withSession(): Promise<{ session: SessionData; error: null } | { session: null; error: NextResponse }> {
  const session = await getSession()
  if (!session) return { session: null, error: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
  return { session, error: null }
}
