'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Sun, Moon, LogOut, LayoutDashboard, Building2, AppWindow, Mail, ShieldCheck } from 'lucide-react'
import { useTheme } from './theme-provider'
import { toast } from 'sonner'

const navLinks = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/companies', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/apps', label: 'Aplicativos', icon: AppWindow },
  { href: '/dashboard/invites', label: 'Convites', icon: Mail },
]

export default function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sessão encerrada.')
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="container max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <Link href="/dashboard" className="font-bold text-sm text-foreground shrink-0">Prime Auth</Link>
        <div className="flex items-center gap-1 flex-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname === href ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname.startsWith('/admin') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
