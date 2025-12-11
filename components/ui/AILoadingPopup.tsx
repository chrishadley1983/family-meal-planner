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
    } else {
      // Small delay before hiding for fade-out animation
      const timeout = setTimeout(() => setIsVisible(false), 150)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  if (!isVisible && !isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-150 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Semi-transparent backdrop - allows screen to be visible */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Compact loading card */}
      <div className="relative z-10 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl p-5 mx-4 min-w-[280px] max-w-[320px]">
        <div className="flex flex-col items-center gap-3">
          {/* Fork & Knife icon */}
          <div className="text-purple-400">
            <svg
              className="w-10 h-10 animate-pulse"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              {/* Fork */}
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
            </svg>
          </div>

          {/* Context message if provided */}
          {contextMessage && (
            <p className="text-zinc-200 font-medium text-sm text-center">
              {contextMessage}
            </p>
          )}

          {/* Rotating whimsical message */}
          <p
            key={messageIndex}
            className="text-purple-400 text-xs text-center animate-fade-in-up h-4"
          >
            {COOKING_MESSAGES[messageIndex]}
          </p>

          {/* Loading dots */}
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce-dot-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce-dot-2" />
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce-dot-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
