import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJwt } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const payload = await verifyJwt(auth.slice(7))
    const jti = payload.jti as string
    const record = await prisma.accessToken.findUnique({ where: { jti } })
    if (!record || record.revoked || record.expiresAt < new Date())
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    const user = await prisma.appUser.findUnique({ where: { id: payload.sub as string } })
    if (!user) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    const scope = record.scope.split(' ')
    return NextResponse.json({ sub: user.id, ...(scope.includes('profile') && { username: user.username, name: user.name }) })
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
}
