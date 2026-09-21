import { Link, useLocation, useSearch } from '@tanstack/react-router'
import { DownloadIcon, NotebookPen, Settings, TagIcon } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useTags } from '@/features/tags/hooks/useTags'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export const SideNav = () => {
  const { tags, isLoading } = useTags()
  const { pathname } = useLocation()
  const search = useSearch({ strict: false }) as { tag?: string }
  const selectedTag = search.tag ?? null
  const { canInstall, promptInstall } = usePWAInstall()

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2">
        <Link
          to="/"
          className="flex items-center gap-3"
          aria-label="VectorNote ホーム"
        >
          <BrandMark />
          <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            VectorNote
          </span>
        </Link>
      </div>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-3 text-xs tracking-wide text-muted-foreground">
            ライブラリ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/' && selectedTag === null}
                  tooltip="すべて"
                  className="h-10 text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground"
                >
                  <Link to="/" search={{}}>
                    <NotebookPen />
                    <span>すべてのメモ</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  ))
                : tags.map((tag) => (
                    <SidebarMenuItem key={tag.tagId}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/' && selectedTag === tag.label}
                        tooltip={tag.label}
                        className="h-10 text-muted-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground"
                      >
                        <Link to="/" search={{ tag: tag.label }}>
                          <TagIcon />
                          <span>{tag.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>{tag.count}</SidebarMenuBadge>
                    </SidebarMenuItem>
                  ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="設定"
              isActive={pathname === '/settings'}
              className="h-10"
            >
              <Link to="/settings">
                <Settings />
                <span>設定</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {canInstall && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={promptInstall}
                tooltip="アプリをインストール"
              >
                <DownloadIcon />
                <span>アプリをインストール</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
