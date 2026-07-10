import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function getAppAccess(appId: string, ownerId: string): Promise<{ ok: boolean; isOwner: boolean; canEdit: boolean; canDelete: boolean }> {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return { ok: true, isOwner: true, canEdit: true, canDelete: true }
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  if (!collab) return { ok: false, isOwner: false, canEdit: false, canDelete: false }
  return { ok: true, isOwner: false, canEdit: collab.canEditUsers, canDelete: false }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const access = await getAppAccess(id, session.ownerId)
  if (!access.ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (!access.canEdit) return NextResponse.json({ error: 'Sem permissão para editar usuários.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(3).regex(/^[a-z0-9_.-]+$/).optional(),
    mustChangePassword: z.boolean().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const updateData = { ...parsed.data, ...(parsed.data.username && { username: parsed.data.username.toLowerCase() }) }
  const updated = await prisma.appUser.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, username: true, mustChangePassword: true, createdAt: true, createdByOwner: { select: { id: true, name: true } } },
  })
  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.update', targetId: userId, targetName: updated.name },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const access2 = await getAppAccess(id, session.ownerId)
  if (!access2.ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (!access2.canDelete) return NextResponse.json({ error: 'Sem permissão para excluir usuários.' }, { status: 403 })
  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { name: true } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  // Delete related records explicitly before deleting the user (old records may lack cascade metadata)
  await prisma.accessToken.deleteMany({ where: { appUserId: userId } }).catch(() => null)
  await prisma.refreshToken.deleteMany({ where: { appUserId: userId } }).catch(() => null)
  await prisma.authorizationCode.deleteMany({ where: { appUserId: userId } }).catch(() => null)
  await prisma.authEvent.deleteMany({ where: { appUserId: userId } }).catch(() => null)
  await prisma.appUser.delete({ where: { id: userId } })
  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.delete', targetId: userId, targetName: user.name },
  })
  return NextResponse.json({ ok: true })
}
