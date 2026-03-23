# FR-SEARCH-002: フィルタ検索 実装計画

## Context

セマンティック検索（FR-SEARCH-001）に対して、タグや日付範囲によるフィルタリング機能を追加する。フィルタはセマンティック検索と組み合わせて使用でき、検索結果をさらに絞り込むことができる。

## 前提条件

- FR-SEARCH-001 が実装済みであること（searchNotes エンドポイント、検索 UI）
- タグが Note エンティティに保存されていること（`tags: string[]`）

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: searchNotes エンドポイントにフィルタパラメータ追加 | 未着手 |
| Task 2: TagFilter コンポーネント | 未着手 |
| Task 3: DateRangeFilter コンポーネント | 未着手 |
| Task 4: SearchFilters 統合コンポーネント | 未着手 |
| Task 5: 検索フック・ページへのフィルタ統合 | 未着手 |

---

## 実装タスク

### Task 1: searchNotes エンドポイントにフィルタパラメータ追加

**ファイル:** `apps/functions/src/api/search/searchNotes.ts`（修正）

リクエストパラメータに `tags` と `dateRange` を追加し、Vector Search の結果に対してフィルタリングを行う。

```typescript
// リクエストボディの拡張
const {
  query,
  limit: resultLimit = 10,
  minSimilarity = 0.3,
  tags,        // string[] | undefined — タグフィルタ
  dateRange,   // { start: string, end: string } | undefined — 日付範囲フィルタ
} = req.body
```

**フィルタロジック:**
- Vector Search 後に結果をフィルタリング（Firestore Vector Search は直接フィルタをサポートしないため）
- タグフィルタ: 指定タグのいずれかを含むメモのみ返す
- 日付範囲フィルタ: `createdAt` が指定範囲内のメモのみ返す

```typescript
// Vector Search 結果に対するフィルタリング
let filteredResults = results

if (tags && tags.length > 0) {
  filteredResults = filteredResults.filter((r) =>
    tags.some((tag: string) => r.note.tags.includes(tag)),
  )
}

if (dateRange) {
  const start = new Date(dateRange.start)
  const end = new Date(dateRange.end)
  filteredResults = filteredResults.filter((r) => {
    const createdAt = r.note.createdAt
    return createdAt >= start && createdAt <= end
  })
}
```

**ルーターのバリデーション追加:**

```typescript
// router.ts の searchNotes ルートに追加
check('tags').optional().isArray(),
check('tags.*').optional().isString(),
check('dateRange').optional().isObject(),
check('dateRange.start').optional().isISO8601(),
check('dateRange.end').optional().isISO8601(),
```

### Task 2: TagFilter コンポーネント

**ファイル:** `apps/web/src/features/search/components/TagFilter.tsx`（新規）

```typescript
type TagFilterProps = {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}
```

- ユーザーが使用しているタグの一覧を表示（既存メモから取得 or 検索結果のタグを集約）
- shadcn/ui の `Badge` をトグルボタンとして使用
- 選択中のタグはハイライト表示
- 複数タグの同時選択が可能（OR 条件）

### Task 3: DateRangeFilter コンポーネント

**ファイル:** `apps/web/src/features/search/components/DateRangeFilter.tsx`（新規）

```typescript
type DateRange = {
  start: string // ISO 8601
  end: string   // ISO 8601
}

type DateRangeFilterProps = {
  dateRange: DateRange | null
  onDateRangeChange: (dateRange: DateRange | null) => void
}
```

- 開始日・終了日の入力（shadcn/ui の日付ピッカーまたは `input[type="date"]`）
- 「今日」「今週」「今月」のプリセットボタン
- クリアボタンで日付範囲フィルタを解除

### Task 4: SearchFilters 統合コンポーネント

**ファイル:** `apps/web/src/features/search/components/SearchFilters.tsx`（新規）

```typescript
type SearchFiltersProps = {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  dateRange: DateRange | null
  onDateRangeChange: (dateRange: DateRange | null) => void
}
```

- `TagFilter` と `DateRangeFilter` を横並びまたはアコーディオンで配置
- フィルタの有無を示すインジケーター（フィルタ適用中の場合はバッジ表示）
- 「フィルタをクリア」ボタンで全フィルタを一括解除

### Task 5: 検索フック・ページへのフィルタ統合

**修正ファイル:**
- `apps/web/src/infrastructure/api/searchApi.ts`（修正）
- `apps/web/src/features/search/hooks/useSearchNotes.ts`（修正）
- `apps/web/src/routes/_authed/search.tsx`（修正）

**searchApi.ts の修正:**

```typescript
type SearchNotesParams = {
  query: string
  limit?: number
  minSimilarity?: number
  tags?: string[]       // 追加
  dateRange?: DateRange | null  // 追加
}
```

**useSearchNotes の修正:**

```typescript
export const useSearchNotes = (
  query: string,
  options?: { tags?: string[]; dateRange?: DateRange | null },
) => {
  const { uid } = useFirebaseAuthContext()

  return useQuery({
    queryKey: ['searchNotes', query, options?.tags, options?.dateRange],
    queryFn: () =>
      searchNotesApi({
        query,
        tags: options?.tags,
        dateRange: options?.dateRange,
      }),
    enabled: !!uid && query.length > 0,
  })
}
```

**search.tsx の修正:**
- URL パラメータに `tags` と `dateRange` を追加
- `SearchFilters` コンポーネントを検索バーの下に配置
- フィルタ変更時に URL パラメータを更新して再検索

---

## 実装順序

1. Task 1（エンドポイントのフィルタ対応）→ バックエンドの拡張
2. Task 2（TagFilter）→ タグフィルタ UI
3. Task 3（DateRangeFilter）→ 日付フィルタ UI
4. Task 4（SearchFilters）→ フィルタ統合
5. Task 5（フック・ページ統合）→ フロントエンド全体の統合

## 検証方法

1. タグフィルタを選択すると、選択したタグを含むメモのみが検索結果に表示されること
2. 日付範囲を指定すると、指定期間内のメモのみが検索結果に表示されること
3. タグフィルタと日付フィルタを同時に使用できること
4. セマンティック検索とフィルタを組み合わせて検索できること
5. フィルタをクリアすると、フィルタなしの検索結果に戻ること
6. プリセットボタン（今日、今週、今月）が正しく動作すること
7. URL パラメータにフィルタ条件が反映され、ページリロードでも維持されること
