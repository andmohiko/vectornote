import { createFileRoute } from '@tanstack/react-router'

import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { login } = useFirebaseAuthContext()

  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold">VectorNote</h1>
        <Button onClick={login}>Googleでログイン</Button>
      </div>
    </main>
  )
}
