import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto'
import { verifyPassword } from './password'

const key = createHash('sha256').update(process.env.SECRET_ENCRYPTION_KEY ?? 'dev-secret-encryption-key-change-in-production').digest()
const ENCRYPTED_FORMAT = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i

export function encryptSecret(raw: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Retorna o valor em texto puro, ou null se `stored` não estiver no formato criptografado (ex.: hash bcrypt legado). */
export function tryDecryptSecret(stored: string): string | null {
  if (!ENCRYPTED_FORMAT.test(stored)) return null
  try {
    const [ivHex, tagHex, dataHex] = stored.split(':')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Verifica um client secret armazenado em qualquer um dos dois formatos (criptografado novo, ou hash bcrypt legado). */
export async function verifyClientSecret(raw: string, stored: string): Promise<boolean> {
  const decrypted = tryDecryptSecret(stored)
  if (decrypted !== null) {
    const a = Buffer.from(raw)
    const b = Buffer.from(decrypted)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  return verifyPassword(raw, stored)
}
