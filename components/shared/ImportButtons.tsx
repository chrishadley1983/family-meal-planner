'use client'

import { Button } from '@/components/ui'

interface ImportButtonsProps {
  onUrlClick: () => void
  onPhotoClick: () => void
}

/**
 * Import URL and Import Photo buttons
 * Shared component for Inventory and Staples modals
 */
export function ImportButtons({ onUrlClick, onPhotoClick }: ImportButtonsProps) {
  return (
    <div className="flex gap-2 pb-2 border-b border-zinc-700">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onUrlClick}
      >
        Import URL
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onPhotoClick}
      >
        Import Photo
      </Button>
    </div>
  )
}
