import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const app = await prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
  })
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const logs = await prisma.appAuditLog.findMany({
    where: { appId: id },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(logs)
}
