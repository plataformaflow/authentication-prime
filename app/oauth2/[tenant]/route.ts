import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params

  const blocked = await prisma.blockedTenant.findUnique({ where: { slug: tenant } })
  if (blocked) return NextResponse.json({ error: 'Este tenant está bloqueado.' }, { status: 403 })

  const app = await prisma.oAuthApp.findFirst({ where: { tenantSlug: tenant } })
  if (!app) return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })
  if (!app.defaultRedirectUri) return NextResponse.json({ error: 'Nenhum URI padrão configurado para este tenant.' }, { status: 400 })

  const state = req.nextUrl.searchParams.get('state')

  const params2 = new URLSearchParams({
    response_type: 'code',
    client_id: app.clientId,
    redirect_uri: app.defaultRedirectUri,
    scope: app.scopes.join(' '),
  })
  if (state) params2.set('state', state)

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/authorize?${params2}`)
}
