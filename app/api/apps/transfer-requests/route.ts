import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

// GET — list all pending transfer requests where the session user is the target company owner
export async function GET() {
  const { session, error } = await withSession()
  if (error) return error

  const requests = await prisma.appTransferRequest.findMany({
    where: {
      status: 'pending',
      toCompany: { ownerId: session.ownerId },
    },
    include: {
      app: { select: { id: true, name: true } },
      toCompany: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}
