import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id: appId, inviteId } = await params

  const me = await prisma.owner.findUnique({ where: { id: session.ownerId }, select: { email: true } })
  if (!me) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

  const invite = await prisma.appCollaboratorInvite.findFirst({
    where: { id: inviteId, appId, toEmail: me.email, status: 'pending' },
  })
  if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({ action: z.enum(['accept', 'reject']) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })

  const { action } = parsed.data

  if (action === 'accept') {
    const alreadyCollab = await prisma.appCollaborator.findUnique({
      where: { appId_ownerId: { appId, ownerId: session.ownerId } },
    })
    if (!alreadyCollab) {
      await prisma.appCollaborator.create({ data: { appId, ownerId: session.ownerId } })
      await prisma.appAuditLog.create({
        data: { appId, actorId: session.ownerId, action: 'collaborator.add', targetId: session.ownerId },
      })
    }
    await prisma.appCollaboratorInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } })
    return NextResponse.json({ ok: true, action: 'accepted' })
  }

  await prisma.appCollaboratorInvite.update({ where: { id: inviteId }, data: { status: 'rejected' } })
  return NextResponse.json({ ok: true, action: 'rejected' })
}
