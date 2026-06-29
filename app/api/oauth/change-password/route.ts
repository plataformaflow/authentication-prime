import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'
import { verifyJwt } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const schema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8).max(128) })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  try {
    const payload = await verifyJwt(auth.slice(7))
    const user = await prisma.appUser.findUnique({ where: { id: payload.sub as string } })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    if (!(await verifyPassword(parsed.data.oldPassword, user.password)))
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 })
    await prisma.appUser.update({ where: { id: user.id }, data: { password: await hashPassword(parsed.data.newPassword), mustChangePassword: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
  }
}
