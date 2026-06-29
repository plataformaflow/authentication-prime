import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  const apps = await prisma.oAuthApp.findMany({
    orderBy: { createdAt: 'desc' },
    include: { company: { select: { id: true, name: true } }, _count: { select: { users: true, authEvents: true } } },
  })
  return NextResponse.json(apps)
}
