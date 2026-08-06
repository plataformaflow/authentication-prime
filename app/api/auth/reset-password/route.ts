import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/),
})
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const reset = await prisma.ownerPasswordReset.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
  })
  if (!reset || !reset.verified || reset.expiresAt < new Date())
    return NextResponse.json({ error: 'Link inválido ou expirado. Solicite a redefinição novamente.' }, { status: 400 })

  await prisma.owner.update({ where: { id: reset.ownerId }, data: { password: await hashPassword(parsed.data.password) } })
  await prisma.ownerPasswordReset.deleteMany({ where: { ownerId: reset.ownerId } })

  return NextResponse.json({ ok: true })
}
