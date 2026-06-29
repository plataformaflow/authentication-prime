import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '../prisma'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production')
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function issueAccessToken(p: { appUserId: string; appId: string; scope: string; username: string; name: string }) {
  const jti = randomBytes(16).toString('hex')
  const expiresIn = 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  const token = await new SignJWT({ sub: p.appUserId, username: p.username, name: p.name, scope: p.scope, aud: p.appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret())
  await prisma.accessToken.create({ data: { jti, appUserId: p.appUserId, appId: p.appId, scope: p.scope, expiresAt } })
  return { token, expiresIn }
}

export async function issueRefreshToken(p: { appUserId: string; appId: string; scope: string }) {
  const raw = randomBytes(48).toString('hex')
  const tokenHash = sha256(raw)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { tokenHash, ...p, expiresAt } })
  return raw
}

export async function verifyRefreshToken(raw: string) {
  const tokenHash = sha256(raw)
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { appUser: true } })
  if (!record || record.revoked || record.expiresAt < new Date()) return null
  return record
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret())
    const jti = payload.jti as string
    const record = await prisma.accessToken.findUnique({ where: { jti } })
    if (!record || record.revoked || record.expiresAt < new Date()) return null
    return payload
  } catch { return null }
}

export async function revokeAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret())
    const jti = payload.jti as string
    await prisma.accessToken.update({ where: { jti }, data: { revoked: true } }).catch(() => {})
  } catch {}
}

export async function revokeRefreshTokenRaw(raw: string) {
  const tokenHash = sha256(raw)
  await prisma.refreshToken.update({ where: { tokenHash }, data: { revoked: true } }).catch(() => {})
}
