import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const tenants = await prisma.blockedTenant.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(tenants)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(2).max(63),
    reason: z.string().max(300).optional(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Identificador de tenant inválido.' }, { status: 400 })

  const existing = await prisma.blockedTenant.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) return NextResponse.json({ error: 'Este tenant já está bloqueado.' }, { status: 409 })

  const blocked = await prisma.blockedTenant.create({
    data: { slug: parsed.data.slug, reason: parsed.data.reason?.trim() || null },
  })
  return NextResponse.json(blocked, { status: 201 })
}
