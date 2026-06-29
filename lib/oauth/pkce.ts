import { createHash } from 'crypto'

export function verifyCodeChallenge(verifier: string, challenge: string, method: string) {
  if (method === 'S256') {
    const hash = createHash('sha256').update(verifier).digest('base64url')
    return hash === challenge
  }
  if (method === 'plain') return verifier === challenge
  return false
}
