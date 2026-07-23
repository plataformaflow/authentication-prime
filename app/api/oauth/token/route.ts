import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyClientSecret } from '@/lib/secretCrypto'
import { verifyAuthCode } from '@/lib/oauth/code'
import { issueAccessToken, issueRefreshToken, verifyRefreshToken, revokeRefreshTokenRaw } from '@/lib/oauth/token'
import { verifyCodeChallenge } from '@/lib/oauth/pkce'

const limiter = new Map<string, { count: number; reset: number }>()
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const e = limiter.get(key)
  if (!e || e.reset < now) { limiter.set(key, { count: 1, reset: now + windowMs }); return true }
  if (e.count >= max) return false
  e.count++; return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`token:${ip}`, 10, 60000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const body = Object.fromEntries((await req.formData()).entries()) as Record<string, string>
  let clientId = body.client_id
  let clientSecret = body.client_secret
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Basic ')) {
    const [id, sec] = Buffer.from(authHeader.slice(6), 'base64').toString().split(':')
    clientId = id; clientSecret = sec
  }
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'invalid_client' }, { status: 401 })

  const app = await prisma.oAuthApp.findUnique({ where: { clientId } })
  if (!app || !(await verifyClientSecret(clientSecret, app.clientSecret)))
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })

  const grantType = body.grant_type
  if (grantType === 'authorization_code') {
    const { code, redirect_uri, code_verifier } = body
    if (!code || !redirect_uri) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    const record = await verifyAuthCode(code, redirect_uri, app.id)
    if (!record) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    if (record.codeChallenge && record.codeChallengeMethod) {
      if (!code_verifier || !verifyCodeChallenge(code_verifier, record.codeChallenge, record.codeChallengeMethod))
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }
    const user = await prisma.appUser.findUnique({ where: { id: record.appUserId } })
    if (!user) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    const { token, expiresIn } = await issueAccessToken({ appUserId: user.id, appId: app.id, clientId: app.clientId, scope: record.scope, username: user.username, name: user.name })
    const refreshToken = await issueRefreshToken({ appUserId: user.id, appId: app.id, scope: record.scope })
    prisma.authEvent.create({ data: { appId: app.id, appUserId: user.id, event: 'token_issued', ip } }).catch(() => {})
    return NextResponse.json({ access_token: token, token_type: 'Bearer', expires_in: expiresIn, refresh_token: refreshToken, scope: record.scope })
  }
  if (grantType === 'refresh_token') {
    const raw = body.refresh_token
    if (!raw) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    const record = await verifyRefreshToken(raw)
    if (!record || record.appId !== app.id) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    const { token, expiresIn } = await issueAccessToken({ appUserId: record.appUser.id, appId: app.id, clientId: app.clientId, scope: record.scope, username: record.appUser.username, name: record.appUser.name })
    await revokeRefreshTokenRaw(raw)
    const newRefresh = await issueRefreshToken({ appUserId: record.appUser.id, appId: app.id, scope: record.scope })
    prisma.authEvent.create({ data: { appId: app.id, appUserId: record.appUser.id, event: 'token_refreshed', ip } }).catch(() => {})
    return NextResponse.json({ access_token: token, token_type: 'Bearer', expires_in: expiresIn, refresh_token: newRefresh, scope: record.scope })
  }
  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
