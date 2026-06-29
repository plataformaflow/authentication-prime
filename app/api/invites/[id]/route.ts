import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const owner = await prisma.owner.findUnique({ where: { id: session.ownerId } })
  if (!owner) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({ status: z.enum(['approved', 'rejected']) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  const invite = await prisma.companyInvite.findFirst({ where: { id, toEmail: owner.email, type: 'invite' } })
  if (!invite || invite.status !== 'pending') return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
  await prisma.companyInvite.update({ where: { id }, data: { status: parsed.data.status } })
  if (parsed.data.status === 'approved') {
    await prisma.companyMember.upsert({
      where: { companyId_ownerId: { companyId: invite.companyId, ownerId: session.ownerId } },
      create: { companyId: invite.companyId, ownerId: session.ownerId },
      update: {},
    })
  }
  return NextResponse.json({ ok: true })
}
