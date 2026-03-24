import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
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
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid var(--color-border)',
    marginRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--color-muted-foreground)',
    fontSize: 'inherit',
    minWidth: '2em',
    padding: '0 4px 0 0',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
})

export const createMinimalSetup = (options?: {
  placeholder?: string
}): Extension[] => [
  indentUnit.of('  '),
  lineNumbers(),
  history(),
  keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  baseTheme,
  ...(options?.placeholder ? [placeholderExt(options.placeholder)] : []),
]
