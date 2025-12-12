'use client'

import Image from 'next/image'
import { NutritionistAction } from '@/lib/nutritionist/types'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  suggestedActions?: NutritionistAction[]
  onActionClick?: (action: NutritionistAction) => void
  isLoading?: boolean
}

export function ChatMessage({
  role,
  content,
  timestamp,
  suggestedActions,
  onActionClick,
  isLoading = false,
}: ChatMessageProps) {
  const isUser = role === 'user'

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Render markdown-like content (basic implementation)
  const renderContent = (text: string) => {
    // Split by newlines and process
    const lines = text.split('\n')
    const elements: JSX.Element[] = []

    lines.forEach((line, index) => {
      // Bold text
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Bullet points
      if (processed.startsWith('- ')) {
        processed = `<span class="ml-2">• ${processed.substring(2)}</span>`
      }
      // Headers
      if (processed.startsWith('**') && processed.endsWith('**')) {
        processed = processed.replace(/^\*\*(.+)\*\*$/, '<strong class="font-semibold text-white">$1</strong>')
      }

      elements.push(
        <span
          key={index}
          dangerouslySetInnerHTML={{ __html: processed }}
          className="block"
        />
      )
    })

    return elements
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-green-900/50 to-blue-900/50 overflow-hidden border border-green-700/30">
          <Image
            src="/sarah-nutritionist.png"
            alt="Emilia"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Message content */}
      <div
        className={`
          max-w-[85%] rounded-lg px-4 py-3
          ${isUser
            ? 'bg-purple-600 text-white'
            : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
          }
        `}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-zinc-400">Emilia is thinking...</span>
          </div>
        ) : (
          <>
            {/* Message text */}
            <div className="text-sm leading-relaxed space-y-1">
              {renderContent(content)}
            </div>

            {/* Timestamp */}
            {timestamp && (
              <div className={`text-xs mt-2 ${isUser ? 'text-purple-200' : 'text-zinc-500'}`}>
                {formatTime(timestamp)}
              </div>
            )}

            {/* Action buttons */}
            {!isUser && suggestedActions && suggestedActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => onActionClick?.(action)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* User avatar placeholder */}
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
          You
        </div>
      )}
    </div>
  )
}
