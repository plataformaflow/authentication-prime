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

export async function GET(req: NextRequest, { params }: { params: Promise<{ sub: string }> }) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`company-users:${ip}`, 60, 60000))
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const { company, error } = await withCompanyApiKey(req)
  if (error) return error

  const { sub } = await params
  const user = await prisma.appUser.findFirst({
    where: { id: sub, app: { companyId: company.id } },
    include: { app: { select: { id: true, name: true, tenantSlug: true } } },
  })
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    app: { id: user.app.id, name: user.app.name, tenantSlug: user.app.tenantSlug },
  })
}
