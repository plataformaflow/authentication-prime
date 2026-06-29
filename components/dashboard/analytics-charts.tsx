'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DailyDataPoint {
  date: string
  success: number
  failed: number
}

interface AppStat {
  appName: string
  success: number
  failed: number
}

interface AuthChartProps {
  data: DailyDataPoint[]
}

interface AppBarChartProps {
  apps: AppStat[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function AuthLineChart({ data }: AuthChartProps) {
  const formatted = data.map(d => ({ ...d, date: formatDate(d.date) }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
        />
        <Line type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2} dot={false} name="Sucesso" />
        <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Falha" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AppBarChart({ apps }: AppBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={apps} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="appName" tick={{ fontSize: 10 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="failed" fill="#ef4444" name="Falha" radius={[4, 4, 0, 0]} />
        <Bar dataKey="success" fill="#6366f1" name="Sucesso" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
