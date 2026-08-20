import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import type { ThemeMode } from '@/features/settings/hooks/useThemeMode'
import { useThemeMode } from '@/features/settings/hooks/useThemeMode'
import { cn } from '@/lib/utils'

type ThemeOption = {
  value: ThemeMode
  label: string
  icon: React.ReactNode
}

const themeOptions: Array<ThemeOption> = [
  { value: 'light', label: 'ライト', icon: <SunIcon className="size-5" /> },
  { value: 'dark', label: 'ダーク', icon: <MoonIcon className="size-5" /> },
  { value: 'auto', label: '自動', icon: <MonitorIcon className="size-5" /> },
]

export const ThemeSelector = () => {
  const { mode, selectMode } = useThemeMode()

  return (
    <div className="flex gap-2">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => selectMode(option.value)}
          className={cn(
            'flex flex-1 flex-col items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            mode === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
