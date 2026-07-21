import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

async function requireOwnedWebhook(companyId: string, webhookId: string, ownerId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId } })
  if (!company) return null
  return prisma.webhook.findFirst({ where: { id: webhookId, companyId } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; webhookId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, webhookId } = await params
  const webhook = await requireOwnedWebhook(id, webhookId, session.ownerId)
  if (!webhook) return NextResponse.json({ error: 'Webhook não encontrado.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = z.object({ active: z.boolean() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const updated = await prisma.webhook.update({ where: { id: webhookId }, data: { active: parsed.data.active } })
  return NextResponse.json({ id: updated.id, url: updated.url, active: updated.active, createdAt: updated.createdAt })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; webhookId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, webhookId } = await params
  const webhook = await requireOwnedWebhook(id, webhookId, session.ownerId)
  if (!webhook) return NextResponse.json({ error: 'Webhook não encontrado.' }, { status: 404 })

  await prisma.webhook.delete({ where: { id: webhookId } })
  return NextResponse.json({ ok: true })
}
