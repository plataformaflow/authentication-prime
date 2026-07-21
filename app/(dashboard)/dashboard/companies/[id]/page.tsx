import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { CompanyDetailClient } from './company-detail-client'

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d
}

function fillDays(data: Record<string, Record<string, number>>, days: number): Array<{ date: string; success: number; failed: number }> {
  const result: Array<{ date: string; success: number; failed: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const entry = data[key] ?? { success: 0, failed: 0 }
    result.push({ date: key, success: entry.success, failed: entry.failed })
  }
  return result
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()

  const company = await prisma.company.findFirst({
    where: { id, OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] },
    include: {
      apps: { include: { _count: { select: { users: true, authEvents: true } } } },
      _count: { select: { apps: true } },
      members: { include: { owner: { select: { id: true, name: true, email: true } } } },
      webhooks: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!company) redirect('/dashboard/companies')

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

  const analytics = {
    totalSuccess, totalFailed, activeUsers: allActiveUsers.size,
    dailyData: fillDays(byDay, 30),
    apps: Object.values(byApp).map(a => ({ appId: a.appId, appName: a.appName, success: a.success, failed: a.failed, activeUsers: a.activeUsers.size, totalUsers: userCountMap[a.appId] ?? 0 })),
  }

  const companyWithRole = {
    ...company,
    role: company.ownerId === session.ownerId ? 'owner' : 'member',
    webhooks: company.webhooks.map(w => ({ id: w.id, url: w.url, active: w.active, createdAt: w.createdAt })),
  }

  return (
    <CompanyDetailClient
      id={id}
      initialCompany={JSON.parse(JSON.stringify(companyWithRole))}
      initialAnalytics={analytics}
    />
  )
}
