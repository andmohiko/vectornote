import { z } from 'zod'

export const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, 'テンプレート名を入力してください')
    .max(100, 'テンプレート名は100文字以内です'),
  body: z
    .string()
    .min(1, '本文を入力してください')
    .max(10000, '本文は10,000文字以内です'),
  defaultTitle: z
    .string()
    .max(100, 'タイトルは100文字以内です')
    .optional()
    .default(''),
  defaultKeyword: z
    .string()
    .max(500, 'キーワードは500文字以内です')
    .optional()
    .default(''),
  defaultTags: z
    .array(z.string().max(50, 'タグは50文字以内です'))
    .max(10, 'タグは最大10個です')
    .optional()
    .default([]),
})

export type TemplateFormValues = z.infer<typeof templateFormSchema>
