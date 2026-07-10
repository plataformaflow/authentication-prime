import { Lock } from 'lucide-react'
import { type ReactNode } from 'react'

interface AuthSplitProps {
  children: ReactNode
}

export function AuthSplit({ children }: AuthSplitProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0f1117] p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-teal-900/20 pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-10 w-60 h-60 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Autenticação Prime</span>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gerencie a autenticação dos setores da sua empresa
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Crie empresas, registre aplicações e gerencie usuários de forma centralizada e segura.
            </p>
          </div>
          <ul className="space-y-2">
            {[
              'Authorization Code Flow',
              'PKCE Support',
              'JWT Access Tokens',
              'Refresh Token Rotation',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/30">
          © {new Date().getFullYear()} Prime Aith
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0f1117] p-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
