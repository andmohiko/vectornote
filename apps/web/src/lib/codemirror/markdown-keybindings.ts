import type { EditorState, Text } from '@codemirror/state'
import type { EditorView, KeyBinding } from '@codemirror/view'

const MAX_INDENT_LEVEL = 6
const INDENT_UNIT = '  '
const MAX_INDENT = INDENT_UNIT.repeat(MAX_INDENT_LEVEL)

/** チェックボックスリスト: `  - [ ] text` or `  - [x] text` */
const checkboxPattern = /^(\s*)- \[[ x]\] (.*)$/
/** 箇条書きリスト: `  - text` */
const unorderedListPattern = /^(\s*)- (.*)$/
/** 番号付きリスト: `  1. text` */
const orderedListPattern = /^(\s*)(\d+)\. (.*)$/

const getLineAt = (state: EditorState, pos: number) => {
  const line = state.doc.lineAt(pos)
  return { text: line.text, from: line.from, to: line.to }
}

/**
 * 指定行より上を探索し、targetIndentと同じインデントレベルの番号付きリストの最後の番号を返す。
 * 見つからなければ0を返す。
 */
const findLastOrderedNumberAbove = (
  doc: Text,
  lineNumber: number,
  targetIndent: string,
): number => {
  for (let i = lineNumber - 1; i >= 1; i--) {
    const lineText = doc.line(i).text
    const indent = lineText.match(/^(\s*)/)?.[1] ?? ''

    // ターゲットより浅いインデントに到達したら探索終了
    if (indent.length < targetIndent.length) break

    // 同じインデントレベルの番号付きリストを発見
    if (indent.length === targetIndent.length) {
      const match = lineText.match(orderedListPattern)
      if (match) {
        return Number(match[2])
      }
      // 同じインデントだが番号付きリストではない → 探索終了
      break
    }
  }
  return 0
}

/**
 * 番号付きリストの行をインデント/アンインデントした後、番号を調整する。
 * 番号付きリストでない場合はnullを返す。
 */
const renumberAfterIndentChange = (
  lineText: string,
  newIndent: string,
  doc: Text,
  lineNumber: number,
): string | null => {
  const match = lineText.match(orderedListPattern)
  if (!match) return null
  const [, , , content] = match
  const lastNum = findLastOrderedNumberAbove(doc, lineNumber, newIndent)
  return `${newIndent}${lastNum + 1}. ${content}`
}

const handleEnter = (view: EditorView): boolean => {
  const { state } = view
  const { head } = state.selection.main
  const { text, from, to } = getLineAt(state, head)

  // チェックボックス
  let match = text.match(checkboxPattern)
  if (match) {
    const [, indent, content] = match
    if (!content) {
      // 空行 → リスト終了
      view.dispatch({ changes: { from, to }, selection: { anchor: from } })
      return true
    }
    const newLine = `\n${indent}- [ ] `
    view.dispatch({
      changes: { from: head, to: head, insert: newLine },
      selection: { anchor: head + newLine.length },
    })
    return true
  }

  // 箇条書き
  match = text.match(unorderedListPattern)
  if (match) {
    const [, indent, content] = match
    if (!content) {
      view.dispatch({ changes: { from, to }, selection: { anchor: from } })
      return true
    }
    const newLine = `\n${indent}- `
    view.dispatch({
      changes: { from: head, to: head, insert: newLine },
      selection: { anchor: head + newLine.length },
    })
    return true
  }

  // 番号付きリスト
  match = text.match(orderedListPattern)
  if (match) {
    const [, indent, numStr, content] = match
    if (!content) {
      view.dispatch({ changes: { from, to }, selection: { anchor: from } })
      return true
    }
    const nextNum = Number(numStr) + 1
    const newLine = `\n${indent}${nextNum}. `
    view.dispatch({
      changes: { from: head, to: head, insert: newLine },
      selection: { anchor: head + newLine.length },
    })
    return true
  }

  return false
}

const handleTab = (view: EditorView): boolean => {
  const { state } = view
  const { from, to } = state.selection.main

  if (from === to) {
    // 単一行
    const line = state.doc.lineAt(from)
    const currentIndent = line.text.match(/^(\s*)/)?.[1] ?? ''
    if (currentIndent.length >= MAX_INDENT.length) return true

    const newIndent = currentIndent + INDENT_UNIT
    const renumbered = renumberAfterIndentChange(
      line.text,
      newIndent,
      state.doc,
      line.number,
    )
    if (renumbered) {
      // 番号付きリスト: 行全体を置き換え（番号を1にリセット）
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: renumbered },
        selection: { anchor: line.from + renumbered.length },
      })
    } else {
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: INDENT_UNIT },
        selection: { anchor: from + INDENT_UNIT.length },
      })
    }
    return true
  }

  // 複数行選択
  const startLine = state.doc.lineAt(from)
  const endLine = state.doc.lineAt(to)
  const changes: Array<{ from: number; to: number; insert: string }> = []

  for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
    const line = state.doc.line(lineNum)
    const currentIndent = line.text.match(/^(\s*)/)?.[1] ?? ''
    if (currentIndent.length < MAX_INDENT.length) {
      const newIndent = currentIndent + INDENT_UNIT
      const renumbered = renumberAfterIndentChange(
        line.text,
        newIndent,
        state.doc,
        line.number,
      )
      if (renumbered) {
        changes.push({ from: line.from, to: line.to, insert: renumbered })
      } else {
        changes.push({ from: line.from, to: line.from, insert: INDENT_UNIT })
      }
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes })
  }
  return true
}

const handleShiftTab = (view: EditorView): boolean => {
  const { state } = view
  const { from, to } = state.selection.main

  if (from === to) {
    // 単一行
    const line = state.doc.lineAt(from)
    const currentIndent = line.text.match(/^(\s*)/)?.[1] ?? ''
    if (currentIndent.length === 0) return true
    const removeCount = Math.min(INDENT_UNIT.length, currentIndent.length)

    const newIndent = currentIndent.slice(removeCount)
    const renumbered = renumberAfterIndentChange(
      line.text,
      newIndent,
      state.doc,
      line.number,
    )
    if (renumbered) {
      // 番号付きリスト: 行全体を置き換え（同階層の続き番号に調整）
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: renumbered },
        selection: { anchor: line.from + renumbered.length },
      })
    } else {
      view.dispatch({
        changes: { from: line.from, to: line.from + removeCount },
        selection: { anchor: Math.max(line.from, from - removeCount) },
      })
    }
    return true
  }

  // 複数行選択
  const startLine = state.doc.lineAt(from)
  const endLine = state.doc.lineAt(to)
  const changes: Array<{ from: number; to: number; insert?: string }> = []

  for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
    const line = state.doc.line(lineNum)
    const currentIndent = line.text.match(/^(\s*)/)?.[1] ?? ''
    if (currentIndent.length > 0) {
      const removeCount = Math.min(INDENT_UNIT.length, currentIndent.length)
      const newIndent = currentIndent.slice(removeCount)
      const renumbered = renumberAfterIndentChange(
        line.text,
        newIndent,
        state.doc,
        line.number,
      )
      if (renumbered) {
        changes.push({ from: line.from, to: line.to, insert: renumbered })
      } else {
        changes.push({ from: line.from, to: line.from + removeCount })
      }
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes })
  }
  return true
}

export const markdownKeymap: KeyBinding[] = [
  { key: 'Enter', run: handleEnter },
  { key: 'Tab', run: handleTab },
  { key: 'Shift-Tab', run: handleShiftTab },
]
