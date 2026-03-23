# FR-EMBED-001: 埋め込み生成 実装計画

## Context

VectorNote のセマンティック検索（FR-SEARCH-001）の前提条件として、メモ保存時に自動的にベクトル埋め込みを生成する機能を実装する。OpenAI text-embedding-3-small（1536次元）を使用し、Firebase Functions の Firestore トリガー（`onDocumentCreated` / `onDocumentWritten`）でバックグラウンド処理として実行する。フロントエンド側の変更は不要。

## 前提条件

- Firebase Functions がデプロイ可能であること
- Note 型定義に `embedding: VectorValue | null` が定義済みであること（`packages/common/src/entities/Note.ts`）
- Firestore Vector Search インデックス（dimension: 1536）が `firestore.indexes.json` に設定済みであること
- OpenAI API キーが Firebase Functions の環境変数（`OPENAI_API_KEY`）に設定されていること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: OpenAI パッケージの追加 | 未着手 |
| Task 2: OpenAI クライアントの初期化 | 未着手 |
| Task 3: onCreateNote トリガーの実装 | 未着手 |
| Task 4: onUpdateNote トリガーの実装 | 未着手 |

---

## 実装タスク

### Task 1: OpenAI パッケージの追加

**ファイル:** `apps/functions/package.json`（修正）

```bash
cd apps/functions && pnpm add openai
```

### Task 2: OpenAI クライアントの初期化

**ファイル:** `apps/functions/src/lib/openai.ts`（新規）

```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### Task 3: onCreateNote トリガーの実装

**ファイル:** `apps/functions/src/triggers/onCreateNote.ts`（新規）

メモが作成された時に自動的にベクトル埋め込みを生成し、同ドキュメントに書き戻す。

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { openai } from '~/lib/openai'

export const onCreateNote = onDocumentCreated(
  'users/{uid}/notes/{noteId}',
  async (event) => {
    const snapshot = event.data
    if (!snapshot) return

    const data = snapshot.data()
    const { title, content, keywords, tags } = data

    // 埋め込み対象テキスト = タイトル + 本文 + 関連キーワード + タグ
    const embeddingText = [
      title || '',
      content || '',
      keywords || '',
      ...(tags || []),
    ]
      .filter(Boolean)
      .join(' ')

    if (!embeddingText.trim()) return

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
      })

      const embedding = response.data[0].embedding

      await snapshot.ref.update({
        embedding: FieldValue.vector(embedding),
      })
    } catch (error) {
      console.error('Embedding generation failed for note:', event.params.noteId, error)
    }
  },
)
```

**処理フロー:**
1. メモ作成イベントを検知
2. `タイトル + 本文 + キーワード + タグ` を連結して埋め込み対象テキストを生成
3. OpenAI API でベクトル化（text-embedding-3-small, 1536次元）
4. 生成されたベクトルを `FieldValue.vector()` で同ドキュメントの `embedding` フィールドに書き戻す
5. エラー時はログ出力のみ（メモ作成自体には影響しない）

**ファイル:** `apps/functions/src/index.ts`（修正）

```typescript
// triggers の下にエクスポートを追加
export { onCreateNote } from './triggers/onCreateNote'
```

### Task 4: onUpdateNote トリガーの実装

**ファイル:** `apps/functions/src/triggers/onUpdateNote.ts`（新規）

メモの内容が更新された時に embedding を再生成する。embedding フィールド自体の更新では再トリガーしないよう制御する。

```typescript
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { openai } from '~/lib/openai'

export const onUpdateNote = onDocumentWritten(
  'users/{uid}/notes/{noteId}',
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()

    // 削除イベントまたは作成イベントはスキップ（作成は onCreateNote で処理）
    if (!before || !after) return

    // 内容に変更がない場合はスキップ
    const contentChanged =
      before.title !== after.title ||
      before.content !== after.content ||
      before.keywords !== after.keywords ||
      JSON.stringify(before.tags) !== JSON.stringify(after.tags)

    if (!contentChanged) return

    const { title, content, keywords, tags } = after

    const embeddingText = [
      title || '',
      content || '',
      keywords || '',
      ...(tags || []),
    ]
      .filter(Boolean)
      .join(' ')

    if (!embeddingText.trim()) return

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
      })

      const embedding = response.data[0].embedding

      await event.data!.after!.ref.update({
        embedding: FieldValue.vector(embedding),
      })
    } catch (error) {
      console.error('Embedding re-generation failed for note:', event.params.noteId, error)
    }
  },
)
```

**無限ループ防止:**
- `contentChanged` チェックにより、embedding フィールドのみの更新（= トリガー自身による書き戻し）では再トリガーしない
- `title`, `content`, `keywords`, `tags` のいずれかが変更された場合のみ再生成

**ファイル:** `apps/functions/src/index.ts`（修正）

```typescript
// triggers の下にエクスポートを追加
export { onCreateNote } from './triggers/onCreateNote'
export { onUpdateNote } from './triggers/onUpdateNote'
```

---

## 実装順序

1. Task 1（OpenAI パッケージ追加）→ 依存パッケージ
2. Task 2（OpenAI クライアント初期化）→ 共通モジュール
3. Task 3（onCreateNote トリガー）→ 新規メモの embedding 生成
4. Task 4（onUpdateNote トリガー）→ 既存メモの embedding 再生成

## 検証方法

1. メモを新規作成した後、Firestore コンソールで embedding フィールドに 1536 次元のベクトルが保存されていること
2. メモの content や title を編集した後、embedding が再生成されていること
3. embedding のみが変更された場合（トリガーによる書き戻し）は再トリガーされないこと（無限ループしないこと）
4. embedding 生成に失敗しても、メモの作成・更新自体は正常に完了していること
5. Functions のログに embedding 生成の成功・失敗が記録されていること
