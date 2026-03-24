import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { TemplateManageSection } from '@/features/templates/components/TemplateManageSection'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { logout } = useFirebaseAuthContext()

  return (
    <main className="pb-8 pt-14">
      <h1 className="mb-8 text-xl font-semibold">設定</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">テンプレート管理</h2>
        <TemplateManageSection />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">アカウント</h2>
        <Button variant="outline" onClick={logout}>
          ログアウト
        </Button>
      </section>
    </main>
  )
}
