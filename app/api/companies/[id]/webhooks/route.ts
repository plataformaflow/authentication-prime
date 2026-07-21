import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar webhooks.' }, { status: 403 })

  const webhooks = await prisma.webhook.findMany({ where: { companyId: id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(webhooks.map(w => ({ id: w.id, url: w.url, active: w.active, createdAt: w.createdAt })))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar webhooks.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({ url: z.string().url() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })

  const secret = randomBytes(32).toString('hex')
  const webhook = await prisma.webhook.create({
    data: { companyId: id, url: parsed.data.url, secret },
  })
  return NextResponse.json({ id: webhook.id, url: webhook.url, active: webhook.active, createdAt: webhook.createdAt, secret }, { status: 201 })
}
