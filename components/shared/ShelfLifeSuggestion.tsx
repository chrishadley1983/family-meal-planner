'use client'

import type { ShelfLifeSeedItem } from '@/lib/inventory'
import { STORAGE_LOCATION_LABELS } from '@/lib/types/inventory'

interface ShelfLifeSuggestionProps {
  suggestion: ShelfLifeSeedItem | null
  onApply: () => void
  /** Show frequency suggestion (for staples) */
  showFrequency?: boolean
  /** Suggested frequency based on shelf life (for staples) */
  suggestedFrequency?: string
  /** Show expiry date calculation (for inventory) */
  showExpiryCalculation?: boolean
  /** Calculated expiry date (for inventory) */
  calculatedExpiryDate?: string
}

/**
 * AI Shelf Life Suggestion Box
 * Shows matched ingredient info and allows applying suggestions to form
 * Shared between Inventory and Staples add modals
 */
export function ShelfLifeSuggestion({
  suggestion,
  onApply,
  showFrequency = false,
  suggestedFrequency,
  showExpiryCalculation = false,
  calculatedExpiryDate,
}: ShelfLifeSuggestionProps) {
  if (!suggestion) return null

  return (
    <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-600/50">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-blue-300">
            Matched: <span className="font-medium">{suggestion.ingredientName}</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Typical shelf life: {suggestion.shelfLifeDays} days
            {suggestion.defaultLocation && (
              <> | Store in: {STORAGE_LOCATION_LABELS[suggestion.defaultLocation]}</>
            )}
            {suggestion.category && (
              <> | Category: {suggestion.category}</>
            )}
          </p>

          {/* Show frequency for staples */}
          {showFrequency && suggestedFrequency && (
            <p className="text-xs text-zinc-400 mt-1">
              Suggested frequency: {suggestedFrequency}
            </p>
          )}

          {/* Show expiry calculation for inventory */}
          {showExpiryCalculation && calculatedExpiryDate && (
            <p className="text-xs text-zinc-400 mt-1">
              Suggested expiry: {calculatedExpiryDate}
            </p>
          )}

          {suggestion.notes && (
            <p className="text-xs text-zinc-500 mt-1 italic">{suggestion.notes}</p>
          )}

          <button
            type="button"
            onClick={onApply}
            className="mt-2 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Apply Suggestions
          </button>
        </div>
      </div>
    </div>
  )
}
