import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { ThemeCard } from '@/features/settings/components/ThemeCard'
import { TemplateManageSection } from '@/features/templates/components/TemplateManageSection'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { logout } = useFirebaseAuthContext()

  return (
    <main className="pb-8 pt-14">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">設定</h1>

      <section className="mb-12">
        <ThemeCard />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-medium">テンプレート管理</h2>
        <TemplateManageSection />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-medium">アカウント</h2>
        <Button variant="outline" onClick={logout}>
          ログアウト
        </Button>
      </section>

      <p className="text-sm text-muted-foreground">
        バージョン: {import.meta.env.VITE_VERSION ?? '-'}
      </p>
    </main>
  )
}
