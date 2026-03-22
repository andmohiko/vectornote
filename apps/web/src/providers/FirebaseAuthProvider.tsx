import type { User } from 'firebase/auth'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

import { auth } from '@/lib/firebase'
import { Loader2Icon } from 'lucide-react'

const FirebaseAuthContext = createContext<{
  currentUser: User | null | undefined
  uid: string | null | undefined
  login: () => void
  logout: () => Promise<void>
  isAuthPath: boolean
}>({
  currentUser: undefined,
  uid: undefined,
  login: async () => {},
  logout: async () => {},
  isAuthPath: false,
})

const FirebaseAuthProvider = ({
  children,
}: {
  children: ReactNode
}): ReactNode => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(
    undefined,
  )
  const [uid, setUid] = useState<string | null | undefined>(undefined)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthPath = useMemo(
    () => location.pathname === '/login',
    [location.pathname],
  )

  const LoadingCover = () => {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2Icon className="size-10 animate-spin" />
      </div>
    )
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user)
        setUid(user.uid)
      } else {
        setCurrentUser(null)
        setUid(null)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUser === undefined) return
    if (currentUser === null && !isAuthPath) {
      navigate({ to: '/login' })
    }
    if (currentUser && isAuthPath) {
      navigate({ to: '/' })
    }
  }, [currentUser, isAuthPath, navigate])

  const login = useCallback(async () => {
    const googleProvider = new GoogleAuthProvider()
    signInWithPopup(auth, googleProvider)
      .then(async (val) => {
        const userData = val.user
        console.log('login success', userData)
      })
      .catch((error) => {
        console.error('error with google login', error)
      })
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  return (
    <FirebaseAuthContext.Provider
      value={{ currentUser, uid, login, logout, isAuthPath }}
    >
      {currentUser === undefined ? <LoadingCover /> : null}
      {children}
    </FirebaseAuthContext.Provider>
  )
}

export { FirebaseAuthContext, FirebaseAuthProvider }

export const useFirebaseAuthContext = () => useContext(FirebaseAuthContext)