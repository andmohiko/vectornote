import type React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { NoteFormValues } from '../schemas/noteSchema'
import { noteFormSchema } from '../schemas/noteSchema'

type NoteFormProps = {
  onSubmit: (values: NoteFormValues) => void | Promise<void>
  defaultValues?: Partial<NoteFormValues>
  submitLabel?: string
  isPending?: boolean
  resetOnSuccess?: boolean
  footerLeft?: React.ReactNode
  expandContent?: boolean
}

export const NoteForm = ({
  onSubmit,
  defaultValues,
  submitLabel = '保存',
  isPending = false,
  resetOnSuccess = false,
  footerLeft,
  expandContent = false,
}: NoteFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    mode: 'all',
    defaultValues: {
      content: '',
      title: '',
      keywords: '',
      tags: [],
      ...defaultValues,
    },
  })

  const handleSubmitWithReset = async (values: NoteFormValues) => {
    await onSubmit(values)
    if (resetOnSuccess) reset()
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitWithReset)} className={expandContent ? 'flex h-full flex-col gap-6' : 'space-y-6'}>
      <div className="space-y-2">
        <Label htmlFor="title">タイトル</Label>
        <Input
          id="title"
          placeholder="タイトル（任意）"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className={expandContent ? 'flex min-h-0 flex-1 flex-col space-y-2' : 'space-y-2'}>
        <Label htmlFor="content">本文</Label>
        <Textarea
          id="content"
          placeholder="メモの内容を入力..."
          className={expandContent ? 'h-full min-h-0 resize-none break-all' : 'min-h-[12rem] break-all'}
          {...register('content')}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">キーワード</Label>
        <Input
          id="keywords"
          placeholder="カンマ区切りで入力（任意）"
          {...register('keywords')}
        />
        {errors.keywords && (
          <p className="text-sm text-destructive">{errors.keywords.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>{footerLeft}</div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
