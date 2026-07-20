import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { setSession } from '@/lib/session'
import { ADMIN_EMAIL } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { name, email, password } = parsed.data
  const existing = await prisma.owner.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })

  const hashed = await hashPassword(password)
  const owner = await prisma.owner.create({ data: { name, email, password: hashed, isAdmin: email === ADMIN_EMAIL } })

  // Resolve pending app collaborator invites for this email
  const pendingCollabInvites = await prisma.appCollaboratorInvite.findMany({
    where: { toEmail: email, status: 'pending' },
  })
  if (pendingCollabInvites.length > 0) {
    await Promise.all(
      pendingCollabInvites.map(inv =>
        prisma.$transaction([
          prisma.appCollaborator.create({ data: { appId: inv.appId, ownerId: owner.id } }),
          prisma.appCollaboratorInvite.update({ where: { id: inv.id }, data: { status: 'accepted' } }),
        ])
      )
    )
  }

  // Resolve pending company invites for this email
  const pendingCompanyInvites = await prisma.companyInvite.findMany({
    where: { toEmail: email, status: 'pending', type: 'invite' },
  })
  if (pendingCompanyInvites.length > 0) {
    await Promise.all(
      pendingCompanyInvites.map(inv =>
        prisma.$transaction([
          prisma.companyMember.create({ data: { companyId: inv.companyId, ownerId: owner.id } }),
          prisma.companyInvite.update({ where: { id: inv.id }, data: { status: 'accepted' } }),
        ])
      )
    )
  }

  await setSession({ ownerId: owner.id, isAdmin: owner.isAdmin })
  return NextResponse.json({ ok: true })
}
