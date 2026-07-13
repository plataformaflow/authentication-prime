import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

async function getAccess(appId: string, ownerId: string) {
  const byCompany = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (byCompany) return { ok: true, isCollab: false, collab: null }
  const collab = await prisma.appCollaborator.findUnique({ where: { appId_ownerId: { appId, ownerId } } })
  if (!collab) return { ok: false, isCollab: false, collab: null }
  return { ok: true, isCollab: true, collab }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const { ok } = await getAccess(id, session.ownerId)
  if (!ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const users = await prisma.appUser.findMany({
    where: { appId: id },
    select: {
      id: true, name: true, username: true, mustChangePassword: true, createdAt: true,
      createdByOwner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const { ok, isCollab, collab } = await getAccess(id, session.ownerId)
  if (!ok) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  if (isCollab && !collab!.canCreateUsers) {
    return NextResponse.json({ error: 'Sem permissão para criar usuários.' }, { status: 403 })
  }

  // Check max users limit for collaborators
  if (isCollab && collab!.maxUsers !== null) {
    const count = await prisma.appUser.count({ where: { appId: id } })
    if (count >= collab!.maxUsers!) {
      return NextResponse.json({ error: `Limite de ${collab!.maxUsers} usuários atingido.` }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(2),
    username: z.string().min(3).regex(/^[a-z0-9_.-]+$/),
    password: z.string().min(8),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const username = parsed.data.username.toLowerCase()
  const existing = await prisma.appUser.findUnique({ where: { username_appId: { username, appId: id } } })
  if (existing) return NextResponse.json({ error: 'Username já cadastrado neste app.' }, { status: 409 })

  const user = await prisma.appUser.create({
    data: {
      name: parsed.data.name,
      username,
      password: await hashPassword(parsed.data.password),
      appId: id,
      createdByOwnerId: session.ownerId,
    },
    select: {
      id: true, name: true, username: true, mustChangePassword: true, createdAt: true,
      createdByOwner: { select: { id: true, name: true } },
    },
  })

  await prisma.appAuditLog.create({
    data: { appId: id, actorId: session.ownerId, action: 'user.create', targetId: user.id, targetName: user.name, meta: JSON.stringify({ username }) },
  })

  return NextResponse.json(user, { status: 201 })
}
