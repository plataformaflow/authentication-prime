import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

export interface SessionData {
  ownerId: string
  isAdmin: boolean
}

const COOKIE_NAME = 'prime_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-session-secret-change-in-production'
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

function encode(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = sign(payload)
  return `${payload}.${sig}`
}

function decode(cookie: string): SessionData | null {
  const dot = cookie.lastIndexOf('.')
  if (dot === -1) return null
  const payload = cookie.slice(0, dot)
  const sig = cookie.slice(dot + 1)
  try {
    const expected = sign(payload)
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return null
  return decode(raw)
}

export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, encode(data), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
