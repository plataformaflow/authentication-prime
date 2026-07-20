import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const { id } = await params
  await prisma.blockedTenant.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
