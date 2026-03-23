# FR-SEARCH-003: 検索履歴 実装計画

## Context

ユーザーの検索体験を向上させるため、過去の検索クエリをローカルストレージに保存し、ワンクリックで再検索できる機能を実装する。直近10件の検索履歴を管理する。

## 前提条件

- FR-SEARCH-001 が実装済みであること（SearchBar、検索結果ページ）

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: useSearchHistory フック | 未着手 |
| Task 2: SearchHistory コンポーネント | 未着手 |
| Task 3: SearchBar への履歴統合 | 未着手 |

---

## 実装タスク

### Task 1: useSearchHistory フック

**ファイル:** `apps/web/src/features/search/hooks/useSearchHistory.ts`（新規）

```typescript
const STORAGE_KEY = 'vectornote-search-history'
const MAX_HISTORY = 10

type UseSearchHistoryReturn = {
  history: string[]
  addHistory: (query: string) => void
  removeHistory: (query: string) => void
  clearHistory: () => void
}

export const useSearchHistory = (): UseSearchHistoryReturn => {
  const [history, setHistory] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  })

  const addHistory = useCallback((query: string) => {
    setHistory((prev) => {
      // 重複を除去して先頭に追加、最大10件
      const filtered = prev.filter((q) => q !== query)
      const updated = [query, ...filtered].slice(0, MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const updated = prev.filter((q) => q !== query)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setHistory([])
  }, [])

  return { history, addHistory, removeHistory, clearHistory }
}
```

**仕様:**
- ローカルストレージのキー: `vectornote-search-history`
- 最大保存件数: 10件
- 同じクエリは重複保存せず、最新位置に移動
- `addHistory`: 検索実行時に呼び出す
- `removeHistory`: 個別の履歴を削除
- `clearHistory`: 全履歴をクリア

### Task 2: SearchHistory コンポーネント

**ファイル:** `apps/web/src/features/search/components/SearchHistory.tsx`（新規）

```typescript
type SearchHistoryProps = {
  history: string[]
  onSelect: (query: string) => void
  onRemove: (query: string) => void
  onClear: () => void
}
```

- 検索履歴を縦リストで表示
- 各履歴項目:
  - クエリテキスト（クリックで `onSelect` → 再検索）
  - 削除ボタン（× アイコン、クリックで `onRemove`）
- リスト上部に「検索履歴」ラベルと「すべて削除」ボタン
- 履歴が0件の場合は表示しない

### Task 3: SearchBar への履歴統合

**ファイル:** `apps/web/src/features/search/components/SearchBar.tsx`（修正）

- 検索バーにフォーカスした際、入力が空であれば検索履歴をドロップダウン表示
- 履歴項目クリックで検索バーにクエリをセットし検索実行
- 検索実行時に `addHistory` で履歴に追加
- 検索バー外クリックでドロップダウンを閉じる

**実装イメージ:**

```typescript
const SearchBar = () => {
  const [inputValue, setInputValue] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const { history, addHistory, removeHistory, clearHistory } = useSearchHistory()
  const navigate = useNavigate()

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    addHistory(query.trim())
    setShowHistory(false)
    navigate({ to: '/search', search: { q: query.trim() } })
  }

  const handleSelectHistory = (query: string) => {
    setInputValue(query)
    handleSearch(query)
  }

  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setShowHistory(true)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch(inputValue)}
        placeholder="メモを検索..."
      />
      {showHistory && history.length > 0 && !inputValue && (
        <SearchHistory
          history={history}
          onSelect={handleSelectHistory}
          onRemove={removeHistory}
          onClear={clearHistory}
        />
      )}
    </div>
  )
}
```

---

## 実装順序

1. Task 1（useSearchHistory フック）→ 履歴管理ロジック
2. Task 2（SearchHistory コンポーネント）→ 履歴表示 UI
3. Task 3（SearchBar 統合）→ 検索バーとの連携

## 検証方法

1. 検索を実行すると、ローカルストレージに検索クエリが保存されること
2. 検索バーにフォーカスすると、過去の検索履歴がドロップダウンで表示されること
3. 履歴項目をクリックすると、そのクエリで再検索が実行されること
4. 同じクエリで再検索した場合、重複せず最新位置に移動すること
5. 11件目の検索を行うと、最も古い履歴が削除されること
6. 個別の履歴を削除できること
7. 「すべて削除」で全履歴がクリアされること
8. ブラウザをリロードしても検索履歴が保持されること
