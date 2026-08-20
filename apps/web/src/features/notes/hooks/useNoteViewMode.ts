import { useCallback, useState } from 'react'

export type NoteViewMode = 'card' | 'list'

const STORAGE_KEY = 'noteViewMode'

type UseNoteViewModeReturn = {
  viewMode: NoteViewMode
  setViewMode: (mode: NoteViewMode) => void
}

/** メモ一覧の表示モード(カード/リスト)を管理し、localStorageに永続化する */
export const useNoteViewMode = (): UseNoteViewModeReturn => {
  const [viewMode, setViewModeState] = useState<NoteViewMode>(() =>
    localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'card',
  )

  const setViewMode = useCallback((mode: NoteViewMode): void => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  return { viewMode, setViewMode }
}
