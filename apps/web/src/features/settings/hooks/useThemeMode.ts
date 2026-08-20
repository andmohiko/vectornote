import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

const applyTheme = (mode: ThemeMode): void => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

export type UseThemeModeReturn = {
  mode: ThemeMode
  selectMode: (mode: ThemeMode) => void
}

/**
 * テーマモード（ライト/ダーク/自動）の状態管理フック
 * @description localStorageへの永続化と、autoモード時のシステム設定追従を行う
 */
export const useThemeMode = (): UseThemeModeReturn => {
  const [mode, setMode] = useState<ThemeMode>('auto')

  // 初期表示時に保存済みのテーマを反映する
  useEffect(() => {
    const initial = getStoredTheme()
    setMode(initial)
    applyTheme(initial)
  }, [])

  // auto モード時にシステム設定の変更を追従する
  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => applyTheme('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  const selectMode = (selected: ThemeMode): void => {
    setMode(selected)
    applyTheme(selected)
    window.localStorage.setItem('theme', selected)
  }

  return { mode, selectMode }
}
