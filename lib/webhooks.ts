import { createHmac } from 'crypto'
import { prisma } from './prisma'

export async function dispatchAppWebhooks(event: 'app.created' | 'app.updated', params: {
  companyId: string
  companyName: string
  appId: string
  appName: string
  clientId: string
  /** Só disponível em 'app.created' — o servidor não guarda o valor bruto depois. */
  clientSecret?: string
  redirectUris: string[]
  defaultRedirectUri: string | null
  tenantSlug: string | null
  scopes: string[]
}) {
  const webhooks = await prisma.webhook.findMany({ where: { companyId: params.companyId, active: true } })
  if (webhooks.length === 0) return

  const payload = JSON.stringify({
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

  await Promise.allSettled(webhooks.map(async wh => {
    const signature = createHmac('sha256', wh.secret).update(payload).digest('hex')
    await fetch(wh.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PrimeAuth-Signature': signature },
      body: payload,
    })
  }))
}
