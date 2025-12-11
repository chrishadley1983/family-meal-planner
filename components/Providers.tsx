'use client'

import { SessionProvider } from 'next-auth/react'
import { AILoadingProvider } from '@/components/providers/AILoadingProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AILoadingProvider>
        {children}
      </AILoadingProvider>
    </SessionProvider>
  )
}
