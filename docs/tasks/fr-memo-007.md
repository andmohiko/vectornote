<!-- @format -->

# FR-MEMO-007: 固定メモ（ピン留め）タブ機能 実装計画

## Context

現在のホーム画面はすべてのメモを最新順（updatedAt DESC）で表示しており、過去のメモが埋もれてしまう課題がある。
`firestore-design.md` で `isPinned: Boolean` フィールドが設計済みだが未実装。

本タスクでは以下を実装する：

1. Note エンティティに `isPinned` フィールドを追加
2. ホーム画面上部に「最新」「固定」タブを導入
3. メモ編集モーダルに「固定する / 固定解除」ボタンを追加
4. 固定タブでは `isPinned === true` のメモのみ表示

前提条件：

- FR-MEMO-001〜006 が実装済みであること
- FR-TAG-001 が実装済みであること（タグフィルタナビ）

### データ移行方針

既存のメモドキュメントには `isPinned` フィールドが存在しない。バックフィルスクリプトは実行せず、以下の方針で段階的に移行する：

- **新規作成時**: `isPinned: false` を含めて作成する（Task 5）
- **クライアントからの更新時**: `useUpdateNoteMutation`（メモ編集）と `useTogglePinMutation`（ピン留めトグル）の両方で `isPinned` を dto に必ず含める。これにより `updateDoc` のマージ結果が 10 フィールドとなり、セキュリティルール（`size() == 10`）を通過する
- **Cloud Functions トリガー**: Admin SDK はセキュリティルールをバイパスするため影響なし

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: Note エンティティ型に `isPinned` 追加 | 未着手 |
| Task 2: Firestore セキュリティルール更新 | 未着手 |
| Task 3: Firestore インデックス追加 | 未着手 |
| Task 4: Operations 層に `fetchPinnedNotesOperation` 追加 | 未着手 |
| Task 5: `useCreateNoteMutation` に `isPinned: false` 追加 | 未着手 |
| Task 6: `useUpdateNoteMutation` に `isPinned` を含める | 未着手 |
| Task 7: `usePinnedNotes` フック作成 | 未着手 |
| Task 8: `useTogglePinMutation` フック作成 | 未着手 |
| Task 9: NoteDetailModal にピン留めボタン追加 | 未着手 |
| Task 10: PinnedNoteList コンポーネント作成 | 未着手 |
| Task 11: ホームページにタブ UI 追加 | 未着手 |

---

## 実装タスク

### Task 1: Note エンティティ型に `isPinned` 追加

**ファイル:** `packages/common/src/entities/Note.ts`（変更）

Note 型に `isPinned: boolean` を追加する。

```typescript
/** Entity型（Firestoreから取得したデータ、Date変換済み） */
export type Note = {
  noteId: NoteId
  createdAt: Date
  content: string
  embedding: VectorValue | null
  isPinned: boolean          // ← 追加
  ogp: OgpInfo | null
  keywords: string
  tags: string[]
  title: string | null
  updatedAt: Date
  updatedBy: UpdatedBy
}
```

`CreateNoteDto` は `Omit<Note, 'noteId' | 'createdAt' | 'updatedAt'>` で定義されているため、`isPinned` は自動的に含まれる。変更不要。

`UpdateNoteDto` にオプショナルフィールドとして追加：

```typescript
/** 更新用DTO */
export type UpdateNoteDto = {
  content?: Note['content']
  isPinned?: Note['isPinned']   // ← 追加
  keywords?: Note['keywords']
  ogp?: Note['ogp']
  tags?: Note['tags']
  title?: Note['title']
  updatedAt: FieldValue
  updatedBy?: UpdatedBy
}
```

`UpdateNoteDtoFromAdmin` は変更不要（Cloud Functions トリガーは `isPinned` を操作しない）。

### Task 2: Firestore セキュリティルール更新

**ファイル:** `firestore.rules`（変更）

`isValidNoteSchema` 関数を更新し、`isPinned` フィールドのバリデーションを追加する。

```javascript
function isValidNoteSchema(requestData) {
  return requestData.size() == 10     // 9 → 10 に変更
    && 'createdAt' in requestData && requestData.createdAt is timestamp
    && 'updatedAt' in requestData && requestData.updatedAt is timestamp
    && 'updatedBy' in requestData && requestData.updatedBy is string
    && 'content' in requestData && requestData.content is string
    && 'embedding' in requestData
    && 'isPinned' in requestData && requestData.isPinned is bool   // ← 追加
    && 'ogp' in requestData && (requestData.ogp is map || requestData.ogp == null)
    && 'keywords' in requestData && requestData.keywords is string
    && 'tags' in requestData && requestData.tags is list
    && 'title' in requestData && (requestData.title is string || requestData.title == null);
}
```

> **注意:** `request.resource.data` は update 時にマージ後の全フィールドを返す。クライアントからの更新時は `useUpdateNoteMutation` と `useTogglePinMutation` の両方で `isPinned` を dto に必ず含めることで、マージ後のフィールド数を 10 に揃える。Cloud Functions（Admin SDK）はセキュリティルールをバイパスするため影響なし。

### Task 3: Firestore インデックス追加

**ファイル:** `firestore.indexes.json`（変更）

固定メモクエリ（`isPinned == true` + `orderBy('updatedAt', 'desc')`）用の複合インデックスを追加する。

```json
{
  "collectionGroup": "notes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isPinned", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
}
```

### Task 4: Operations 層に `fetchPinnedNotesOperation` 追加

**ファイル:** `apps/web/src/infrastructure/firestore/notes.ts`（変更）

固定メモを取得する Operation を追加する。既存の `fetchNotesOperation` と同じパターンだが、`where('isPinned', '==', true)` でフィルタする。

```typescript
/** 固定メモ一覧を取得する（ページネーション対応） */
export const fetchPinnedNotesOperation = async (
  uid: Uid,
  pageSize: number,
  lastDocument: DocumentSnapshot | null,
): Promise<FetchResultWithPagination<Note>> => {
  const baseConstraints = [
    where('isPinned', '==', true),
    orderBy('updatedAt', 'desc'),
  ]
  const constraints = lastDocument
    ? [...baseConstraints, startAfter(lastDocument), limit(pageSize)]
    : [...baseConstraints, limit(pageSize)]

  const snapshot = await getDocs(query(notesRef(uid), ...constraints))
  const items = snapshot.docs.map(
    (d) => ({ noteId: d.id, ...convertDate(d.data(), dateColumns) }) as Note,
  )
  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null
  const hasMore = snapshot.docs.length === pageSize

  return { items, lastDoc, hasMore }
}
```

### Task 5: `useCreateNoteMutation` に `isPinned: false` 追加

**ファイル:** `apps/web/src/features/notes/hooks/useCreateNoteMutation.ts`（変更）

`CreateNoteDto` に `isPinned: false` を追加する。新規作成メモはデフォルトで非固定。

```typescript
const dto: CreateNoteDto = {
  content: values.content,
  title: values.title || null,
  keywords: values.keywords ?? '',
  tags: values.tags || [],
  embedding: null,
  isPinned: false,              // ← 追加
  ogp: null,
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp,
  updatedBy: 'user' as const,
}
```

### Task 6: `useUpdateNoteMutation` に `isPinned` を含める

**ファイル:** `apps/web/src/features/notes/hooks/useUpdateNoteMutation.ts`（変更）

既存ドキュメントに `isPinned` フィールドがなくてもセキュリティルール（`size() == 10`）を通過させるため、`UpdateNoteDto` に `isPinned` を必ず含める。`NoteDetailModal` から渡される `note` の `isPinned` を使用する。

`mutationFn` の引数を `NoteFormValues` から拡張し、`isPinned` を受け取れるようにする。

```typescript
type UpdateNoteInput = NoteFormValues & {
  isPinned: boolean
}

export const useUpdateNoteMutation = (noteId: string) => {
  // ...
  return useMutation({
    mutationFn: async (values: UpdateNoteInput) => {
      if (!uid) throw new Error('認証エラー')

      const dto: UpdateNoteDto = {
        content: values.content,
        title: values.title || '',
        keywords: values.keywords ?? '',
        tags: values.tags || [],
        isPinned: values.isPinned,    // ← 追加
        updatedAt: serverTimestamp,
        updatedBy: 'user' as const,
      }

      await updateNoteOperation(uid, noteId, dto)
    },
    // ...optimistic update にも isPinned を反映
  })
}
```

`NoteDetailModal` の `handleSubmit` と `handleSave` で `isPinned` を渡す：

```typescript
const handleSubmit = async (values: NoteFormValues) => {
  await mutateAsync({ ...values, isPinned: isPinned })
  // ...
}

const handleSave = async (values: NoteFormValues) => {
  await mutateAsync({ ...values, isPinned: isPinned })
  // ...
}
```

ここで `isPinned` は Task 9 で導入するローカル状態（`localIsPinned ?? note?.isPinned ?? false`）を参照する。

### Task 7: `usePinnedNotes` フック作成

**ファイル:** `apps/web/src/features/notes/hooks/usePinnedNotes.ts`（新規）

`useNotes` と同じパターンで `useInfiniteQuery` を使用する。

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { fetchPinnedNotesOperation, PAGE_SIZE } from '@/infrastructure/firestore/notes'

export const pinnedNotesQueryKey = (uid: string) =>
  ['notes', uid, { pinned: true }] as const

export const usePinnedNotes = () => {
  const { uid } = useFirebaseAuthContext()

  return useInfiniteQuery({
    queryKey: pinnedNotesQueryKey(uid!),
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      return fetchPinnedNotesOperation(uid!, PAGE_SIZE, pageParam)
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!uid,
  })
}
```

### Task 8: `useTogglePinMutation` フック作成

**ファイル:** `apps/web/src/features/notes/hooks/useTogglePinMutation.ts`（新規）

ピン留めトグル専用の mutation フック。NoteForm を経由せず直接 `updateNoteOperation` を呼ぶ。

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateNoteDto } from '@vectornote/common'
import { toast } from 'sonner'
import { updateNoteOperation } from '@/infrastructure/firestore/notes'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const useTogglePinMutation = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (isPinned: boolean) => {
      if (!uid) throw new Error('認証エラー')

      const dto: UpdateNoteDto = {
        isPinned: !isPinned,
        updatedAt: serverTimestamp,
        updatedBy: 'user' as const,
      }

      await updateNoteOperation(uid, noteId, dto)
    },
    onSuccess: (_data, isPinned) => {
      toast.success(isPinned ? '固定を解除しました' : 'メモを固定しました')
    },
    onError: () => {
      toast.error('更新に失敗しました')
    },
    onSettled: () => {
      // ['notes', uid] のプレフィックスマッチで最新タブ・固定タブ両方を無効化
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
  })
}
```

### Task 9: NoteDetailModal にピン留めボタン追加

**ファイル:** `apps/web/src/features/notes/components/NoteDetailModal.tsx`（変更）

`footerLeft` に「固定する / 固定解除」ボタンを追加する。削除ボタンと並列に配置する。

モーダル内でピン状態をローカルに管理し、即座に UI に反映する。

```tsx
import { Pin, PinOff } from 'lucide-react'
import { useTogglePinMutation } from '../hooks/useTogglePinMutation'

// NoteDetailModal 内
const { mutateAsync: togglePin, isPending: isTogglePinPending } = useTogglePinMutation(note?.noteId ?? '')
const [localIsPinned, setLocalIsPinned] = useState<boolean | null>(null)
const isPinned = localIsPinned ?? note?.isPinned ?? false

// note が変わったらローカル状態をリセット
useEffect(() => setLocalIsPinned(null), [note?.noteId])

const handleTogglePin = async () => {
  setLocalIsPinned(!isPinned)
  await togglePin(isPinned)
}

// footerLeft に渡す JSX
footerLeft={
  <div className="flex gap-2">
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleTogglePin}
      disabled={isTogglePinPending}
    >
      {isPinned ? <PinOff className="mr-1 size-4" /> : <Pin className="mr-1 size-4" />}
      {isPinned ? '固定解除' : '固定する'}
    </Button>
    <Button
      type="button"
      size="sm"
      className="border-transparent bg-red-600 text-white hover:bg-red-700 hover:text-white"
      onClick={openDeleteDialog}
    >
      削除
    </Button>
  </div>
}
```

### Task 10: PinnedNoteList コンポーネント作成

**ファイル:** `apps/web/src/features/notes/components/PinnedNoteList.tsx`（新規）

`NoteList` と同じパターンだが、`usePinnedNotes` を使用する。空の場合は「固定されたメモはありません」を表示する。

```tsx
import type { Note } from '@vectornote/common'
import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { usePinnedNotes } from '../hooks/usePinnedNotes'
import { NoteCard } from './NoteCard'
import { NoteDetailModal } from './NoteDetailModal'

export const PinnedNoteList = () => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = usePinnedNotes()

  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  // 無限スクロール（NoteList と同じ IntersectionObserver パターン）

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i.toString()} className="h-36 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const notes = data?.pages.flatMap((page) => page.items) ?? []

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          固定されたメモはありません。
        </p>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.noteId} note={note} onClick={setSelectedNote} />
          ))}
        </div>
        <div ref={observerRef} className="mt-8 flex justify-center">
          {isFetchingNextPage && <Spinner className="size-6" />}
        </div>
      </div>
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </>
  )
}
```

### Task 11: ホームページにタブ UI 追加

**ファイル:** `apps/web/src/routes/_authed/index.tsx`（変更）

画面上部に「最新」「固定」タブを追加する。タブの状態はローカル state で管理し、タブに応じて NoteList / PinnedNoteList を切り替える。「固定」タブ選択時はタグフィルタナビを非表示にする。

```tsx
import { useState } from 'react'
import { PinnedNoteList } from '@/features/notes/components/PinnedNoteList'

function HomePage() {
  const { tag } = Route.useSearch()
  const { tags } = useTags()
  const topTags = tags.slice(0, TOP_TAGS_COUNT)
  const { isOpen: isCreateModalOpen, open: openCreateModal, close: closeCreateModal } = useDisclosure()
  const [activeTab, setActiveTab] = useState<'latest' | 'pinned'>('latest')

  // ...keyboard shortcut...

  return (
    <main className="pb-8 pt-4">
      {/* タブ UI */}
      <div className="mb-4 flex gap-4 border-b">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'latest'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('latest')}
        >
          最新
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'pinned'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('pinned')}
        >
          固定
        </button>
      </div>

      {/* タグフィルタナビ（最新タブのみ表示） */}
      {activeTab === 'latest' && (
        <nav className="mb-4 flex gap-2 overflow-x-auto">
          {/* 既存のタグナビ */}
        </nav>
      )}

      {/* メモ一覧 */}
      <section>
        {activeTab === 'latest' ? (
          <NoteList tag={tag} onClickCreate={openCreateModal} />
        ) : (
          <PinnedNoteList />
        )}
      </section>

      <CreateNoteButton onClick={openCreateModal} />
      <CreateNoteModal open={isCreateModalOpen} onClose={closeCreateModal} />
    </main>
  )
}
```

---

## 実装順序

1. Task 1（型定義）→ 全体の基盤
2. Task 2（セキュリティルール）→ クライアント更新時に isPinned を必ず含めるため移行不要
3. Task 3（インデックス）→ セキュリティルールと同時にデプロイ
4. Task 4（Operations 層）→ Firestore アクセス
5. Task 5（Create mutation 更新）→ 新規作成対応
6. Task 6（Update mutation 更新）→ 既存ドキュメント更新時の isPinned 対応
7. Task 7〜8（Hooks 層）→ React 統合
8. Task 9（NoteDetailModal）→ ピンボタン UI
9. Task 10（PinnedNoteList）→ 固定メモ一覧 UI
10. Task 11（ホームページ）→ タブ UI 統合

## 検証方法

1. メモ編集モーダルで「固定する」をタップ → Firestore 上の `isPinned` が `true` になること
2. トーストで「メモを固定しました」が表示されること
3. 「固定」タブに切り替え → 固定したメモが表示されること
4. 「固定解除」をタップ → `isPinned` が `false` に戻り、固定タブから消えること
5. 「最新」タブには固定・非固定問わず全メモが最新順で表示されること
6. 「固定」タブではタグフィルタナビが非表示であること
7. 新規作成メモは `isPinned: false` で作成され、固定タブには表示されないこと
8. `pnpm web build` が通ること
