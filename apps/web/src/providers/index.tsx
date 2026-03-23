import type { ReactNode } from "react"
import { FirebaseAuthProvider } from "./FirebaseAuthProvider"

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <FirebaseAuthProvider>
      {children}
    </FirebaseAuthProvider>
  )
}