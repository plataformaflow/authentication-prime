import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await withSession()
  if (error) return error
  const owner = await prisma.owner.findUnique({ where: { id: session.ownerId } })
  if (!owner) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const invites = await prisma.companyInvite.findMany({
    where: { toEmail: owner.email, status: 'pending', type: 'invite' },
    include: { company: { select: { id: true, name: true, cnpj: true, logoUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invites)
}
