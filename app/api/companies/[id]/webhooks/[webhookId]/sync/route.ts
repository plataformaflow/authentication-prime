import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'
import { sendAppToWebhook } from '@/lib/webhooks'

// Reenvia todas as aplicações já existentes da empresa para um webhook
// específico. Como o servidor só guarda o hash do client_secret, cada
// aplicação tem seu secret rotacionado aqui para poder ser enviado em texto
// puro — isso invalida o secret anterior de cada uma.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; webhookId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, webhookId } = await params

  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar webhooks.' }, { status: 403 })

  const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, companyId: id } })
  if (!webhook) return NextResponse.json({ error: 'Webhook não encontrado.' }, { status: 404 })

  const apps = await prisma.oAuthApp.findMany({ where: { companyId: id } })

  let synced = 0
  for (const app of apps) {
    const rawSecret = randomBytes(24).toString('hex')
    await prisma.oAuthApp.update({ where: { id: app.id }, data: { clientSecret: await hashPassword(rawSecret) } })

    try {
      await sendAppToWebhook(webhook, {
        companyId: company.id,
        companyName: company.name,
        appId: app.id,
        appName: app.name,
        clientId: app.clientId,
        clientSecret: rawSecret,
        redirectUris: app.redirectUris,
        defaultRedirectUri: app.defaultRedirectUri,
        tenantSlug: app.tenantSlug,
        scopes: app.scopes,
      })
      synced++
    } catch { /* melhor esforço — segue para as próximas aplicações */ }

    await prisma.appAuditLog.create({
      data: { appId: app.id, actorId: session.ownerId, action: 'app.secret_rotated_sync', meta: webhook.url },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, synced, total: apps.length })
}
