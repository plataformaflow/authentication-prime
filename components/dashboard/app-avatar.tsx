import { cn } from '@/lib/utils'

const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
]

function colorForName(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[hash]
}

interface AppAvatarProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }

export function AppAvatar({ name, logoUrl, size = 'md', className }: AppAvatarProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn('rounded-xl object-cover', sizeMap[size], className)}
      />
    )
  }
  return (
    <div className={cn('rounded-xl flex items-center justify-center text-white font-bold', colorForName(name), sizeMap[size], className)}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
