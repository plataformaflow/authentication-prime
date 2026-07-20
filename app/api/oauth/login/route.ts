import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { generateAuthCode } from '@/lib/oauth/code'

const limiter = new Map<string, { count: number; reset: number }>()
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const e = limiter.get(key)
  if (!e || e.reset < now) { limiter.set(key, { count: 1, reset: now + windowMs }); return true }
  if (e.count >= max) return false
  e.count++; return true
}

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  clientId: z.string(),
  redirectUri: z.string().url(),
  scope: z.string().default('openid'),
  state: z.string().optional(),
  codeChallenge: z.string().optional(),
  codeChallengeMethod: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`login:${ip}`, 10, 60000))
    return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { password, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod } = parsed.data
  const username = parsed.data.username.toLowerCase()

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app || !app.redirectUris.includes(redirectUri))
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const user = await prisma.appUser.findUnique({ where: { username_appId: { username, appId: app.id } } })
  if (!user || !(await verifyPassword(password, user.password))) {
    prisma.authEvent.create({ data: { appId: app.id, event: 'login_failed', ip } }).catch(() => {})
    return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
  }

  prisma.authEvent.create({ data: { appId: app.id, appUserId: user.id, event: 'login_success', ip } }).catch(() => {})
  const code = await generateAuthCode({ appUserId: user.id, appId: app.id, redirectUri, scope, codeChallenge, codeChallengeMethod })
  const redirectUrl = new URL(redirectUri)
  if (app.applyTenantAfterLogin && app.tenantSlug) redirectUrl.hostname = `${app.tenantSlug}.${redirectUrl.hostname}`
  redirectUrl.searchParams.set('code', code)
  if (state) redirectUrl.searchParams.set('state', state)
  if (user.mustChangePassword) redirectUrl.searchParams.set('must_change_password', '1')
  return NextResponse.json({ redirect: redirectUrl.toString() })
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();

  url.pathname = "/oauth/login";

  return NextResponse.redirect(url, 307);
}