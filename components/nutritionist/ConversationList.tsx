'use client'

import { formatDistanceToNow } from 'date-fns'

export interface ConversationPreview {
  id: string
  title: string | null
  profileId: string
  profile: {
    id: string
    profileName: string
    avatarUrl?: string | null
  }
  lastMessage: string | null
  lastMessageAt: Date | string
  createdAt: Date | string
}

interface ConversationListProps {
  conversations: ConversationPreview[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
  isLoading?: boolean
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  isLoading = false,
}: ConversationListProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-zinc-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            No conversations yet.
            <br />
            Start a new one!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`
                  w-full p-3 rounded-lg text-left transition-colors
                  ${conv.id === selectedId
                    ? 'bg-purple-600/20 border border-purple-600/30'
                    : 'hover:bg-zinc-800 border border-transparent'
                  }
                `}
              >
                {/* Title */}
                <div className="font-medium text-zinc-200 text-sm truncate">
                  {conv.title || 'New conversation'}
                </div>

                {/* Last message preview */}
                {conv.lastMessage && (
                  <div className="text-xs text-zinc-500 truncate mt-1">
                    {conv.lastMessage}
                  </div>
                )}

                {/* Profile and time */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-zinc-600">
                    {conv.profile.profileName}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
