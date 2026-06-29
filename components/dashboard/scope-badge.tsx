import { cn } from '@/lib/utils'

const SCOPE_COLORS: Record<string, string> = {
  openid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  profile: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  email: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
}

export function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SCOPE_COLORS[scope] ?? 'bg-muted text-muted-foreground')}>
      {scope}
    </span>
  )
}
