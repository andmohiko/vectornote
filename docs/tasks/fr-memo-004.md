# FR-MEMO-004: メモ一覧表示 実装計画

## Context

VectorNote のメモ一覧表示機能を実装する。ログイン後のデフォルト画面として、`updatedAt` 降順でメモ一覧を無限スクロールで表示する。

## 前提条件

- FR-MEMO-001 が実装済みであること（Note 型定義、`fetchNotesOperation`、セキュリティルール）
- TanStack Query がセットアップ済みであること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: メモ一覧取得フック（無限スクロール） | 未着手 |
| Task 2: メモカードコンポーネント | 未着手 |
| Task 3: メモ一覧コンポーネント | 未着手 |
| Task 4: ホームページルートの更新 | 未着手 |

---

## 実装タスク

### Task 1: メモ一覧取得フック（無限スクロール）

**ファイル:** `apps/web/src/features/notes/hooks/useNotes.ts`（新規）

TanStack Query の `useInfiniteQuery` を使用してカーソルベースのページネーションを実装する。

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { fetchNotesOperation } from '@/infrastructure/firestore/noteOperations'

const NOTES_PAGE_SIZE = 20

export const notesQueryKey = (uid: string) => ['notes', uid] as const

export const useNotes = () => {
  const { uid } = useFirebaseAuthContext()

  return useInfiniteQuery({
    queryKey: notesQueryKey(uid!),
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      return fetchNotesOperation(uid!, NOTES_PAGE_SIZE, pageParam)
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!uid,
  })
}
```

### Task 2: メモカードコンポーネント

**ファイル:** `apps/web/src/features/notes/components/NoteCard.tsx`（新規）

```typescript
import type { Note } from '@vectornote/common'

type NoteCardProps = {
  note: Note
}
```

- 表示内容:
  - タイトル: `note.title` があればそれ、なければ `note.content` の先頭50文字
  - タグ: shadcn/ui の `Badge` コンポーネントで表示
  - 更新日時: dayjs でフォーマット（例: `2024/01/15 14:30`）
- shadcn/ui の `Card` を使用
- クリックで `/note/${note.noteId}` に遷移（TanStack Router の `Link` 使用）

### Task 3: メモ一覧コンポーネント

**ファイル:** `apps/web/src/features/notes/components/NoteList.tsx`（新規）

- `useNotes()` でデータ取得
- `pages` を `flatMap` して全ノートを展開
- `NoteCard` をグリッドレイアウトで表示（レスポンシブ: 1列→2列→3列）
- 無限スクロール: `IntersectionObserver` を使用して最下部到達時に `fetchNextPage()` を呼ぶ
- 状態表示:
  - ローディング中: Skeleton コンポーネント（カード形状のプレースホルダー）
  - 追加読み込み中: リスト下部に Spinner 表示
  - メモが0件: 「メモがありません。最初のメモを作成しましょう。」+ `/new` への新規作成ボタン
  - エラー: エラーメッセージ + リトライボタン

### Task 4: ホームページルートの更新

**ファイル:** `apps/web/src/routes/index.tsx`（修正）

現在のテンプレート内容を `NoteList` に置き換える。

- ページヘッダーに「メモ一覧」タイトルと「新規作成」ボタン（`/new` へのリンク）を配置
- `NoteList` コンポーネントをレンダリング
- 既存のテンプレートコンテンツ（TanStack Start の紹介文やデモ）は削除

---

## 実装順序

1. Task 1（無限スクロールフック）→ データ取得の基盤
2. Task 2（NoteCard）→ 個別カードUI
3. Task 3（NoteList）→ 一覧UI + 無限スクロール
4. Task 4（ホームページ更新）→ ページ統合

## 検証方法

1. ログイン後、`/` にメモ一覧が表示されること
2. メモが `updatedAt` 降順でソートされていること
3. 20件以上のメモがある場合、スクロールで追加読み込みされること
4. 追加読み込み中に Spinner が表示されること
5. メモが0件の場合、空状態メッセージと新規作成ボタンが表示されること
6. メモカードをクリックすると `/note/{noteId}` に遷移すること
7. タイトル未設定のメモは本文先頭50文字が表示されること
8. タグが Badge として正しく表示されること
