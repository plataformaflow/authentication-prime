import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tryDecryptSecret } from '@/lib/secretCrypto'
import { withSession } from '@/lib/middleware'
import { sendAppToWebhook } from '@/lib/webhooks'

// Reenvia todas as aplicações já existentes da empresa para um webhook específico,
// usando o client_secret decifrado a partir do valor já armazenado. Esta rota NUNCA
// grava nada em oAuthApp — o secret de uma aplicação só muda quando o usuário aciona
// a rotação manualmente. Aplicações cujo secret ainda está no formato legado (hash
// bcrypt, irreversível) simplesmente não têm o secret incluído no envio; o dono
// precisa rotacionar aquela aplicação especificamente, por conta própria, para que
// ela passe a ser sincronizável com secret.
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
  let pendingRotation = 0
  for (const app of apps) {
    const rawSecret = tryDecryptSecret(app.clientSecret)
    if (rawSecret === null) pendingRotation++

    try {
      await sendAppToWebhook(webhook, {
        companyId: company.id,
        companyName: company.name,
        appId: app.id,
        appName: app.name,
        clientId: app.clientId,
        clientSecret: rawSecret ?? undefined,
        redirectUris: app.redirectUris,
        defaultRedirectUri: app.defaultRedirectUri,
        tenantSlug: app.tenantSlug,
        scopes: app.scopes,
      })
      synced++
    } catch { /* melhor esforço — segue para as próximas aplicações */ }
  }

  return NextResponse.json({ ok: true, synced, total: apps.length, pendingRotation })
}
