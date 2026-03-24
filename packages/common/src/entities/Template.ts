import type { FieldValue } from 'firebase/firestore'

/** コレクション名 */
export const templateCollection = 'templates' as const

/** ID型エイリアス */
export type TemplateId = string

/** Entity型（Firestoreから取得したデータ、Date変換済み） */
export type Template = {
  templateId: TemplateId
  body: string
  createdAt: Date
  defaultKeyword: string
  defaultTags: string[]
  defaultTitle: string
  name: string
  updatedAt: Date
}

/** 作成用DTO */
export type CreateTemplateDto = Omit<
  Template,
  'templateId' | 'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue
  updatedAt: FieldValue
}

/** 更新用DTO */
export type UpdateTemplateDto = {
  body?: Template['body']
  defaultKeyword?: Template['defaultKeyword']
  defaultTags?: Template['defaultTags']
  defaultTitle?: Template['defaultTitle']
  name?: Template['name']
  updatedAt: FieldValue
}
