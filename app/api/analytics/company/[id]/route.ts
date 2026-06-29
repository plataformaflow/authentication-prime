import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSession } from '@/lib/middleware'

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d
}

function fillDays(data: Record<string, Record<string, number>>, days: number) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    result.push({ date: key, ...(data[key] ?? { success: 0, failed: 0 }) })
  }
  return result
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id: companyId } = await params
  const company = await prisma.company.findFirst({
    where: { id: companyId, OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] },
    include: { apps: { select: { id: true, name: true } } },
  })
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  const since = daysAgo(30)
  const appIds = company.apps.map(a => a.id)
  const events = await prisma.authEvent.findMany({ where: { appId: { in: appIds }, createdAt: { gte: since } } })
  const byDay: Record<string, Record<string, number>> = {}
  const byApp: Record<string, { appId: string; appName: string; success: number; failed: number; activeUsers: Set<string> }> = {}
  for (const a of company.apps) byApp[a.id] = { appId: a.id, appName: a.name, success: 0, failed: 0, activeUsers: new Set() }
  let totalSuccess = 0, totalFailed = 0
  const allActiveUsers = new Set<string>()
  for (const e of events) {
    const day = e.createdAt.toISOString().split('T')[0]
    if (!byDay[day]) byDay[day] = { success: 0, failed: 0 }
    const appEntry = byApp[e.appId]
    if (e.event === 'login_success') {
      byDay[day].success++; totalSuccess++
      if (e.appUserId) { appEntry?.activeUsers.add(e.appUserId); allActiveUsers.add(`${e.appId}:${e.appUserId}`) }
      if (appEntry) appEntry.success++
    }
    if (e.event === 'login_failed') { byDay[day].failed++; totalFailed++; if (appEntry) appEntry.failed++ }
  }
  const userCounts = await prisma.appUser.groupBy({ by: ['appId'], where: { appId: { in: appIds } }, _count: { id: true } })
  const userCountMap = Object.fromEntries(userCounts.map(r => [r.appId, r._count.id]))
  return NextResponse.json({
    totalSuccess, totalFailed, activeUsers: allActiveUsers.size,
    dailyData: fillDays(byDay, 30),
    apps: Object.values(byApp).map(a => ({ appId: a.appId, appName: a.appName, success: a.success, failed: a.failed, activeUsers: a.activeUsers.size, totalUsers: userCountMap[a.appId] ?? 0 })),
  })
}
