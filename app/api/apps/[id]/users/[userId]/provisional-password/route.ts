import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

async function getAppAccess(appId: string, ownerId: string, isAdmin = false): Promise<{ ok: boolean; canEdit: boolean }> {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: isAdmin ? undefined : { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return { ok: true, canEdit: true }
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  if (!collab) return { ok: false, canEdit: false }
  return { ok: true, canEdit: collab.canEditUsers }
}

// Define diretamente uma senha provisória (mustChangePassword: true) para um
// AppUser já existente. Diferente de /reset-password (que gera um link para o
// próprio usuário definir a senha depois), aqui o admin escolhe a senha na
// hora — só disponível quando o app tem provisionalPasswordEnabled ativado.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const access = await getAppAccess(id, session.ownerId, session.isAdmin)
  if (!access.ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (!access.canEdit) return NextResponse.json({ error: 'Sem permissão para editar usuários.' }, { status: 403 })

  const app = await prisma.oAuthApp.findUnique({ where: { id }, select: { provisionalPasswordEnabled: true } })
  if (!app?.provisionalPasswordEnabled) {
    return NextResponse.json({ error: 'Senha provisória não está ativada para esta aplicação.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = z.object({ password: z.string().min(8) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'A senha deve ter ao menos 8 caracteres.' }, { status: 400 })

  const user = await prisma.appUser.update({
    where: { id: userId },
    data: { password: await hashPassword(parsed.data.password), mustChangePassword: true },
    select: {
      id: true, name: true, username: true, mustChangePassword: true, createdAt: true,
      createdByOwner: { select: { id: true, name: true } },
    },
  })

  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.set_provisional_password', targetId: userId, targetName: user.name },
  })

  return NextResponse.json(user)
}
