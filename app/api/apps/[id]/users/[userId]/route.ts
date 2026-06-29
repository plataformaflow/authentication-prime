import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function ownerApp(id: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(2).optional(),
    username: z.string().min(3).regex(/^[a-z0-9_.-]+$/).optional(),
    mustChangePassword: z.boolean().optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const updateData = { ...parsed.data, ...(parsed.data.username && { username: parsed.data.username.toLowerCase() }) }
  const updated = await prisma.appUser.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, username: true, mustChangePassword: true, createdAt: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, userId } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  await prisma.appUser.delete({ where: { id: userId } })
  return NextResponse.json({ ok: true })
}
