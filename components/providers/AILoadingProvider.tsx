'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AILoadingPopup } from '@/components/ui/AILoadingPopup'

interface AILoadingContextType {
  /** Show the AI loading popup with an optional context message */
  startLoading: (contextMessage?: string) => void
  /** Hide the AI loading popup */
  stopLoading: () => void
  /** Whether the loading popup is currently visible */
  isLoading: boolean
}

const AILoadingContext = createContext<AILoadingContextType | undefined>(undefined)

interface AILoadingProviderProps {
  children: ReactNode
}

export function AILoadingProvider({ children }: AILoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [contextMessage, setContextMessage] = useState<string | undefined>(undefined)

  const startLoading = useCallback((message?: string) => {
    console.log('🔷 AI Loading started:', message || 'No context message')
    setContextMessage(message)
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    console.log('🟢 AI Loading stopped')
    setIsLoading(false)
    setContextMessage(undefined)
  }, [])

  return (
    <AILoadingContext.Provider value={{ startLoading, stopLoading, isLoading }}>
      {children}
      <AILoadingPopup isOpen={isLoading} contextMessage={contextMessage} />
    </AILoadingContext.Provider>
  )
}

/**
 * Hook to access the AI loading context.
 * Use this to show/hide the global AI loading popup.
 *
 * @example
 * const { startLoading, stopLoading } = useAILoading()
 *
 * const handleGenerate = async () => {
 *   startLoading('Generating your meal plan...')
 *   try {
 *     await generateMealPlan()
 *   } finally {
 *     stopLoading()
 *   }
 * }
 */
export function useAILoading(): AILoadingContextType {
  const context = useContext(AILoadingContext)
  if (context === undefined) {
    throw new Error('useAILoading must be used within an AILoadingProvider')
  }
  return context
}
