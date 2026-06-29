import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

function formatCNPJ(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export async function POST(req: NextRequest) {
  const { session, error } = await withSession()
  if (error) return error
  const body = await req.json().catch(() => null)
  const parsed = z.object({ cnpj: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
  const formatted = formatCNPJ(parsed.data.cnpj)
  const company = await prisma.company.findUnique({ where: { cnpj: formatted } })
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada com este CNPJ.' }, { status: 404 })
  if (company.ownerId === session.ownerId) return NextResponse.json({ error: 'Você já é o criador desta empresa.' }, { status: 400 })
  const alreadyMember = await prisma.companyMember.findUnique({ where: { companyId_ownerId: { companyId: company.id, ownerId: session.ownerId } } })
  if (alreadyMember) return NextResponse.json({ error: 'Você já é membro desta empresa.' }, { status: 409 })
  const caller = await prisma.owner.findUnique({ where: { id: session.ownerId } })
  if (!caller) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const existing = await prisma.companyInvite.findFirst({ where: { companyId: company.id, fromOwnerId: session.ownerId, type: 'request', status: 'pending' } })
  if (existing) return NextResponse.json({ error: 'Você já possui uma solicitação pendente para esta empresa.' }, { status: 409 })
  await prisma.companyInvite.create({ data: { companyId: company.id, type: 'request', toEmail: caller.email, fromOwnerId: session.ownerId } })
  return NextResponse.json({ ok: true, companyName: company.name }, { status: 201 })
}
