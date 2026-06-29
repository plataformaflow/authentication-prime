import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  const since30 = new Date(); since30.setDate(since30.getDate() - 30)
  const [totalOwners, totalCompanies, totalApps, totalUsers, totalEvents, recentOwners] = await Promise.all([
    prisma.owner.count(), prisma.company.count(), prisma.oAuthApp.count(), prisma.appUser.count(),
    prisma.authEvent.count({ where: { createdAt: { gte: since30 } } }),
    prisma.owner.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, isAdmin: true, createdAt: true, _count: { select: { companies: true } } } }),
  ])
  const events = await prisma.authEvent.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true, event: true } })
  const eventsByDay: Record<string, number> = {}
  for (const e of events) {
    const day = e.createdAt.toISOString().split('T')[0]
    if (e.event === 'login_success') eventsByDay[day] = (eventsByDay[day] ?? 0) + 1
  }
  const dailyLogins = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    dailyLogins.push({ date: key, logins: eventsByDay[key] ?? 0 })
  }
  return NextResponse.json({ totalOwners, totalCompanies, totalApps, totalUsers, totalEvents, dailyLogins, recentOwners })
}
