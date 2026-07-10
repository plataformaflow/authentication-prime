import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { withSession } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await withSession()
  if (error) return error

  const include = { company: { select: { id: true, name: true, logoUrl: true, cnpj: true, cpf: true } }, _count: { select: { users: true } } } as const

  // Apps owned via company (owner or company member)
  const ownedApps = await prisma.oAuthApp.findMany({
    where: { company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
    include,
    orderBy: { createdAt: 'desc' },
  })
  const ownedIds = new Set(ownedApps.map(a => a.id))

  // Apps the user is a direct collaborator on (not already in owned set)
  const collabEntries = await prisma.appCollaborator.findMany({
    where: { ownerId: session.ownerId },
    include: { app: { include } },
  })

  const collabApps = collabEntries
    .filter(e => !ownedIds.has(e.app.id))
    .map(e => ({
      ...e.app,
      _role: 'collaborator' as const,
      _permissions: {
        canViewAnalytics: e.canViewAnalytics,
        canCreateUsers: e.canCreateUsers,
        canEditUsers: e.canEditUsers,
        maxUsers: e.maxUsers,
      },
    }))

  const result = [
    ...ownedApps.map(a => ({ ...a, _role: 'owner' as const })),
    ...collabApps,
  ]

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { session, error } = await withSession()
  if (error) return error
  const body = await req.json().catch(() => null)
  const schema = z.object({
    name: z.string().min(2),
    companyId: z.string(),
    redirectUris: z.array(z.string().url()).min(1),
    scopes: z.array(z.string()).default(['openid', 'profile']),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, ownerId: session.ownerId } })
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  const clientId = randomBytes(16).toString('hex')
  const rawSecret = randomBytes(24).toString('hex')
  const clientSecret = await hashPassword(rawSecret)
  const app = await prisma.oAuthApp.create({
    data: { name: parsed.data.name, companyId: parsed.data.companyId, redirectUris: parsed.data.redirectUris, scopes: parsed.data.scopes, clientId, clientSecret },
  })
  return NextResponse.json({ ...app, clientSecret: rawSecret }, { status: 201 })
}
