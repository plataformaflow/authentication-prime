import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function hasAppAccess(appId: string, ownerId: string) {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return true
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  return !!collab
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  if (!(await hasAppAccess(id, session.ownerId))) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
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
  if (!(await hasAppAccess(id, session.ownerId))) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { name: true } })
  await prisma.appUser.delete({ where: { id: userId } })
  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.delete', targetId: userId, targetName: user?.name },
  })
  return NextResponse.json({ ok: true })
}
