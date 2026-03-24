import { Link, useRouterState } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { SearchBar } from '@/features/search/components/SearchBar'

export default function Header() {
  const routerState = useRouterState()
  const search = routerState.location.search as Record<string, unknown>
  const q = typeof search.q === 'string' ? search.q : ''

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[var(--header-bg)] backdrop-blur-sm">
      <div className="flex items-center gap-4 px-4 py-3">
        <SidebarTrigger />
        <Link to="/" className="shrink-0 text-sm font-semibold text-foreground no-underline hover:text-foreground">
          VectorNote
        </Link>
        <div className="flex-1">
          <SearchBar initialQuery={q} />
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings">
            <Settings className="size-5" />
          </Link>
        </Button>
      </div>
    </header>
  )
}
