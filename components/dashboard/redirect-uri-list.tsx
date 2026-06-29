'use client'

import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface RedirectUriListProps {
  uris: string[]
  onChange: (uris: string[]) => void
  clientId?: string
  scopes?: string[]
  error?: string
}

async function buildOAuthUrl(uri: string, clientId: string, scopes: string[]) {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: uri,
    scope: scopes.join(' '),
    state: crypto.randomUUID(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return `/api/oauth/authorize?${params.toString()}`
}

export function RedirectUriList({ uris, onChange, clientId, scopes = ['openid', 'profile', 'email'], error }: RedirectUriListProps) {
  function update(index: number, value: string) {
    onChange(uris.map((u, i) => (i === index ? value : u)))
  }

  function remove(index: number) {
    onChange(uris.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...uris, ''])
  }

  async function openOAuth(uri: string) {
    if (!clientId) return
    if (!uri.trim()) { toast.error('URI vazia.'); return }
    const url = await buildOAuthUrl(uri, clientId, scopes)
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-2">
      {uris.map((uri, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="url"
            value={uri}
            onChange={e => update(i, e.target.value)}
            placeholder="https://meuapp.com/callback"
            className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {clientId && (
            <button
              type="button"
              onClick={() => openOAuth(uri)}
              title="Testar OAuth login com esta URI"
              className="h-9 px-2.5 flex items-center gap-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-indigo-600 hover:border-indigo-300 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Testar
            </button>
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={uris.length === 1}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar URI
      </button>
    </div>
  )
}
