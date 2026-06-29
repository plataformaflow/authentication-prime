import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { apps: true } } },
  })
  return NextResponse.json(companies)
}
