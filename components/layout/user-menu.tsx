'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

interface UserMenuProps {
  name: string
  email: string
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sessão encerrada.')
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-8 h-8 rounded-full bg-[#1a2f6b] flex items-center justify-center text-white text-xs font-bold hover:bg-[#152560] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a2f6b]/40 focus:ring-offset-1"
      >
        {name.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 bg-card border border-border rounded-2xl shadow-xl shadow-[#1a2550]/10 dark:shadow-black/30 overflow-hidden">
          <div className="h-0.5 bg-[#d4a847]" />
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-[#1a2550] dark:text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/8 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
