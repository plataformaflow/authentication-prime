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
    result.push({ date: key, ...(data[key] ?? { success: 0, failed: 0, tokenIssued: 0, tokenRefreshed: 0 }) })
  }
  return result
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await withSession()
  if (error) return error
  const { id: appId } = await params
  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId: session.ownerId }, { members: { some: { ownerId: session.ownerId } } }] } },
  })
  if (!app) return NextResponse.json({ error: 'App não encontrado.' }, { status: 404 })
  const since = daysAgo(30)
  const events = await prisma.authEvent.findMany({
    where: { appId, createdAt: { gte: since } },
    include: { appUser: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const byDay: Record<string, Record<string, number>> = {}
  const activeUsers = new Set<string>()
  let loginSuccess = 0, loginFailed = 0, tokenIssued = 0, tokenRefreshed = 0
  for (const e of events) {
    const day = e.createdAt.toISOString().split('T')[0]
    if (!byDay[day]) byDay[day] = { success: 0, failed: 0, tokenIssued: 0, tokenRefreshed: 0 }
    if (e.event === 'login_success') { byDay[day].success++; loginSuccess++; if (e.appUserId) activeUsers.add(e.appUserId) }
    if (e.event === 'login_failed') { byDay[day].failed++; loginFailed++ }
    if (e.event === 'token_issued') { byDay[day].tokenIssued++; tokenIssued++ }
    if (e.event === 'token_refreshed') { byDay[day].tokenRefreshed++; tokenRefreshed++ }
  }
  const totalUsers = await prisma.appUser.count({ where: { appId } })
  return NextResponse.json({
    loginSuccess, loginFailed, tokenIssued, tokenRefreshed,
    activeUsers: activeUsers.size, totalUsers,
    successRate: loginSuccess + loginFailed > 0 ? Math.round((loginSuccess / (loginSuccess + loginFailed)) * 100) : 0,
    dailyData: fillDays(byDay, 30),
    recentEvents: events.slice(0, 20).map(e => ({
      id: e.id, event: e.event, createdAt: e.createdAt,
      user: e.appUser ? { username: e.appUser.username, name: e.appUser.name } : null,
    })),
  })
}
