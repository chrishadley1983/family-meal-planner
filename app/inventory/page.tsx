'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useAILoading } from '@/components/providers/AILoadingProvider'
import { COMMON_UNITS, DEFAULT_CATEGORIES } from '@/lib/unit-conversion'
import {
  enrichInventoryItemWithExpiry,
  filterInventoryItems,
  sortByExpiryPriority,
  sortInventoryItems,
  getUniqueCategories,
  formatDaysUntilExpiry,
  formatExpiryDate,
  getInventoryStats,
  calculateExpiryFromShelfLife,
} from '@/lib/inventory/expiry-calculations'
import {
  checkForDuplicates,
  suggestMergedQuantity,
  SHELF_LIFE_SEED_DATA,
} from '@/lib/inventory'
import type { DuplicateCheckResult, ShelfLifeSeedItem } from '@/lib/inventory'
import type {
  InventoryItem,
  InventoryItemWithExpiry,
  InventoryFilters,
  InventorySortField,
  InventorySortOptions,
  ExpiryStatus,
  StorageLocation,
  InventorySettings,
} from '@/lib/types/inventory'
import {
  STORAGE_LOCATIONS,
  EXPIRY_STATUS_LABELS,
  EXPIRY_STATUS_COLORS,
  STORAGE_LOCATION_LABELS,
  DEFAULT_INVENTORY_SETTINGS,
} from '@/lib/types/inventory'

// Raw item from API
interface RawInventoryItem {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: StorageLocation | null
  purchaseDate: string
  expiryDate: string | null
  expiryIsEstimated: boolean
  isActive: boolean
  addedBy: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Shopping list category from API
interface ShoppingListCategory {
  id: string
  name: string
  displayOrder: number
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const { startLoading, stopLoading } = useAILoading()
  const [rawItems, setRawItems] = useState<RawInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<ShoppingListCategory[]>([])

  // Filters state
  const [filters, setFilters] = useState<InventoryFilters>({})
  const [sortOptions, setSortOptions] = useState<InventorySortOptions>({
    field: 'expiryDate',
    order: 'asc',
  })

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    location: '' as StorageLocation | '',
    expiryDate: '',
    isActive: true,
    notes: '',
  })

  // Edit form state
  const [editingItem, setEditingItem] = useState<InventoryItemWithExpiry | null>(null)
  const [editFormData, setEditFormData] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    location: '' as StorageLocation | '',
    expiryDate: '',
    isActive: true,
    notes: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Duplicate detection state
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null)
  const [shelfLifeSuggestion, setShelfLifeSuggestion] = useState<ShelfLifeSeedItem | null>(null)
  const [showMergeOption, setShowMergeOption] = useState(false)

  // CSV import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    autoExpiry: true,
    autoCategory: true,
    autoLocation: true,
  })
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  // Photo import state
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoImages, setPhotoImages] = useState<string[]>([])
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [extractedItems, setExtractedItems] = useState<Array<{
    itemName: string
    quantity: number
    unit: string
    category?: string
    location?: string
    confidence?: string
    selected: boolean
  }>>([])
  const [photoSummary, setPhotoSummary] = useState('')
  const [importingPhoto, setImportingPhoto] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settings, setSettings] = useState<Partial<InventorySettings>>(DEFAULT_INVENTORY_SETTINGS)
  const [savingSettings, setSavingSettings] = useState(false)

  // Enrich items with expiry status
  const items = useMemo(() => {
    return rawItems.map(item => enrichInventoryItemWithExpiry({
      ...item,
      purchaseDate: new Date(item.purchaseDate),
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    } as InventoryItem))
  }, [rawItems])

  // Apply filters and sorting
  const filteredAndSortedItems = useMemo(() => {
    let result = filterInventoryItems(items, filters)

    // Default sort: by expiry priority
    if (sortOptions.field === 'expiryDate' && sortOptions.order === 'asc') {
      result = sortByExpiryPriority(result)
    } else {
      result = sortInventoryItems(result, sortOptions)
    }

    return result
  }, [items, filters, sortOptions])

  // Get unique categories from items
  const itemCategories = useMemo(() => getUniqueCategories(items), [items])

  // Get stats
  const stats = useMemo(() => getInventoryStats(items), [items])

  useEffect(() => {
    fetchItems()
    fetchCategories()
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      console.log('🔷 Fetching inventory settings...')
      const response = await fetch('/api/inventory/settings')
      const data = await response.json()
      console.log('🟢 Settings fetched:', data.settings)
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('❌ Error fetching settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      console.log('🔷 Saving inventory settings:', settings)
      const response = await fetch('/api/inventory/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipInventoryCheck: settings.skipInventoryCheck,
          smallQuantityThresholdGrams: settings.smallQuantityThresholdGrams,
          smallQuantityThresholdMl: settings.smallQuantityThresholdMl,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      console.log('🟢 Settings saved:', data.settings)
      setSettings(data.settings)
      setShowSettingsModal(false)
    } catch (error) {
      console.error('❌ Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const fetchCategories = async () => {
    try {
      console.log('🔷 Fetching shopping list categories...')
      const response = await fetch('/api/shopping-lists/categories')
      const data = await response.json()
      console.log('🟢 Categories fetched:', data.categories?.length || 0)
      setCategories(data.categories || [])
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
    }
  }

  const fetchItems = async () => {
    try {
      console.log('🔷 Fetching inventory items...')
      const response = await fetch('/api/inventory')
      const data = await response.json()
      console.log('🟢 Items fetched:', data.items?.length || 0)
      setRawItems(data.items || [])
    } catch (error) {
      console.error('❌ Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  // Look up shelf life data for item name
  const lookupShelfLife = (itemName: string): ShelfLifeSeedItem | null => {
    if (!itemName || itemName.length < 2) return null

    const normalizedInput = itemName.toLowerCase().trim()

    // Try exact match first
    const exactMatch = SHELF_LIFE_SEED_DATA.find(
      item => item.ingredientName.toLowerCase() === normalizedInput
    )
    if (exactMatch) return exactMatch

    // Try partial match (input contains reference or vice versa)
    const partialMatch = SHELF_LIFE_SEED_DATA.find(item => {
      const refLower = item.ingredientName.toLowerCase()
      return normalizedInput.includes(refLower) || refLower.includes(normalizedInput)
    })
    if (partialMatch) return partialMatch

    // Try word-based matching
    const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2)
    const wordMatch = SHELF_LIFE_SEED_DATA.find(item => {
      const refWords = item.ingredientName.toLowerCase().split(/\s+/)
      return inputWords.some(iw => refWords.some(rw => rw.includes(iw) || iw.includes(rw)))
    })

    return wordMatch || null
  }

  // Handle item name change with duplicate detection and shelf life lookup
  const handleItemNameChange = (value: string) => {
    setNewItem({ ...newItem, itemName: value })

    // Check for duplicates
    if (value.length >= 2) {
      const check = checkForDuplicates(value, items, {
        category: newItem.category || undefined,
        location: newItem.location || undefined,
      })
      setDuplicateCheck(check)
      setShowMergeOption(check.isDuplicate && check.matchingItems.length > 0)
      console.log('🔄 Duplicate check:', check.isDuplicate ? `Found ${check.matchingItems.length} match(es)` : 'No duplicates')
    } else {
      setDuplicateCheck(null)
      setShowMergeOption(false)
    }

    // Look up shelf life
    const shelfLife = lookupShelfLife(value)
    setShelfLifeSuggestion(shelfLife)
    if (shelfLife) {
      console.log('🔄 Shelf life suggestion:', shelfLife.ingredientName, shelfLife.shelfLifeDays, 'days')
    }
  }

  // Apply shelf life suggestion to form
  const applyShelfLifeSuggestion = () => {
    if (!shelfLifeSuggestion) return

    const updates: Partial<typeof newItem> = {}

    // Set category if not already set
    if (!newItem.category && shelfLifeSuggestion.category) {
      updates.category = shelfLifeSuggestion.category
    }

    // Set location if not already set
    if (!newItem.location && shelfLifeSuggestion.defaultLocation) {
      updates.location = shelfLifeSuggestion.defaultLocation
    }

    // Calculate and set expiry date
    const expiryDate = calculateExpiryFromShelfLife(new Date(), shelfLifeSuggestion.shelfLifeDays)
    updates.expiryDate = expiryDate.toISOString().split('T')[0]

    setNewItem({ ...newItem, ...updates })
    console.log('⚡ Applied shelf life suggestion:', updates)
  }

  // Handle merge with existing item
  const handleMergeWithExisting = async (existingItem: InventoryItemWithExpiry) => {
    const mergeResult = suggestMergedQuantity(
      existingItem.quantity,
      newItem.quantity,
      existingItem.unit,
      newItem.unit
    )

    if (!mergeResult.canMerge) {
      alert(`Cannot merge: Different units (${existingItem.unit} vs ${newItem.unit}). Please convert manually or add as new item.`)
      return
    }

    try {
      console.log('🔷 Merging with existing item:', existingItem.itemName)
      const response = await fetch(`/api/inventory?id=${existingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: mergeResult.quantity,
          // Update expiry date if new one is sooner (FIFO)
          ...(newItem.expiryDate && (!existingItem.expiryDate ||
            new Date(newItem.expiryDate) < existingItem.expiryDate) && {
            expiryDate: newItem.expiryDate,
          }),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to merge items')
      }

      const data = await response.json()
      console.log('🟢 Merged successfully. New quantity:', mergeResult.quantity)
      setRawItems(rawItems.map(i => i.id === existingItem.id ? data.item : i))

      // Reset form
      setNewItem({
        itemName: '',
        quantity: 1,
        unit: '',
        category: '',
        location: '',
        expiryDate: '',
        isActive: true,
        notes: '',
      })
      setShowAddForm(false)
      setDuplicateCheck(null)
      setShelfLifeSuggestion(null)
      setShowMergeOption(false)
    } catch (error) {
      console.error('❌ Error merging items:', error)
      alert('Failed to merge items')
    }
  }

  // Handle CSV import
  const handleImportCSV = async () => {
    if (!csvText.trim() || importing) return

    setImporting(true)
    setImportResult(null)

    try {
      console.log('🔷 Importing CSV...')
      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const data = await response.json()
      console.log('🟢 Import complete:', data.results)

      setImportResult(data.results)
      setRawItems(data.items)

      // Clear CSV text on success
      if (data.results.imported > 0) {
        setCsvText('')
      }
    } catch (error) {
      console.error('❌ Error importing CSV:', error)
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      })
    } finally {
      setImporting(false)
    }
  }

  // Handle file upload for CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  // Handle photo file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve(event.target?.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    Promise.all(Array.from(files).map(readFile)).then(images => {
      setPhotoImages(prev => [...prev, ...images])
      setExtractedItems([])
      setPhotoSummary('')
    })
  }

  // Analyze photos with AI
  const handleAnalyzePhoto = async () => {
    if (photoImages.length === 0 || analyzingPhoto) return

    setAnalyzingPhoto(true)
    setExtractedItems([])
    setPhotoSummary('')
    startLoading('Analyzing inventory photos...')

    try {
      console.log('🔷 Analyzing', photoImages.length, 'photo(s)...')
      const response = await fetch('/api/inventory/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photoImages }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      console.log('🟢 Extracted', data.items?.length || 0, 'items')

      setExtractedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: true,
        }))
      )
      setPhotoSummary(data.summary || '')
    } catch (error) {
      console.error('❌ Error analyzing photo:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze photo')
    } finally {
      setAnalyzingPhoto(false)
      stopLoading()
    }
  }

  // Import extracted items from photo
  const handleImportPhotoItems = async () => {
    const selectedItems = extractedItems.filter(i => i.selected)
    if (selectedItems.length === 0 || importingPhoto) return

    setImportingPhoto(true)

    try {
      console.log('🔷 Importing', selectedItems.length, 'items from photo...')
      const response = await fetch('/api/inventory/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems,
          options: { autoExpiry: true },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const data = await response.json()
      console.log('🟢 Imported', data.imported, 'items')

      setRawItems(data.items)
      setShowPhotoModal(false)
      setPhotoImages([])
      setExtractedItems([])
      setPhotoSummary('')
    } catch (error) {
      console.error('❌ Error importing items:', error)
      alert(error instanceof Error ? error.message : 'Failed to import items')
    } finally {
      setImportingPhoto(false)
    }
  }

  // Toggle item selection in photo import
  const togglePhotoItemSelection = (index: number) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // Remove a photo
  const removePhoto = (index: number) => {
    setPhotoImages(prev => prev.filter((_, i) => i !== index))
    setExtractedItems([])
    setPhotoSummary('')
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addingItem) return

    setAddingItem(true)
    try {
      console.log('🔷 Creating inventory item:', newItem.itemName)
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          location: newItem.location || null,
          expiryDate: newItem.expiryDate || null,
          notes: newItem.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create item')
      }

      const data = await response.json()
      console.log('🟢 Created item:', data.item.itemName)
      setRawItems([...rawItems, data.item])
      setNewItem({
        itemName: '',
        quantity: 1,
        unit: '',
        category: '',
        location: '',
        expiryDate: '',
        isActive: true,
        notes: '',
      })
      setShowAddForm(false)
      setDuplicateCheck(null)
      setShelfLifeSuggestion(null)
      setShowMergeOption(false)
    } catch (error) {
      console.error('❌ Error creating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to create item')
    } finally {
      setAddingItem(false)
    }
  }

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"? This cannot be undone.`)) return

    try {
      console.log('🔷 Deleting item:', itemName)
      const response = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      console.log('🟢 Item deleted')
      setRawItems(rawItems.filter(i => i.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error) {
      console.error('❌ Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleToggleActive = async (item: InventoryItemWithExpiry) => {
    try {
      console.log('🔷 Toggling active status for:', item.itemName)
      const response = await fetch(`/api/inventory?id=${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      const data = await response.json()
      console.log('🟢 Item updated:', data.item.isActive ? 'Active' : 'Inactive')
      setRawItems(rawItems.map(i => i.id === item.id ? data.item : i))
    } catch (error) {
      console.error('❌ Error updating item:', error)
      alert('Failed to update item')
    }
  }

  const handleEditClick = (item: InventoryItemWithExpiry) => {
    setEditingItem(item)
    setEditFormData({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      location: item.location || '',
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : '',
      isActive: item.isActive,
      notes: item.notes || '',
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || savingEdit) return

    setSavingEdit(true)
    try {
      console.log('🔷 Updating item:', editFormData.itemName)
      const response = await fetch(`/api/inventory?id=${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          location: editFormData.location || null,
          expiryDate: editFormData.expiryDate || null,
          notes: editFormData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
      }

      const data = await response.json()
      console.log('🟢 Updated item:', data.item.itemName)
      setRawItems(rawItems.map(i => i.id === editingItem.id ? data.item : i))
      setEditingItem(null)
    } catch (error) {
      console.error('❌ Error updating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to update item')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSortChange = (field: InventorySortField) => {
    if (sortOptions.field === field) {
      setSortOptions({
        field,
        order: sortOptions.order === 'asc' ? 'desc' : 'asc',
      })
    } else {
      setSortOptions({ field, order: 'asc' })
    }
  }

  const getSortIcon = (field: InventorySortField) => {
    if (sortOptions.field !== field) return null
    return sortOptions.order === 'asc' ? ' ↑' : ' ↓'
  }

  const getExpiryStatusBadge = (status: ExpiryStatus, daysUntilExpiry: number | null, isEstimated: boolean) => {
    const colors = EXPIRY_STATUS_COLORS[status]
    const label = EXPIRY_STATUS_LABELS[status]

    if (status === 'fresh' && daysUntilExpiry === null) {
      return null
    }

    return (
      <Badge
        variant={status === 'expired' ? 'error' : status === 'expiring_soon' ? 'warning' : 'success'}
        size="sm"
      >
        {label}
        {isEstimated && ' (Est.)'}
      </Badge>
    )
  }

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(i => i.id)))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected items? This cannot be undone.`)) return

    try {
      console.log('🔷 Bulk deleting', selectedIds.size, 'items')
      for (const id of selectedIds) {
        await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
      }
      console.log('🟢 Bulk delete complete')
      setRawItems(rawItems.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('❌ Error in bulk delete:', error)
      alert('Failed to delete some items')
    }
  }

  const handleBulkMarkInactive = async () => {
    if (selectedIds.size === 0) return

    try {
      console.log('🔷 Marking', selectedIds.size, 'items as inactive')
      const updatedItems: RawInventoryItem[] = []
      for (const id of selectedIds) {
        const response = await fetch(`/api/inventory?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        })
        if (response.ok) {
          const data = await response.json()
          updatedItems.push(data.item)
        }
      }
      console.log('🟢 Bulk update complete')
      setRawItems(rawItems.map(i => {
        const updated = updatedItems.find(u => u.id === i.id)
        return updated || i
      }))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('❌ Error in bulk update:', error)
      alert('Failed to update some items')
    }
  }

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Inventory"
        description="Track your food items and expiry dates"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowSettingsModal(true)} variant="secondary">
              Settings
            </Button>
            <Button onClick={() => setShowPhotoModal(true)} variant="secondary">
              Photo Import
            </Button>
            <Button onClick={() => setShowImportModal(true)} variant="secondary">
              CSV Import
            </Button>
            <Button onClick={() => setShowAddForm(true)} variant="primary">
              Add Item
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Category:</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                {itemCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Location:</label>
              <select
                value={filters.location || ''}
                onChange={(e) => setFilters({ ...filters, location: e.target.value as StorageLocation || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                {STORAGE_LOCATIONS.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Expiry:</label>
              <select
                value={filters.expiryStatus || ''}
                onChange={(e) => setFilters({ ...filters, expiryStatus: e.target.value as ExpiryStatus || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="fresh">Fresh</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Status:</label>
              <select
                value={filters.isActive === undefined ? '' : filters.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters({
                    ...filters,
                    isActive: value === '' ? undefined : value === 'active',
                  })
                }}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {(filters.category || filters.location || filters.expiryStatus || filters.isActive !== undefined) && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-zinc-400">Total Items</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.fresh}</div>
            <div className="text-sm text-zinc-400">Fresh</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.expiringSoon}</div>
            <div className="text-sm text-zinc-400">Expiring Soon</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
            <div className="text-sm text-zinc-400">Expired</div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="card p-4 mb-6 bg-purple-900/20 border-purple-500/50">
            <div className="flex items-center justify-between">
              <span className="text-white">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
              <div className="flex gap-2">
                <Button onClick={handleBulkMarkInactive} variant="secondary" size="sm">
                  Mark Inactive
                </Button>
                <Button onClick={handleBulkDelete} variant="danger" size="sm">
                  Delete Selected
                </Button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-sm text-zinc-400 hover:text-white ml-2"
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No items in inventory</h3>
            <p className="text-zinc-400 mb-6">
              Track your food items to reduce waste and know what you have on hand.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowAddForm(true)} variant="primary">
                Add Item
              </Button>
            </div>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="card p-12 text-center">
            <h3 className="text-lg font-medium text-white mb-2">No items match your filters</h3>
            <p className="text-zinc-400 mb-4">Try adjusting your filter criteria</p>
            <button
              onClick={() => setFilters({})}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Inventory Table */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('itemName')}
                    >
                      Name{getSortIcon('itemName')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Qty
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('category')}
                    >
                      Category{getSortIcon('category')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Location
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('expiryDate')}
                    >
                      Expiry{getSortIcon('expiryDate')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredAndSortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-800/30 ${!item.isActive ? 'opacity-50' : ''} ${
                        item.expiryStatus === 'expired' ? 'bg-red-900/10' :
                        item.expiryStatus === 'expiring_soon' ? 'bg-yellow-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{item.itemName}</span>
                          {getExpiryStatusBadge(item.expiryStatus, item.daysUntilExpiry, item.expiryIsEstimated)}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.location ? STORAGE_LOCATION_LABELS[item.location] : <span className="text-zinc-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <div className="flex flex-col">
                          <span className={
                            item.expiryStatus === 'expired' ? 'text-red-400' :
                            item.expiryStatus === 'expiring_soon' ? 'text-yellow-400' : ''
                          }>
                            {formatExpiryDate(item.expiryDate, item.expiryIsEstimated)}
                          </span>
                          {item.daysUntilExpiry !== null && (
                            <span className="text-xs text-zinc-500">
                              {formatDaysUntilExpiry(item.daysUntilExpiry)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            item.isActive
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-purple-400 hover:text-purple-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.itemName)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        <Modal
          isOpen={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setDuplicateCheck(null)
            setShelfLifeSuggestion(null)
            setShowMergeOption(false)
          }}
          title="Add Inventory Item"
          maxWidth="md"
        >
          <form onSubmit={handleAddItem} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newItem.itemName}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  placeholder="e.g., Milk"
                />
              </div>
            </div>

            {/* Duplicate Warning */}
            {duplicateCheck?.isDuplicate && showMergeOption && (
              <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-600/50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-300 font-medium">
                      Similar item{duplicateCheck.matchingItems.length > 1 ? 's' : ''} found in inventory
                    </p>
                    <div className="mt-2 space-y-2">
                      {duplicateCheck.matchingItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded">
                          <span className="text-sm text-zinc-200">
                            {item.itemName} - {item.quantity} {item.unit}
                            {item.location && ` (${STORAGE_LOCATION_LABELS[item.location]})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMergeWithExisting(item)}
                            className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded"
                          >
                            Merge (+{newItem.quantity})
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                      Or continue to add as a new item
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Shelf Life Suggestion */}
            {shelfLifeSuggestion && !duplicateCheck?.isDuplicate && (
              <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-600/50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-300">
                      Matched: <span className="font-medium">{shelfLifeSuggestion.ingredientName}</span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Typical shelf life: {shelfLifeSuggestion.shelfLifeDays} days
                      {shelfLifeSuggestion.defaultLocation && (
                        <> | Store in: {STORAGE_LOCATION_LABELS[shelfLifeSuggestion.defaultLocation]}</>
                      )}
                      {shelfLifeSuggestion.category && (
                        <> | Category: {shelfLifeSuggestion.category}</>
                      )}
                    </p>
                    {shelfLifeSuggestion.notes && (
                      <p className="text-xs text-zinc-500 mt-1 italic">{shelfLifeSuggestion.notes}</p>
                    )}
                    <button
                      type="button"
                      onClick={applyShelfLifeSuggestion}
                      className="mt-2 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Apply Suggestions
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select category...</option>
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Location
                </label>
                <select
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value as StorageLocation | '' })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select location...</option>
                  {STORAGE_LOCATIONS.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Quantity *
                </label>
                <Input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Unit *
                </label>
                <select
                  required
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select unit...</option>
                  {COMMON_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Notes
              </label>
              <Input
                type="text"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => {
                setShowAddForm(false)
                setDuplicateCheck(null)
                setShelfLifeSuggestion(null)
                setShowMergeOption(false)
              }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={addingItem}>
                {addingItem ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title="Edit Inventory Item"
          maxWidth="md"
        >
          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  required
                  value={editFormData.itemName}
                  onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select category...</option>
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Quantity *
                </label>
                <Input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Unit *
                </label>
                <select
                  required
                  value={editFormData.unit}
                  onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select unit...</option>
                  {COMMON_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Location
                </label>
                <select
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value as StorageLocation | '' })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select location...</option>
                  {STORAGE_LOCATIONS.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={editFormData.expiryDate}
                  onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Notes
              </label>
              <Input
                type="text"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
              />
              <label htmlFor="editIsActive" className="text-sm text-zinc-300">
                Active (appears in inventory checks)
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Import CSV Modal */}
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false)
            setImportResult(null)
          }}
          title="Import from CSV"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4">
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-sm text-zinc-300 font-medium mb-2">CSV Format</p>
              <p className="text-xs text-zinc-400 mb-2">
                Your CSV should have these columns (headers are flexible):
              </p>
              <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
                <li><strong>Item Name</strong> - Required. The name of the item (e.g., &quot;Milk&quot;, &quot;Chicken Breast&quot;)</li>
                <li><strong>Quantity</strong> - Optional. Defaults to 1</li>
                <li><strong>Unit</strong> - Optional. Defaults to &quot;each&quot; (e.g., &quot;g&quot;, &quot;ml&quot;, &quot;kg&quot;)</li>
                <li><strong>Category</strong> - Optional. Auto-detected from shelf life data</li>
                <li><strong>Location</strong> - Optional. &quot;fridge&quot;, &quot;freezer&quot;, &quot;cupboard&quot;, or &quot;pantry&quot;</li>
                <li><strong>Expiry Date</strong> - Optional. YYYY-MM-DD format, or auto-calculated</li>
                <li><strong>Notes</strong> - Optional</li>
              </ul>
              <p className="text-xs text-zinc-500 mt-2">
                Example: <code className="bg-zinc-700 px-1 rounded">Item,Quantity,Unit,Location</code>
              </p>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              />
            </div>

            {/* Or paste CSV */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Or Paste CSV Content
              </label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value)
                  setImportResult(null)
                }}
                placeholder="Item,Quantity,Unit,Category,Location&#10;Milk,2,litres,Dairy & Eggs,fridge&#10;Chicken Breast,500,g,Meat & Fish,fridge"
                rows={8}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Import options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">Import Options</p>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={importOptions.skipDuplicates}
                  onChange={(e) => setImportOptions({ ...importOptions, skipDuplicates: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                Skip duplicates (items with same name already in inventory)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={importOptions.autoExpiry}
                  onChange={(e) => setImportOptions({ ...importOptions, autoExpiry: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                Auto-calculate expiry dates from shelf life data
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={importOptions.autoCategory}
                  onChange={(e) => setImportOptions({ ...importOptions, autoCategory: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                Auto-detect category from shelf life data
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={importOptions.autoLocation}
                  onChange={(e) => setImportOptions({ ...importOptions, autoLocation: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                Auto-suggest storage location from shelf life data
              </label>
            </div>

            {/* Import result */}
            {importResult && (
              <div className={`p-3 rounded-lg ${
                importResult.errors.length > 0
                  ? 'bg-red-900/30 border border-red-600/50'
                  : 'bg-green-900/30 border border-green-600/50'
              }`}>
                <div className="flex items-start gap-2">
                  {importResult.errors.length > 0 ? (
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      importResult.errors.length > 0 ? 'text-red-300' : 'text-green-300'
                    }`}>
                      {importResult.imported > 0
                        ? `Successfully imported ${importResult.imported} item${importResult.imported !== 1 ? 's' : ''}`
                        : 'No items imported'}
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {importResult.skipped} duplicate{importResult.skipped !== 1 ? 's' : ''} skipped
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <ul className="text-xs text-red-400 mt-1 list-disc list-inside">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
              >
                {importResult && importResult.imported > 0 ? 'Done' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImportCSV}
                variant="primary"
                disabled={!csvText.trim() || importing}
              >
                {importing ? 'Importing...' : 'Import Items'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Photo Import Modal */}
        <Modal
          isOpen={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false)
            setPhotoImages([])
            setExtractedItems([])
            setPhotoSummary('')
          }}
          title="Import from Photo"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4">
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-sm text-zinc-300 font-medium mb-2">Photo Recognition</p>
              <p className="text-xs text-zinc-400">
                Upload photos of your groceries, fridge contents, or receipts. Our AI will identify items and suggest inventory entries.
              </p>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Upload Photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              />
            </div>

            {/* Photo previews */}
            {photoImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-300">
                  {photoImages.length} photo{photoImages.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {photoImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={img}
                        alt={`Photo ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleAnalyzePhoto}
                  variant="secondary"
                  disabled={analyzingPhoto}
                >
                  {analyzingPhoto ? 'Analyzing...' : 'Analyze Photos'}
                </Button>
              </div>
            )}

            {/* Analyzing indicator */}
            {analyzingPhoto && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
                <span className="text-zinc-300">AI is analyzing your photos...</span>
              </div>
            )}

            {/* Extracted items */}
            {extractedItems.length > 0 && (
              <div className="space-y-3">
                {photoSummary && (
                  <p className="text-sm text-green-400">{photoSummary}</p>
                )}
                <p className="text-sm font-medium text-zinc-300">
                  {extractedItems.length} items found - select which to import:
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {extractedItems.map((item, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        item.selected
                          ? 'bg-purple-900/30 border-purple-600/50'
                          : 'bg-zinc-800/50 border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => togglePhotoItemSelection(i)}
                        className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium">{item.itemName}</span>
                        <span className="text-zinc-400 text-sm ml-2">
                          {item.quantity} {item.unit}
                        </span>
                        {item.category && (
                          <span className="text-zinc-500 text-xs ml-2">({item.category})</span>
                        )}
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
                    </label>
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowPhotoModal(false)
                  setPhotoImages([])
                  setExtractedItems([])
                  setPhotoSummary('')
                }}
              >
                Cancel
              </Button>
              {extractedItems.length > 0 && (
                <Button
                  onClick={handleImportPhotoItems}
                  variant="primary"
                  disabled={importingPhoto || extractedItems.filter(i => i.selected).length === 0}
                >
                  {importingPhoto ? 'Importing...' : `Import ${extractedItems.filter(i => i.selected).length} Items`}
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* Inventory Settings Modal */}
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Inventory Settings"
          maxWidth="md"
        >
          <div className="p-6 space-y-6">
            {/* Skip Inventory Check Toggle */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label htmlFor="skipInventoryCheck" className="text-white font-medium">
                    Skip Inventory Check
                  </label>
                  <p className="text-sm text-zinc-400 mt-1">
                    When enabled, shopping lists will not check your inventory for existing items.
                    All recipe ingredients will be added to shopping lists without deductions.
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    id="skipInventoryCheck"
                    type="button"
                    role="switch"
                    aria-checked={settings.skipInventoryCheck}
                    onClick={() => setSettings({ ...settings, skipInventoryCheck: !settings.skipInventoryCheck })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-800 ${
                      settings.skipInventoryCheck ? 'bg-purple-600' : 'bg-zinc-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.skipInventoryCheck ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Small Quantity Thresholds */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <h3 className="text-white font-medium mb-2">Small Quantity Thresholds</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Items with quantities below these thresholds will be flagged during cooking deduction,
                allowing you to choose whether to remove them from inventory.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="thresholdGrams" className="block text-sm font-medium text-zinc-300 mb-1">
                    Weight (grams)
                  </label>
                  <Input
                    id="thresholdGrams"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settings.smallQuantityThresholdGrams ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdGrams}
                    onChange={(e) => setSettings({
                      ...settings,
                      smallQuantityThresholdGrams: parseFloat(e.target.value) || 0
                    })}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Default: {DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdGrams}g
                  </p>
                </div>
                <div>
                  <label htmlFor="thresholdMl" className="block text-sm font-medium text-zinc-300 mb-1">
                    Volume (ml)
                  </label>
                  <Input
                    id="thresholdMl"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settings.smallQuantityThresholdMl ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdMl}
                    onChange={(e) => setSettings({
                      ...settings,
                      smallQuantityThresholdMl: parseFloat(e.target.value) || 0
                    })}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Default: {DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdMl}ml
                  </p>
                </div>
              </div>
            </div>

            {/* Info about settings usage */}
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-600/50">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-300">
                  These settings affect how inventory is checked when importing meal plans to shopping lists
                  and when marking meals as cooked.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  fetchSettings() // Reset to saved values
                  setShowSettingsModal(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                variant="primary"
                disabled={savingSettings}
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  )
}
