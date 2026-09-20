# ⚡ Vector Memo 要件定義書

**セマンティック検索メモ帳アプリケーション**

---

## 1. プロジェクト概要

### 1.1 背景と目的

現代のナレッジワーカーは、Slack、Twitter、Notion、手元のメモ帳など、複数のプラットフォームに情報が散在している状況に直面しています。従来のキーワード検索では完全一致が必要なため、「会議」と入力しても「ミーティング」や「打ち合わせ」は検索結果に表示されません。

本プロジェクトでは、ベクトル埋め込み技術を活用し、曖昧な記憶や類語、ニュアンスでも検索可能な「セマンティック検索メモ帳」を開発します。これにより、ユーザーは過去のアイデアや情報を直感的に発見できるようになります。

### 1.2 プロジェクトスコープ

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Vector Memo |
| 開発期間 | Phase 1: 4週間（MVP） |
| 対象ユーザー | 個人のナレッジワーカー、研究者、クリエイター |
| プラットフォーム | Webアプリケーション（SPA、レスポンシブ対応） |

### 1.3 用語定義

| 用語 | 定義 |
|------|------|
| セマンティック検索 | キーワードの完全一致ではなく、意味的な類似性に基づいて検索する手法 |
| ベクトル埋め込み | テキストを高次元の数値ベクトルに変換したもの。意味が近いテキストは近い位置にマッピングされる |
| コサイン類似度 | 2つのベクトル間の角度の余弦を計算し、類似性を0〜1で表す指標 |
| Embedding Model | テキストをベクトルに変換するAIモデル（例: OpenAI text-embedding-3-small） |

---

## 2. 機能要件

### 2.1 認証機能

#### FR-AUTH-001: Googleログイン

| 項目 | 内容 |
|------|------|
| 概要 | Firebase AuthenticationによるGoogleアカウントログイン |
| 優先度 | 必須 |

**詳細要件:**
- Firebase Authenticationを使用したGoogleアカウントでのログイン機能を提供する
- 未ログイン状態ではログイン画面のみを表示する
- ログイン成功後、自動的にメモ一覧画面へ遷移する
- ログアウト機能を提供し、セッションを完全にクリアする

#### FR-AUTH-002: セッション管理

| 項目 | 内容 |
|------|------|
| 概要 | ログイン状態の永続化と管理 |
| 優先度 | 必須 |

**詳細要件:**
- ログイン状態を永続化する（Firebase Authの状態 + `localStorage` にログイン時刻 `auth_login_at` を保存）
- セッション有効期限は30日間とする。`onAuthStateChanged` 内で経過時間が30日を超えていれば自動ログアウトし `/login` へ遷移する
- 複数デバイスからの同時ログインを許可する
- TanStack Routerのレイアウトルート（`_authed`）の `beforeLoad` で `auth.currentUser` を検証し、未認証時は `/login` へリダイレクトする
- ログアウト時は `signOut` に加えて `localStorage` のログイン時刻削除と TanStack Query キャッシュのクリア（`queryClient.clear()`）を行う

---

### 2.2 メモ管理機能

#### FR-MEMO-001: メモの作成

| 項目 | 内容 |
|------|------|
| 概要 | 新規メモの作成機能 |
| 優先度 | 必須 |

**入力フィールド仕様:**

| フィールド名 | 必須/任意 | データ型 | バリデーション |
|-------------|----------|---------|---------------|
| 本文 (content) | **必須** | string | 1文字以上、10,000文字以下 |
| タイトル (title) | 任意 | string \| null | 100文字以下 |
| 関連キーワード (keywords) | 任意 | string \| null | 500文字以下。カンマまたはスペース区切り |
| タグ (tags) | 任意 | string[] | 各タグ50文字以下、最大10個 |

**詳細要件:**
- テンプレートを選択して各フィールドの初期値を流し込める（詳細は FR-TEMPLATE-001 参照）
- 未保存のまま作成を中断しようとした場合は確認を表示する

**処理フロー:**
1. ユーザーがフォームに入力
2. クライアント側でZodによるバリデーション
3. Firestoreにメモデータを保存（`addDoc` / 自動ID。`embedding: null`, `isPinned: false`, `ogp: null`, `updatedBy: 'user'` で初期化）
4. Firestoreの `onDocumentCreated` トリガーが起動し、OGP取得・ツイート引用挿入・ベクトル埋め込み生成を非同期で実行し、ドキュメントを更新する
5. 成功後、モーダルを閉じて一覧を再取得（invalidate）する

> 注: 埋め込みはメモ保存時ではなく Firestore トリガーで非同期生成されるため、作成直後は `embedding: null`。生成完了までに遅延がある（詳細は FR-EMBED-001 参照）。

#### FR-MEMO-002: メモの編集

| 項目 | 内容 |
|------|------|
| 概要 | 既存メモの編集機能 |
| 優先度 | 必須 |

**詳細要件:**
- 作成済みメモの全フィールド（本文・タイトル・キーワード・タグ）を編集可能とする
- 更新時は `updatedBy: 'user'` をセットする。`title / content / keywords / tags` のいずれかが変更された場合、Firestoreの `onDocumentUpdated` トリガーがベクトル埋め込みを再生成する（`updatedBy: 'trigger'` による更新では再生成しない = 再帰トリガー防止）
- 更新日時（updatedAt）を自動更新する
- 楽観的更新（Optimistic Update）を実装する（対象は単一ノート詳細キャッシュ。一覧は invalidate で再取得）
- 本文コピー、ピン留めトグルの操作を提供する
- 未保存のまま編集を中断しようとした場合は確認を表示する

#### FR-MEMO-003: メモの削除

| 項目 | 内容 |
|------|------|
| 概要 | メモの削除機能 |
| 優先度 | 必須 |

**詳細要件:**
- 確認（「この操作は取り消せません」）を経てからメモを削除する
- 削除は物理削除（復元不可）とする（`deleteDoc`）
- 削除後は `onDocumentDeleted` トリガーがタグ使用回数（count）をデクリメントする
- 削除後は一覧を再取得（invalidate）する

#### FR-MEMO-004: メモ一覧表示

| 項目 | 内容 |
|------|------|
| 概要 | ログイン後のデフォルト画面 |
| 優先度 | 必須 |

**詳細要件:**
- ログイン後のデフォルト画面（`/`）としてメモ一覧を表示する
- 「最新」と「固定（`isPinned: true` のみ）」を切り替えて表示できる（詳細は FR-MEMO-005 参照）
- 更新日時の降順（最新順）でソートする（`orderBy('updatedAt', 'desc')`）
- 無限スクロールによるページネーションを実装する（カーソル `startAfter`、**1回あたり18件**）
- 各メモはタイトル（または本文先頭）、タグ、更新日時、OGP情報を表示する
- URLクエリ `?tag=xxx` によるタグ絞り込みが可能（`where('tags', 'array-contains', tag)`）
- TanStack Queryによるデータフェッチとキャッシュ管理

#### FR-MEMO-005: メモの固定（ピン留め）

| 項目 | 内容 |
|------|------|
| 概要 | 重要なメモをピン留めして固定表示する |
| 優先度 | 中 |

**詳細要件:**
- メモの `isPinned` フラグをトグルできる
- 「固定」表示では `isPinned: true` のメモを更新日時降順・無限スクロールで一覧表示する

---

### 2.3 検索機能

#### FR-SEARCH-001: セマンティック検索

| 項目 | 内容 |
|------|------|
| 概要 | ベクトル類似度に基づく意味検索 |
| 優先度 | 必須 |

**詳細要件:**
- 検索クエリをベクトル化し、Firestore Vector Search（`findNearest`, `distanceMeasure: 'COSINE'`）で近傍メモを取得する
- `similarity = 1 - distance` に変換し、閾値以上のメモを検索結果として返す
  - サーバー既定値: `minSimilarity = 0.3`
  - **クライアントは `minSimilarity: 0.2`, `limit: 20` を明示送信するため、実効閾値は 0.2**
- 検索結果は類似度の降順でソートする
- 各検索結果に類似度スコア（パーセント表示）を付与する
- 検索は `/search?q=xxx` で実行する

**検索例:**

| 検索クエリ | ヒットするメモ例 |
|-----------|----------------|
| 「会議で出たアイデア」 | 「ミーティング」「打ち合わせ」「MTG」を含むメモ |
| 「プログラミングの勉強」 | 「TypeScript」「React」「コーディング」を含むメモ |
| 「進捗どうなってる」 | 「ステータス」「完了」「作業中」を含むメモ |

#### FR-SEARCH-002: フィルタ検索

| 項目 | 内容 |
|------|------|
| 概要 | 条件によるフィルタリング |
| 優先度 | 中 |
| **実装状況** | **未実装**（一覧画面のタグ絞り込み `?tag=` はあるが、セマンティック検索側のフィルタ併用は未対応） |

**詳細要件:**
- タグによるフィルタリングが可能
- 日付範囲によるフィルタリングが可能
- セマンティック検索とフィルタの組み合わせが可能

#### FR-SEARCH-003: 検索履歴

| 項目 | 内容 |
|------|------|
| 概要 | 過去の検索クエリの保存・再利用 |
| 優先度 | 低 |
| **実装状況** | **未実装**（検索クエリはURLの `q` パラメータに保持されるのみ） |

**詳細要件:**
- 直近10件の検索クエリをローカルストレージに保存する
- 検索履歴からワンクリックで再検索が可能

---

### 2.4 ベクトル埋め込み

#### FR-EMBED-001: 埋め込み生成

| 項目 | 内容 |
|------|------|
| 概要 | メモ保存時の自動ベクトル生成 |
| 優先度 | 必須 |

**詳細要件:**
- 埋め込みは **onCall関数ではなく Firestore トリガー**（`onDocumentCreated` / `onDocumentUpdated`）で非同期生成する。各トリガーは `triggerOnce` で冪等化する
- トリガー内の処理順序: OGP取得（`fetchOgp`）→ ツイート引用挿入（`insertTweetQuote`）→ content/ogp更新 → 埋め込み生成
- 埋め込み対象テキスト（`buildEmbeddingText`）= `タイトル + 本文 + 関連キーワード + タグ + OGPタイトル + OGP説明`（空要素を除外して連結）
- OpenAI text-embedding-3-small（1536次元）を使用する（次元数はコードで明示せず、モデル既定 + `firestore.indexes.json` の `dimension: 1536` に依存）
- Firestoreへは `FieldValue.vector(embedding)` として保存する（型は `VectorValue | null`）
- OpenAI APIキーは Firebase Functions Secret で保護する（クライアントに露出しない）
- 更新時は `title / content / keywords / tags` のいずれか変更時のみ再生成。`updatedBy: 'trigger'` の更新では再生成しない（再帰トリガー防止）
- OpenAI API 失敗時はログ出力のみで、自動リトライ機構はない（`embedding: null` のまま残る）

#### FR-EMBED-002: バッチ処理

| 項目 | 内容 |
|------|------|
| 概要 | 大量データのインポート時の効率化 |
| 優先度 | 低 |
| **実装状況** | **未実装**（インポート機能自体が未実装） |

**詳細要件:**
- インポート機能使用時はバッチでベクトル生成を行う
- 1バッチあたり最大100件とする

---

### 2.5 テンプレート機能

#### FR-TEMPLATE-001: メモテンプレート

| 項目 | 内容 |
|------|------|
| 概要 | メモ作成時に定型フォーマットを流し込むテンプレート |
| 優先度 | 中 |

**詳細要件:**
- テンプレートは `users/{uid}/templates` サブコレクションで管理する
- テンプレートは `name`（テンプレート名）と、メモに流し込む雛形（`body` / `defaultTitle` / `defaultKeyword` / `defaultTags`）を持つ
- テンプレートの作成・編集・削除ができる
- メモ作成時にテンプレートを選択すると、各フィールドに `content=body / title=defaultTitle / keywords=defaultKeyword / tags=defaultTags` が投入される
- テンプレート一覧は `onSnapshot` によるリアルタイム購読（`createdAt` 昇順）

**バリデーション:** name 必須100字以内、body 必須10,000字以内、defaultTitle 100字以内、defaultKeyword 500字以内、defaultTags 各50字以内・最大10個

---

### 2.6 タグ機能

#### FR-TAG-001: タグの自動集計

| 項目 | 内容 |
|------|------|
| 概要 | タグの使用回数をサーバー側で自動集計する |
| 優先度 | 中 |

**詳細要件:**
- タグは Note の `tags: string[]` フィールドに加えて、`users/{uid}/tags` サブコレクション（`label`, `count`）でも管理する
- メモの作成/更新/削除トリガーがタグを走査し、使用回数を自動同期する（既存タグは `FieldValue.increment(±1)`、無ければ新規作成、count が 1 以下になれば削除）

#### FR-TAG-002: タグサジェスト

| 項目 | 内容 |
|------|------|
| 概要 | タグ入力時のサジェスト表示 |
| 優先度 | 中 |

**詳細要件:**
- タグ入力時にサジェストを提示する（メモ・テンプレートの両方の入力で共通）
- 入力が空のとき: 最近使ったタグ（`updatedAt` 降順・上位10件、選択済みを除外）を提示
- 入力があるとき: 全タグから前方一致（小文字化）でフィルタして候補を提示

---

### 2.7 リッチコンテンツ機能

#### FR-RICH-001: OGP取得

| 項目 | 内容 |
|------|------|
| 概要 | 本文中のURLからOGP情報を取得して保存する |
| 優先度 | 低 |

**詳細要件:**
- メモ作成/更新トリガーが本文の最初のURLを抽出し、OGP情報（`og:title` / `og:description` / `og:image`、無ければ `<title>`）を取得する（5秒タイムアウト、User-Agent `VectorNoteBot/1.0`）
- 取得した情報は `Note.ogp: OgpInfo{url, title, description, image}` として保存する
- OGPのタイトル・説明は埋め込みテキストにも連結する

#### FR-RICH-002: ツイート引用

| 項目 | 内容 |
|------|------|
| 概要 | ツイートURLの本文を引用ブロックとして挿入する |
| 優先度 | 低 |

**詳細要件:**
- 本文の最初のURLが `twitter.com` / `x.com` の `/status/{id}` の場合、Twitter oEmbed API（`publish.twitter.com/oembed`）からツイート本文・投稿者を取得する
- URL直前に `> 本文\n> - 作者名 (@screenName)` の引用ブロックを挿入する（二重挿入防止あり）

#### FR-RICH-003: マークダウン入力

| 項目 | 内容 |
|------|------|
| 概要 | マークダウン記法での本文入力補助 |
| 優先度 | 低 |

**詳細要件:**
- 本文入力時のマークダウン補助を提供する: 箇条書き `- ` / 番号付き `1. ` / チェックボックス `- [ ] ` の自動継続・自動採番、Tab/Shift-Tab でのインデント調整（最大6階層）
- **マークダウンプレビュー（レンダリング表示）は未実装**

---

## 3. 非機能要件

### 3.1 パフォーマンス要件

| 項目 | 目標値 | 測定方法 |
|------|--------|---------|
| 初期ページ読み込み | 3秒以内 | LCP (Largest Contentful Paint) |
| 検索結果表示 | 2秒以内 | 埋め込み生成〜結果表示まで |
| メモ保存 | 1秒以内 | 埋め込み生成含む |
| 同時接続ユーザー数 | 100人 | Phase 1目標 |
| バンドルサイズ | 200KB以下 | gzip圧縮後、初期ロード |

### 3.2 セキュリティ要件

#### NFR-SEC-001: 認証・認可

- Firebase Authenticationによる認証を必須とする
- Firestoreセキュリティルールにより、ユーザーは自身のデータのみアクセス可能
- APIキーはサーバーサイド（Firebase Functions）で管理し、クライアントに露出させない

#### NFR-SEC-002: データ保護

- 通信はHTTPS（TLS 1.3）を使用する
- Firestoreのデータは保存時に自動暗号化される
- 個人情報の取り扱いはGDPR/個人情報保護法に準拠する

### 3.3 可用性・信頼性

| 項目 | 目標値 |
|------|--------|
| 目標稼働率 | 99.5%（月間ダウンタイム約3.6時間以内） |
| SLA | Firebase/GCPのSLAに準拠 |
| データバックアップ | Firestoreの自動バックアップ（日次） |

### 3.4 スケーラビリティ

| 項目 | 初期 | 将来 |
|------|------|------|
| ユーザー数 | 1,000人 | 10,000人 |
| メモ数/ユーザー | 最大10,000件 | - |
| ストレージ | Firestore無料枠 | 自動スケール |

---

## 4. データモデル

### 4.1 Firestoreコレクション構造

```
firestore/
├── users/
│   └── {uid}/
│       ├── createdAt: Timestamp
│       ├── email: string
│       ├── updatedAt: Timestamp
│       ├── notes/  (サブコレクション)
│       │   └── {noteId}/
│       │       ├── createdAt: Timestamp
│       │       ├── content: string
│       │       ├── embedding: vector(1536) | null
│       │       ├── isPinned: boolean
│       │       ├── ogp: map | null      # {url, title, description, image}
│       │       ├── keywords: string
│       │       ├── tags: string[]
│       │       ├── title: string | null
│       │       ├── updatedAt: Timestamp
│       │       └── updatedBy: 'trigger' | 'user'
│       ├── tags/  (サブコレクション)
│       │   └── {tagId}/
│       │       ├── label: string
│       │       ├── count: number
│       │       ├── createdAt: Timestamp
│       │       └── updatedAt: Timestamp
│       └── templates/  (サブコレクション)
│           └── {templateId}/
│               ├── name: string
│               ├── body: string
│               ├── defaultTitle: string
│               ├── defaultKeyword: string
│               ├── defaultTags: string[]
│               ├── createdAt: Timestamp
│               └── updatedAt: Timestamp
```

### 4.2 users コレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| uid | string | Firebase Auth UID（ドキュメントID） |
| createdAt | Timestamp | 作成日時 |
| email | string | 認証に使用したメールアドレス |
| updatedAt | Timestamp | 更新日時 |

### 4.3 notes サブコレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| noteId | string | 自動生成ID（ドキュメントID） |
| createdAt | Timestamp | 作成日時 |
| content | string | メモの本文（必須） |
| embedding | vector(1536) \| null | ベクトル埋め込み（トリガーで生成。生成前は null） |
| isPinned | boolean | ピン留めフラグ |
| ogp | map \| null | OGP情報 `{url, title, description, image}` |
| keywords | string | 検索時のキーワード |
| tags | string[] | メモのジャンル分け用のタグ |
| title | string \| null | メモのタイトル（任意） |
| updatedAt | Timestamp | 更新日時 |
| updatedBy | 'trigger' \| 'user' | 直近の更新主（再帰トリガー防止用） |

### 4.3.1 tags サブコレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| tagId | string | 自動生成ID（ドキュメントID） |
| label | string | タグ名 |
| count | number | 使用回数（トリガーで自動同期） |
| createdAt | Timestamp | 作成日時 |
| updatedAt | Timestamp | 更新日時 |

### 4.3.2 templates サブコレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| templateId | string | 自動生成ID（ドキュメントID） |
| name | string | テンプレート名 |
| body | string | 本文の雛形 |
| defaultTitle | string | タイトルの初期値 |
| defaultKeyword | string | キーワードの初期値 |
| defaultTags | string[] | タグの初期値 |
| createdAt | Timestamp | 作成日時 |
| updatedAt | Timestamp | 更新日時 |

### 4.4 Firestoreインデックス設定

**firestore.indexes.json:**

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

### 4.5 TypeScript型定義

実際の型定義は `packages/common/src/entities/` に配置されている。Entity層ではFirestoreの `Timestamp` は `Date` に変換済み。

```typescript
// packages/common/src/entities/Note.ts
import type { VectorValue } from 'firebase/firestore';

export type OgpInfo = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

export type UpdatedBy = 'trigger' | 'user';

export type Note = {
  noteId: string;
  createdAt: Date;
  content: string;
  embedding: VectorValue | null;
  isPinned: boolean;
  ogp: OgpInfo | null;
  keywords: string;
  tags: string[];
  title: string | null;
  updatedAt: Date;
  updatedBy: UpdatedBy;
};

export type SearchResult = {
  note: Note;
  similarity: number; // 0.0 ~ 1.0
};

// packages/common/src/entities/User.ts
export type User = {
  uid: string;
  createdAt: Date;
  email: string;
  updatedAt: Date;
};

// packages/common/src/entities/Tag.ts
export type Tag = {
  tagId: string;
  label: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
};

// packages/common/src/entities/Template.ts
export type Template = {
  templateId: string;
  name: string;
  body: string;
  defaultTitle: string;
  defaultKeyword: string;
  defaultTags: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

> 注: 作成・更新用のDTO型（`CreateNoteDto` / `UpdateNoteDto` / `UpdateNoteDtoFromAdmin` など、`FieldValue` を使う型）も各Entityファイルに定義されている。

---

## 5. 画面・ルート構成

### 5.1 ルート一覧

| 画面ID | 画面名 | パス | 認証 | 概要 |
|--------|--------|------|------|------|
| SCR-001 | ログイン画面 | `/login` | 不要 | Googleログイン（ログイン済みは `/` へリダイレクト） |
| SCR-002 | メモ一覧画面（ホーム） | `/`（`?tag=xxx`） | 必要 | 最新/固定の切替、タグ絞り込み |
| SCR-005 | 検索結果画面 | `/search?q=xxx` | 必要 | セマンティック検索の結果表示 |
| SCR-006 | 設定画面 | `/settings` | 必要 | テーマ切替・テンプレート管理・アカウント・バージョン表示 |
| SCR-007 | Aboutページ | `/about` | 必要 | （スターター由来。削除候補） |

- 認証は `_authed` レイアウトルートの `beforeLoad` で担保する（未認証は `/login` へリダイレクト）。
- **メモの作成・詳細・編集は専用ページ（`/new`, `/note/$noteId`）を持たず、一覧画面上のモーダルで完結する。** spec初版の SCR-003 / SCR-004 は廃止。

### 5.2 設定画面（SCR-006）の機能

1. **テーマ切替**: ライト / ダーク / 自動（`prefers-color-scheme` に追従）。localStorage に永続化。
2. **テンプレート管理**: テンプレートのCRUD（FR-TEMPLATE-001）。
3. **アカウント**: ログアウト。
4. **バージョン表示**: `VITE_VERSION` を表示。

---

## 6. API設計

### 6.1 アーキテクチャ概要

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TanStack Start │     │ Firebase         │     │ OpenAI API      │
│  (SPA)          │────▶│ Functions (v2)   │────▶│                 │
│                 │     │                  │     │ Embeddings      │
│  TanStack Query │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌──────────────────┐
│ Firebase Auth   │     │ Cloud Firestore  │
│ (Google OAuth)  │     │ + Vector Search  │
└─────────────────┘     └──────────────────┘
```

### 6.2 Firebase Functions

Functions は「① Firestoreトリガー（埋め込み生成・OGP・タグ集計）」と「② HTTPエンドポイント（検索）」で構成される。**埋め込み生成用の `generateEmbedding` onCall関数は存在しない**（トリガーに置き換わっている）。

#### ① Firestore トリガー

| トリガー | 種別 | 対象 | 処理内容 |
|---------|------|------|---------|
| `onCreateNote` | `onDocumentCreated` | `users/{uid}/notes/{noteId}` | OGP取得 → ツイート引用挿入 → 埋め込み生成 → タグcount同期 |
| `onUpdateNote` | `onDocumentUpdated` | 同上 | 変更検知して上記を再実行（`updatedBy: 'trigger'` はスキップ） |
| `onDeleteNote` | `onDocumentDeleted` | 同上 | タグcountのデクリメント／削除 |

いずれも `triggerOnce` で冪等化。OpenAI APIキーは Functions Secret で保護。

#### ② 検索エンドポイント（HTTP）

| 項目 | 内容 |
|------|------|
| メソッド / パス | `POST {FUNCTIONS_BASE_URL}/search/notes`（Express router 経由） |
| タイプ | HTTP関数（onCallではない） |
| 認証 | `Authorization: Bearer {ID Token}` を `authMiddleware` で検証 |

**リクエスト:**
```typescript
interface SearchNotesRequest {
  query: string;           // 検索クエリ（必須）
  limit?: number;          // 最大件数（1〜50、デフォルト: 10 / クライアントは20を送信）
  minSimilarity?: number;  // 最低類似度（0〜1、デフォルト: 0.3 / クライアントは0.2を送信）
}
```

**レスポンス:**
```typescript
interface SearchNotesResponse {
  results: Array<{
    note: Note;
    similarity: number;  // 1 - distance
  }>;
}
```

**処理内容:**
1. IDトークンを検証（`authMiddleware`）
2. クエリを OpenAI `text-embedding-3-small` でベクトル化
3. Firestore Vector Search（`findNearest`, `distanceMeasure: 'COSINE'`）で近傍ノートを取得
4. `similarity = 1 - distance` に変換し、`minSimilarity` でフィルタ・類似度降順ソートして返却

> 注: `tags` によるフィルタ併用は未実装（FR-SEARCH-002）。

### 6.3 クライアントサイドAPI（Firestore直接アクセス）

TanStack Queryを使用してFirestoreに直接アクセスする操作:

| 操作 | Query Key | 説明 |
|------|-----------|------|
| メモ一覧取得 | `['notes', uid]` | ページネーション付き |
| メモ詳細取得 | `['note', noteId]` | 単一メモ |
| メモ作成 | mutation | invalidate: `['notes']` |
| メモ更新 | mutation | invalidate: `['notes']`, `['note', id]`（詳細は楽観的更新） |
| メモ削除 | mutation | invalidate: `['notes']` |
| ピン留めトグル | mutation | invalidate: `['notes', uid]` |
| 固定メモ一覧 | `['notes', uid, {pinned:true}]` | 無限スクロール |
| セマンティック検索 | `['searchNotes', query]` | HTTP API 経由 |
| タグ一覧 / 最近使ったタグ | onSnapshot購読 | サジェスト用 |
| テンプレート一覧 | onSnapshot購読 | 設定・作成モーダル用 |

---

## 7. 技術スタック

### 7.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.x | UIライブラリ |
| TanStack Start | 1.x | フルスタックReactフレームワーク（SPAモード） |
| TanStack Router | 1.x | 型安全なファイルベースルーティング |
| TanStack Query | 5.x | サーバー状態管理、キャッシュ |
| TypeScript | 5.x | 型安全な開発 |
| Tailwind CSS | 4.x | ユーティリティファーストCSS |
| shadcn/ui（Radix UI） | - | UIコンポーネント |
| React Hook Form | 7.x | フォーム状態管理 |
| Zod | 4.x | スキーマバリデーション |
| CodeMirror | 6.x | 本文エディタ（マークダウン入力補助） |
| sonner | 2.x | トースト通知 |
| next-themes | 0.4.x | テーマ（ライト/ダーク/自動）切替 |
| dayjs | 1.x | 日時整形 |
| Vite | 8.x | ビルドツール |
| vite-plugin-pwa | 1.x | PWA対応 |

### 7.2 バックエンド / インフラ

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Firebase Authentication | - | ユーザー認証（Google OAuth） |
| Cloud Firestore | - | NoSQLデータベース + Vector Search |
| Firebase Functions | v2 | Firestoreトリガー（埋め込み生成・OGP取得・タグ集計）+ 検索HTTP API |
| firebase-admin | 14.x | Functions内のFirestore/Auth操作 |
| Firebase Hosting | - | 静的ホスティング + CDN |
| OpenAI API | openai 7.x | ベクトル埋め込み生成（text-embedding-3-small） |
| Express | 4.x | Functions内のHTTPルーティング（検索エンドポイント） |
| @t3-oss/env-core | 0.13.x | 環境変数の型安全なバリデーション（Functions） |

### 7.3 開発ツール

| ツール | 用途 |
|--------|------|
| pnpm | パッケージマネージャー |
| Turborepo | monorepoのタスク実行 |
| Biome | コード品質・フォーマット（Lint / Format） |
| cspell | スペルチェック |
| Vitest | ユニットテスト（web） |
| tsup | Functionsのビルド |
| GitHub Actions | CI（web / functions / common の各Lint） |
| Firebase Emulator Suite | ローカル開発環境 |

### 7.4 プロジェクト構成（monorepo）

pnpm workspace + Turborepo による monorepo 構成。`apps/web`（フロントエンド）、`apps/functions`（Firebase Functions）、`packages/common`（共通の型定義）で構成される。

```
vectornote/
├── apps/
│   ├── web/                      # フロントエンド（TanStack Start SPAモード）
│   │   ├── src/
│   │   │   ├── routes/           # ファイルベースルーティング
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── login.tsx     # /login
│   │   │   │   ├── _authed.tsx   # 認証ガード（レイアウトルート）
│   │   │   │   └── _authed/
│   │   │   │       ├── index.tsx     # / (メモ一覧)
│   │   │   │       ├── search.tsx    # /search
│   │   │   │       ├── settings.tsx  # /settings
│   │   │   │       └── about.tsx     # /about
│   │   │   ├── features/         # 機能別モジュール
│   │   │   │   ├── notes/        # メモ（hooks / components / schemas）
│   │   │   │   ├── search/       # 検索
│   │   │   │   ├── tags/         # タグ
│   │   │   │   ├── templates/    # テンプレート
│   │   │   │   └── settings/     # 設定（テーマ）
│   │   │   ├── components/       # 汎用コンポーネント（ui/ など）
│   │   │   ├── hooks/            # 汎用フック
│   │   │   ├── infrastructure/   # データアクセス層
│   │   │   │   ├── firestore/    # Firestore操作（notes/tags/templates/users）
│   │   │   │   └── api/          # Functions HTTP呼び出し（searchApi）
│   │   │   ├── providers/        # FirebaseAuthProvider など
│   │   │   ├── lib/              # firebase初期化 / codemirror など
│   │   │   ├── router.tsx
│   │   │   └── routeTree.gen.ts  # 自動生成
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── functions/                # Firebase Functions
│       ├── src/
│       │   ├── index.ts
│       │   ├── router.ts         # Express router（検索エンドポイント）
│       │   ├── api/search/       # searchNotes
│       │   ├── triggers/         # onCreateNote / onUpdateNote / onDeleteNote
│       │   ├── infrastructure/firestore/  # notes/tags/users
│       │   ├── middleware/       # auth
│       │   ├── lib/              # openai / twitter / firebase
│       │   └── utils/            # embedding / ogp / tweetQuote など
│       ├── tsup.config.ts
│       └── package.json
├── packages/
│   └── common/                   # 共通の型定義
│       └── src/
│           ├── entities/         # Note / User / Tag / Template / Auth
│           └── utils/            # twitter など
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.jsonc
├── package.json
└── tsconfig.json
```

---

## 8. セキュリティ設計

### 8.1 Firestoreセキュリティルール

- ユーザーは自身の `users/{uid}` 配下（notes / tags / templates サブコレクション含む）のみ read/write 可能とする（`isSignedIn()` かつ `isUser(userId)`）。
- 各コレクションで作成/更新時にスキーマバリデーション関数（フィールド数・型の検証）を通す。
  - `notes`: フィールド数10。`content`(string) / `title`(string \| null) / `keywords`(string) / `tags`(list) / `embedding` / `isPinned`(bool) / `ogp`(map \| null) / `updatedBy`(string) / `createdAt` / `updatedAt`。read/create/update/delete を許可。
  - `templates`: フィールド数7。`name` / `body` / `defaultTitle` / `defaultKeyword` / `defaultTags` / `createdAt` / `updatedAt`。read/create/update/delete を許可。
  - `tags`: **read のみ許可**（作成・更新・削除は Functions トリガー = firebase-admin 経由でのみ行い、クライアントからは書き込めない）。
  - `users`: フィールド数3（`email` / `createdAt` / `updatedAt`）。read/create/update を許可。

実際のルールは `firestore.rules` を参照。

### 8.2 APIキー管理

| キー | 管理方法 | 露出範囲 |
|------|---------|---------|
| Firebase Config | 環境変数（`VITE_*`、公開可） | クライアント |
| OpenAI API Key | Functions の `.env`（`@t3-oss/env-core` で検証） | サーバーのみ |

- OpenAI API Key は `apps/functions/.env` に `OPENAI_API_KEY` として置き、`process.env` から参照する（`defineSecret` は使わない）。

### 8.3 入力値検証

**クライアントサイド（Zod）:**
```typescript
// apps/web/src/features/notes/schemas/noteSchema.ts
import { z } from 'zod';

export const noteFormSchema = z.object({
  content: z.string().min(1).max(10000),
  title: z.string().max(100).optional().default(''),
  keywords: z.string().max(500).optional().default(''),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;
```

**サーバーサイド（Firebase Functions）:**
- 検索エンドポイントのリクエストは express-validator で検証（`query` 必須、`limit` 1〜50、`minSimilarity` 0〜1）
- IDトークンの検証（`authMiddleware`）
- Firestore セキュリティルールでもスキーマ・所有権を検証（8.1）

---

## 9. 開発計画

### 9.1 Phase 1: MVP（4週間）

| 週 | タスク | 成果物 |
|----|--------|--------|
| Week 1 | 環境構築、Firebase設定、認証実装 | ログイン機能、Firestore接続、TanStack Start初期設定 |
| Week 2 | メモCRUD、一覧画面実装 | メモ作成/編集/削除/一覧表示、TanStack Query統合 |
| Week 3 | ベクトル埋め込み、検索機能実装 | Firebase Functions、セマンティック検索動作 |
| Week 4 | UI/UX改善、テスト、デプロイ | 本番環境リリース、E2Eテスト |

### 9.2 Phase 2: 機能拡張（将来）

| 優先度 | 機能 | 概要 | 状況 |
|--------|------|------|------|
| 高 | Slack連携 | Slackメッセージの自動インポート | 未着手 |
| 高 | Notion連携 | Notionページの同期 | 未着手 |
| 中 | 自動タグ付け | GPTによるタグ自動生成 | 未着手 |
| 中 | マルチモーダル | 画像のベクトル検索対応 | 未着手 |
| 低 | マークダウン対応 | 本文のMarkdown記法での入力・プレビュー表示 | 入力補助は実装済（FR-RICH-003）。プレビューは未実装 |
| 低 | URLスクレイピング | 本文にURLが含まれる場合、リンク先の内容を取得して保存 | 実装済（OGP取得 FR-RICH-001） |
| 低 | ツイート保存 | ツイートURLの場合、本文テキストと画像を取得して保存 | 実装済（ツイート引用 FR-RICH-002。画像取得は未対応） |
| 低 | チーム共有 | メモの共有・コラボレーション | 未着手 |
| 低 | モバイルアプリ | React Native版 | 未着手 |

### 9.3 リリース基準

- [ ] 全機能要件（FR-*）の実装完了
- [ ] パフォーマンス目標値の達成（Lighthouse スコア 90+）
- [ ] セキュリティレビュー完了
- [ ] ドキュメント整備（README、API仕様）

> 注: E2Eテスト（Playwright）は現時点では未導入。ユニットテストは Vitest（web）を使用。

---

## 10. 付録

### 10.1 環境変数

**web（`apps/web/.env`）:**
```env
VITE_ENV=localhost

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_USE_EMULATOR=true
VITE_FUNCTIONS_BASE_URL=   # 検索APIのベースURL
VITE_VERSION=              # 設定画面のバージョン表示
```

**functions（`apps/functions/.env`）:**
```env
OPENAI_API_KEY=
```

- Functions の環境変数は `.env` で管理し `process.env` から参照する（`@t3-oss/env-core` で型安全に検証。ビルド時に `env-check.ts` で検証）。`defineSecret` / `firebase functions:secrets:set` は使用しない。

### 10.2 コスト概算

| サービス | 無料枠 | 超過時料金 |
|---------|--------|-----------|
| Firestore | 1GB保存、50K読み取り/日 | $0.18/100K読み取り |
| Firebase Functions | 200万呼び出し/月 | $0.40/100万呼び出し |
| Firebase Hosting | 10GB保存、360MB/日転送 | $0.026/GB |
| OpenAI Embeddings | - | $0.02/100万トークン |

**月間コスト試算（1,000ユーザー、各100メモ）:**
- Firestore: 無料枠内
- Functions: 無料枠内（検索10回/日/ユーザー）
- OpenAI: 約 $2/月

### 10.3 参考リンク

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Firebase Vector Search](https://firebase.google.com/docs/firestore/vector-search)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

### 10.4 改訂履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-03-21 | 1.0 | 初版作成 | - |
| 2026-03-23 | 1.1 | firestore-design.mdに基づきデータモデルを更新（memos→notes、usersフィールド整理、keywords型変更） | - |
| 2026-09-21 | 1.2 | 実装との差分を反映。追加: テンプレート(FR-TEMPLATE)/ピン留め(FR-MEMO-005)/タグ集計・サジェスト(FR-TAG)/OGP・ツイート引用・マークダウン(FR-RICH)。設計変更: 作成・詳細をモーダル化（/new・/note を廃止）、Note型に isPinned/ogp/updatedBy 追加・embedding は VectorValue、埋め込みをトリガー方式に変更、検索を HTTP API 化。未実装明記: フィルタ検索・検索履歴・バッチ処理・MDプレビュー。UIレイアウト図・コンポーネント名を削除。技術スタック(§7)・プロジェクト構成(§7.4 monorepo)・セキュリティルール(§8.1)・環境変数(§8.2/§10.1)を実装に合わせて更新（Tailwind4/Zod4/Biome/Turborepo/tsup、Functions環境変数は.env+t3-env管理） | - |

---

**— 以上 —**