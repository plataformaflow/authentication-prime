import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, inviteId } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode responder convites.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({ status: z.enum(['approved', 'rejected']) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  const invite = await prisma.companyInvite.findFirst({ where: { id: inviteId, companyId: id } })
  if (!invite || invite.status !== 'pending') return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
  await prisma.companyInvite.update({ where: { id: inviteId }, data: { status: parsed.data.status } })
  if (parsed.data.status === 'approved') {
    const targetOwner = await prisma.owner.findUnique({ where: { email: invite.toEmail } })
    if (targetOwner) {
      await prisma.companyMember.upsert({
        where: { companyId_ownerId: { companyId: id, ownerId: targetOwner.id } },
        create: { companyId: id, ownerId: targetOwner.id },
        update: {},
      })
    }
  }
  return NextResponse.json({ ok: true })
}
