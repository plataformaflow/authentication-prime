import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

async function ownerApp(id: string, ownerId: string) {
  return prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const users = await prisma.appUser.findMany({
    where: { appId: id },
    select: { id: true, name: true, username: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await ownerApp(id, session.ownerId)
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const schema = z.object({
    name: z.string().min(2),
    username: z.string().min(3).regex(/^[a-z0-9_.-]+$/),
    password: z.string().min(8),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const username = parsed.data.username.toLowerCase()
  const existing = await prisma.appUser.findUnique({ where: { username_appId: { username, appId: id } } })
  if (existing) return NextResponse.json({ error: 'Username já cadastrado neste app.' }, { status: 409 })
  const user = await prisma.appUser.create({
    data: { name: parsed.data.name, username, password: await hashPassword(parsed.data.password), appId: id },
    select: { id: true, name: true, username: true, mustChangePassword: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
