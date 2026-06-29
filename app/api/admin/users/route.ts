import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  const owners = await prisma.owner.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, phone: true, isAdmin: true, createdAt: true, _count: { select: { companies: true } } },
  })
  return NextResponse.json(owners)
}
