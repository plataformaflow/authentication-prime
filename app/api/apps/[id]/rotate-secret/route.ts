import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { encryptSecret } from '@/lib/secretCrypto'
import { withSession } from '@/lib/middleware'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const app = await prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
  })
  if (!app) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  const rawSecret = randomBytes(24).toString('hex')
  await prisma.oAuthApp.update({ where: { id }, data: { clientSecret: encryptSecret(rawSecret) } })
  return NextResponse.json({ clientSecret: rawSecret })
}
