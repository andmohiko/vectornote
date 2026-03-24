import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import {
  EditorView,
  keymap,
  placeholder as placeholderExt,
} from '@codemirror/view'
import { markdownKeymap } from './markdown-keybindings'

const baseTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    fontSize: 'inherit',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: '0',
    caretColor: 'currentColor',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'currentColor',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
})

export const createMinimalSetup = (options?: {
  placeholder?: string
}): Extension[] => [
  indentUnit.of('  '),
  history(),
  keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  baseTheme,
  ...(options?.placeholder ? [placeholderExt(options.placeholder)] : []),
]
