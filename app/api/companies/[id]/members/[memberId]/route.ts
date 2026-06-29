import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id, memberId } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode remover membros.' }, { status: 403 })
  await prisma.companyMember.delete({ where: { id: memberId } })
  return NextResponse.json({ ok: true })
}
