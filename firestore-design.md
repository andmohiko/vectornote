<!-- @format -->

# Firestore 設計

- [users](#users)
  - [notes](#notes)

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
