'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, AppWindow, ShieldBan } from 'lucide-react'

const ADMIN_TABS = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/companies', label: 'Empresas', icon: Building2 },
  { href: '/admin/apps', label: 'Aplicativos', icon: AppWindow },
  { href: '/admin/blocked-tenants', label: 'Tenants bloqueados', icon: ShieldBan },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-border overflow-x-auto mb-6">
      <div className="flex gap-0 min-w-max">
        {ADMIN_TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
