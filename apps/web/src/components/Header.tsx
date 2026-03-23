import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export default function Header() {
  const { logout } = useFirebaseAuthContext()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[var(--header-bg)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-sm font-semibold text-foreground no-underline hover:text-foreground">
          VectorNote
        </Link>
        <Button variant="ghost" size="sm" onClick={logout}>
          ログアウト
        </Button>
      </div>
    </header>
  )
}
