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

function formatCNPJ(raw: string) {
  const d = raw.replace(/[^\d]/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
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
    logoUrl: z.string().url().optional().or(z.literal('')),
    description: z.string().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const { cnpj, ...rest } = parsed.data
  if (cnpj) {
    if (!validateCNPJ(cnpj)) return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
    const exists = await prisma.company.findUnique({ where: { cnpj: formatCNPJ(cnpj) } })
    if (exists && exists.id !== id) return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 409 })
  }
  const updated = await prisma.company.update({ where: { id }, data: { ...rest, logoUrl: rest.logoUrl || null, ...(cnpj ? { cnpj: formatCNPJ(cnpj) } : {}) } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode excluir.' }, { status: 403 })
  await prisma.company.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
