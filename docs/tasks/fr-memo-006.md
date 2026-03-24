# FR-MEMO-006: メモ本文のマークダウン入力支援

| 項目 | 内容 |
|------|------|
| 概要 | メモ本文入力にCodeMirror 6ベースのマークダウン入力支援を導入する |
| 優先度 | 高 |
| 関連機能 | FR-MEMO-001（メモ作成）、FR-MEMO-002（メモ編集） |

---

## 1. 背景と目的

メモの本文入力は現在プレーンな `<textarea>` で実装されている。箇条書きでメモを取る際に、タブキーでのインデントやリストの自動継続ができないため、入力効率が悪い。

マークダウンの入力支援機能を追加し、リスト記法の入力効率を向上させる。

**注意**: 表示側のマークダウンレンダリングは本機能のスコープ外。保存データはマークダウン文字列のまま、表示もプレーンテキストとして扱う。

---

## 2. 対応するマークダウン記法

### 2.1 箇条書きリスト（Unordered List）

```
- アイテム1
- アイテム2
  - ネストされたアイテム
```

- マーカー: `-`（ハイフン + スペース）

### 2.2 番号付きリスト（Ordered List）

```
1. アイテム1
2. アイテム2
  1. ネストされたアイテム
```

- マーカー: `数字.`（数字 + ドット + スペース）
- 自動継続時は前の行の番号 + 1 を挿入する

### 2.3 チェックボックス（Task List）

```
- [ ] 未完了タスク
- [x] 完了タスク
  - [ ] ネストされたタスク
```

- マーカー: `- [ ] ` または `- [x] `
- 自動継続時は常に `- [ ] `（未チェック）を挿入する

---

## 3. 入力支援の仕様

### 3.1 Enterキーによる自動継続

| 状態 | 動作 |
|------|------|
| リスト行にテキストがある状態でEnter | 次の行に同じインデント + 同種のリストマーカーを挿入 |
| リスト行が空（マーカーのみ）でEnter | リストマーカーを削除してリストを終了（通常の空行にする） |
| リスト以外の行でEnter | 通常の改行 |

**自動継続の例**:

```
- アイテム1[Enter]
- |  ← カーソル位置。「- 」が自動挿入される

1. アイテム1[Enter]
2. |  ← 「2. 」が自動挿入される

- [ ] タスク1[Enter]
- [ ] |  ← 「- [ ] 」が自動挿入される
```

**リスト終了の例**:

```
- アイテム1
- [Enter]  ← 「- 」だけの行でEnter
|  ← リストマーカーが削除され、通常の空行になる
```

### 3.2 Tab / Shift+Tab によるインデント

| キー | 動作 |
|------|------|
| Tab | 現在の行をインデント（スペース2つ追加） |
| Shift+Tab | 現在の行をアンインデント（スペース2つ削除） |

- インデント単位: スペース2つ
- 最大インデントレベル: 6段階（スペース12個）
- 最小インデントレベル: 0（インデントなし）
- 複数行選択時は選択範囲内の全行に対して一括適用

### 3.3 対応しないマークダウン記法

以下の記法は入力支援の対象外（ユーザーが手動で入力する）:

- 見出し（`#`、`##` 等）
- 太字（`**bold**`）
- 斜体（`*italic*`）
- コードブロック（`` ``` ``）
- インラインコード
- リンク（`[text](url)`）
- 画像
- テーブル

---

## 4. UIの仕様

### 4.1 見た目

- シンタックスハイライトは行わない（プレーンテキスト表示）
- 既存の `<Textarea>` と同じ外観を維持する（ボーダー、パディング、フォント等）
- ツールバーは表示しない
- プレビュー機能は提供しない

### 4.2 操作性

- 既存のテキストエリアと同様にフォーカス・入力が可能
- Undo/Redo（Ctrl+Z / Ctrl+Shift+Z）が動作する
- テキストの折り返し表示
- プレースホルダーテキスト表示

---

## 5. 技術仕様

### 5.1 使用ライブラリ

**CodeMirror 6** を使用する。

必要パッケージ:
- `@codemirror/state` - エディタ状態管理
- `@codemirror/view` - DOM描画、キーマップ
- `@codemirror/commands` - 基本コマンド（Undo/Redo等）
- `@codemirror/language` - インデント設定

`@codemirror/lang-markdown` は使用しない（シンタックスハイライト不要のため）。

### 5.2 react-hook-form との統合

- `register` の代わりに `Controller` を使用
- `Controller` の `field.value` と `field.onChange` でCodeMirrorと双方向バインディング
- 既存のZodバリデーション（`content: z.string().min(1).max(10000)`）はそのまま動作

### 5.3 テンプレート機能との互換性

- `CreateNoteModal` でテンプレート選択時に `formKey` をインクリメントして `NoteForm` を再マウントする既存仕様に対応
- 再マウント時に `defaultValues` から初期値を読み込むため、特別な対応は不要

### 5.4 フォーカス制御

- `CreateNoteModal` の `handleOpenAutoFocus` で `document.getElementById('content')?.focus()` を使用している
- CodeMirror のコンテナ要素に `id` を設定し、フォーカスイベントを `EditorView.focus()` に委譲する

---

## 6. 影響範囲

### 変更対象ファイル
- `apps/web/src/features/notes/components/NoteForm.tsx` - Textarea → MarkdownEditor に置き換え

### 新規作成ファイル
- `apps/web/src/components/ui/markdown-editor.tsx` - CodeMirrorラッパーコンポーネント
- `apps/web/src/lib/codemirror/setup.ts` - CodeMirror最小設定
- `apps/web/src/lib/codemirror/markdown-keybindings.ts` - リスト自動継続・インデントのキーマップ

### 変更なし
- `apps/web/src/features/notes/schemas/noteSchema.ts` - バリデーションスキーマ変更なし
- `apps/web/src/features/notes/components/CreateNoteModal.tsx` - フォーカス制御の仕組みで対応
- `apps/web/src/features/notes/components/NoteDetailModal.tsx` - NoteForm経由で自動対応
- `packages/common/src/entities/Note.ts` - データモデル変更なし
