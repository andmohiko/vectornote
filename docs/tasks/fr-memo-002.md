# FR-MEMO-002: メモの編集 実装計画

## Context

VectorNote のメモ編集機能を実装する。既存メモの全フィールドを編集可能にし、楽観的更新（Optimistic Update）で UX を向上させる。

embedding の再生成は FR-EMBED で別途実装するため、本タスクでは扱わない。

## 前提条件

- FR-MEMO-001 が実装済みであること（Note 型定義、noteOperations、Zod スキーマ、セキュリティルール）

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: メモ取得フック | 未着手 |
| Task 2: メモ更新ミューテーションフック | 未着手 |
| Task 3: メモ詳細・編集ページルート | 未着手 |

---

## 実装タスク

### Task 1: メモ取得フック

**ファイル:** `apps/web/src/features/notes/hooks/useNote.ts`（新規）

TanStack Query の `useQuery` を使用して単一メモを取得する。

```typescript
import { useQuery } from '@tanstack/react-query'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { fetchNoteOperation } from '@/infrastructure/firestore/noteOperations'

export const noteQueryKey = (uid: string, noteId: string) =>
  ['notes', uid, noteId] as const

export const useNote = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()

  return useQuery({
    queryKey: noteQueryKey(uid!, noteId),
    queryFn: () => fetchNoteOperation(uid!, noteId),
    enabled: !!uid,
  })
}
```

### Task 2: メモ更新ミューテーションフック

**ファイル:** `apps/web/src/features/notes/hooks/useUpdateNoteMutation.ts`（新規）

- TanStack Query の `useMutation` を使用
- 楽観的更新を実装: `onMutate` でキャッシュを即時更新、`onError` でロールバック
- `updatedAt` は `serverTimestamp` を使用
- keywords のテキスト → 配列変換ロジックを含む

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { updateNoteOperation } from '@/infrastructure/firestore/noteOperations'
import { noteQueryKey } from './useNote'
import type { NoteFormValues } from '../schemas/noteSchema'
import type { Note, UpdateNoteDto } from '@vectornote/common'

export const useUpdateNoteMutation = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: NoteFormValues) => {
      if (!uid) throw new Error('認証エラー')

      const keywords = values.keywords
        ? values.keywords.split(/[,\s、]+/).filter(Boolean)
        : []

      const dto: UpdateNoteDto = {
        content: values.content,
        title: values.title || '',
        keywords,
        tags: values.tags || [],
        updatedAt: serverTimestamp,
      }

      await updateNoteOperation(uid, noteId, dto)
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: noteQueryKey(uid!, noteId) })
      const previous = queryClient.getQueryData<Note>(noteQueryKey(uid!, noteId))

      queryClient.setQueryData(noteQueryKey(uid!, noteId), (old: Note | undefined) => {
        if (!old) return old
        return { ...old, ...values, updatedAt: new Date() }
      })

      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(noteQueryKey(uid!, noteId), context.previous)
      }
      toast.error('更新に失敗しました')
    },
    onSuccess: () => {
      toast.success('メモを更新しました')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteQueryKey(uid!, noteId) })
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
  })
}
```

### Task 3: メモ詳細・編集ページルート

**ファイル:** `apps/web/src/routes/note.$noteId.tsx`（新規）

- TanStack Router の動的ルート `/note/$noteId`
- `Route.useParams()` で `noteId` を取得
- `useNote(noteId)` でメモデータを取得
- ローディング中は Skeleton を表示
- メモが見つからない場合は「メモが見つかりません」を表示
- FR-MEMO-001 で作成した `NoteForm` を `defaultValues` 付きで使用
- `useUpdateNoteMutation` の `mutateAsync` を `onSubmit` に渡す
- keywords は `string[]` → カンマ区切りテキストに変換してフォームに渡す
- ページタイトル「メモを編集」を表示
- 「戻る」リンク（`/` へ）を配置

```typescript
// defaultValues の変換例
const defaultValues: Partial<NoteFormValues> = {
  content: note.content,
  title: note.title,
  keywords: note.keywords.join(', '),
  tags: note.tags,
}
```

---

## 実装順序

1. Task 1（メモ取得フック）→ データ取得の基盤
2. Task 2（更新ミューテーション）→ 更新ロジック
3. Task 3（編集ページルート）→ ページ統合

## 検証方法

1. `/note/{noteId}` にアクセスし、既存メモのデータがフォームに表示されること
2. content を編集して送信 → Firestore のドキュメントが更新されること
3. `updatedAt` が自動更新されること
4. 楽観的更新: 送信直後にUIが即座に更新されること
5. 更新失敗時にロールバックされ、エラートーストが表示されること
6. 存在しない noteId でアクセス → 「メモが見つかりません」が表示されること
