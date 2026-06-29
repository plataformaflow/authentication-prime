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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  return NextResponse.json(app)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(2).optional(),
    redirectUris: z.array(z.string().url()).min(1).optional(),
    scopes: z.array(z.string()).optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const data: Record<string, unknown> = {}
  if (parsed.data.name) data.name = parsed.data.name
  if (parsed.data.redirectUris) data.redirectUris = parsed.data.redirectUris
  if (parsed.data.scopes) data.scopes = parsed.data.scopes
  await prisma.oAuthApp.update({ where: { id }, data })
  const updated = await ownerApp(id, session.ownerId)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  await prisma.oAuthApp.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
