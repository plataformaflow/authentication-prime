import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function getAppAsCompanyUser(appId: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await getAppAsCompanyUser(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const [collaborators, invites] = await Promise.all([
    prisma.appCollaborator.findMany({
      where: { appId: id },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.appCollaboratorInvite.findMany({
      where: { appId: id, status: 'pending' },
      select: { id: true, toEmail: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ collaborators, invites })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await getAppAsCompanyUser(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({ email: z.string().email() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })

  const { email } = parsed.data

  // Check if already a collaborator
  const existing = await prisma.owner.findUnique({ where: { email } })
  if (existing) {
    const alreadyCollab = await prisma.appCollaborator.findUnique({
      where: { appId_ownerId: { appId: id, ownerId: existing.id } },
    })
    if (alreadyCollab) return NextResponse.json({ error: 'Usuário já é colaborador desta aplicação.' }, { status: 409 })
  }

  // Always send an invite — user must accept before becoming a collaborator
  const pendingInvite = await prisma.appCollaboratorInvite.findFirst({
    where: { appId: id, toEmail: email, status: 'pending' },
  })
  if (pendingInvite) return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail.' }, { status: 409 })

  const invite = await prisma.appCollaboratorInvite.upsert({
    where: { appId_toEmail: { appId: id, toEmail: email } },
    create: { appId: id, toEmail: email, fromOwnerId: session.ownerId, status: 'pending' },
    update: { status: 'pending', fromOwnerId: session.ownerId },
  })
  return NextResponse.json({ invite }, { status: 201 })
}
