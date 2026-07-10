import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

async function hasAppAccess(appId: string, ownerId: string) {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return true
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  return !!collab
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  if (!(await hasAppAccess(id, session.ownerId))) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { name: true } })
  const raw = randomBytes(36).toString('hex')
  const tokenHash = sha256(raw)
  await prisma.passwordResetToken.create({ data: { tokenHash, appUserId: userId, expiresAt: new Date(Date.now() + 86400000) } })
  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.reset_password', targetId: userId, targetName: user?.name },
  })

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/oauth/reset-password?token=${raw}&appId=${id}`
  return NextResponse.json({ link })
}
