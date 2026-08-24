import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'
import { dispatchUserCreatedWebhook, userWebhookTargetFor } from '@/lib/webhooks-users'

// Botão "Sincronizar usuários" na seção de webhook do app (ver
// AppUserWebhookSection em app-detail-client.tsx) — reenvia todos os
// AppUsers já existentes desta aplicação, útil depois de configurar o
// webhook pela primeira vez ou depois de uma falha de envio.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const app = await prisma.oAuthApp.findFirst({
    where: { id, company: session.isAdmin ? undefined : { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
    select: { clientId: true, tenantSlug: true, userWebhookEnabled: true, userWebhookUrl: true, userWebhookSecret: true },
  })
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const target = userWebhookTargetFor(app)
  if (!target) return NextResponse.json({ error: 'Webhook de usuários não está ativado/configurado.' }, { status: 400 })

  const users = await prisma.appUser.findMany({ where: { appId: id }, select: { id: true, username: true, name: true } })

  const results = await Promise.allSettled(
    users.map(u => dispatchUserCreatedWebhook(target, { clientId: app.clientId, sub: u.id, username: u.username, name: u.name })),
  )
  const synced = results.filter(r => r.status === 'fulfilled' && r.value).length

  return NextResponse.json({ ok: true, synced, total: users.length })
}
