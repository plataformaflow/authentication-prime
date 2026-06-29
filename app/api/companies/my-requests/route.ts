import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await withSession()
  if (error) return error
  const requests = await prisma.companyInvite.findMany({
    where: { fromOwnerId: session.ownerId, type: 'request' },
    include: { company: { select: { id: true, name: true, cnpj: true, logoUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}
