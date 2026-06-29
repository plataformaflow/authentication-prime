import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  const { id } = await params
  if (id === session.ownerId) return NextResponse.json({ error: 'Não é possível alterar o próprio status.' }, { status: 400 })
  const owner = await prisma.owner.findUnique({ where: { id } })
  if (!owner) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const updated = await prisma.owner.update({ where: { id }, data: { isAdmin: !owner.isAdmin } })
  return NextResponse.json({ id: updated.id, isAdmin: updated.isAdmin })
}
