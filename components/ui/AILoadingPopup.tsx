'use client'

import React, { useEffect, useState } from 'react'

// Cooking-themed whimsical messages that rotate while AI is thinking
const COOKING_MESSAGES = [
  'Preheating the neural networks...',
  'Whisking up some ideas...',
  'Simmering the possibilities...',
  'Tossing ingredients together...',
  'Letting the flavours meld...',
  'Folding in the good stuff...',
  'Kneading through the data...',
  'Marinating on that thought...',
  'Bringing it to a gentle boil...',
  'Adding a pinch of creativity...',
  'Stirring the pot...',
  'Checking the seasoning...',
  'Letting it rest for perfection...',
  'Plating up your results...',
  'Garnishing with final touches...',
  'Taste testing the output...',
  'Reducing to the essentials...',
  'Caramelising the concepts...',
  'Flipping through recipes...',
  'Zesting up the analysis...',
  'Blending the ingredients...',
  'Proofing the dough of ideas...',
  'Deglazing with fresh insights...',
  'Rolling out the details...',
  'Infusing with nutrition facts...',
  'Tempering the calculations...',
  'Basting with brilliance...',
  'Grilling the numbers...',
  'Sautéing the suggestions...',
  'Fermenting the perfect plan...',
]

export interface AILoadingPopupProps {
  isOpen: boolean
  /** Optional context-specific message to show alongside rotating messages */
  contextMessage?: string
}

export function AILoadingPopup({ isOpen, contextMessage }: AILoadingPopupProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Rotate through messages
  useEffect(() => {
    if (!isOpen) return

    // Start with a random message
    setMessageIndex(Math.floor(Math.random() * COOKING_MESSAGES.length))

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % COOKING_MESSAGES.length)
    }, 2500) // Change message every 2.5 seconds

    return () => clearInterval(interval)
  }, [isOpen])

  // Handle visibility with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      // Small delay before hiding for fade-out animation
      const timeout = setTimeout(() => setIsVisible(false), 150)
      return () => clearTimeout(timeout)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isVisible && !isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-150 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop - blocks all interaction */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-md mx-4">
        {/* Animated cooking pot icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {/* Cooking pot icon */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Steam animation */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-1.5 h-4 bg-white/40 rounded-full animate-steam-1" />
            <div className="w-1.5 h-5 bg-white/30 rounded-full animate-steam-2" />
            <div className="w-1.5 h-4 bg-white/40 rounded-full animate-steam-3" />
          </div>
        </div>

        {/* Context message if provided */}
        {contextMessage && (
          <p className="text-white font-medium text-lg text-center">
            {contextMessage}
          </p>
        )}

        {/* Rotating whimsical message */}
        <div className="h-8 flex items-center">
          <p
            key={messageIndex}
            className="text-orange-300 text-center animate-fade-in-up"
          >
            {COOKING_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce-dot-1" />
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce-dot-2" />
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce-dot-3" />
        </div>
      </div>
    </div>
  )
}
