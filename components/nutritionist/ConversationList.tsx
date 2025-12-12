'use client'

import { useState } from 'react'
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
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  onDelete,
  isLoading = false,
}: ConversationListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  }

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setDeleteConfirmId(convId)
  }

  const handleConfirmDelete = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(convId)
    }
    setDeleteConfirmId(null)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
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
              <div
                key={conv.id}
                className={`
                  w-full p-3 rounded-lg text-left transition-colors cursor-pointer relative group
                  ${conv.id === selectedId
                    ? 'bg-purple-600/20 border border-purple-600/30'
                    : 'hover:bg-zinc-800 border border-transparent'
                  }
                `}
                onClick={() => onSelect(conv.id)}
              >
                {/* Delete confirmation overlay */}
                {deleteConfirmId === conv.id ? (
                  <div className="absolute inset-0 bg-zinc-900/95 rounded-lg flex items-center justify-center gap-2 z-10">
                    <button
                      onClick={(e) => handleConfirmDelete(e, conv.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-md transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                {/* Delete button (visible on hover) */}
                {onDelete && deleteConfirmId !== conv.id && (
                  <button
                    onClick={(e) => handleDeleteClick(e, conv.id)}
                    className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* Title */}
                <div className="font-medium text-zinc-200 text-sm truncate pr-6">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
