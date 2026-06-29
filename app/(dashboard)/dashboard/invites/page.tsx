'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Mail, Building2 } from 'lucide-react'
import { apiErrorMessage } from '@/lib/validation'

interface Invite {
  id: string; status: string
  company: { id: string; name: string; cnpj: string; logoUrl?: string }
  createdAt: string
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [myRequests, setMyRequests] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/invites').then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d) })
    fetch('/api/companies/my-requests').then(r => r.json()).then(d => { if (Array.isArray(d)) setMyRequests(d) })
  }, [])

  async function handleRespond(inviteId: string, status: 'approved' | 'rejected') {
    setLoading(true)
    try {
      const res = await fetch(`/api/invites/${inviteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const data = await res.json()
      if (!res.ok) { toast.error(apiErrorMessage(data)); return }
      toast.success(status === 'approved' ? 'Convite aceito!' : 'Convite recusado.')
      setInvites(p => p.filter(i => i.id !== inviteId))
    } catch { toast.error('Erro ao responder.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Convites</h1>
        <p className="text-sm text-muted-foreground">Convites recebidos e suas solicitações</p>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Convites recebidos</h2>
        {invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum convite pendente.</p>
          </div>
        ) : invites.map(inv => (
          <div key={inv.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              {inv.company.logoUrl ? <img src={inv.company.logoUrl} alt="" className="w-9 h-9 rounded-md object-cover" /> : <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center"><Building2 className="w-4 h-4 text-muted-foreground" /></div>}
              <div>
                <p className="font-medium text-sm">{inv.company.name}</p>
                <p className="text-xs text-muted-foreground">{inv.company.cnpj}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleRespond(inv.id, 'approved')} disabled={loading} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-60">Aceitar</button>
              <button onClick={() => handleRespond(inv.id, 'rejected')} disabled={loading} className="px-3 py-1 text-xs border border-destructive text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-60">Recusar</button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Minhas solicitações</h2>
        {myRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação enviada.</p>
        ) : myRequests.map(req => (
          <div key={req.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <p className="font-medium text-sm">{req.company.name}</p>
              <p className="text-xs text-muted-foreground">{req.company.cnpj}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
              {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
