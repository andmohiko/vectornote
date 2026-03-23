# FR-MEMO-001: メモの作成 実装計画

## Context

VectorNote のメモ作成機能を実装する。このタスクは他のメモ管理機能（FR-MEMO-002〜004）の基盤となる共通部分（型定義、Firestore Operations、セキュリティルール、バリデーションスキーマ）を含む。

embedding フィールドは FR-EMBED で別途実装するため、本タスクでは扱わない。

## 前提条件

- Firebase プロジェクト設定・エミュレータが動作すること
- `FirebaseAuthProvider` による認証が実装済みであること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: Note エンティティ型定義 | 未着手 |
| Task 2: Zod バリデーションスキーマ | 未着手 |
| Task 3: Firestore セキュリティルール更新 | 未着手 |
| Task 4: Firestore インデックス設定 | 未着手 |
| Task 5: Firestore Operations 層 | 未着手 |
| Task 6: メモ作成フック | 未着手 |
| Task 7: メモ作成フォームコンポーネント | 未着手 |
| Task 8: メモ作成ページルート | 未着手 |

---

## 実装タスク

### Task 1: Note エンティティ型定義（共通基盤）

**ファイル:**
- `packages/common/src/entities/Note.ts`（新規）
- `packages/common/src/entities/index.ts`（修正）

`.claude/rules/firestore.md` に従い、3種類の型を定義する。

```typescript
import type { FieldValue } from 'firebase/firestore'

export const notesCollection = 'notes' as const

export type NoteId = string

export type Note = {
  noteId: NoteId
  createdAt: Date
  updatedAt: Date
  content: string
  title: string
  keywords: string[]
  tags: string[]
}

export type CreateNoteDto = Omit<Note, 'noteId' | 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue
  updatedAt: FieldValue
}

export type UpdateNoteDto = {
  content?: string
  title?: string
  keywords?: string[]
  tags?: string[]
  updatedAt: FieldValue
}
```

- `entities/index.ts` に `export * from './Note'` を追加
- embedding は含めない（FR-EMBED で追加）

### Task 2: Zod バリデーションスキーマ（共通基盤）

**ファイル:** `apps/web/src/features/notes/schemas/noteSchema.ts`（新規）

```typescript
import { z } from 'zod'

export const noteFormSchema = z.object({
  content: z.string().min(1, '本文を入力してください').max(10000, '本文は10,000文字以内です'),
  title: z.string().max(100, 'タイトルは100文字以内です').optional().default(''),
  keywords: z.string().max(500, 'キーワードは500文字以内です').optional().default(''),
  tags: z
    .array(z.string().max(50, 'タグは50文字以内です'))
    .max(10, 'タグは最大10個です')
    .optional()
    .default([]),
})

export type NoteFormValues = z.infer<typeof noteFormSchema>
```

- `keywords` はフォーム上は単一テキスト（カンマ/スペース区切り）、保存時に `string[]` へ変換する

### Task 3: Firestore セキュリティルール更新（共通基盤）

**ファイル:** `firestore.rules`

現在のルールには `users/{userId}` 配下のサブコレクションルールがない。`notes` サブコレクション用のルールを追加する。
既存ルールに `memos` の記載がある場合は `notes` に修正する。

```
match /users/{userId} {
  allow read, update: if isSignedIn() && isUser(userId);
  allow create: if isSignedIn() && isUser(userId);

  match /notes/{noteId} {
    allow read: if isSignedIn() && isUser(userId);
    allow create: if isSignedIn() && isUser(userId)
                  && requestData().content is string
                  && requestData().content.size() > 0
                  && requestData().content.size() <= 10000;
    allow update: if isSignedIn() && isUser(userId)
                  && requestData().content is string
                  && requestData().content.size() > 0
                  && requestData().content.size() <= 10000;
    allow delete: if isSignedIn() && isUser(userId);
  }
}
```

### Task 4: Firestore インデックス設定（共通基盤）

**ファイル:** `firestore.indexes.json`

FR-MEMO-004 の一覧表示で `updatedAt` 降順ソートが必要。また将来の FR-SEARCH-001 で embedding のベクトルインデックスが必要。

```json
{
  "indexes": [
    {
      "collectionGroup": "notes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "notes",
      "fieldPath": "embedding",
      "indexes": [
        {
          "queryScope": "COLLECTION",
          "vectorConfig": {
            "dimension": 1536,
            "flat": {}
          }
        }
      ]
    }
  ]
}
```

### Task 5: Firestore Operations 層（共通基盤）

**ファイル:** `apps/web/src/infrastructure/firestore/noteOperations.ts`（新規）

`.claude/rules/firestore.md` のパターンに従う。パスは `users/{uid}/notes/{noteId}` サブコレクション。

実装する関数:

| 関数名 | 用途 | 戻り値 |
|--------|------|--------|
| `createNoteOperation` | メモ作成（addDoc で自動ID） | `Promise<string>` (noteId) |
| `fetchNoteOperation` | 単一メモ取得 | `Promise<Note \| null>` |
| `updateNoteOperation` | メモ更新 | `Promise<void>` |
| `deleteNoteOperation` | メモ削除 | `Promise<void>` |
| `fetchNotesOperation` | ページネーション付き一覧取得 | `Promise<FetchResultWithPagination<Note>>` |

共通パターン:
- `dateColumns = ['createdAt', 'updatedAt'] as const`
- `convertDate` ユーティリティ（`@/utils/convertDate`）を使用
- サブコレクションパス: `collection(db, 'users', uid, notesCollection)`
- `FetchResultWithPagination<T>` 型を同ファイルまたは共通ユーティリティに定義

### Task 6: メモ作成フック

**ファイル:** `apps/web/src/features/notes/hooks/useCreateNoteMutation.ts`（新規）

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { createNoteOperation } from '@/infrastructure/firestore/noteOperations'
import type { NoteFormValues } from '../schemas/noteSchema'
import type { CreateNoteDto } from '@vectornote/common'

export const useCreateNoteMutation = () => {
  const { uid } = useFirebaseAuthContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: NoteFormValues) => {
      if (!uid) throw new Error('認証エラー：再ログインしてください')

      const keywords = values.keywords
        ? values.keywords.split(/[,\s、]+/).filter(Boolean)
        : []

      const dto: CreateNoteDto = {
        content: values.content,
        title: values.title || '',
        keywords,
        tags: values.tags || [],
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      }

      await createNoteOperation(uid, dto)
    },
    onSuccess: () => {
      toast.success('メモを作成しました')
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
      navigate({ to: '/' })
    },
    onError: () => {
      toast.error('メモの作成に失敗しました')
    },
  })
}
```

### Task 7: メモ作成フォームコンポーネント

**ファイル:** `apps/web/src/features/notes/components/NoteForm.tsx`（新規）

- react-hook-form + `@hookform/resolvers/zod` + `noteFormSchema` を使用
- `.claude/rules/react.md` のフォームパターンに従う
- フィールド: content（Textarea）、title（Input）、keywords（Input）、tags（カンマ区切りInput）
- shadcn/ui コンポーネント（Button, Input, Textarea, Label）を使用
- props で `onSubmit` と `defaultValues` を受け取り、作成/編集で共用可能にする
- ローディング中はボタンを disabled + Spinner 表示

```typescript
type NoteFormProps = {
  onSubmit: (values: NoteFormValues) => Promise<void>
  defaultValues?: Partial<NoteFormValues>
  submitLabel?: string
  isPending?: boolean
}
```

### Task 8: メモ作成ページルート

**ファイル:** `apps/web/src/routes/new.tsx`（新規）

- TanStack Router のファイルベースルーティングで `/new` ルートを作成
- `NoteForm` をレンダリング
- `useCreateNoteMutation` の `mutateAsync` を `onSubmit` に渡す
- ページタイトル「新規メモ」を表示
- 「戻る」リンク（`/` へ）を配置

---

## 実装順序

1. Task 1（型定義）→ 全体の基盤
2. Task 2（Zodスキーマ）→ バリデーション定義
3. Task 3（セキュリティルール）→ データ保護
4. Task 4（インデックス設定）→ クエリ最適化
5. Task 5（Operations層）→ Firestore アクセス
6. Task 6（作成フック）→ ビジネスロジック
7. Task 7（フォームコンポーネント）→ UI
8. Task 8（ルート）→ ページ統合

## 検証方法

1. `/new` にアクセスし、メモ作成フォームが表示されること
2. content 未入力で送信 → バリデーションエラーが表示されること
3. content 入力して送信 → Firestore エミュレータの `users/{uid}/notes` にドキュメントが作成されること
4. 保存されたデータに `createdAt`、`updatedAt`、`content`、`title`、`keywords`、`tags` が含まれること
5. 作成後、`/`（一覧画面）に遷移すること
6. トースト通知が表示されること
