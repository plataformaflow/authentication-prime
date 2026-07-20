import { NextRequest, NextResponse } from 'next/server'
import type { Company } from '@prisma/client'
import { prisma } from './prisma'
import { verifyPassword } from './password'

export async function withCompanyApiKey(req: NextRequest): Promise<{ company: Company; error: null } | { company: null; error: NextResponse }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  const rawKey = authHeader.slice(7)
  if (!rawKey) {
    return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }

  const candidates = await prisma.company.findMany({ where: { apiKeyHash: { not: null } } })
  for (const company of candidates) {
    if (company.apiKeyHash && await verifyPassword(rawKey, company.apiKeyHash)) {
      return { company, error: null }
    }
  }
  return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
}
