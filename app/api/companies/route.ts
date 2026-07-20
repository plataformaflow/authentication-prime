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

const companySchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
})

export async function GET() {
  const { session, error } = await withSession()
  if (error) return error
  const ownerId = session.ownerId
  const [owned, member] = await Promise.all([
    prisma.company.findMany({
      where: { ownerId },
      include: { _count: { select: { apps: true } }, members: { select: { id: true, owner: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findMany({
      where: { members: { some: { ownerId } } },
      include: { _count: { select: { apps: true } }, owner: { select: { name: true, email: true } }, members: { select: { id: true, owner: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return NextResponse.json([
    ...owned.map(c => ({ ...c, role: 'owner' })),
    ...member.map(c => ({ ...c, role: 'member' })),
  ])
}

export async function POST(req: NextRequest) {
  const { session, error } = await withSession()
  if (error) return error
  const body = await req.json().catch(() => null)
  const parsed = companySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { cnpj, cpf, ...rest } = parsed.data

  if (!cnpj && !cpf) return NextResponse.json({ error: 'Informe CPF ou CNPJ.' }, { status: 400 })
  if (cnpj && cpf) return NextResponse.json({ error: 'Informe apenas CPF ou CNPJ, não ambos.' }, { status: 400 })

  if (cnpj) {
    if (!validateCNPJ(cnpj)) return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
    const exists = await prisma.company.findFirst({ where: { cnpj: formatCNPJ(cnpj) } })
    if (exists) return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 409 })
  }

  if (cpf) {
    if (!validateCPF(cpf)) return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    const exists = await prisma.company.findFirst({ where: { cpf: formatCPF(cpf) } })
    if (exists) return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
  }

  const company = await prisma.company.create({
    data: {
      ...rest,
      logoUrl: rest.logoUrl || null,
      ...(cnpj ? { cnpj: formatCNPJ(cnpj) } : {}),
      ...(cpf ? { cpf: formatCPF(cpf) } : {}),
      ownerId: session.ownerId,
    },
    include: { _count: { select: { apps: true } } },
  })
  return NextResponse.json(company, { status: 201 })
}
