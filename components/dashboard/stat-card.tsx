import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10' }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm shadow-[#1a2550]/5">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#1a2550] dark:text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
