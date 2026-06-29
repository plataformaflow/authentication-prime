import { createHash, randomBytes } from 'crypto'
import { prisma } from '../prisma'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function generateAuthCode(params: {
  appUserId: string
  appId: string
  redirectUri: string
  scope: string
  codeChallenge?: string
  codeChallengeMethod?: string
}) {
  const code = randomBytes(36).toString('hex')
  const codeHash = sha256(code)
  await prisma.authorizationCode.create({
    data: {
      codeHash,
      appUserId: params.appUserId,
      appId: params.appId,
      redirectUri: params.redirectUri,
      scope: params.scope,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  })
  return code
}

export async function verifyAuthCode(code: string, redirectUri: string, appId: string) {
  const codeHash = sha256(code)
  const record = await prisma.authorizationCode.findUnique({ where: { codeHash } })
  if (!record || record.used || record.expiresAt < new Date()) return null
  if (record.redirectUri !== redirectUri || record.appId !== appId) return null
  await prisma.authorizationCode.update({ where: { id: record.id }, data: { used: true } })
  return record
}
