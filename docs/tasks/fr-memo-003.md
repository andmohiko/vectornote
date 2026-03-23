# FR-MEMO-003: メモの削除 実装計画

## Context

VectorNote のメモ削除機能を実装する。確認ダイアログ表示後に物理削除し、一覧画面へ遷移する。

## 前提条件

- FR-MEMO-001 が実装済みであること（Note 型定義、`deleteNoteOperation`、セキュリティルール）
- FR-MEMO-002 が実装済みであること（メモ詳細ページ `/note/$noteId`）
- shadcn/ui の Dialog コンポーネントが利用可能であること（インストール済み）

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: メモ削除ミューテーションフック | 未着手 |
| Task 2: 削除確認ダイアログコンポーネント | 未着手 |
| Task 3: 編集ページに削除ボタンを追加 | 未着手 |

---

## 実装タスク

### Task 1: メモ削除ミューテーションフック

**ファイル:** `apps/web/src/features/notes/hooks/useDeleteNoteMutation.ts`（新規）

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { deleteNoteOperation } from '@/infrastructure/firestore/noteOperations'

export const useDeleteNoteMutation = () => {
  const { uid } = useFirebaseAuthContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!uid) throw new Error('認証エラー')
      await deleteNoteOperation(uid, noteId)
    },
    onSuccess: () => {
      toast.success('メモを削除しました')
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
      navigate({ to: '/' })
    },
    onError: () => {
      toast.error('削除に失敗しました')
    },
  })
}
```

### Task 2: 削除確認ダイアログコンポーネント

**ファイル:** `apps/web/src/features/notes/components/DeleteNoteDialog.tsx`（新規）

shadcn/ui の Dialog（`@/components/ui/dialog`）を使用する。

```typescript
type DeleteNoteDialogProps = {
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

- 確認メッセージ:「このメモを削除しますか？この操作は取り消せません。」
- 「キャンセル」ボタンと「削除する」ボタン（destructive variant）
- 削除中はボタンを disabled + Spinner 表示
- `useDeleteNoteMutation` を内部で使用

### Task 3: 編集ページに削除ボタンを追加

**ファイル:** `apps/web/src/routes/note.$noteId.tsx`（修正）

- ページ上部に「削除」ボタン（destructive variant, outline）を配置
- クリックで `DeleteNoteDialog` を `open` にする
- Dialog の状態管理は `useState` で行う

---

## 実装順序

1. Task 1（削除ミューテーション）→ 削除ロジック
2. Task 2（削除確認ダイアログ）→ UI
3. Task 3（編集ページ統合）→ ページに組み込み

## 検証方法

1. メモ編集ページで「削除」ボタンをクリック → 確認ダイアログが表示されること
2. 「キャンセル」クリック → ダイアログが閉じ、メモは削除されないこと
3. 「削除する」クリック → Firestore からドキュメントが削除されること
4. 削除後、`/`（一覧画面）に遷移すること
5. 削除成功時にトースト通知が表示されること
