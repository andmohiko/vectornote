import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { useTags } from '@/features/tags/hooks/useTags'

type TagSuggestionDropdownProps = {
  tagInput: string
  activeTags: string[]
  onSelect: (label: string) => void
}

export const TagSuggestionDropdown = ({
  tagInput,
  activeTags,
  onSelect,
}: TagSuggestionDropdownProps) => {
  const { tags } = useTags()

  const suggestions = useMemo(() => {
    const filtered = tags.filter((tag) => !activeTags.includes(tag.label))

    if (tagInput === '') {
      return filtered.slice(0, 5)
    }

    const lowerInput = tagInput.toLowerCase()
    return filtered.filter((tag) =>
      tag.label.toLowerCase().startsWith(lowerInput),
    )
  }, [tags, tagInput, activeTags])

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {tagInput === '' ? 'よく使うタグ' : '候補'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((tag) => (
          <Badge
            key={tag.tagId}
            variant="outline"
            className="cursor-pointer hover:bg-secondary"
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(tag.label)
            }}
          >
            {tag.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
