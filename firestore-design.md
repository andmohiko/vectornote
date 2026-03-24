<!-- @format -->

# Firestore 設計

- [users](#users)
  - [notes](#notes)
  - [tags](#tags)
  - [templates](#templates)

## users

### 概要

- ユーザー一覧コレクション
- ID: Firebase Auth の Uid

## 詳細

- createdAt: Timestamp 作成日時
- email: String 認証に使用したメールアドレス
- updatedAt: Timestamp 更新日時

## notes

### 概要

- ユーザーのメモ一覧コレクション
- ID: 自動生成
- 親コレクションのユーザーのみがアクセス可能

## 詳細

- createdAt: Timestamp 作成日時
- content: String メモの本文（必須）
- embedding: vector(1536)
- keywords: String 検索時のキーワード
- tags: Array<String> メモのジャンル分け用のタグ
- title: String メモのタイトル（任意）
- updatedAt: Timestamp 更新日時

## tags

### 概要

- ユーザーのタグ一覧コレクション
- ID: 自動生成
- 親コレクションのユーザーのみがアクセス可能
- クライアントからは read のみ。write は Firebase Functions のトリガーが行う

### 詳細

- count: Number タグがついているメモの件数
- createdAt: Timestamp 作成日時
- label: String タグ名
- updatedAt: Timestamp 更新日時

### 同期ルール

- メモ作成時（onCreateNote）: タグが存在すれば `count` をインクリメント、なければドキュメントを新規作成
- メモ更新時（onUpdateNote）: `before.tags` と `after.tags` の差分を計算し、追加タグをインクリメント・削除タグをデクリメント
- メモ削除時（onDeleteNote）: 各タグの `count` をデクリメント、`count=0` になればドキュメントを削除
- `count` の増減は `FieldValue.increment()` でアトミックに操作する

## templates

### 概要

- ユーザーのテンプレート一覧コレクション
- ID: 自動生成
- 親コレクションのユーザーのみがアクセス可能
- クライアントからreadもwriteも行うため、firestoreセキュリティルールが必要

## 詳細

- body: String テンプレート本文
- createdAt: Timestamp 作成日時
- defaultKeyword: String デフォルトでつけるキーワード
- defaultTags: Array<String> デフォルトでつけるタグ
- defaultTitle: String デフォルトでつけるメモのタイトル
- name: String テンプレート名
- updatedAt: Timestamp 更新日時
