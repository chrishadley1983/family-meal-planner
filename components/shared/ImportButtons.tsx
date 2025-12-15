'use client'

import { Link, Camera } from 'lucide-react'

interface ImportButtonsProps {
  onUrlClick: () => void
  onPhotoClick: () => void
}

/**
 * Import URL and Import Photo buttons
 * Shared component for Inventory and Staples modals
 * Full width buttons with icons
 */
export function ImportButtons({ onUrlClick, onPhotoClick }: ImportButtonsProps) {
  return (
    <div className="flex gap-3 mb-4">
      <button
        type="button"
        onClick={onUrlClick}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-700 transition-colors"
      >
        <Link className="w-4 h-4" />
        Import URL
      </button>
      <button
        type="button"
        onClick={onPhotoClick}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-700 transition-colors"
      >
        <Camera className="w-4 h-4" />
        Import Photo
      </button>
    </div>
  )
}
