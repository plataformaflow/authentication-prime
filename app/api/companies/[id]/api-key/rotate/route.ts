import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar a chave de API.' }, { status: 403 })

  const rawKey = randomBytes(32).toString('hex')
  await prisma.company.update({ where: { id }, data: { apiKeyHash: await hashPassword(rawKey) } })
  return NextResponse.json({ apiKey: rawKey })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar a chave de API.' }, { status: 403 })

  await prisma.company.update({ where: { id }, data: { apiKeyHash: null } })
  return NextResponse.json({ ok: true })
}
