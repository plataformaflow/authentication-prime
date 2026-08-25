import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

// Devolve a chave já gerada em texto puro — ver comentário no schema
// (Company.apiKey) sobre por que não é hash/criptografada.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params
  const company = await prisma.company.findFirst({ where: { id, ownerId: session.ownerId }, select: { apiKey: true } })
  if (!company) return NextResponse.json({ error: 'Apenas o criador pode gerenciar a chave de API.' }, { status: 403 })

  return NextResponse.json({ apiKey: company.apiKey })
}
