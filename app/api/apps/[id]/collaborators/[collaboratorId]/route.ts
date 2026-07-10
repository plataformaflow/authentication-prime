import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function ownerOnly(appId: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
}

// PATCH — update collaborator permissions
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, collaboratorId } = await params

  const app = await ownerOnly(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    canViewAnalytics: z.boolean().optional(),
    canCreateUsers: z.boolean().optional(),
    maxUsers: z.number().int().min(1).nullable().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const collab = await prisma.appCollaborator.findFirst({ where: { id: collaboratorId, appId: id } })
  if (!collab) return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })

  const updated = await prisma.appCollaborator.update({
    where: { id: collaboratorId },
    data: {
      ...(parsed.data.canViewAnalytics !== undefined ? { canViewAnalytics: parsed.data.canViewAnalytics } : {}),
      ...(parsed.data.canCreateUsers !== undefined ? { canCreateUsers: parsed.data.canCreateUsers } : {}),
      ...(parsed.data.maxUsers !== undefined ? { maxUsers: parsed.data.maxUsers } : {}),
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(updated)
}

// DELETE — remove collaborator or invite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, collaboratorId } = await params

  const app = await ownerOnly(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const [collab, invite] = await Promise.all([
    prisma.appCollaborator.findFirst({ where: { id: collaboratorId, appId: id } }),
    prisma.appCollaboratorInvite.findFirst({ where: { id: collaboratorId, appId: id } }),
  ])

  if (collab) {
    await prisma.appCollaborator.delete({ where: { id: collaboratorId } })
    await prisma.appAuditLog.create({
      data: { appId: id, actorId: session.ownerId, action: 'collaborator.remove', targetId: collab.ownerId },
    })
  } else if (invite) {
    await prisma.appCollaboratorInvite.delete({ where: { id: collaboratorId } })
  } else {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
