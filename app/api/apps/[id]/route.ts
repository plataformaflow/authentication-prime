import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

type AppAccess = 'full' | 'collaborator' | null

async function getAppAccess(appId: string, ownerId: string): Promise<{ access: AppAccess; collab?: { canViewAnalytics: boolean; canCreateUsers: boolean; canEditUsers: boolean; canDeleteUsers: boolean; maxUsers: number | null } }> {
  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (app) return { access: 'full' }
  const collab = await prisma.appCollaborator.findUnique({
    where: { appId_ownerId: { appId, ownerId } },
  })
  if (!collab) return { access: null }
  return {
    access: 'collaborator',
    collab: { canViewAnalytics: collab.canViewAnalytics, canCreateUsers: collab.canCreateUsers, canEditUsers: collab.canEditUsers, canDeleteUsers: collab.canDeleteUsers ?? false, maxUsers: collab.maxUsers },
  }
}

async function ownerApp(id: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
    include: { company: true },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const { access, collab } = await getAppAccess(id, session.ownerId)
  if (!access) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const app = await prisma.oAuthApp.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  })
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  if (access === 'collaborator') {
    return NextResponse.json({
      id: app.id, name: app.name, logoUrl: app.logoUrl, description: app.description,
      scopes: app.scopes, company: app.company, createdAt: app.createdAt,
      _access: 'collaborator',
      _permissions: collab,
    })
  }

  return NextResponse.json({ ...app, _access: 'full' })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const { access } = await getAppAccess(id, session.ownerId)
  if (!access) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const body = await req.json().catch(() => null)

  if (access === 'collaborator') {
    const parsed = z.object({ name: z.string().min(2) }).safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    const updated = await prisma.oAuthApp.update({
      where: { id },
      data: { name: parsed.data.name },
      include: { company: { select: { id: true, name: true } } },
    })
    await prisma.appAuditLog.create({
      data: { appId: id, actorId: session.ownerId, action: 'app.rename', targetName: parsed.data.name },
    })
    return NextResponse.json({ ...updated, _access: 'collaborator' })
  }

  const parsed = z.object({
    name: z.string().min(2).optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    description: z.string().max(500).optional(),
    redirectUris: z.array(z.string().url()).min(1).optional(),
    scopes: z.array(z.string()).optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null
  if (parsed.data.redirectUris) data.redirectUris = parsed.data.redirectUris
  if (parsed.data.scopes) data.scopes = parsed.data.scopes

  await prisma.oAuthApp.update({ where: { id }, data })
  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'app.update', meta: JSON.stringify(Object.keys(data)) },
  })

  const updated = await ownerApp(id, session.ownerId)
  return NextResponse.json({ ...updated, _access: 'full' })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  // Delete all child records explicitly so old records without cascade metadata also work
  await prisma.appAuditLog.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.appTransferRequest.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.appCollaboratorInvite.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.appCollaborator.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.authEvent.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.refreshToken.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.accessToken.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.authorizationCode.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.appUser.deleteMany({ where: { appId: id } }).catch(() => null)
  await prisma.oAuthApp.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
