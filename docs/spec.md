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
- ログイン状態をブラウザセッションで維持する
- セッション有効期限は30日間とする
- 複数デバイスからの同時ログインを許可する
- TanStack Routerのルートガードで認証状態を検証する

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

**処理フロー:**
1. ユーザーがフォームに入力
2. クライアント側でZodによるバリデーション
3. Firebase Functionsでベクトル埋め込みを生成
4. Firestoreにメモデータ + 埋め込みベクトルを保存
5. 成功後、一覧画面へ遷移

#### FR-MEMO-002: メモの編集

| 項目 | 内容 |
|------|------|
| 概要 | 既存メモの編集機能 |
| 優先度 | 必須 |

**詳細要件:**
- 作成済みメモの全フィールドを編集可能とする
- 編集時はベクトル埋め込みを再生成する
- 更新日時（updatedAt）を自動更新する
- 楽観的更新（Optimistic Update）を実装し、UXを向上させる

#### FR-MEMO-003: メモの削除

| 項目 | 内容 |
|------|------|
| 概要 | メモの削除機能 |
| 優先度 | 必須 |

**詳細要件:**
- 確認ダイアログを表示後、メモを削除する
- 削除は物理削除（復元不可）とする
- 削除後は一覧画面へ遷移する

#### FR-MEMO-004: メモ一覧表示

| 項目 | 内容 |
|------|------|
| 概要 | ログイン後のデフォルト画面 |
| 優先度 | 必須 |

**詳細要件:**
- ログイン後のデフォルト画面としてメモ一覧を表示する
- 更新日時の降順（最新順）でソートする
- 無限スクロールによるページネーションを実装する（1回あたり20件）
- 各メモはタイトル（または本文先頭50文字）、タグ、更新日時を表示する
- TanStack Queryによるデータフェッチとキャッシュ管理

---

### 2.3 検索機能

#### FR-SEARCH-001: セマンティック検索

| 項目 | 内容 |
|------|------|
| 概要 | ベクトル類似度に基づく意味検索 |
| 優先度 | 必須 |

**詳細要件:**
- 検索クエリをベクトル化し、保存済みメモとのコサイン類似度を計算する
- 類似度が閾値（0.3）以上のメモを検索結果として返す
- 検索結果は類似度の降順でソートする
- 各検索結果に類似度スコア（パーセント表示）を表示する
- 検索中はローディング状態を表示する

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

**詳細要件:**
- タグによるフィルタリングが可能
- 日付範囲によるフィルタリングが可能
- セマンティック検索とフィルタの組み合わせが可能

#### FR-SEARCH-003: 検索履歴

| 項目 | 内容 |
|------|------|
| 概要 | 過去の検索クエリの保存・再利用 |
| 優先度 | 低 |

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
- メモ保存時に自動的にベクトル埋め込みを生成する
- 埋め込み対象テキスト = `タイトル + 本文 + 関連キーワード + タグ`（連結）
- OpenAI text-embedding-3-small（1536次元）を使用する
- 埋め込み生成はFirebase Functions経由で実行（APIキー保護）

#### FR-EMBED-002: バッチ処理

| 項目 | 内容 |
|------|------|
| 概要 | 大量データのインポート時の効率化 |
| 優先度 | 低 |

**詳細要件:**
- インポート機能使用時はバッチでベクトル生成を行う
- 1バッチあたり最大100件とする

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
│       └── notes/  (サブコレクション)
│           └── {noteId}/
│               ├── createdAt: Timestamp
│               ├── content: string
│               ├── embedding: vector(1536)
│               ├── keywords: string[]
│               ├── tags: string[]
│               ├── title: string
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
| id | string | 自動生成ID（ドキュメントID） |
| createdAt | Timestamp | 作成日時 |
| content | string | メモの本文（必須） |
| embedding | vector(1536) | ベクトル埋め込み |
| keywords | string[] | 検索時のキーワード |
| tags | string[] | メモのジャンル分け用のタグ |
| title | string | メモのタイトル（任意） |
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

```typescript
// types/note.ts
import { Timestamp } from 'firebase/firestore';

export interface Note {
  id: string;
  createdAt: Timestamp;
  content: string;
  embedding: number[];
  keywords: string[];
  tags: string[];
  title: string;
  updatedAt: Timestamp;
}

export interface NoteInput {
  content: string;
  title?: string;
  keywords?: string[];
  tags?: string[];
}

export interface SearchResult {
  note: Note;
  similarity: number;
}

export interface User {
  uid: string;
  createdAt: Timestamp;
  email: string;
  updatedAt: Timestamp;
}
```

---

## 5. 画面設計

### 5.1 画面一覧

| 画面ID | 画面名 | パス | 認証 | 概要 |
|--------|--------|------|------|------|
| SCR-001 | ログイン画面 | `/login` | 不要 | Googleログインボタンを表示 |
| SCR-002 | メモ一覧画面 | `/` | 必要 | 最新メモを一覧表示（ホーム） |
| SCR-003 | メモ作成画面 | `/new` | 必要 | 新規メモ入力フォーム |
| SCR-004 | メモ詳細画面 | `/note/$noteId` | 必要 | メモの詳細表示と編集 |
| SCR-005 | 検索結果画面 | `/search?q=xxx` | 必要 | セマンティック検索の結果表示 |
| SCR-006 | 設定画面 | `/settings` | 必要 | ユーザー設定 |

### 5.2 画面遷移図

```
[ログイン画面] ──(認証成功)──▶ [メモ一覧画面]
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              [メモ作成]      [メモ詳細]      [検索結果]
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                                    ▼
                              [設定画面]
```

### 5.3 SCR-001: ログイン画面

**レイアウト:**
- 中央揃えのシンプルなレイアウト
- アプリロゴ + タイトル
- 「Googleでログイン」ボタン
- 簡単な説明テキスト

**コンポーネント:**
- Logo
- GoogleSignInButton
- FeatureDescription

### 5.4 SCR-002: メモ一覧画面（ホーム）

**レイアウト:**
```
┌─────────────────────────────────────────────┐
│  [Logo]     [検索バー]     [Avatar][Logout] │  ← ヘッダー
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ メモ1   │  │ メモ2   │  │ メモ3   │     │  ← カードグリッド
│  │ タグ    │  │ タグ    │  │ タグ    │     │
│  │ 日時    │  │ 日時    │  │ 日時    │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ メモ4   │  │ メモ5   │  │ メモ6   │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                             │
│                    [+]                      │  ← FAB（新規作成）
└─────────────────────────────────────────────┘
```

**コンポーネント:**
- Header (Logo, SearchBar, UserMenu)
- MemoCard (title, preview, tags, date)
- MemoGrid (infinite scroll)
- FloatingActionButton

### 5.5 SCR-003: メモ作成画面

**レイアウト:**
```
┌─────────────────────────────────────────────┐
│  [←戻る]              新規メモ              │
├─────────────────────────────────────────────┤
│                                             │
│  タイトル（任意）                           │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  本文 *                                     │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │                                     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  関連キーワード（任意）                     │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  タグ（任意）                               │
│  ┌─────────────────────────────────────┐   │
│  │ [tag1] [tag2] [+追加]               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [キャンセル] [保存]            │
└─────────────────────────────────────────────┘
```

**コンポーネント:**
- MemoForm
- TagInput (autocomplete)
- SubmitButton (with loading state)

### 5.6 SCR-005: 検索結果画面

**レイアウト:**
```
┌─────────────────────────────────────────────┐
│  [Logo]     [検索バー: "会議"]  [Avatar]    │
├─────────────────────────────────────────────┤
│  「会議」の検索結果: 5件                    │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────┬──────┐ │
│  │ ミーティングの議事録            │ 92%  │ │  ← 類似度スコア
│  │ タグ: meeting, work             │      │ │
│  └─────────────────────────────────┴──────┘ │
│  ┌─────────────────────────────────┬──────┐ │
│  │ 打ち合わせメモ                  │ 85%  │ │
│  │ タグ: mtg                       │      │ │
│  └─────────────────────────────────┴──────┘ │
│  ┌─────────────────────────────────┬──────┐ │
│  │ チームMTGで出たアイデア         │ 78%  │ │
│  │ タグ: idea, meeting             │      │ │
│  └─────────────────────────────────┴──────┘ │
└─────────────────────────────────────────────┘
```

**コンポーネント:**
- SearchResultCard (with similarity badge)
- SearchResultList
- EmptyState (検索結果なし)

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

### 6.2 Firebase Functions エンドポイント

#### generateEmbedding

| 項目 | 内容 |
|------|------|
| 関数名 | `generateEmbedding` |
| タイプ | onCall (v2) |
| 認証 | Firebase Auth必須 |

**リクエスト:**
```typescript
interface GenerateEmbeddingRequest {
  text: string;  // 埋め込み対象テキスト
}
```

**レスポンス:**
```typescript
interface GenerateEmbeddingResponse {
  embedding: number[];  // 1536次元ベクトル
}
```

**処理内容:**
1. 認証トークンを検証
2. テキストをOpenAI APIに送信
3. 生成されたベクトルを返却

#### searchNotes

| 項目 | 内容 |
|------|------|
| 関数名 | `searchNotes` |
| タイプ | onCall (v2) |
| 認証 | Firebase Auth必須 |

**リクエスト:**
```typescript
interface SearchNotesRequest {
  query: string;       // 検索クエリ
  limit?: number;      // 最大件数（デフォルト: 10）
  tags?: string[];     // タグフィルタ
  minSimilarity?: number;  // 最低類似度（デフォルト: 0.3）
}
```

**レスポンス:**
```typescript
interface SearchNotesResponse {
  results: Array<{
    note: Note;
    similarity: number;
  }>;
}
```

**処理内容:**
1. 認証トークンを検証
2. クエリをベクトル化
3. Firestore Vector Searchで類似ノートを検索
4. 結果を類似度でソートして返却

### 6.3 クライアントサイドAPI（Firestore直接アクセス）

TanStack Queryを使用してFirestoreに直接アクセスする操作:

| 操作 | Query Key | 説明 |
|------|-----------|------|
| メモ一覧取得 | `['notes', uid]` | ページネーション付き |
| メモ詳細取得 | `['note', noteId]` | 単一メモ |
| メモ作成 | mutation | invalidate: `['notes']` |
| メモ更新 | mutation | invalidate: `['notes']`, `['note', id]` |
| メモ削除 | mutation | invalidate: `['notes']` |

---

## 7. 技術スタック

### 7.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| TanStack Start | 1.x | フルスタックReactフレームワーク（SPAモード） |
| TanStack Router | 1.x | 型安全なファイルベースルーティング |
| TanStack Query | 5.x | サーバー状態管理、キャッシュ |
| TypeScript | 5.x | 型安全な開発 |
| Tailwind CSS | 3.x | ユーティリティファーストCSS |
| React Hook Form | 7.x | フォーム状態管理 |
| Zod | 3.x | スキーマバリデーション |
| Vite | 5.x | ビルドツール（TanStack Start内蔵） |

### 7.2 バックエンド / インフラ

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Firebase Authentication | - | ユーザー認証（Google OAuth） |
| Cloud Firestore | - | NoSQLデータベース + Vector Search |
| Firebase Functions | v2 | サーバーレス関数（埋め込み生成） |
| Firebase Hosting | - | 静的ホスティング + CDN |
| OpenAI API | - | ベクトル埋め込み生成（text-embedding-3-small） |

### 7.3 開発ツール

| ツール | 用途 |
|--------|------|
| pnpm | パッケージマネージャー |
| ESLint + Prettier | コード品質・フォーマット |
| Vitest | ユニットテスト |
| Playwright | E2Eテスト |
| GitHub Actions | CI/CD |
| Firebase Emulator Suite | ローカル開発環境 |

### 7.4 TanStack Start プロジェクト構成

```
vector-memo/
├── app/
│   ├── routes/
│   │   ├── __root.tsx          # ルートレイアウト
│   │   ├── index.tsx           # / (メモ一覧)
│   │   ├── login.tsx           # /login
│   │   ├── new.tsx             # /new (メモ作成)
│   │   ├── note.$noteId.tsx     # /note/:noteId (詳細)
│   │   ├── search.tsx          # /search
│   │   └── settings.tsx        # /settings
│   ├── components/
│   │   ├── ui/                 # 汎用UIコンポーネント
│   │   ├── note/                # メモ関連コンポーネント
│   │   └── layout/             # レイアウトコンポーネント
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useNotes.ts
│   │   └── useSearch.ts
│   ├── lib/
│   │   ├── firebase.ts         # Firebase初期化
│   │   ├── firestore.ts        # Firestore操作
│   │   └── functions.ts        # Firebase Functions呼び出し
│   ├── types/
│   │   └── note.ts
│   ├── router.tsx
│   ├── routeTree.gen.ts        # 自動生成
│   └── client.tsx
├── functions/                   # Firebase Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── generateEmbedding.ts
│   │   └── searchNotes.ts
│   └── package.json
├── public/
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── app.config.ts               # TanStack Start設定
├── package.json
└── tsconfig.json
```

---

## 8. セキュリティ設計

### 8.1 Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザードキュメント
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
      // メモサブコレクション
      match /notes/{noteId} {
        allow read, write: if request.auth != null 
                           && request.auth.uid == userId;
        
        // バリデーション
        allow create: if request.resource.data.content is string
                      && request.resource.data.content.size() > 0
                      && request.resource.data.content.size() <= 10000;
        
        allow update: if request.resource.data.content is string
                      && request.resource.data.content.size() > 0
                      && request.resource.data.content.size() <= 10000;
      }
    }
  }
}
```

### 8.2 APIキー管理

| キー | 管理方法 | 露出範囲 |
|------|---------|---------|
| Firebase Config | 環境変数（公開可） | クライアント |
| OpenAI API Key | Firebase Functions Secret | サーバーのみ |

**Firebase Functions でのシークレット設定:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

### 8.3 入力値検証

**クライアントサイド（Zod）:**
```typescript
import { z } from 'zod';

export const noteSchema = z.object({
  content: z.string().min(1).max(10000),
  title: z.string().max(100).optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type NoteInput = z.infer<typeof noteSchema>;
```

**サーバーサイド（Firebase Functions）:**
- 同じZodスキーマを共有
- 認証トークンの検証
- レートリミット実装

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

| 優先度 | 機能 | 概要 |
|--------|------|------|
| 高 | Slack連携 | Slackメッセージの自動インポート |
| 高 | Notion連携 | Notionページの同期 |
| 中 | 自動タグ付け | GPTによるタグ自動生成 |
| 中 | マルチモーダル | 画像のベクトル検索対応 |
| 低 | マークダウン対応 | 本文のMarkdown記法での入力・プレビュー表示 |
| 低 | URLスクレイピング | 本文にURLが含まれる場合、リンク先の内容を取得して保存 |
| 低 | ツイート保存 | ツイートURLの場合、本文テキストと画像を取得して保存 |
| 低 | チーム共有 | メモの共有・コラボレーション |
| 低 | モバイルアプリ | React Native版 |

### 9.3 リリース基準

- [ ] 全機能要件（FR-*）の実装完了
- [ ] 主要画面のE2Eテスト合格（カバレッジ80%以上）
- [ ] パフォーマンス目標値の達成（Lighthouse スコア 90+）
- [ ] セキュリティレビュー完了
- [ ] ドキュメント整備（README、API仕様）

---

## 10. 付録

### 10.1 環境変数

**`.env.local`（開発環境）:**
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

**Firebase Functions（本番）:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

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

---

**— 以上 —**