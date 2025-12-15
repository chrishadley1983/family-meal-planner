'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

interface RecipeEditHeaderProps {
  onUndo: () => void
  onSave: () => void
  onCancel: () => void
  canUndo: boolean
  saving: boolean
  className?: string
}

export function RecipeEditHeader({
  onUndo,
  onSave,
  onCancel,
  canUndo,
  saving,
  className = '',
}: RecipeEditHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-10 bg-gray-900/50 backdrop-blur border-b border-gray-800 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          href="/recipes"
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
        >
          ← Back to Recipes
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo || saving}
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-zinc-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↶ Undo
          </button>
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
            size="sm"
            isLoading={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-2 text-zinc-400 hover:text-zinc-300 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
