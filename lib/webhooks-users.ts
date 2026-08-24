// Notifica o Prime Visita (ou qualquer sistema, mas hoje só ele) quando um
// AppUser é criado — configurado por aplicação (ver AppUserWebhookSection em
// app-detail-client.tsx: desativado por padrão, exige tenantSlug definido).
// Autenticado por segredo simples (Authorization: Bearer), diferente da
// assinatura HMAC do webhook de app.created/app.updated em lib/webhooks.ts —
// aqui o destino não é um webhook genérico configurável pelo dono da
// empresa, é sempre o mesmo sistema, então não precisa da mesma flexibilidade.

export interface UserWebhookTarget {
  url: string
  secret: string
}

export interface UserWebhookPayload {
  clientId: string
  sub: string
  username: string
  name: string
}

function buildPayload(params: UserWebhookPayload) {
  return JSON.stringify({
    event: 'user.created',
    clientId: params.clientId,
    user: { sub: params.sub, username: params.username, name: params.name },
  })
}

// Fire-and-forget: uma falha aqui (Prime Visita fora do ar, por exemplo) não
// deve impedir a criação do usuário neste servidor.
export async function dispatchUserCreatedWebhook(target: UserWebhookTarget, params: UserWebhookPayload): Promise<boolean> {
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.secret}` },
      body: buildPayload(params),
    })
    return res.ok
  } catch {
    return false
  }
}

// App elegível pra receber o webhook de usuário: opção ativada, URL e
// segredo configurados, E tenant definido (usuários só são enviados quando
// a aplicação já tem um tenant — sem isso, o Prime Visita não teria como
// resolver a qual empresa o usuário pertence de forma estável).
export function userWebhookTargetFor(app: {
  tenantSlug?: string | null
  userWebhookEnabled?: boolean
  userWebhookUrl?: string | null
  userWebhookSecret?: string | null
}): UserWebhookTarget | null {
  if (!app.tenantSlug || !app.userWebhookEnabled || !app.userWebhookUrl || !app.userWebhookSecret) return null
  return { url: app.userWebhookUrl, secret: app.userWebhookSecret }
}
