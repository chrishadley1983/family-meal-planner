/**
 * Shared types for Import URL/Photo modals
 * Used by both Inventory and Staples pages
 */

import type { StorageLocation } from '@/lib/types/inventory'
import type { StapleFrequency } from '@/lib/types/staples'

// Base extracted item type - common fields
export interface BaseExtractedItem {
  itemName: string
  quantity: number
  unit: string
  category?: string
  confidence?: 'high' | 'medium' | 'low'
  selected: boolean
}

// Inventory-specific extracted item
export interface ExtractedInventoryItem extends BaseExtractedItem {
  location?: StorageLocation
  expiryDate?: string
  expiryDays?: number
}

// Staple-specific extracted item
export interface ExtractedStapleItem extends BaseExtractedItem {
  frequency?: StapleFrequency
}

// Union type for all extracted items
export type ExtractedItem = ExtractedInventoryItem | ExtractedStapleItem

// Import type configuration
export interface ImportConfig {
  type: 'inventory' | 'staple'
  apiEndpoint: string
  itemLabel: string
  itemLabelPlural: string
}

// Props for URL/Photo modals
export interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (count: number) => void
  config: ImportConfig
  categories: Array<{ id?: string; name: string }>
}

// Inventory import config
export const INVENTORY_CONFIG: ImportConfig = {
  type: 'inventory',
  apiEndpoint: '/api/inventory',
  itemLabel: 'item',
  itemLabelPlural: 'items',
}

// Staple import config
export const STAPLE_CONFIG: ImportConfig = {
  type: 'staple',
  apiEndpoint: '/api/staples',
  itemLabel: 'staple',
  itemLabelPlural: 'staples',
}
