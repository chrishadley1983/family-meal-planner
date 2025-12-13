'use client'

import { useState } from 'react'
import { Button, Input, Modal, Badge } from '@/components/ui'
import { useNotification } from '@/components/providers/NotificationProvider'
import { COMMON_UNITS } from '@/lib/unit-conversion'
import { STORAGE_LOCATIONS } from '@/lib/types/inventory'
import { STAPLE_FREQUENCIES } from '@/lib/types/staples'
import type { ImportModalProps, ExtractedInventoryItem, ExtractedStapleItem } from './import-types'

type ExtractedItem = ExtractedInventoryItem | ExtractedStapleItem

/**
 * Import from URL Modal
 * Shared component for Inventory and Staples import
 */
export function ImportUrlModal({
  isOpen,
  onClose,
  onImportComplete,
  config,
  categories,
}: ImportModalProps) {
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [importing, setImporting] = useState(false)
  const notification = useNotification()

  const handleClose = () => {
    setUrl('')
    setExtractedItems([])
    onClose()
  }

  const handleAnalyze = async () => {
    if (!url.trim() || analyzing) return

    setAnalyzing(true)
    setExtractedItems([])

    try {
      const endpoint = config.type === 'inventory'
        ? '/api/inventory/url'
        : '/api/staples/url'

      console.log(`🔷 Analyzing URL for ${config.itemLabelPlural}:`, url)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      console.log(`🟢 Extracted ${data.items?.length || 0} ${config.itemLabelPlural} from URL`)

      setExtractedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: true,
        }))
      )
    } catch (error) {
      console.error('❌ Error analyzing URL:', error)
      const errorMessage = error instanceof Error ? error.message : ''

      // Provide user-friendly messages based on the error
      if (errorMessage.includes('403')) {
        notification.error('This website blocked our request. Try Photo Import instead.')
      } else if (errorMessage.includes('404')) {
        notification.error('Page not found. Please check the URL and try again.')
      } else if (errorMessage.includes('Failed to fetch')) {
        notification.error("Couldn't access this URL. Please check the link or try Photo Import.")
      } else {
        notification.error("Couldn't analyze this page. Try Photo Import or add items manually.")
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImport = async () => {
    const selectedItems = extractedItems.filter(i => i.selected)
    if (selectedItems.length === 0 || importing) return

    setImporting(true)

    try {
      console.log(`🔷 Importing ${selectedItems.length} ${config.itemLabelPlural} from URL...`)

      let importedCount = 0
      for (const item of selectedItems) {
        const body = config.type === 'inventory'
          ? {
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category || 'Other',
              location: (item as ExtractedInventoryItem).location || null,
              expiryDate: (item as ExtractedInventoryItem).expiryDate || null,
              isActive: true,
              notes: null,
            }
          : {
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category || null,
              frequency: (item as ExtractedStapleItem).frequency || 'weekly',
              isActive: true,
              notes: null,
            }

        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          importedCount++
        }
      }

      console.log(`🟢 Imported ${importedCount} ${config.itemLabelPlural} from URL`)
      handleClose()
      onImportComplete(importedCount)
    } catch (error) {
      console.error(`❌ Error importing ${config.itemLabelPlural}:`, error)
      notification.error(`Couldn't import ${config.itemLabelPlural}. Please try again.`)
    } finally {
      setImporting(false)
    }
  }

  const toggleItemSelection = (index: number) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const updateItem = (index: number, field: string, value: any) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  const selectedCount = extractedItems.filter(i => i.selected).length

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import ${config.itemLabelPlural.charAt(0).toUpperCase() + config.itemLabelPlural.slice(1)} from URL`}
      maxWidth="lg"
    >
      <div className="p-6 space-y-4">
        {/* Instructions */}
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-sm text-zinc-300 font-medium mb-2">URL Import</p>
          <p className="text-xs text-zinc-400">
            Paste a URL to a shopping list, meal plan, or grocery list. Our AI will extract items
            {config.type === 'staple' && ' and suggest appropriate frequencies'}.
          </p>
        </div>

        {/* URL input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            URL
          </label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/shopping-list"
              className="flex-1"
            />
            <Button
              onClick={handleAnalyze}
              variant="secondary"
              disabled={!url.trim() || analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </div>

        {/* Analyzing indicator */}
        {analyzing && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
            <span className="text-zinc-300">AI is analyzing the URL...</span>
          </div>
        )}

        {/* Extracted items */}
        {extractedItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-300">
              {extractedItems.length} {config.itemLabelPlural} found - edit and select which to import:
            </p>
            <div className="max-h-80 overflow-y-auto space-y-3">
              {extractedItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.selected
                      ? 'bg-purple-900/30 border-purple-600/50'
                      : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemSelection(i)}
                      className="mt-2 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateItem(i, 'itemName', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="Item name"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-20 px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          min="0.01"
                          step="0.01"
                          placeholder="Qty"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(i, 'unit', e.target.value)}
                          className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">Unit...</option>
                          {COMMON_UNITS.map(unit => (
                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                          ))}
                        </select>

                        {/* Inventory-specific: Location */}
                        {config.type === 'inventory' && (
                          <select
                            value={(item as ExtractedInventoryItem).location || ''}
                            onChange={(e) => updateItem(i, 'location', e.target.value || null)}
                            className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Location...</option>
                            {STORAGE_LOCATIONS.map(loc => (
                              <option key={loc.value} value={loc.value}>{loc.label}</option>
                            ))}
                          </select>
                        )}

                        {/* Staple-specific: Frequency */}
                        {config.type === 'staple' && (
                          <select
                            value={(item as ExtractedStapleItem).frequency || 'weekly'}
                            onChange={(e) => updateItem(i, 'frequency', e.target.value)}
                            className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            {STAPLE_FREQUENCIES.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        )}

                        {/* Category */}
                        <select
                          value={item.category || ''}
                          onChange={(e) => updateItem(i, 'category', e.target.value)}
                          className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">Category...</option>
                          {categories.map(cat => (
                            <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {item.confidence && (
                      <Badge
                        variant={
                          item.confidence === 'high' ? 'success' :
                          item.confidence === 'medium' ? 'warning' : 'default'
                        }
                        size="sm"
                      >
                        {item.confidence}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <button
                type="button"
                onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: true })))}
                className="text-purple-400 hover:text-purple-300"
              >
                Select all
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: false })))}
                className="text-purple-400 hover:text-purple-300"
              >
                Deselect all
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={selectedCount === 0 || importing}
          >
            {importing
              ? 'Importing...'
              : `Import ${selectedCount} ${selectedCount !== 1 ? config.itemLabelPlural : config.itemLabel}`
            }
          </Button>
        </div>
      </div>
    </Modal>
  )
}
