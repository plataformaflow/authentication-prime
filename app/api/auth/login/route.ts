import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { setSession } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/auth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { email, password } = parsed.data
  const owner = await prisma.owner.findUnique({ where: { email } })
  if (!owner || !(await verifyPassword(password, owner.password)))
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })

  let isAdmin = owner.isAdmin
  if (owner.email === ADMIN_EMAIL && !isAdmin) {
    await prisma.owner.update({ where: { id: owner.id }, data: { isAdmin: true } })
    isAdmin = true
  }

  await setSession({ ownerId: owner.id, isAdmin })
  return NextResponse.json({ ok: true })
}
