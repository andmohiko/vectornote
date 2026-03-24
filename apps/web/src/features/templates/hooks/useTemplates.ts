import { useEffect, useState } from 'react'
import type { Template } from '@vectornote/common'
import { subscribeTemplatesOperation } from '@/infrastructure/firestore/templates'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { errorMessage } from '@/utils/errorMessage'

export type UseTemplatesReturn = {
  templates: Array<Template>
  isLoading: boolean
  error: string | null
}

export const useTemplates = (): UseTemplatesReturn => {
  const { uid } = useFirebaseAuthContext()
  const [templates, setTemplates] = useState<Array<Template>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return

    setIsLoading(true)
    const unsubscribe = subscribeTemplatesOperation(
      uid,
      (updatedTemplates) => {
        setTemplates(updatedTemplates)
        setIsLoading(false)
      },
      (err) => {
        setError(errorMessage(err))
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [uid])

  return { templates, isLoading, error }
}
