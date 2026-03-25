# FR-TWEET-001: ツイートURL貼り付け時の本文自動挿入

## Context

メモ作成・編集時に Twitter/X のツイートURLを本文に貼り付けた際、Cloud Functions トリガー内で oEmbed API からアカウント名(@screen_name)とツイート本文を取得し、メモの content に Markdown 引用形式で自動挿入する機能を実装する。

OGP 情報は従来通り HTML メタタグから取得する（ツイートURLでも変わらない）。oEmbed API はツイート本文+アカウント名の取得にのみ使用する。

再トリガー防止のために `updatedBy` フィールドを Note に導入し、トリガーによる content 書き換えが無限ループしないようにする。

### 使用API: Twitter oEmbed API

```
GET https://publish.twitter.com/oembed?url={TWEET_URL}&omit_script=true
```

- 認証不要・無料
- レスポンスの `html` フィールド内の `<blockquote>` > `<p>` タグからツイート本文を抽出
- `author_url` フィールドからスクリーンネームを抽出

### ツイート引用の挿入フォーマット

ツイートURLの直前に Markdown 引用ブロックを挿入する:

```
> ユーザー名 (@screen_name)
> ツイート本文がここに入る

https://x.com/screen_name/status/123456789
```

## 前提条件

- 既存の OGP 取得機能（`onCreateNote` / `onUpdateNote`）が動作していること
- `apps/functions/src/utils/ogp.ts` に `extractFirstUrl` / `fetchOgp` が実装済みであること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Step 1: `updatedBy` 型定義と Note 型への追加 | 未着手 |
| Step 2: Firestore Security Rules 更新 | 未着手 |
| Step 3: Twitter URL 判定ユーティリティ作成 | 未着手 |
| Step 4: oEmbed API によるツイート情報取得関数の実装 | 未着手 |
| Step 5: ツイート引用挿入ユーティリティ作成 | 未着手 |
| Step 6: `onCreateNote.ts` 修正 | 未着手 |
| Step 7: `onUpdateNote.ts` 修正 | 未着手 |
| Step 8: フロントエンド修正 | 未着手 |

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `packages/common/src/entities/Note.ts` | 修正: `UpdatedBy` 型追加、`updatedBy` フィールド追加 |
| `packages/common/src/utils/twitter.ts` | 新規: `isTweetUrl`, `extractTweetId` |
| `packages/common/src/utils/index.ts` | 新規: re-export |
| `packages/common/src/index.ts` | 修正: `utils` の re-export 追加 |
| `firestore.rules` | 修正: `isValidNoteSchema` に `updatedBy` 追加 |
| `apps/functions/src/lib/twitter.ts` | 新規: `fetchTweetInfo` (oEmbed API 呼び出し) |
| `apps/functions/src/utils/tweetQuote.ts` | 新規: ツイート引用挿入ロジック |
| `apps/functions/src/triggers/onCreateNote.ts` | 修正: 引用挿入 + `updatedBy` 対応 |
| `apps/functions/src/triggers/onUpdateNote.ts` | 修正: 再トリガー防止 + 引用挿入 |
| `apps/web/src/features/notes/hooks/useCreateNoteMutation.ts` | 修正: `updatedBy: 'user'` 追加 |
| `apps/web/src/features/notes/hooks/useUpdateNoteMutation.ts` | 修正: `updatedBy: 'user'` 追加 |

---

## 実装タスク

### Step 1: `updatedBy` 型定義と Note 型への追加

**ファイル:** `packages/common/src/entities/Note.ts`

`UpdatedBy` を単独の型として定義し、Note および DTO から参照する。

```typescript
/** ドキュメント更新の操作主 */
export type UpdatedBy = 'trigger' | 'user'
```

- `Note` 型に `updatedBy: UpdatedBy` フィールドを追加
- `CreateNoteDto` は `Omit` で生成されているため自動的に含まれる
- `UpdateNoteDto` に `updatedBy?: UpdatedBy` を追加
- `UpdateNoteDtoFromAdmin` に `content?: Note['content']` と `updatedBy?: UpdatedBy` を追加

### Step 2: Firestore Security Rules 更新

**ファイル:** `firestore.rules`

- `isValidNoteSchema` の `requestData.size()` を `8` → `9` に変更
- `'updatedBy' in requestData && requestData.updatedBy is string` を追加

### Step 3: Twitter URL 判定ユーティリティ作成

**ファイル:** `packages/common/src/utils/twitter.ts`（新規）

```typescript
/** Twitter/X のツイートURLパターン */
const TWEET_URL_REGEX =
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/

/** URLがツイートURLかどうかを判定する */
export const isTweetUrl = (url: string): boolean => {
  return TWEET_URL_REGEX.test(url)
}

/** ツイートURLからツイートIDを抽出する */
export const extractTweetId = (url: string): string | null => {
  const match = url.match(TWEET_URL_REGEX)
  return match ? match[1] : null
}
```

**ファイル:** `packages/common/src/utils/index.ts`（新規）

```typescript
export { extractTweetId, isTweetUrl } from './twitter'
```

**ファイル:** `packages/common/src/index.ts`（修正）

```typescript
export * from './entities'
export * from './utils'
```

**対応URLパターン:**
- `https://twitter.com/{username}/status/{tweet_id}`
- `https://x.com/{username}/status/{tweet_id}`
- `https://www.twitter.com/{username}/status/{tweet_id}`
- `https://www.x.com/{username}/status/{tweet_id}`
- クエリパラメータ付き（`?s=20` 等）も対応

### Step 4: oEmbed API によるツイート情報取得関数の実装

**ファイル:** `apps/functions/src/lib/twitter.ts`（新規）

```typescript
type TweetOembedResponse = {
  html: string
  author_name: string
  author_url: string
  url: string
}

export type TweetInfo = {
  authorName: string
  screenName: string
  text: string
}

/** oEmbed レスポンスの HTML からツイート本文を抽出する */
const extractTweetText = (html: string): string | null => {
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/)
  if (!pMatch) return null

  return pMatch[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/** author_url からスクリーンネームを抽出する */
const extractScreenName = (authorUrl: string): string | null => {
  const match = authorUrl.match(/https?:\/\/(?:twitter\.com|x\.com)\/(\w+)/)
  return match ? match[1] : null
}

/** Twitter oEmbed API を使用してツイート情報を取得する */
export const fetchTweetInfo = async (url: string): Promise<TweetInfo | null> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
    })

    if (!response.ok) return null

    const data = (await response.json()) as TweetOembedResponse
    const screenName = extractScreenName(data.author_url)
    const text = extractTweetText(data.html)

    if (!screenName || !text) return null

    return { authorName: data.author_name, screenName, text }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**oEmbed レスポンス例:**
```json
{
  "html": "<blockquote class=\"twitter-tweet\"><p lang=\"ja\" dir=\"ltr\">ツイートの本文がここに入る</p>&mdash; ユーザー名 (@screen_name) <a href=\"...\">...</a></blockquote>",
  "author_name": "ユーザー名",
  "author_url": "https://twitter.com/screen_name",
  "url": "https://twitter.com/screen_name/status/123456789"
}
```

### Step 5: ツイート引用挿入ユーティリティ作成

**ファイル:** `apps/functions/src/utils/tweetQuote.ts`（新規）

```typescript
import { isTweetUrl } from '@vectornote/common'
import type { TweetInfo } from '~/lib/twitter'
import { fetchTweetInfo } from '~/lib/twitter'
import { extractFirstUrl } from '~/utils/ogp'

/** ツイート引用ブロックを生成する */
const buildTweetQuoteBlock = (info: TweetInfo): string => {
  return `> ${info.authorName} (@${info.screenName})\n> ${info.text}`
}

/** content 内のツイートURLの直前に引用ブロックを挿入する */
export const insertTweetQuote = async (
  content: string,
): Promise<{ content: string; changed: boolean }> => {
  const url = extractFirstUrl(content)
  if (!url || !isTweetUrl(url)) {
    return { content, changed: false }
  }

  // 既に引用が挿入済みならスキップ（URLの直前に引用ブロックがある）
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alreadyInserted = new RegExp(`> .+ \\(@\\w+\\)\\n>[^\\n]+\\n\\n${escaped}`)
  if (alreadyInserted.test(content)) {
    return { content, changed: false }
  }

  const info = await fetchTweetInfo(url)
  if (!info) {
    return { content, changed: false }
  }

  const quoteBlock = buildTweetQuoteBlock(info)
  const updatedContent = content.replace(url, `${quoteBlock}\n\n${url}`)
  return { content: updatedContent, changed: true }
}
```

### Step 6: `onCreateNote.ts` 修正

**ファイル:** `apps/functions/src/triggers/onCreateNote.ts`

処理フロー:
1. OGP取得（従来通り `fetchOgp`）
2. ツイート引用挿入（`insertTweetQuote`）
3. OGP + content + `updatedBy: 'trigger'` で Note 更新
4. embedding生成（挿入後の content を使用）

### Step 7: `onUpdateNote.ts` 修正

**ファイル:** `apps/functions/src/triggers/onUpdateNote.ts`

処理フロー:
1. **先頭で** `after.updatedBy === 'trigger'` ならスキップ（再トリガー防止）
2. content 変更時: OGP再取得 + ツイート引用挿入
3. `updatedBy: 'trigger'` で Note 更新
4. embedding再生成（挿入後の content を使用）

### Step 8: フロントエンド修正

**ファイル:** `apps/web/src/features/notes/hooks/useCreateNoteMutation.ts`
**ファイル:** `apps/web/src/features/notes/hooks/useUpdateNoteMutation.ts`

- `useCreateNoteMutation.ts`: dto に `updatedBy: 'user' as const` を追加
- `useUpdateNoteMutation.ts`: dto に `updatedBy: 'user' as const` を追加

---

## 検証方法

1. メモ本文に `https://x.com/username/status/123456789` 形式のURLを含めてメモを作成する
2. Firestore コンソールで以下を確認:
   - `content` にツイート引用ブロック（`> ユーザー名 (@screen_name)\n> 本文`）が挿入されていること
   - `ogp` フィールドに従来通り OGP 情報が保存されていること
   - `updatedBy` が `'trigger'` になっていること
3. OgpPreview コンポーネントで OGP 情報が表示されることを確認
4. 通常のURL（Twitter以外）では従来通り OGP 情報のみが取得されることを確認
5. 削除済みツイートや保護アカウントのURLの場合、エラーにならず OGP のみ保存されることを確認
6. メモ編集でツイートURLを追加した場合も正しく引用が挿入されることを確認
7. トリガーによる content 書き換え後に再トリガーが発火しないことを確認（`updatedBy: 'trigger'` でスキップ）
8. `pnpm functions pre-build` でビルド確認
9. `pnpm web build` でフロントエンドビルド確認
