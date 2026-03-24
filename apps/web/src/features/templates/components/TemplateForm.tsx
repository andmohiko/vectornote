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
import { TagSuggestionDropdown } from '@/features/tags/components/TagSuggestionDropdown'
import type { TemplateFormValues } from '../schemas/templateSchema'
import { templateFormSchema } from '../schemas/templateSchema'

type TemplateFormProps = {
  onSubmit: (values: TemplateFormValues) => void | Promise<void>
  defaultValues?: Partial<TemplateFormValues>
  submitLabel?: string
  isPending?: boolean
  footerLeft?: React.ReactNode
}

export const TemplateForm = ({
  onSubmit,
  defaultValues,
  submitLabel = '保存',
  isPending = false,
  footerLeft,
}: TemplateFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    mode: 'all',
    defaultValues: {
      name: '',
      body: '',
      defaultTitle: '',
      defaultKeyword: '',
      defaultTags: [],
      ...defaultValues,
    },
  })

  const tags = watch('defaultTags') ?? []

  const [tagInput, setTagInput] = useState('')
  const [isTagInputFocused, setIsTagInputFocused] = useState(false)

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    if (tags.length >= 10) return
    if (tags.includes(trimmed)) return
    setValue('defaultTags', [...tags, trimmed], { shouldValidate: true })
    setTagInput('')
  }

  const addTagByLabel = (label: string) => {
    if (!label.trim()) return
    if (tags.length >= 10) return
    if (tags.includes(label)) return
    setValue('defaultTags', [...tags, label], { shouldValidate: true })
    setTagInput('')
  }

  const removeTag = (index: number) => {
    setValue(
      'defaultTags',
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="name">テンプレート名</Label>
        <Input
          id="name"
          placeholder="テンプレート名（例: 採用面接議事録）"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultTitle">デフォルトタイトル</Label>
        <Input
          id="defaultTitle"
          placeholder="タイトル（任意）"
          {...register('defaultTitle')}
        />
        {errors.defaultTitle && (
          <p className="text-sm text-destructive">{errors.defaultTitle.message}</p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-2">
        <Label htmlFor="body">本文</Label>
        <Textarea
          id="body"
          placeholder="テンプレートの本文を入力..."
          className="h-full min-h-0 resize-none break-all"
          {...register('body')}
        />
        {errors.body && (
          <p className="text-sm text-destructive">{errors.body.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultKeyword">デフォルトキーワード</Label>
        <Input
          id="defaultKeyword"
          placeholder="カンマ区切りで入力（任意）"
          {...register('defaultKeyword')}
        />
        {errors.defaultKeyword && (
          <p className="text-sm text-destructive">{errors.defaultKeyword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultTags">デフォルトタグ</Label>
        <Input
          id="defaultTags"
          placeholder="タグを入力してEnterで追加（最大10個）"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onFocus={() => setIsTagInputFocused(true)}
          onBlur={() => {
            setIsTagInputFocused(false)
            addTag()
          }}
          disabled={tags.length >= 10}
        />
        {isTagInputFocused && (
          <TagSuggestionDropdown
            tagInput={tagInput}
            activeTags={tags}
            onSelect={addTagByLabel}
          />
        )}
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
        {errors.defaultTags && (
          <p className="text-sm text-destructive">{errors.defaultTags.message}</p>
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
