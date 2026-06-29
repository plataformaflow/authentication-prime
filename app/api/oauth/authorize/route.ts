import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const client_id = searchParams.get('client_id') ?? ''
  const redirect_uri = searchParams.get('redirect_uri') ?? ''
  const response_type = searchParams.get('response_type') ?? ''
  const state = searchParams.get('state')
  const scope = searchParams.get('scope') ?? 'openid'
  const code_challenge = searchParams.get('code_challenge')
  const code_challenge_method = searchParams.get('code_challenge_method')

  if (!client_id || !redirect_uri || response_type !== 'code')
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const app = await prisma.oAuthApp.findUnique({ where: { clientId: client_id } })
  if (!app) return NextResponse.json({ error: 'invalid_client' }, { status: 400 })
  if (!app.redirectUris.includes(redirect_uri))
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri não autorizado.' }, { status: 400 })

  const params = new URLSearchParams({ client_id, redirect_uri, scope })
  if (state) params.set('state', state)
  if (code_challenge) params.set('code_challenge', code_challenge)
  if (code_challenge_method) params.set('code_challenge_method', code_challenge_method)

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/oauth/login?${params}`)
}
