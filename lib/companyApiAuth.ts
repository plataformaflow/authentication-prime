import { NextRequest, NextResponse } from 'next/server'
import type { Company } from '@prisma/client'
import { prisma } from './prisma'

export async function withCompanyApiKey(req: NextRequest): Promise<{ company: Company; error: null } | { company: null; error: NextResponse }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  const rawKey = authHeader.slice(7)
  if (!rawKey) {
    return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }

  const company = await prisma.company.findFirst({ where: { apiKey: rawKey } })
  if (!company) {
    return { company: null, error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  return { company, error: null }
}
