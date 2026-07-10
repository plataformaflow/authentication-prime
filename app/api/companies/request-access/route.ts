import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

function formatCNPJ(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatCPF(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

export async function POST(req: NextRequest) {
  const { session, error } = await withSession()
  if (error) return error
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    cnpj: z.string().min(1).optional(),
    cpf: z.string().min(1).optional(),
  }).refine(d => d.cnpj || d.cpf, { message: 'Informe CNPJ ou CPF.' }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message ?? 'Dados inválidos.' }, { status: 400 })

  const { cnpj, cpf } = parsed.data

  let company = null
  if (cnpj) {
    company = await prisma.company.findFirst({ where: { cnpj: formatCNPJ(cnpj) } })
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada com este CNPJ.' }, { status: 404 })
  } else if (cpf) {
    company = await prisma.company.findFirst({ where: { cpf: formatCPF(cpf) } })
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada com este CPF.' }, { status: 404 })
  }

  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
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
