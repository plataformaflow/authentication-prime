import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode ver convites.' }, { status: 403 })
  const invites = await prisma.companyInvite.findMany({
    where: { companyId: id, status: 'pending' },
    include: { fromOwner: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invites)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode convidar.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({ email: z.string().email() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  const { email } = parsed.data
  const caller = await prisma.owner.findUnique({ where: { id: session.ownerId } })
  if (caller?.email === email) return NextResponse.json({ error: 'Você não pode se convidar.' }, { status: 400 })
  const target = await prisma.owner.findUnique({ where: { email } })
  if (target) {
    if (target.id === company.ownerId) return NextResponse.json({ error: 'Este usuário já é o criador.' }, { status: 409 })
    const alreadyMember = await prisma.companyMember.findUnique({ where: { companyId_ownerId: { companyId: id, ownerId: target.id } } })
    if (alreadyMember) return NextResponse.json({ error: 'Usuário já é membro.' }, { status: 409 })
  }
  const existing = await prisma.companyInvite.findFirst({ where: { companyId: id, toEmail: email, status: 'pending', type: 'invite' } })
  if (existing) return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail.' }, { status: 409 })
  const invite = await prisma.companyInvite.create({
    data: { companyId: id, type: 'invite', toEmail: email, fromOwnerId: session.ownerId },
    include: { fromOwner: { select: { name: true, email: true } } },
  })
  return NextResponse.json(invite, { status: 201 })
}
