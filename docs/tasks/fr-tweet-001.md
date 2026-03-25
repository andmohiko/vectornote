# FR-TWEET-001: ツイートURL貼り付け時の本文自動挿入

## Context

メモ作成・編集時に Twitter/X のツイートURLを本文に貼り付けた際、ツイートの本文テキストを自動的にメモ本文に挿入する機能を実装する。

現状、URLを貼ると Cloud Functions の `onCreateNote` / `onUpdateNote` トリガーで OGP 情報（タイトル・説明・画像）を取得しているが、Twitter/X の OGP ではツイート本文が十分に取得できない。Twitter の oEmbed API（`publish.twitter.com/oembed`）を利用することで、認証不要でツイート本文を取得できる。

## 方針

### アプローチ: Cloud Functions（サーバーサイド）で処理

ツイート本文の取得は既存の OGP 取得フローに組み込み、Cloud Functions 側で実行する。

**理由:**
- 既存の `fetchOgp` と同じレイヤーで処理でき、アーキテクチャの一貫性を保てる
- oEmbed API はサーバーサイドから呼ぶのが適切（CORS の問題を回避）
- フロントエンドの変更を最小限に抑えられる

### ツイート本文の格納先

OGP の `description` フィールドにツイート本文を格納する。

**理由:**
- 既存の `OgpInfo` 型を変更せずに対応できる
- OgpPreview コンポーネントで `description` として表示される
- embedding 生成時にも `ogpDescription` として検索対象に含まれる

### 使用API: Twitter oEmbed API

```
GET https://publish.twitter.com/oembed?url={TWEET_URL}&omit_script=true
```

- 認証不要・無料
- レスポンスの `html` フィールド内の `<blockquote>` > `<p>` タグからツイート本文を抽出
- `author_name` フィールドからユーザー表示名を取得可能

## 前提条件

- 既存の OGP 取得機能（`onCreateNote` / `onUpdateNote`）が動作していること
- `apps/functions/src/utils/ogp.ts` に `extractFirstUrl` / `fetchOgp` が実装済みであること

## 実装ステータス

| タスク | ステータス |
|--------|-----------|
| Task 1: Twitter URL 判定ユーティリティの追加 | 未着手 |
| Task 2: oEmbed API によるツイート情報取得関数の実装 | 未着手 |
| Task 3: OGP 取得フローへの統合 | 未着手 |
| Task 4: フロントエンドでのツイート表示対応（任意） | 未着手 |

---

## 実装タスク

### Task 1: Twitter URL 判定ユーティリティの追加

**ファイル:** `apps/functions/src/utils/twitter.ts`（新規）

Twitter/X のツイートURLかどうかを判定し、URLを正規化する。

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

**対応URLパターン:**
- `https://twitter.com/{username}/status/{tweet_id}`
- `https://x.com/{username}/status/{tweet_id}`
- `https://www.twitter.com/{username}/status/{tweet_id}`
- `https://www.x.com/{username}/status/{tweet_id}`
- クエリパラメータ付き（`?s=20` 等）も対応

### Task 2: oEmbed API によるツイート情報取得関数の実装

**ファイル:** `apps/functions/src/utils/twitter.ts`（Task 1 に追記）

oEmbed API を呼び出し、ツイート本文と著者名を取得する。

```typescript
import type { OgpInfo } from '@vectornote/common'

type TweetOembedResponse = {
  html: string
  author_name: string
  author_url: string
  url: string
}

/** oEmbed レスポンスの HTML からツイート本文を抽出する */
const extractTweetText = (html: string): string | null => {
  // <blockquote> 内の <p> タグからテキストを抽出
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/)
  if (!pMatch) return null

  return (
    pMatch[1]
      // HTMLタグを除去
      .replace(/<[^>]+>/g, '')
      // HTMLエンティティをデコード
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  )
}

/** Twitter oEmbed API を使用してツイート情報を OgpInfo として取得する */
export const fetchTweetAsOgp = async (url: string): Promise<OgpInfo> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
    })

    if (!response.ok) {
      return { url, title: null, description: null, image: null }
    }

    const data = (await response.json()) as TweetOembedResponse
    const tweetText = extractTweetText(data.html)

    return {
      url,
      title: data.author_name ?? null,
      description: tweetText,
      image: null,
    }
  } catch {
    return { url, title: null, description: null, image: null }
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

**OgpInfo へのマッピング:**
| OgpInfo フィールド | 値 |
|---|---|
| `url` | 元のツイートURL |
| `title` | `author_name`（ユーザー表示名） |
| `description` | `<p>` タグから抽出したツイート本文 |
| `image` | `null`（oEmbed API では画像URLを取得できない） |

### Task 3: OGP 取得フローへの統合

**ファイル:** `apps/functions/src/utils/ogp.ts`（修正）

既存の `fetchOgp` を呼ぶ前に Twitter URL かどうかを判定し、ツイートURLの場合は `fetchTweetAsOgp` を使用する。

```typescript
// ogp.ts に追加するインポートと関数

import { isTweetUrl, fetchTweetAsOgp } from '~/utils/twitter'

/** URLの種類に応じて適切な方法で OGP 情報を取得する */
export const fetchOgpAuto = async (url: string): Promise<OgpInfo> => {
  if (isTweetUrl(url)) {
    return fetchTweetAsOgp(url)
  }
  return fetchOgp(url)
}
```

**ファイル:** `apps/functions/src/triggers/onCreateNote.ts`（修正）
**ファイル:** `apps/functions/src/triggers/onUpdateNote.ts`（修正）

トリガー関数内で `fetchOgp` を呼んでいる箇所を `fetchOgpAuto` に置き換える。

```diff
- import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
+ import { extractFirstUrl, fetchOgpAuto } from '~/utils/ogp'

- const ogp = await fetchOgp(url)
+ const ogp = await fetchOgpAuto(url)
```

### Task 4: フロントエンドでのツイート表示対応（任意）

**ファイル:** `apps/web/src/features/notes/components/OgpPreview.tsx`（修正）

現状の `OgpPreview` コンポーネントはそのままでも `title`（著者名）と `description`（ツイート本文）を表示するため、基本的な表示は変更不要。

ただし、ツイートであることを視覚的に区別したい場合は以下の対応を行う。

```typescript
// ツイートURLかどうかの判定（フロントエンド用）
const isTweetUrl = (url: string): boolean =>
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)
```

表示例:
- ツイートURLの場合、OgpPreview に Twitter/X アイコンやラベルを追加
- `image` が `null` のため、画像なしレイアウトで表示される

**優先度:** 低（既存の OgpPreview で十分表示可能なため）

---

## 実装順序

1. Task 1（Twitter URL 判定）→ 基盤ユーティリティ
2. Task 2（oEmbed 取得関数）→ ツイート取得ロジック
3. Task 3（OGP フロー統合）→ 既存トリガーとの接続
4. Task 4（フロント表示対応）→ 任意の UI 改善

## 影響範囲

| 対象 | 変更内容 |
|------|---------|
| `apps/functions/src/utils/twitter.ts` | 新規作成 |
| `apps/functions/src/utils/ogp.ts` | `fetchOgpAuto` 関数を追加 |
| `apps/functions/src/triggers/onCreateNote.ts` | `fetchOgp` → `fetchOgpAuto` に変更 |
| `apps/functions/src/triggers/onUpdateNote.ts` | `fetchOgp` → `fetchOgpAuto` に変更 |
| `apps/web/src/features/notes/components/OgpPreview.tsx` | （任意）ツイート表示の最適化 |

## 検証方法

1. メモ本文に `https://x.com/username/status/123456789` 形式のURLを含めてメモを作成する
2. Firestore コンソールで `ogp` フィールドに以下が保存されていることを確認:
   - `title`: ツイート著者名
   - `description`: ツイート本文テキスト
   - `image`: `null`
3. OgpPreview コンポーネントでツイート著者名と本文が表示されることを確認
4. 通常のURL（Twitter以外）では従来通り OGP 情報が取得されることを確認
5. 削除済みツイートや保護アカウントのURLの場合、エラーにならず空の OGP 情報が保存されることを確認
6. メモ編集でツイートURLを追加・変更した場合も正しく取得されることを確認
