# FR-MEMO-005: メモ一覧でのOGP情報表示 実装計画

## Context

メモ本文にURLが含まれる場合、メモ一覧画面（`NoteCard`）にそのURLのOGP情報（タイトル・説明・サムネイル画像）を表示する。

OGPデータは `Note` ドキュメントにオブジェクトとして保持する。FR-EMBED-001 の embedding と同じ設計思想で、メモ作成・更新時の Firestore トリガーがバックグラウンドでURLを検出しOGPを取得して同ドキュメントに書き戻す。フロントエンドはメモ取得と同時にOGPデータを受け取れるため、追加のAPI呼び出しが不要でシンプルになる。

## 前提条件

- FR-MEMO-001 が実装済みであること（Note 型定義、Firestore Operations）
- FR-MEMO-004 が実装済みであること（`NoteCard`、`NoteList` が動作）
- Firebase Functions がデプロイ可能またはエミュレータで動作していること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: OgpInfo 型定義・Note 型に ogp フィールド追加 | 完了 |
| Task 2: onCreateNote トリガーにOGP取得処理を追加 | 完了 |
| Task 3: onUpdateNote トリガーにOGP取得処理を追加 | 完了 |
| Task 4: OgpPreview コンポーネント（Web） | 完了 |
| Task 5: NoteCard に OgpPreview を組み込む | 完了 |

---

## 実装タスク

### Task 1: OgpInfo 型定義・Note 型に ogp フィールド追加

**ファイル:**
- `packages/common/src/entities/Note.ts`（修正）

`Note` エンティティにOGP情報を表すオブジェクト型フィールドを追加する。

```typescript
export type OgpInfo = {
  url: string
  title: string | null
  description: string | null
  image: string | null
}

export type Note = {
  noteId: NoteId
  createdAt: Date
  content: string
  embedding: VectorValue | null
  ogp: OgpInfo | null  // 追加
  keywords: string
  tags: string[]
  title: string | null
  updatedAt: Date
}
```

`UpdateNoteDto` にも `ogp` フィールドを追加する（トリガーから書き戻すため）:

```typescript
export type UpdateNoteDto = {
  content?: Note['content']
  keywords?: Note['keywords']
  ogp?: Note['ogp']  // 追加
  tags?: Note['tags']
  title?: Note['title']
  updatedAt: FieldValue
}
```

`CreateNoteDto` は `Note` から生成されるため自動的に `ogp` が含まれる。初期値は `null` で作成し、トリガーが非同期で書き戻す。

### Task 2: onCreateNote トリガーにOGP取得処理を追加

**ファイル:** `apps/functions/src/triggers/onCreateNote.ts`（新規）

FR-EMBED-001 の `onCreateNote` パターンと同様。メモ作成時に本文からURLを抽出してOGP情報を取得し、`ogp` フィールドに書き戻す。

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'

export const onCreateNote = onDocumentCreated(
  'users/{uid}/notes/{noteId}',
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return

    const { content } = snapshot.data()
    const url = extractFirstUrl(content)
    if (!url) return

    try {
      const ogp = await fetchOgp(url)
      await snapshot.ref.update({ ogp })
    } catch (error) {
      console.error('OGP fetch failed for note:', event.params.noteId, error)
    }
  },
)
```

**ヘルパー関数（同ファイルまたは `~/utils/ogp.ts`）:**

- `extractFirstUrl(content: string): string | null` — 正規表現 `/https?:\/\/[^\s]+/` で最初のURLを抽出
- `fetchOgp(url: string): Promise<OgpInfo>` — `fetch()` でHTMLを取得し、正規表現で `og:title`・`og:description`・`og:image` を抽出。`og:title` がなければ `<title>` タグにフォールバック。タイムアウト5秒、User-Agent設定

**`apps/functions/src/index.ts`（修正）:**

```typescript
// triggers
export { onCreateNote } from './triggers/onCreateNote'
```

### Task 3: onUpdateNote トリガーにOGP取得処理を追加

**ファイル:** `apps/functions/src/triggers/onUpdateNote.ts`（新規）

`onDocumentUpdated` を使用する（作成・削除イベントを含まないため、before/afterの存在が保証される）。`content` が変更された場合のみOGPを再取得する。`ogp` フィールドのみの更新（トリガー自身による書き戻し）では再トリガーしない。

```typescript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

export const onUpdateNote = onDocumentUpdated(
  'users/{uid}/notes/{noteId}',
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()

    // content が変更されていない場合はスキップ
    if (before.content === after.content) return

    const url = extractFirstUrl(after.content)

    try {
      const ogp = url ? await fetchOgp(url) : null
      await event.data.after.ref.update({ ogp })
    } catch (error) {
      console.error('OGP re-fetch failed for note:', event.params.noteId, error)
    }
  },
)
```

**無限ループ防止:**
- `content` の変更のみをトリガー条件にすることで、`ogp` フィールドの書き戻しによる再トリガーを防ぐ
- `onDocumentUpdated` は作成・削除イベントを検知しないため、`onDocumentWritten` のような `before`/`after` の存在チェックが不要

**`apps/functions/src/index.ts`（修正）:**

```typescript
export { onCreateNote } from './triggers/onCreateNote'
export { onUpdateNote } from './triggers/onUpdateNote'
```

### Task 4: OgpPreview コンポーネント（Web）

**ファイル:** `apps/web/src/features/notes/components/OgpPreview.tsx`（新規）

```typescript
import type { OgpInfo } from '@vectornote/common'

type OgpPreviewProps = {
  ogp: OgpInfo
}
```

- サムネイル画像（左）・タイトル・説明・URLドメイン（右）の横並びカードレイアウト
- `<img>` に `onError` でロード失敗時は非表示
- リンクの `<a>` に `target="_blank" rel="noopener noreferrer"` と `onClick={(e) => e.stopPropagation()}` を付けてカード全体クリック（モーダル表示）を妨げない

### Task 5: NoteCard に OgpPreview を組み込む

**ファイル:** `apps/web/src/features/notes/components/NoteCard.tsx`（修正）

- `note.ogp` が存在する場合、`CardContent` の末尾に `<OgpPreview ogp={note.ogp} />` を追加
- 追加のフック・API呼び出しは不要

```tsx
{note.ogp && <OgpPreview ogp={note.ogp} />}
```

---

## 実装順序

1. Task 1（型定義）→ 全体の基盤
2. Task 2（onCreateNote トリガー）→ 新規メモのOGP取得
3. Task 3（onUpdateNote トリガー）→ 更新時のOGP再取得
4. Task 4（OgpPreview コンポーネント）→ UI
5. Task 5（NoteCard 統合）→ 最終統合

## 検証方法

1. URLを含むメモを新規作成し、しばらく後にFirestoreコンソールで `ogp` フィールドが書き込まれていること
2. メモ一覧画面を再表示し、該当カードにOGPプレビューが表示されること
3. OGPプレビューのリンクをクリックすると別タブで開くこと
4. OGPプレビューをクリックしてもモーダルが開かないこと（stopPropagation）
5. URLを含まないメモは `ogp: null` のままでプレビューが表示されないこと
6. メモの本文を編集してURLを変更すると、OGP情報が更新されること
7. OGP取得に失敗してもメモの作成・更新自体は正常に完了すること（エラーはログのみ）
