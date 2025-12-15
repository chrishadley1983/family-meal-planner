'use client'

import { Share2, Edit, Copy } from 'lucide-react'

interface RecipeDetailHeaderProps {
  mealCategories: string[]
  onShare?: () => void
  onEdit: () => void
  onDuplicate: () => void
  duplicating?: boolean
  isEditing?: boolean
}

export function RecipeDetailHeader({
  mealCategories,
  onShare,
  onEdit,
  onDuplicate,
  duplicating = false,
  isEditing = false,
}: RecipeDetailHeaderProps) {
  if (isEditing) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Meal category tags */}
      <div className="flex items-center gap-2 flex-wrap">
        {mealCategories.map((cat, idx) => (
          <span
            key={idx}
            className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {onShare && (
          <button
            onClick={onShare}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-5 h-5 text-zinc-400" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors flex items-center gap-2 text-white"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={onDuplicate}
          disabled={duplicating}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors flex items-center gap-2 text-white disabled:opacity-50"
        >
          <Copy className="w-4 h-4" />
          {duplicating ? 'Duplicating...' : 'Duplicate'}
        </button>
      </div>
    </div>
  )
}
