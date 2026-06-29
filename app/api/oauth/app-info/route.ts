import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')

  if (!clientId) return NextResponse.json({ error: 'client_id obrigatório.' }, { status: 400 })

  const app = await prisma.oAuthApp.findUnique({
    where: { clientId },
    include: { company: { select: { name: true, logoUrl: true } } },
  })

  if (!app) return NextResponse.json({ error: 'Aplicação não encontrada.', code: 'invalid_client' }, { status: 404 })

  if (redirectUri) {
    if (!app.redirectUris.includes(redirectUri)) {
      return NextResponse.json({ error: 'redirect_uri não está registrado para esta aplicação.', code: 'invalid_redirect_uri' }, { status: 400 })
    }
  }

  return NextResponse.json({
    appName: app.name,
    companyName: app.company.name,
    logoUrl: app.company.logoUrl,
    appId: app.id,
  })
}
