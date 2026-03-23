import type { SearchResult } from '@vectornote/common'
import { auth } from '@/lib/firebase'

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL

type SearchNotesParams = {
  query: string
  limit?: number
  minSimilarity?: number
}

type SearchNotesResponse = {
  results: SearchResult[]
}

/** セマンティック検索を実行する */
export const searchNotesApi = async (
  params: SearchNotesParams,
): Promise<SearchNotesResponse> => {
  const user = auth.currentUser
  if (!user) throw new Error('認証エラー：再ログインしてください')

  const idToken = await user.getIdToken()

  const response = await fetch(`${FUNCTIONS_BASE_URL}/search/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('検索に失敗しました')
  }

  return response.json()
}
