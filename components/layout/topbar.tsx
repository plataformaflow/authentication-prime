'use client'

import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { UserMenu } from './user-menu'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/dashboard/companies': 'Empresas',
  '/dashboard/apps': 'Aplicações',
  '/dashboard/invites': 'Convites',
  '/admin': 'Admin',
  '/admin/users': 'Usuários',
  '/admin/companies': 'Empresas',
  '/admin/apps': 'Aplicações',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/dashboard/companies/')) return 'Empresas'
  if (pathname.startsWith('/dashboard/apps/')) return 'Aplicações'
  if (pathname.startsWith('/admin/')) return 'Admin'
  return 'Painel'
}

interface TopbarProps {
  userName: string
  userEmail: string
}

export function Topbar({ userName, userEmail }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const pathname = usePathname()

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="font-semibold text-sm text-foreground">{getTitle(pathname)}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  )
}
