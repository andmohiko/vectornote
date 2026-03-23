import type React from 'react'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
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
  autoFocusContent?: boolean
}

export const NoteForm = ({
  onSubmit,
  defaultValues,
  submitLabel = '保存',
  isPending = false,
  resetOnSuccess = false,
  footerLeft,
  expandContent = false,
  autoFocusContent = false,
}: NoteFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  const tags = watch('tags') ?? []

  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    if (tags.length >= 10) return
    setValue('tags', [...tags, trimmed], { shouldValidate: true })
    setTagInput('')
  }

  const removeTag = (index: number) => {
    setValue(
      'tags',
      tags.filter((_, i) => i !== index),
      { shouldValidate: true },
    )
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmitWithReset = async (values: NoteFormValues) => {
    await onSubmit(values)
    if (resetOnSuccess) {
      reset()
      setTagInput('')
    }
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
          autoFocus={autoFocusContent}
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

      <div className="space-y-2">
        <Label htmlFor="tags">タグ</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            placeholder="タグを入力してEnterで追加（最大10個）"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            disabled={tags.length >= 10}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="h-6 gap-1 px-2 text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-0.5 rounded-full hover:text-destructive focus:outline-none"
                  aria-label={`タグ「${tag}」を削除`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {errors.tags && (
          <p className="text-sm text-destructive">{errors.tags.message}</p>
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
