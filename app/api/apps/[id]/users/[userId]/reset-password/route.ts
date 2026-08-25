import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

async function getAppAccess(appId: string, ownerId: string, isAdmin = false): Promise<{ ok: boolean; canEdit: boolean }> {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: isAdmin ? undefined : { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return { ok: true, canEdit: true }
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  if (!collab) return { ok: false, canEdit: false }
  return { ok: true, canEdit: collab.canEditUsers }
}

// Quando a aplicação tem senha provisória ativada (com uma senha padrão
// definida), "resetar senha" aplica essa senha diretamente ao usuário e liga
// mustChangePassword — o aviso e a troca acontecem no próprio login (ver
// POST /api/oauth/login). Sem a flag, mantém o fluxo antigo: gera um link de
// redefinição para o próprio usuário definir a senha depois.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const access = await getAppAccess(id, session.ownerId, session.isAdmin)
  if (!access.ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const app = await prisma.oAuthApp.findUnique({ where: { id }, select: { provisionalPasswordEnabled: true, provisionalPasswordDefault: true } })

  if (app?.provisionalPasswordEnabled && app.provisionalPasswordDefault) {
    if (!access.canEdit) return NextResponse.json({ error: 'Sem permissão para editar usuários.' }, { status: 403 })
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { password: await hashPassword(app.provisionalPasswordDefault), mustChangePassword: true },
      select: { name: true },
    })
    await prisma.appAuditLog.create({
      data: { appId: id, actorId: session.ownerId, action: 'user.set_provisional_password', targetId: userId, targetName: user.name },
    })
    return NextResponse.json({ provisional: true, password: app.provisionalPasswordDefault })
  }

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
