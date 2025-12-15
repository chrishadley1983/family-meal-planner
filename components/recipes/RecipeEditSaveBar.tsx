'use client'

import { Button } from '@/components/ui'

interface RecipeEditSaveBarProps {
  hasChanges: boolean
  onUndo: () => void
  onCancel: () => void
  onSave: () => void
  canUndo: boolean
  saving: boolean
  className?: string
}

export function RecipeEditSaveBar({
  hasChanges,
  onUndo,
  onCancel,
  onSave,
  canUndo,
  saving,
  className = '',
}: RecipeEditSaveBarProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur border-t border-gray-800 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          {hasChanges ? 'Unsaved changes' : 'All changes saved'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo || saving}
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-zinc-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↶ Undo
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={onSave}
            disabled={saving}
            variant="primary"
            size="sm"
            isLoading={saving}
            className="px-5"
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </Button>
        </div>
      </div>
    </div>
  )
}
