import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function ownerApp(id: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
    include: { company: true },
  })
}

// GET — return pending transfer request for this app
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const request = await prisma.appTransferRequest.findUnique({
    where: { appId: id },
    include: {
      toCompany: { select: { id: true, name: true, cnpj: true, cpf: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  })
  if (!request) return NextResponse.json(null)

  // Only visible to the requester or the target company owner
  const targetCompany = await prisma.company.findUnique({ where: { id: request.toCompanyId } })
  if (request.requestedById !== session.ownerId && targetCompany?.ownerId !== session.ownerId) {
    return NextResponse.json(null)
  }

  return NextResponse.json(request)
}

// POST — initiate transfer request
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    toCompanyId: z.string().min(1).optional(),
    cnpj: z.string().min(1).optional(),
    cpf: z.string().min(1).optional(),
  }).refine(d => d.toCompanyId || d.cnpj || d.cpf, { message: 'Informe a empresa destino.' }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message ?? 'Dados inválidos.' }, { status: 400 })

  let toCompanyId = parsed.data.toCompanyId
  if (!toCompanyId) {
    const formatCNPJ = (r: string) => r.replace(/[^\d]/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    const formatCPF = (r: string) => r.replace(/[^\d]/g, '').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    const found = parsed.data.cnpj
      ? await prisma.company.findFirst({ where: { cnpj: formatCNPJ(parsed.data.cnpj) } })
      : await prisma.company.findFirst({ where: { cpf: formatCPF(parsed.data.cpf!) } })
    if (!found) return NextResponse.json({ error: 'Empresa não encontrada com este documento.' }, { status: 404 })
    toCompanyId = found.id
  }

  if (toCompanyId === app.companyId) {
    return NextResponse.json({ error: 'A aplicação já pertence a esta empresa.' }, { status: 400 })
  }

  const targetCompany = await prisma.company.findFirst({
    where: { id: toCompanyId, OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] },
  })

  // Check if target company exists and requester has access
  const targetAny = await prisma.company.findUnique({ where: { id: toCompanyId } })
  if (!targetAny) return NextResponse.json({ error: 'Empresa destino não encontrada.' }, { status: 404 })

  // Check for existing pending request
  const existing = await prisma.appTransferRequest.findUnique({ where: { appId: id } })
  if (existing) return NextResponse.json({ error: 'Já existe uma solicitação de transferência pendente.' }, { status: 409 })

  // If requester owns or is member of target company → transfer immediately
  if (targetCompany) {
    const updated = await prisma.oAuthApp.update({
      where: { id },
      data: { companyId: toCompanyId },
      include: { company: true },
    })
    return NextResponse.json({ transferred: true, app: { ...updated, _access: 'full' } })
  }

  // Otherwise create a pending transfer request requiring approval
  const request = await prisma.appTransferRequest.create({
    data: {
      appId: id,
      fromCompanyId: app.companyId,
      toCompanyId,
      requestedById: session.ownerId,
      status: 'pending',
    },
    include: {
      toCompany: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ transferred: false, request }, { status: 201 })
}

// PUT — approve or reject a transfer request (called by target company owner)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = z.object({ action: z.enum(['approve', 'reject']) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const request = await prisma.appTransferRequest.findUnique({
    where: { appId: id },
    include: { toCompany: true },
  })
  if (!request || request.status !== 'pending') {
    return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })
  }

  if (request.toCompany.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'Apenas o dono da empresa destino pode responder.' }, { status: 403 })
  }

  if (parsed.data.action === 'approve') {
    await prisma.$transaction([
      prisma.oAuthApp.update({ where: { id }, data: { companyId: request.toCompanyId } }),
      prisma.appTransferRequest.delete({ where: { appId: id } }),
    ])
    return NextResponse.json({ ok: true, approved: true })
  } else {
    await prisma.appTransferRequest.delete({ where: { appId: id } })
    return NextResponse.json({ ok: true, approved: false })
  }
}

// DELETE — cancel a pending transfer request (called by requester)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const request = await prisma.appTransferRequest.findUnique({ where: { appId: id } })
  if (!request) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })
  if (request.requestedById !== session.ownerId) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  await prisma.appTransferRequest.delete({ where: { appId: id } })
  return NextResponse.json({ ok: true })
}
