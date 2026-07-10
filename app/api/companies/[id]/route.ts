import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

function validateCNPJ(raw: string): boolean {
  const cnpj = raw.replace(/[^\d]/g, '')
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (s: string, len: number) => {
    let sum = 0, pos = len - 7
    for (let i = len; i >= 1; i--) { sum += parseInt(s[len - i]) * pos--; if (pos < 2) pos = 9 }
    const r = sum % 11; return r < 2 ? 0 : 11 - r
  }
  return calc(cnpj, 12) === parseInt(cnpj[12]) && calc(cnpj, 13) === parseInt(cnpj[13])
}

function validateCPF(raw: string): boolean {
  const cpf = raw.replace(/[^\d]/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 || r === 11 ? 0 : r
  }
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10])
}

function formatCNPJ(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatCPF(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({
    where: { id, OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] },
    include: {
      apps: { include: { _count: { select: { users: true, authEvents: true } } } },
      _count: { select: { apps: true } },
      members: { include: { owner: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!company) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  return NextResponse.json({ ...company, role: company.ownerId === session.ownerId ? 'owner' : 'member' })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode editar.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(2).optional(),
    cnpj: z.string().optional(),
    cpf: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    description: z.string().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const { cnpj, cpf, ...rest } = parsed.data

  if (cnpj) {
    if (!validateCNPJ(cnpj)) return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
    const exists = await prisma.company.findFirst({ where: { cnpj: formatCNPJ(cnpj) } })
    if (exists && exists.id !== id) return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 409 })
  }

  if (cpf) {
    if (!validateCPF(cpf)) return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    const exists = await prisma.company.findFirst({ where: { cpf: formatCPF(cpf) } })
    if (exists && exists.id !== id) return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      ...rest,
      logoUrl: rest.logoUrl !== undefined ? (rest.logoUrl || null) : undefined,
      ...(cnpj ? { cnpj: formatCNPJ(cnpj), cpf: null } : {}),
      ...(cpf ? { cpf: formatCPF(cpf), cnpj: null } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode excluir.' }, { status: 403 })

  // Fetch all app IDs in this company first
  const apps = await prisma.oAuthApp.findMany({ where: { companyId: id }, select: { id: true } })
  const appIds = apps.map(a => a.id)

  if (appIds.length > 0) {
    // Delete all child records of these apps explicitly (old records may lack cascade metadata)
    await prisma.appAuditLog.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.appTransferRequest.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.appCollaboratorInvite.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.appCollaborator.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.authEvent.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.refreshToken.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.accessToken.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.authorizationCode.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.appUser.deleteMany({ where: { appId: { in: appIds } } }).catch(() => null)
    await prisma.oAuthApp.deleteMany({ where: { id: { in: appIds } } })
  }

  // Delete company-level records
  await prisma.appTransferRequest.deleteMany({ where: { toCompanyId: id } }).catch(() => null)
  await prisma.companyInvite.deleteMany({ where: { companyId: id } }).catch(() => null)
  await prisma.companyMember.deleteMany({ where: { companyId: id } }).catch(() => null)
  await prisma.company.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
