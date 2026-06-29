import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const body = await req.json().catch(() => null)

  if (action === 'reset') {
    const parsed = z.object({ token: z.string(), newPassword: z.string().min(8) }).safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    const tokenHash = sha256(parsed.data.token)
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!record || record.used || record.expiresAt < new Date())
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 })
    await prisma.appUser.update({ where: { id: record.appUserId }, data: { password: await hashPassword(parsed.data.newPassword), mustChangePassword: false } })
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } })
    return NextResponse.json({ ok: true })
  }

  const parsed = z.object({ username: z.string().min(1), appId: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const user = await prisma.appUser.findUnique({ where: { username_appId: { username: parsed.data.username, appId: parsed.data.appId } } })
  if (user) {
    const raw = randomBytes(36).toString('hex')
    const tokenHash = sha256(raw)
    await prisma.passwordResetToken.create({ data: { tokenHash, appUserId: user.id, expiresAt: new Date(Date.now() + 3600000) } })
    console.log(`[RESET] ${user.username} → ${process.env.NEXT_PUBLIC_APP_URL}/oauth/reset-password?token=${raw}&appId=${parsed.data.appId}`)
  }
  return NextResponse.json({ ok: true })
}
