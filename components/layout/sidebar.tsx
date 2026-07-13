'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, AppWindow, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard/companies', label: 'Empresas', icon: Building2 },
  { href: '/dashboard/apps', label: 'Aplicações', icon: AppWindow },
]

interface SidebarProps {
  userName: string
  userEmail: string
  isAdmin: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ userName, userEmail, isAdmin, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const allItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <aside
      style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', borderRightColor: 'var(--sidebar-border)' }}
      className={cn(
        'flex flex-col h-screen border-r transition-all duration-300 shrink-0 z-40',
        // desktop: always visible, collapsible
        'hidden md:flex',
        collapsed ? 'md:w-16' : 'md:w-60',
        // mobile: fixed drawer
        mobileOpen && '!flex fixed inset-y-0 left-0 w-72 md:relative md:w-auto'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-[--sidebar-border]',
        collapsed && 'justify-center px-2'
      )}>
        <PrimeAuthShield />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate text-[--sidebar-foreground]">Prime Auth</p>
            <p className="text-[10px] text-[#d4a847] opacity-70 truncate">Central de Autenticação</p>
          </div>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => setCollapsed(p => !p)}
          className={cn(
            'ml-auto p-1 rounded-lg hover:bg-[--sidebar-accent] text-[--sidebar-foreground] opacity-40 hover:opacity-70 transition-all shrink-0 hidden md:flex',
            collapsed && 'ml-0'
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1 rounded-lg hover:bg-[--sidebar-accent] text-[--sidebar-foreground] opacity-40 hover:opacity-70 transition-all shrink-0 md:hidden"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[--sidebar-foreground] opacity-30">
            Menu
          </p>
        )}
        {allItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                active
                  ? 'bg-[--sidebar-accent] text-[--sidebar-foreground]'
                  : 'text-[--sidebar-foreground] opacity-50 hover:bg-[--sidebar-accent] hover:opacity-80',
                collapsed && 'justify-center px-0 w-10 mx-auto'
              )}
            >
              {/* Gold left indicator */}
              {active && !collapsed && (
                <span className="absolute left-0 inset-y-2 w-[3px] rounded-full bg-[#d4a847]" />
              )}
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#d4a847]' : '')} />
              {!collapsed && <span>{label}</span>}
              {active && collapsed && (
                <span className="absolute -right-1 inset-y-2 w-[3px] rounded-full bg-[#d4a847]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className={cn(
        'border-t border-[--sidebar-border] p-3',
        collapsed && 'flex justify-center'
      )}>
        {collapsed ? (
          <div
            title={userName}
            className="w-8 h-8 rounded-full bg-[#d4a847]/15 border border-[#d4a847]/30 flex items-center justify-center text-[#d4a847] text-xs font-bold"
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-[#d4a847]/15 border border-[#d4a847]/30 flex items-center justify-center text-[#d4a847] text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-[--sidebar-foreground]">{userName}</p>
              <p className="text-[10px] text-[--sidebar-foreground] opacity-45 truncate">{userEmail}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function PrimeAuthShield() {
  return (
    <svg viewBox="0 0 64 64" className="w-8 h-8 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 6 L54 15 L54 32 C54 44 44 54 32 58 C20 54 10 44 10 32 L10 15 Z" fill="#1a2f6b"/>
      <path d="M32 9 L51 17 L51 32 C51 42 43 51 32 55 C21 51 13 42 13 32 L13 17 Z" fill="none" stroke="#d4a847" strokeWidth="1.5"/>
      <circle cx="32" cy="24" r="5" fill="#d4a847"/>
      <path d="M20 40 C20 34 25.5 30 32 30 C38.5 30 44 34 44 40" fill="#d4a847"/>
      <path d="M24 35 L29 40 L41 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
