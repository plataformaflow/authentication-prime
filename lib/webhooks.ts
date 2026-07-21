import { createHmac } from 'crypto'
import { prisma } from './prisma'

export interface AppWebhookPayload {
  companyId: string
  companyName: string
  appId: string
  appName: string
  clientId: string
  /** Só disponível em 'app.created' (ou numa sincronização manual) — o servidor não guarda o valor bruto depois. */
  clientSecret?: string
  redirectUris: string[]
  defaultRedirectUri: string | null
  tenantSlug: string | null
  scopes: string[]
}

function buildPayload(event: string, params: AppWebhookPayload) {
  return JSON.stringify({
    event,
    company: { id: params.companyId, name: params.companyName },
    app: {
      id: params.appId,
      name: params.appName,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      redirectUris: params.redirectUris,
      defaultRedirectUri: params.defaultRedirectUri,
      tenantSlug: params.tenantSlug,
      scopes: params.scopes,
    },
  })
}

async function sendToWebhook(webhook: { url: string; secret: string }, payload: string) {
  const signature = createHmac('sha256', webhook.secret).update(payload).digest('hex')
  await fetch(webhook.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PrimeAuth-Signature': signature },
    body: payload,
  })
}

export async function dispatchAppWebhooks(event: 'app.created' | 'app.updated', params: AppWebhookPayload) {
  const webhooks = await prisma.webhook.findMany({ where: { companyId: params.companyId, active: true } })
  if (webhooks.length === 0) return

  const payload = buildPayload(event, params)
  await Promise.allSettled(webhooks.map(wh => sendToWebhook(wh, payload)))
}

/** Envia o payload de uma aplicação para um único webhook (usado na sincronização manual). */
export async function sendAppToWebhook(webhook: { url: string; secret: string }, params: AppWebhookPayload) {
  await sendToWebhook(webhook, buildPayload('app.created', params))
}
