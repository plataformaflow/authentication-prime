import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await withSession()
  if (error) return error

  const me = await prisma.owner.findUnique({ where: { id: session.ownerId }, select: { email: true } })
  if (!me) return NextResponse.json([], { status: 200 })

  const invites = await prisma.appCollaboratorInvite.findMany({
    where: { toEmail: me.email, status: 'pending' },
    include: {
      app: { select: { id: true, name: true, logoUrl: true, company: { select: { id: true, name: true, logoUrl: true } } } },
      fromOwner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(invites)
}
