import { z } from 'zod'

export const noteFormSchema = z.object({
  content: z
    .string()
    .min(1, '本文を入力してください')
    .max(10000, '本文は10,000文字以内です'),
  title: z
    .string()
    .max(100, 'タイトルは100文字以内です')
    .optional()
    .default(''),
  keywords: z
    .string()
    .max(500, 'キーワードは500文字以内です')
    .optional()
    .default(''),
  tags: z
    .array(z.string().max(50, 'タグは50文字以内です'))
    .max(10, 'タグは最大10個です')
    .optional()
    .default([]),
})

export type NoteFormValues = z.infer<typeof noteFormSchema>
