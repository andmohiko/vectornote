# FR-TEMPLATE-001: テンプレート機能

## 概要

メモ新規作成時に、事前登録したテンプレートを選択してフォームに自動入力できる機能を追加する。

**背景**: 採用面接の議事録など、決まったフォーマットで書くメモを毎回白紙から作成するのは非効率。テンプレートを登録しておくことで、すぐに書き始められるようにする。

**ユースケース例**: 採用面接の議事録テンプレートを登録し、面接のたびに選択して使い回す。

---

## 機能仕様

### テンプレートのデータ構造

| フィールド | 型 | 説明 |
|---|---|---|
| templateId | string | テンプレートID |
| name | string | テンプレート識別名（例: "採用面接議事録"） |
| body | string | テンプレート本文 |
| defaultTitle | string | ノートのデフォルトタイトル（空文字許容） |
| defaultKeyword | string | ノートのデフォルトキーワード |
| defaultTags | string[] | ノートのデフォルトタグ（最大10個） |
| createdAt | Date | 作成日時 |
| updatedAt | Date | 更新日時 |

Firestoreパス: `users/{uid}/templates/{templateId}`

### UI仕様

- **テンプレートを選択**: メモ作成モーダル（CreateNoteModal）に「テンプレートを選択」ボタンを配置
- **TemplateSelectModal**: テンプレート一覧を表示し、選択するとフォームに自動入力
- **TemplateManageModal**: TemplateSelectModal内の「テンプレートを管理」ボタンから開く。テンプレートの作成・削除を行う
- テンプレートが0件の場合は空状態UIを表示

---

## 実装ファイル一覧

### 新規作成

| ファイル | 役割 |
|---|---|
| `packages/common/src/entities/Template.ts` | Entity型・DTO型定義 |
| `apps/web/src/infrastructure/firestore/templates.ts` | Firestore CRUD操作 |
| `apps/web/src/features/templates/schemas/templateSchema.ts` | Zodスキーマ |
| `apps/web/src/features/templates/hooks/useTemplates.ts` | 一覧リアルタイム購読フック |
| `apps/web/src/features/templates/hooks/useCreateTemplateMutation.ts` | 作成ミューテーション |
| `apps/web/src/features/templates/hooks/useUpdateTemplateMutation.ts` | 更新ミューテーション |
| `apps/web/src/features/templates/hooks/useDeleteTemplateMutation.ts` | 削除ミューテーション |
| `apps/web/src/features/templates/components/TemplateForm.tsx` | テンプレート作成・編集フォーム |
| `apps/web/src/features/templates/components/TemplateCard.tsx` | テンプレート一覧アイテム |
| `apps/web/src/features/templates/components/CreateTemplateModal.tsx` | テンプレート作成モーダル |
| `apps/web/src/features/templates/components/DeleteTemplateDialog.tsx` | 削除確認ダイアログ |
| `apps/web/src/features/templates/components/TemplateManageModal.tsx` | テンプレート管理モーダル（一覧・作成・削除） |
| `apps/web/src/features/templates/components/TemplateSelectModal.tsx` | テンプレート選択モーダル |

### 既存ファイルの修正

| ファイル | 変更内容 |
|---|---|
| `packages/common/src/entities/index.ts` | `Template.ts` のexport追加 |
| `apps/web/src/infrastructure/firestore/index.ts` | `templates.ts` のexport追加 |
| `apps/web/src/features/notes/components/CreateNoteModal.tsx` | templateDefaults state追加、TemplateSelectModal組み込み |

---

## 実装詳細

### CreateNoteModalへの統合

`NoteForm`の`footerLeft` propに「テンプレートを選択」ボタンを注入する（NoteForm自体は変更不要）。

```tsx
// CreateNoteModal.tsx 追加ロジック
const [templateDefaults, setTemplateDefaults] = useState<Partial<NoteFormValues>>()
const { isOpen: isTemplateSelectOpen, open: openTemplateSelect, close: closeTemplateSelect } = useDisclosure()

const handleTemplateSelect = (template: Template) => {
  setTemplateDefaults({
    content: template.body,
    title: template.defaultTitle,
    keywords: template.defaultKeyword,
    tags: template.defaultTags,
  })
  setFormKey((k) => k + 1) // 再マウントしてdefaultValuesを再適用
  closeTemplateSelect()
}
```

### パターン参照元

- `useTemplates.ts` → `apps/web/src/features/tags/hooks/useTags.ts`（リアルタイム購読）
- `useCreateTemplateMutation.ts` → `apps/web/src/features/notes/hooks/useCreateNoteMutation.ts`
- `templates.ts` (infrastructure) → `apps/web/src/infrastructure/firestore/notes.ts`
- `CreateTemplateModal.tsx` → `apps/web/src/features/notes/components/CreateNoteModal.tsx`
- `DeleteTemplateDialog.tsx` → `apps/web/src/features/notes/components/DeleteNoteDialog.tsx`

---

## 実装順序

### Phase 1: データ層
- [ ] `packages/common/src/entities/Template.ts` 作成（Entity型・CreateDto・UpdateDto）
- [ ] `packages/common/src/entities/index.ts` にexport追加
- [ ] `apps/web/src/infrastructure/firestore/templates.ts` 作成（CRUD操作）
- [ ] `apps/web/src/infrastructure/firestore/index.ts` にexport追加

### Phase 2: Hooks層
- [ ] `useTemplates.ts`（リアルタイム購読）
- [ ] `useCreateTemplateMutation.ts`
- [ ] `useDeleteTemplateMutation.ts`
- [ ] `useUpdateTemplateMutation.ts`

### Phase 3: スキーマ
- [ ] `templateSchema.ts`（Zodスキーマ、nameフィールドあり）

### Phase 4: テンプレート管理UI
- [ ] `TemplateForm.tsx`
- [ ] `TemplateCard.tsx`
- [ ] `DeleteTemplateDialog.tsx`
- [ ] `CreateTemplateModal.tsx`
- [ ] `TemplateManageModal.tsx`

### Phase 5: 選択UI + CreateNoteModal統合
- [ ] `TemplateSelectModal.tsx`
- [ ] `CreateNoteModal.tsx` 修正

---

## 検証方法

1. テンプレートを作成し、Firestoreコンソールで `users/{uid}/templates/{templateId}` にデータが保存されること
2. 「テンプレートを選択」ボタンがCreateNoteModalに表示されること
3. テンプレートを選択するとフォームの全フィールド（本文・タイトル・キーワード・タグ）に値が入ること
4. テンプレートを選択後、別テンプレートに切り替えた際にフォームが正しく更新されること
5. テンプレートの作成・削除が正常に動作すること
6. テンプレートが0件の場合に空状態UIが表示されること
