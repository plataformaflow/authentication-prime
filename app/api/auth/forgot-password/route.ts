import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomInt, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetCode } from '@/lib/email'

const schema = z.object({ email: z.string().email() })
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const CODE_TTL_MS = 10 * 60 * 1000

const limiter = new Map<string, { count: number; reset: number }>()
function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const e = limiter.get(key)
  if (!e || e.reset < now) { limiter.set(key, { count: 1, reset: now + windowMs }); return false }
  if (e.count >= max) return true
  e.count++
  return false
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (rateLimited(`forgot:ip:${ip}`, 10, 15 * 60 * 1000) || rateLimited(`forgot:email:${parsed.data.email}`, 3, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })

  // Resposta sempre igual, exista ou não o e-mail, para não revelar quais contas existem.
  const owner = await prisma.owner.findUnique({ where: { email: parsed.data.email } })
  if (owner) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    await prisma.ownerPasswordReset.deleteMany({ where: { ownerId: owner.id } })
    await prisma.ownerPasswordReset.create({
      data: { ownerId: owner.id, codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    })
    const result = await sendPasswordResetCode(owner.email, code)
    if (!result.ok) console.error('[forgot-password] falha ao enviar e-mail', result.error)
  }

  return NextResponse.json({ ok: true })
}
