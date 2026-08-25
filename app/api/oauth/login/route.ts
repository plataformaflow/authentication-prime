import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { generateAuthCode } from '@/lib/oauth/code'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

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
  if (app.applyTenantAfterLogin && app.tenantSlug) {
    // tenantDomain (configurado explicitamente) é o domínio-base correto
    // para aplicar o tenant. Sem ele, cai no host do próprio redirect_uri
    // — mas isso está errado quando esse host já tem um subdomínio fixo
    // (ex.: "app.primevisita.com.br" viraria "teste.app.primevisita.com.br"
    // em vez de "teste.primevisita.com.br").
    redirectUrl.hostname = `${app.tenantSlug}.${app.tenantDomain || redirectUrl.hostname}`
  }
  redirectUrl.searchParams.set('code', code)
  if (state) redirectUrl.searchParams.set('state', state)

  // Quando a aplicação ativou o aviso de senha provisória, a própria tela de
  // login mostra o banner e resolve a troca antes de redirecionar — por isso
  // não anexamos "must_change_password" aqui (evitaria informação obsoleta
  // caso o usuário troque a senha na hora). Sem a flag, mantém o
  // comportamento antigo: a aplicação cliente é quem trata o aviso.
  if (user.mustChangePassword && app.provisionalPasswordEnabled) {
    const rawToken = randomBytes(36).toString('hex')
    await prisma.passwordResetToken.create({
      data: { tokenHash: sha256(rawToken), appUserId: user.id, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    })
    return NextResponse.json({ redirect: redirectUrl.toString(), mustChangePassword: true, resetToken: rawToken })
  }

  if (user.mustChangePassword) redirectUrl.searchParams.set('must_change_password', '1')
  return NextResponse.json({ redirect: redirectUrl.toString() })
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();

  url.pathname = "/oauth/login";

  return NextResponse.redirect(url, 307);
}