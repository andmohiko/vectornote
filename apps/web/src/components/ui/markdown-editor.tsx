import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createMinimalSetup } from '@/lib/codemirror/setup'
import { cn } from '@/lib/utils'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  id?: string
}

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder,
  className,
  autoFocus = false,
  id,
}: MarkdownEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const [isFocused, setIsFocused] = useState(false)

  onChangeRef.current = onChange

  const handleFocus = useCallback(() => {
    viewRef.current?.focus()
  }, [])

  // EditorViewの初期化
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
      if (update.focusChanged) {
        setIsFocused(update.view.hasFocus)
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [...createMinimalSetup({ placeholder }), updateListener],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    if (autoFocus) {
      view.focus()
    }

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初期化時のみ実行
  }, [])

  // 外部からのvalue変更に対応（テンプレート選択時など）
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentValue = view.state.doc.toString()
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      })
    }
  }, [value])

  // document.getElementById('content')?.focus() によるフォーカス委譲
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('focus', handleFocus)
    return () => {
      container.removeEventListener('focus', handleFocus)
    }
  }, [handleFocus])

  return (
    <div
      ref={containerRef}
      id={id}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: CodeMirror内部でフォーカス管理するため
      tabIndex={0}
      className={cn(
        'flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none md:text-sm dark:bg-input/30',
        isFocused && 'border-ring ring-3 ring-ring/50',
        className,
      )}
    />
  )
}
