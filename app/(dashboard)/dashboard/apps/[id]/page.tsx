import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { AppDetailClient } from './app-detail-client'

type AppAccess = 'full' | 'collaborator' | null

async function getAppAccess(appId: string, ownerId: string): Promise<{ access: AppAccess; collab?: { canViewAnalytics: boolean; canCreateUsers: boolean; canEditUsers: boolean; canDeleteUsers: boolean; maxUsers: number | null } }> {
  const app = await prisma.oAuthApp.findFirst({
    where: { id: appId, company: { OR: [{ ownerId }, { members: { some: { ownerId } } }] } },
  })
  if (app) return { access: 'full' }
  const collab = await prisma.appCollaborator.findUnique({
    where: { appId_ownerId: { appId, ownerId } },
  })
  if (!collab) return { access: null }
  return {
    access: 'collaborator',
    collab: { canViewAnalytics: collab.canViewAnalytics, canCreateUsers: collab.canCreateUsers, canEditUsers: collab.canEditUsers, canDeleteUsers: collab.canDeleteUsers ?? false, maxUsers: collab.maxUsers },
  }
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d
}

async function getAnalytics(appId: string) {
  const since = daysAgo(30)
  const events = await prisma.authEvent.findMany({
    where: { appId, createdAt: { gte: since } },
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
  return {
    loginSuccess, loginFailed, tokenIssued, tokenRefreshed,
    activeUsers: activeUsers.size, totalUsers,
    successRate: loginSuccess + loginFailed > 0 ? Math.round((loginSuccess / (loginSuccess + loginFailed)) * 100) : 0,
  }
}

export default async function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()

  const { access, collab } = await getAppAccess(id, session.ownerId)
  if (!access) redirect('/dashboard/apps')

  const app = await prisma.oAuthApp.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  })
  if (!app) redirect('/dashboard/apps')

  const canViewAnalytics = access === 'full' || !!collab?.canViewAnalytics
  const analytics = canViewAnalytics ? await getAnalytics(id) : null

  const initialApp = access === 'collaborator'
    ? {
        id: app.id, name: app.name, logoUrl: app.logoUrl, description: app.description,
        scopes: app.scopes, company: app.company, createdAt: app.createdAt,
        _access: 'collaborator' as const,
        _permissions: collab,
      }
    : { ...app, _access: 'full' as const }

  return (
    <AppDetailClient
      id={id}
      initialApp={JSON.parse(JSON.stringify(initialApp))}
      initialAnalytics={analytics}
    />
  )
}
