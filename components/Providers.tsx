'use client'

import { SessionProvider } from 'next-auth/react'
import { AILoadingProvider } from '@/components/providers/AILoadingProvider'
import { NotificationProvider } from '@/components/providers/NotificationProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <AILoadingProvider>
          {children}
        </AILoadingProvider>
      </NotificationProvider>
    </SessionProvider>
  )
}
