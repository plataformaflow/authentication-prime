import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id } = await params

  const app = await prisma.oAuthApp.findFirst({
    where: { id, company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
  })
  if (!app) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const url = req.nextUrl
  const from     = url.searchParams.get('from')
  const to       = url.searchParams.get('to')
  const actorId  = url.searchParams.get('actorId')
  const action   = url.searchParams.get('action')
  const doExport = url.searchParams.get('export') === 'csv'

  const where: { appId: string; createdAt?: { gte?: Date; lte?: Date }; actorId?: string; action?: string } = { appId: id }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    }
  }
  if (actorId) where.actorId = actorId
  if (action)  where.action  = action

  const logs = await prisma.appAuditLog.findMany({
    where,
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    ...(doExport ? {} : { take: 200 }),
  })

  if (doExport) {
    const rows = [
      ['Data', 'Hora', 'Ator', 'E-mail do ator', 'Ação', 'Alvo', 'Detalhes'],
      ...logs.map(l => {
        const d = new Date(l.createdAt)
        let details = ''
        try { details = l.meta ? JSON.stringify(JSON.parse(l.meta)) : '' } catch { details = l.meta ?? '' }
        return [
          d.toLocaleDateString('pt-BR'),
          d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          l.actor.name,
          l.actor.email,
          l.action,
          l.targetName ?? l.targetId ?? '',
          details,
        ]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="atividade-${id}.csv"`,
      },
    })
  }

  // Return logs + distinct actors for filter dropdown
  const actors = await prisma.appAuditLog.findMany({
    where: { appId: id },
    select: { actor: { select: { id: true, name: true } } },
    distinct: ['actorId'],
  })

  return NextResponse.json({ logs, actors: actors.map(a => a.actor) })
}
