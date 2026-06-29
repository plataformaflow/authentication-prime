'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, Building2, AppWindow, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard/companies', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/apps', label: 'Aplicações', icon: AppWindow },
]

interface SidebarProps {
  userName: string
  userEmail: string
  isAdmin: boolean
}

export function Sidebar({ userName, userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const allItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[--sidebar] text-[--sidebar-foreground] transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[--sidebar-border]', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate text-[--sidebar-foreground]">Autenticação Prime</p>
            <p className="text-[10px] text-[--sidebar-foreground]/50 truncate">OAuth2 Server</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className={cn('ml-auto p-1 rounded-md hover:bg-[--sidebar-accent] text-[--sidebar-foreground]/60 hover:text-[--sidebar-foreground] transition-colors shrink-0', collapsed && 'ml-0')}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[--sidebar-foreground]/40">Menu</p>
        )}
        {allItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                active
                  ? 'bg-[--sidebar-accent] text-[--sidebar-foreground]'
                  : 'text-[--sidebar-foreground]/60 hover:bg-[--sidebar-accent] hover:text-[--sidebar-foreground]',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className={cn('border-t border-[--sidebar-border] p-3', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <div title={userName} className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mx-auto">
            {userName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-[--sidebar-foreground]">{userName}</p>
              <p className="text-[10px] text-[--sidebar-foreground]/50 truncate">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
