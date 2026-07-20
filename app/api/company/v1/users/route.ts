import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCompanyApiKey } from '@/lib/companyApiAuth'

const limiter = new Map<string, { count: number; reset: number }>()
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const e = limiter.get(key)
  if (!e || e.reset < now) { limiter.set(key, { count: 1, reset: now + windowMs }); return true }
  if (e.count >= max) return false
  e.count++; return true
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`company-users:${ip}`, 60, 60000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const { company, error } = await withCompanyApiKey(req)
  if (error) return error

  const { searchParams } = req.nextUrl
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200)
  const cursor = searchParams.get('cursor') ?? undefined

  const users = await prisma.appUser.findMany({
    where: { app: { companyId: company.id } },
    include: { app: { select: { id: true, name: true, tenantSlug: true } } },
    orderBy: { id: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = users.length > limit
  const page = hasMore ? users.slice(0, limit) : users

  return NextResponse.json({
    users: page.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      app: { id: u.app.id, name: u.app.name, tenantSlug: u.app.tenantSlug },
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}
