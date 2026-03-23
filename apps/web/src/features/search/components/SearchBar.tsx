import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SearchBarProps = {
  initialQuery?: string
  isLoading?: boolean
}

export const SearchBar = ({ initialQuery = '', isLoading = false }: SearchBarProps) => {
  const [inputValue, setInputValue] = useState(initialQuery)
  const navigate = useNavigate()

  useEffect(() => {
    setInputValue(initialQuery)
  }, [initialQuery])

  const handleSearch = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    navigate({ to: '/search', search: { q: trimmed } })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSearch()
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="セマンティック検索..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
      />
      <Button onClick={handleSearch} disabled={isLoading || !inputValue.trim()}>
        <SearchIcon className="size-4" />
        検索
      </Button>
    </div>
  )
}
