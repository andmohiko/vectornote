import { useCallback, useEffect } from 'react'

/**
 * Cmd+S (Mac) / Ctrl+S (Windows/Linux) で保存処理を実行するカスタムフック
 * INPUT/TEXTAREA/contentEditable にフォーカスがあっても動作する
 */
export const useSaveShortcut = (
  callback: () => void,
  enabled: boolean,
) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        callback()
      }
    },
    [callback],
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
