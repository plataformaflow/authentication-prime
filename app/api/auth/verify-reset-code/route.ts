import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

const schema = z.object({ email: z.string().email(), code: z.string().length(6) })
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const MAX_ATTEMPTS = 5
const TOKEN_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const invalid = () => NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })

  const owner = await prisma.owner.findUnique({ where: { email: parsed.data.email } })
  if (!owner) return invalid()

  const reset = await prisma.ownerPasswordReset.findFirst({
    where: { ownerId: owner.id, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!reset) return invalid()
  if (reset.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: 'Muitas tentativas. Solicite um novo código.' }, { status: 429 })

  const given = Buffer.from(sha256(parsed.data.code))
  const expected = Buffer.from(reset.codeHash)
  const matches = given.length === expected.length && timingSafeEqual(given, expected)

  if (!matches) {
    await prisma.ownerPasswordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } })
    return invalid()
  }

  const token = randomBytes(32).toString('hex')
  await prisma.ownerPasswordReset.update({
    where: { id: reset.id },
    data: { verified: true, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  })

  return NextResponse.json({ token })
}
