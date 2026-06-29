import { NextRequest, NextResponse } from 'next/server'
import { revokeAccessToken, revokeRefreshTokenRaw } from '@/lib/oauth/token'

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null)
  const token = body?.get('token') as string
  const hint = body?.get('token_type_hint') as string
  if (!token) return NextResponse.json({})
  try {
    if (hint === 'access_token') await revokeAccessToken(token)
    else if (hint === 'refresh_token') await revokeRefreshTokenRaw(token)
    else await revokeAccessToken(token).catch(() => revokeRefreshTokenRaw(token))
  } catch {}
  return NextResponse.json({})
}
