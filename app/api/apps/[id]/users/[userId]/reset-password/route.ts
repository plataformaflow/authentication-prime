import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

async function ownerApp(id: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const raw = randomBytes(36).toString('hex')
  const tokenHash = sha256(raw)
  await prisma.passwordResetToken.create({ data: { tokenHash, appUserId: userId, expiresAt: new Date(Date.now() + 3600000) } })
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/oauth/reset-password?token=${raw}&appId=${id}`
  console.log(`[RESET] ${link}`)
  return NextResponse.json({ link })
}
