# セキュリティ診断レポート

**実施日:** 2026-03-26
**対象:** Vector Memo（vectornote）全体
**目的:** ユーザーのメモデータが他ユーザーから閲覧されないことを中心に、セキュリティ全般を診断

---

## 総合評価

**データ分離はしっかりしている。改善点あり。**

最も重要な「他ユーザーのメモが見えてしまう」リスクについては、データモデル・Firestoreセキュリティルール・アプリケーションコードの全層で適切に保護されており、問題なし。

---

## 1. ユーザーデータの分離（最重要項目）

### 結果: 安全

メモデータが他ユーザーから見える可能性は極めて低い。以下の3層で保護されている。

| 層 | 保護内容 | 状態 |
|---|---|---|
| **Firestoreセキュリティルール** | `isSignedIn() && isUser(userId)` を全コレクションに適用。サブコレクション（notes/tags/templates）もパスの `{userId}` と `request.auth.uid` を照合 | 安全 |
| **Cloud Functions** | `authMiddleware`でIDトークンを検証し、`uid`をリクエストに付与。検索クエリは `/users/{uid}/notes/` パスにスコープ | 安全 |
| **クライアント側** | 全 Operations/Hooks で `uid` パラメータ必須。クエリは必ず `collection(db, userCollection, uid, noteCollection)` のパス構造 | 安全 |

データモデルの設計が本質的に安全: `notes` が `users/{uid}` のサブコレクションであるため、パス構造自体が他ユーザーのデータへのアクセスを構造的に防いでいる。

---

## 2. 認証

### 結果: 安全

- Firebase Authentication（Google OAuth）を使用
- TanStack Router の `beforeLoad` でルートガード実装済み
- セッション有効期限 30日、期限切れ時は自動ログアウト
- ログアウト時にクエリキャッシュをクリア (`queryClient.clear()`)

---

## 3. Firestoreセキュリティルール

### 結果: 安全（軽微な改善点あり）

良い点:
- スキーマバリデーション関数でフィールド数・型を厳密に検証
- 全コレクションで認証＋所有者チェック
- delete ルールも所有者のみに限定

改善点:
- `content` の文字数制限（1〜10,000文字）がルール側で未実装。spec.md では定義されているが、Firestore ルールでは型チェックのみ。クライアント側の Zod バリデーションでは制限しているが、ルール側でも `content.size() <= 10000` を追加するとより安全
- `tags` の配列サイズ制限（最大10個）もルール側にない

---

## 4. CORS設定

### 結果: 要改善

以下の3箇所で全オリジン許可になっている。

**`cors.json`:**
```json
{ "origin": ["*"] }
```

**`apps/functions/src/index.ts`:**
```typescript
cors: true  // Cloud Run レベル
```

**Express 内:**
```typescript
cors({ origin: true })  // Express レベル
```

`origin: "*"` は全オリジンからのリクエストを許可している。認証トークンが必要なため即座に悪用はされないが、CSRF攻撃のリスクを高める。本番ドメインに限定すべき。

---

## 5. レートリミット

### 結果: 未実装

Cloud Functions にレートリミットがない。認証済みユーザーが大量のリクエスト（特に検索 → OpenAI API呼び出し）を送ると:
- OpenAI APIコストの爆発
- Cloud Functionsのリソース枯渇

最低限、ユーザーあたりのリクエスト数制限を実装すべき。

---

## 6. APIキー管理

### 結果: 安全

- OpenAI API キーは環境変数で管理、クライアントに露出なし
- Firebase Config は公開情報（設計通り）
- `.gitignore` で `.env` ファイルを除外済み

---

## 7. 入力バリデーション

### 結果: 概ね安全（改善推奨）

| 層 | 実装 |
|---|---|
| クライアント | Zod でバリデーション |
| Cloud Functions | `express-validator` で検索クエリを検証 |
| Firestore ルール | スキーマバリデーション（型・フィールド数） |

改善推奨:
- Firestore ルールに文字数制限を追加（content, title, keywords）
- Cloud Functions の `searchNotes` で `query` の最大長チェックがない。非常に長い文字列を OpenAI に送るコスト攻撃の可能性

---

## 8. OGP取得（SSRF リスク）

### 結果: 軽微なリスク

`onCreateNote` トリガーでメモ本文中のURLからOGPを取得している。ユーザーが内部ネットワークのURL（`http://169.254.169.254/` 等）を入力した場合、Cloud Functions がそのURLにリクエストを送る可能性がある（SSRF）。

対策推奨: URLのホスト名をバリデーションし、プライベートIPアドレスやメタデータエンドポイントへのアクセスをブロック。

---

## 9. セキュリティヘッダー

### 結果: 未設定

`firebase.json` にセキュリティ関連のHTTPヘッダーが設定されていない。以下を追加推奨:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Strict-Transport-Security`（HSTS）

---

## 10. ストレージ

### 結果: 安全

`storage.rules` で全アクセスを拒否（`allow read, write: if false`）。現在未使用のため適切。

---

## 優先度別まとめ

| 優先度 | 項目 | 対応 |
|---|---|---|
| **高** | レートリミット未実装 | Cloud Functions にユーザーあたりのリクエスト制限を追加 |
| **高** | CORS を `*` に設定 | 本番ドメインのみ許可するよう変更 |
| **中** | Firestore ルールに文字数制限なし | `content.size() <= 10000` 等を追加 |
| **中** | OGP取得のSSRFリスク | URL バリデーション追加 |
| **中** | 検索クエリの最大長チェックなし | OpenAI に送る前にクエリ長を制限 |
| **低** | セキュリティヘッダー未設定 | firebase.json に追加 |

---

## 調査対象ファイル

- `firestore.rules` - Firestoreセキュリティルール
- `storage.rules` - Cloud Storageセキュリティルール
- `firebase.json` - Firebase設定
- `cors.json` - CORS設定
- `apps/functions/src/middleware/auth.ts` - 認証ミドルウェア
- `apps/functions/src/api/search/searchNotes.ts` - 検索エンドポイント
- `apps/functions/src/index.ts` - Cloud Functions エントリポイント
- `apps/functions/src/router.ts` - Express ルーター
- `apps/functions/src/triggers/onCreateNote.ts` - メモ作成トリガー
- `apps/functions/src/triggers/onUpdateNote.ts` - メモ更新トリガー
- `apps/functions/src/triggers/onDeleteNote.ts` - メモ削除トリガー
- `apps/functions/src/lib/openai.ts` - OpenAI クライアント
- `apps/functions/src/utils/ogp.ts` - OGP取得ユーティリティ
- `apps/web/src/lib/firebase.ts` - Firebase初期化
- `apps/web/src/infrastructure/firestore/notes.ts` - メモ操作
- `apps/web/src/routes/_authed.tsx` - ルートガード
- `src/providers/FirebaseAuthProvider.tsx` - 認証プロバイダー
- `apps/web/src/hooks/` - カスタムフック群
