# FR-SEARCH-001: セマンティック検索 実装計画

## Context

VectorNote のコア機能であるセマンティック検索を実装する。ユーザーが入力した検索クエリをベクトル化し、保存済みメモとのコサイン類似度を計算して、意味的に近いメモを検索結果として返す。類似度が閾値（0.3）以上のメモを類似度の降順で表示する。

## 前提条件

- FR-EMBED-001 が実装済みであること（メモに embedding が保存されていること）
- Firestore Vector Search インデックスが設定済みであること（`firestore.indexes.json`）
- Firebase Functions の認証ミドルウェアが実装済みであること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: SearchResult 型定義の追加 | 未着手 |
| Task 2: searchNotes エンドポイントの実装 | 未着手 |
| Task 3: ルーターへのルート追加 | 未着手 |
| Task 4: 検索 API 呼び出しヘルパー | 未着手 |
| Task 5: useSearchNotes フック | 未着手 |
| Task 6: SearchBar コンポーネント | 未着手 |
| Task 7: SearchResultCard コンポーネント | 未着手 |
| Task 8: SearchResultList コンポーネント | 未着手 |
| Task 9: 検索結果ページ | 未着手 |

---

## 実装タスク

### Task 1: SearchResult 型定義の追加

**ファイル:** `packages/common/src/entities/Note.ts`（修正）

```typescript
/** 検索結果型 */
export type SearchResult = {
  note: Note
  similarity: number // 0.0 ~ 1.0
}
```

`packages/common/src/entities/index.ts` からも export する。

### Task 2: searchNotes エンドポイントの実装

**ファイル:** `apps/functions/src/api/search/searchNotes.ts`（新規）

```typescript
import type { Response } from 'express'
import { validationResult } from 'express-validator'
import OpenAI from 'openai'
import type { AuthenticatedRequest } from '~/middleware/auth'
import { db } from '~/lib/firebase'
import { userCollection, noteCollection } from '@vectornote/common'
import { FieldValue } from 'firebase-admin/firestore'
import { convertDate } from '~/utils/convertDate'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

exports.handle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { query, limit: resultLimit = 10, minSimilarity = 0.3 } = req.body
    const uid = req.uid

    // 1. クエリをベクトル化
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryVector = embeddingResponse.data[0].embedding

    // 2. Firestore Vector Search で類似ノートを検索
    const notesRef = db
      .collection(userCollection)
      .doc(uid)
      .collection(noteCollection)

    const vectorQuery = notesRef.findNearest({
      vectorField: 'embedding',
      queryVector: FieldValue.vector(queryVector),
      limit: resultLimit,
      distanceMeasure: 'COSINE',
    })

    const snapshot = await vectorQuery.get()

    // 3. 結果を変換・フィルタ
    const results = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        const note = {
          noteId: doc.id,
          ...convertDate(data, dateColumns),
        }
        // COSINE距離を類似度に変換（similarity = 1 - distance）
        const distance = doc.get('distance') ?? 0
        const similarity = 1 - distance
        return { note, similarity }
      })
      .filter((result) => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)

    return res.status(200).json({ results })
  } catch (error) {
    console.error('Search failed:', error)
    return res.status(500).json({ error: '検索に失敗しました' })
  }
}
```

**処理フロー:**
1. 検索クエリを OpenAI API でベクトル化
2. Firestore の `findNearest()` で Vector Search を実行
3. COSINE 距離を類似度に変換し、閾値以上の結果を降順ソートして返却

### Task 3: ルーターへのルート追加

**ファイル:** `apps/functions/src/router.ts`（修正）

```typescript
router.post(
  '/search/notes',
  authMiddleware,
  [
    check('query').isString().notEmpty(),
    check('limit').optional().isInt({ min: 1, max: 50 }),
    check('minSimilarity').optional().isFloat({ min: 0, max: 1 }),
  ],
  require('./api/search/searchNotes').handle,
)
```

### Task 4: 検索 API 呼び出しヘルパー

**ファイル:** `apps/web/src/infrastructure/api/searchApi.ts`（新規）

```typescript
import type { SearchResult } from '@vectornote/common'
import { auth } from '@/lib/firebase'

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL

type SearchNotesParams = {
  query: string
  limit?: number
  minSimilarity?: number
}

type SearchNotesResponse = {
  results: SearchResult[]
}

/** セマンティック検索を実行する */
export const searchNotesApi = async (
  params: SearchNotesParams,
): Promise<SearchNotesResponse> => {
  const user = auth.currentUser
  if (!user) throw new Error('認証エラー：再ログインしてください')

  const idToken = await user.getIdToken()

  const response = await fetch(`${FUNCTIONS_BASE_URL}/search/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('検索に失敗しました')
  }

  return response.json()
}
```

### Task 5: useSearchNotes フック

**ファイル:** `apps/web/src/features/search/hooks/useSearchNotes.ts`（新規）

```typescript
import { useQuery } from '@tanstack/react-query'
import { searchNotesApi } from '@/infrastructure/api/searchApi'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const searchNotesQueryKey = (query: string) =>
  ['searchNotes', query] as const

export const useSearchNotes = (query: string) => {
  const { uid } = useFirebaseAuthContext()

  return useQuery({
    queryKey: searchNotesQueryKey(query),
    queryFn: () => searchNotesApi({ query }),
    enabled: !!uid && query.length > 0,
  })
}
```

### Task 6: SearchBar コンポーネント

**ファイル:** `apps/web/src/features/search/components/SearchBar.tsx`（新規）

- テキスト入力フィールド + 検索ボタン
- Enter キーまたはボタンクリックで検索実行
- 検索実行時に `/search?q=<クエリ>` に遷移（TanStack Router の `useNavigate`）
- ローディング中はボタンを disabled に

### Task 7: SearchResultCard コンポーネント

**ファイル:** `apps/web/src/features/search/components/SearchResultCard.tsx`（新規）

```typescript
import type { SearchResult } from '@vectornote/common'

type SearchResultCardProps = {
  result: SearchResult
}
```

- 表示内容:
  - タイトル: `note.title` があればそれ、なければ `note.content` の先頭50文字
  - タグ: shadcn/ui の `Badge` コンポーネント
  - 類似度スコア: パーセント表示のバッジ（例: `92%`）
  - 更新日時: dayjs でフォーマット
- shadcn/ui の `Card` を使用
- クリックでメモ詳細モーダルを開く（既存の `NoteDetailModal` を再利用）

### Task 8: SearchResultList コンポーネント

**ファイル:** `apps/web/src/features/search/components/SearchResultList.tsx`（新規）

- `SearchResult[]` を受け取り `SearchResultCard` をリスト表示
- 状態表示:
  - ローディング中: Skeleton コンポーネント
  - 検索結果なし: 「検索結果が見つかりませんでした」+ 検索ヒントの表示
  - エラー: エラーメッセージ + リトライボタン
- 検索結果件数の表示（例: `「会議」の検索結果: 5件`）

### Task 9: 検索結果ページ

**ファイル:** `apps/web/src/routes/_authed/search.tsx`（新規）

- URL パラメータ `q` から検索クエリを取得（TanStack Router の `useSearch`）
- `SearchBar`（初期値にクエリをセット）+ `SearchResultList` を配置
- ヘッダーに検索バーを組み込む（既存レイアウトとの統合）

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || '',
  }),
  component: SearchPage,
})
```

---

## 実装順序

1. Task 1（SearchResult 型定義）→ 共通型の基盤
2. Task 2（searchNotes エンドポイント）→ バックエンド検索ロジック
3. Task 3（ルート追加）→ エンドポイントの公開
4. Task 4（API 呼び出しヘルパー）→ フロントエンドからの呼び出し
5. Task 5（useSearchNotes フック）→ React 統合
6. Task 6（SearchBar）→ 検索入力 UI
7. Task 7（SearchResultCard）→ 個別結果カード
8. Task 8（SearchResultList）→ 結果一覧 UI
9. Task 9（検索結果ページ）→ ページ統合

## 検証方法

1. 検索バーにクエリを入力して検索実行すると、`/search?q=<クエリ>` に遷移すること
2. 検索結果が類似度の降順で表示されること
3. 各検索結果に類似度スコア（パーセント表示）が表示されること
4. 類似度が 0.3 未満のメモは表示されないこと
5. 検索中はローディング状態（Skeleton）が表示されること
6. 検索結果が 0 件の場合、空状態メッセージが表示されること
7. 検索結果カードをクリックするとメモの詳細が表示されること
8. 意味的に近いクエリで関連メモがヒットすること（例: 「会議」で「ミーティング」「打ち合わせ」を含むメモがヒット）
