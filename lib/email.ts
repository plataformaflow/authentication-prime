import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Prime Auth <auth@mail.primevisita.com.br>'

function codeEmailHtml(code: string) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
    <p style="font-size: 15px; color: #0f172a; margin: 0 0 16px;">Use o código abaixo para redefinir sua senha no Prime Auth:</p>
    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; background: #eff6ff; border-radius: 12px; padding: 16px 24px; text-align: center; margin: 0 0 16px;">${code}</div>
    <p style="font-size: 13px; color: #64748b; margin: 0;">Esse código expira em 10 minutos. Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.</p>
  </div>`.trim()
}

// A SDK do Resend não lança exceção em erros da API (chave inválida, domínio
// não verificado, cota excedida etc.) — ela resolve normalmente com
// { data: null, error }. É preciso checar `error` explicitamente.
export async function sendPasswordResetCode(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: 'Seu código de verificação — Prime Auth',
      html: codeEmailHtml(code),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao enviar o e-mail.' }
  }
}
