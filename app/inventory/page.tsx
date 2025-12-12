'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import type {
  StorageLocation,
  ExpiryStatus,
  InventoryItemWithExpiry,
  InventoryFilters,
  InventorySortField,
  InventorySortOptions,
  InventoryStatistics,
  CSVInventoryImportSummary,
} from '@/lib/types/inventory'
import { STORAGE_LOCATIONS } from '@/lib/types/inventory'
import {
  enrichInventoryItemWithExpiry,
  sortByExpiryStatusPriority,
  sortInventoryItems,
  filterInventoryItems,
  calculateInventoryStatistics,
  formatExpiryStatus,
  formatDate,
  formatDateISO,
  getExpiryStatusColor,
  getExpiryStatusLabel,
  getLocationLabel,
  getUniqueCategories,
} from '@/lib/inventory/calculations'
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/inventory/csv-parser'
import { validateCSVData, getImportableItems, generateErrorReport } from '@/lib/inventory/csv-validator'
import { COMMON_UNITS, DEFAULT_CATEGORIES } from '@/lib/unit-conversion'

// Raw inventory item from API
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
  isUsedInPlannedMeal: boolean
  createdAt: string
  updatedAt: string
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const [rawItems, setRawItems] = useState<RawInventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filter and sort state
  const [filters, setFilters] = useState<InventoryFilters>({})
  const [sortOptions, setSortOptions] = useState<InventorySortOptions>({
    field: 'expiryDate',
    order: 'asc',
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

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
    notes: '',
    isActive: true,
  })

  // Edit form state
  const [editingItem, setEditingItem] = useState<InventoryItemWithExpiry | null>(null)
  const [editFormData, setEditFormData] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    location: '' as StorageLocation | '',
    purchaseDate: '',
    expiryDate: '',
    notes: '',
    isActive: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Bulk action modals
  const [showBulkExpiryModal, setShowBulkExpiryModal] = useState(false)
  const [bulkExpiryDate, setBulkExpiryDate] = useState('')
  const [processingBulk, setProcessingBulk] = useState(false)

  // Duplicate detection modal
  const [duplicateMatch, setDuplicateMatch] = useState<InventoryItemWithExpiry | null>(null)
  const [pendingNewItem, setPendingNewItem] = useState<typeof newItem | null>(null)

  // CSV Import state
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [csvSummary, setCsvSummary] = useState<CSVInventoryImportSummary | null>(null)
  const [importingCSV, setImportingCSV] = useState(false)
  const [csvFileName, setCsvFileName] = useState('')

  // Photo Import state
  const [showPhotoImport, setShowPhotoImport] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [extractedItems, setExtractedItems] = useState<Array<{
    name: string
    quantity: number
    unit: string
    suggestedCategory: string
    suggestedLocation: string | null
    expiryDate?: string
    calculatedExpiry?: Date
    expiryIsEstimated?: boolean
    confidence: 'high' | 'medium' | 'low'
    selected: boolean
  }>>([])
  const [photoProcessingNotes, setPhotoProcessingNotes] = useState<string | null>(null)
  const [importingPhoto, setImportingPhoto] = useState(false)

  // Enrich items with expiry status
  const items = useMemo(() => {
    return rawItems.map(item => enrichInventoryItemWithExpiry({
      ...item,
      purchaseDate: new Date(item.purchaseDate),
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }))
  }, [rawItems])

  // Apply filters and sorting
  const filteredAndSortedItems = useMemo(() => {
    // Apply search filter
    let result = items
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.itemName.toLowerCase().includes(query)
      )
    }

    // Apply other filters
    result = filterInventoryItems(result, filters)

    // Apply sorting - default to expiry status priority
    if (sortOptions.field === 'expiryDate' && sortOptions.order === 'asc') {
      result = sortByExpiryStatusPriority(result)
    } else {
      result = sortInventoryItems(result, sortOptions)
    }

    return result
  }, [items, filters, sortOptions, searchQuery])

  // Calculate statistics
  const stats = useMemo(() => calculateInventoryStatistics(items), [items])

  // Get unique categories from items
  const categories = useMemo(() => getUniqueCategories(items), [items])

  useEffect(() => {
    fetchItems()
  }, [])

  // Update selectAll when selection changes
  useEffect(() => {
    if (filteredAndSortedItems.length > 0 && selectedIds.size === filteredAndSortedItems.length) {
      setSelectAll(true)
    } else {
      setSelectAll(false)
    }
  }, [selectedIds, filteredAndSortedItems])

  const fetchItems = async () => {
    try {
      console.log('🔷 Fetching inventory...')
      const response = await fetch('/api/inventory')
      const data = await response.json()
      console.log('🟢 Inventory fetched:', data.items?.length || 0)
      setRawItems(data.items || [])
    } catch (error) {
      console.error('❌ Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check for duplicates before adding
  const checkForDuplicates = (itemName: string): InventoryItemWithExpiry | null => {
    const normalizedName = itemName.toLowerCase().trim()
    return items.find(item =>
      item.isActive && item.itemName.toLowerCase().trim() === normalizedName
    ) || null
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addingItem) return

    // Check for duplicates
    const duplicate = checkForDuplicates(newItem.itemName)
    if (duplicate) {
      setDuplicateMatch(duplicate)
      setPendingNewItem(newItem)
      return
    }

    await createItem(newItem)
  }

  const createItem = async (itemData: typeof newItem) => {
    setAddingItem(true)
    try {
      console.log('🔷 Creating inventory item:', itemData.itemName)
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemData,
          location: itemData.location || null,
          expiryDate: itemData.expiryDate || null,
          notes: itemData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create item')
      }

      const data = await response.json()
      console.log('🟢 Created inventory item:', data.item.itemName)
      setRawItems([...rawItems, data.item])
      resetAddForm()
    } catch (error) {
      console.error('❌ Error creating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to create item')
    } finally {
      setAddingItem(false)
    }
  }

  const handleMergeWithExisting = async () => {
    if (!duplicateMatch || !pendingNewItem) return

    // Add to existing quantity
    const newQuantity = duplicateMatch.quantity + pendingNewItem.quantity

    setAddingItem(true)
    try {
      console.log('🔷 Merging with existing item:', duplicateMatch.itemName)
      const response = await fetch(`/api/inventory?id=${duplicateMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (!response.ok) {
        throw new Error('Failed to update item')
      }

      const data = await response.json()
      console.log('🟢 Merged item, new quantity:', newQuantity)
      setRawItems(rawItems.map(item => item.id === duplicateMatch.id ? data.item : item))
      resetAddForm()
      setDuplicateMatch(null)
      setPendingNewItem(null)
    } catch (error) {
      console.error('❌ Error merging item:', error)
      alert('Failed to merge items')
    } finally {
      setAddingItem(false)
    }
  }

  const handleCreateNewAnyway = async () => {
    if (!pendingNewItem) return
    setDuplicateMatch(null)
    await createItem(pendingNewItem)
    setPendingNewItem(null)
  }

  const resetAddForm = () => {
    setNewItem({
      itemName: '',
      quantity: 1,
      unit: '',
      category: '',
      location: '',
      expiryDate: '',
      notes: '',
      isActive: true,
    })
    setShowAddForm(false)
  }

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Remove "${itemName}" from inventory? This cannot be undone.`)) return

    try {
      console.log('🔷 Deleting inventory item:', itemName)
      const response = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      console.log('🟢 Item deleted')
      setRawItems(rawItems.filter(item => item.id !== id))
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
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
      purchaseDate: formatDateISO(item.purchaseDate),
      expiryDate: formatDateISO(item.expiryDate),
      notes: item.notes || '',
      isActive: item.isActive,
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || savingEdit) return

    setSavingEdit(true)
    try {
      console.log('🔷 Updating inventory item:', editFormData.itemName)
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
      console.log('🟢 Updated inventory item:', data.item.itemName)
      setRawItems(rawItems.map(item => item.id === editingItem.id ? data.item : item))
      setEditingItem(null)
    } catch (error) {
      console.error('❌ Error updating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to update item')
    } finally {
      setSavingEdit(false)
    }
  }

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(item => item.id)))
    }
  }

  const handleSelectItem = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) return

    setProcessingBulk(true)
    try {
      console.log('🔷 Bulk deleting', selectedIds.size, 'items')
      const response = await fetch('/api/inventory?bulk=delete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete items')
      }

      console.log('🟢 Bulk delete complete')
      setRawItems(rawItems.filter(item => !selectedIds.has(item.id)))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('❌ Error in bulk delete:', error)
      alert('Failed to delete some items')
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleBulkUpdateExpiry = async () => {
    if (selectedIds.size === 0 || !bulkExpiryDate) return

    setProcessingBulk(true)
    try {
      console.log('🔷 Bulk updating expiry for', selectedIds.size, 'items')
      const response = await fetch('/api/inventory?bulk=update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          expiryDate: bulkExpiryDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update items')
      }

      console.log('🟢 Bulk expiry update complete')
      // Refresh to get updated items
      await fetchItems()
      setSelectedIds(new Set())
      setShowBulkExpiryModal(false)
      setBulkExpiryDate('')
    } catch (error) {
      console.error('❌ Error in bulk update:', error)
      alert('Failed to update some items')
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleBulkMarkInactive = async () => {
    if (selectedIds.size === 0) return

    setProcessingBulk(true)
    try {
      console.log('🔷 Marking', selectedIds.size, 'items as inactive')
      const response = await fetch('/api/inventory?bulk=update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          isActive: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update items')
      }

      console.log('🟢 Bulk inactive update complete')
      await fetchItems()
      setSelectedIds(new Set())
    } catch (error) {
      console.error('❌ Error in bulk update:', error)
      alert('Failed to update some items')
    } finally {
      setProcessingBulk(false)
    }
  }

  // CSV Import handlers
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate()
    downloadCSV(template, 'inventory-import-template.csv')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
        console.log('🔷 Parsing CSV file:', file.name)
        const rows = parseCSV(content)
        const existingNames = items.filter(i => i.isActive).map(i => i.itemName)
        const summary = validateCSVData(rows, existingNames)
        console.log('🟢 CSV validation complete:', {
          total: summary.totalRows,
          valid: summary.validCount,
          warnings: summary.warningCount,
          errors: summary.errorCount,
        })
        setCsvSummary(summary)
      } catch (error) {
        console.error('❌ Error parsing CSV:', error)
        alert('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  const handleImportCSV = async () => {
    if (!csvSummary) return

    const itemsToImport = getImportableItems(csvSummary, true) // Include warnings
    if (itemsToImport.length === 0) {
      alert('No valid items to import')
      return
    }

    setImportingCSV(true)
    console.log('🔷 Importing', itemsToImport.length, 'items from CSV')

    let successCount = 0
    let errorCount = 0

    for (const item of itemsToImport) {
      try {
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            addedBy: 'CSV',
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          console.error('❌ Failed to import:', item.itemName)
        }
      } catch (error) {
        errorCount++
        console.error('❌ Error importing item:', item.itemName, error)
      }
    }

    console.log('🟢 CSV import complete:', { success: successCount, errors: errorCount })

    // Refresh inventory
    await fetchItems()

    // Reset state
    setShowCSVImport(false)
    setCsvSummary(null)
    setCsvFileName('')
    setImportingCSV(false)

    // Show result
    if (errorCount === 0) {
      alert(`Successfully imported ${successCount} items!`)
    } else {
      alert(`Imported ${successCount} items. ${errorCount} items failed to import.`)
    }
  }

  const handleResetCSVImport = () => {
    setCsvSummary(null)
    setCsvFileName('')
  }

  // Photo Import handlers
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG or PNG)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Please select an image under 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPhotoPreview(dataUrl)
      setExtractedItems([])
      setPhotoProcessingNotes(null)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzePhoto = async () => {
    if (!photoPreview) return

    setAnalyzingPhoto(true)
    setExtractedItems([])

    try {
      console.log('🔷 Sending photo for AI analysis...')
      const response = await fetch('/api/inventory/import-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: photoPreview }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze photo')
      }

      const data = await response.json()
      console.log('🟢 AI extracted', data.items?.length || 0, 'items')

      // Add selected flag to items (default to high/medium confidence)
      setExtractedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: item.confidence !== 'low',
        }))
      )
      setPhotoProcessingNotes(data.processingNotes)
    } catch (error) {
      console.error('❌ Error analyzing photo:', error)
      alert(error instanceof Error ? error.message : 'Failed to analyze photo')
    } finally {
      setAnalyzingPhoto(false)
    }
  }

  const handleToggleExtractedItem = (index: number) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const handleImportSelectedItems = async () => {
    const selectedItems = extractedItems.filter(item => item.selected)
    if (selectedItems.length === 0) {
      alert('Please select at least one item to import')
      return
    }

    setImportingPhoto(true)
    console.log('🔷 Importing', selectedItems.length, 'items from photo')

    let successCount = 0
    let errorCount = 0

    for (const item of selectedItems) {
      try {
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.suggestedCategory,
            location: item.suggestedLocation || null,
            expiryDate: item.expiryDate || (item.calculatedExpiry ? new Date(item.calculatedExpiry).toISOString().split('T')[0] : null),
            addedBy: 'Photo',
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
          console.error('❌ Failed to import:', item.name)
        }
      } catch (error) {
        errorCount++
        console.error('❌ Error importing item:', item.name, error)
      }
    }

    console.log('🟢 Photo import complete:', { success: successCount, errors: errorCount })

    // Refresh inventory
    await fetchItems()

    // Reset state
    setShowPhotoImport(false)
    setPhotoPreview(null)
    setExtractedItems([])
    setPhotoProcessingNotes(null)
    setImportingPhoto(false)

    // Show result
    if (errorCount === 0) {
      alert(`Successfully imported ${successCount} items!`)
    } else {
      alert(`Imported ${successCount} items. ${errorCount} items failed to import.`)
    }
  }

  const handleResetPhotoImport = () => {
    setPhotoPreview(null)
    setExtractedItems([])
    setPhotoProcessingNotes(null)
  }

  // Sort handlers
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

  // Get expiry badge
  const getExpiryBadge = (item: InventoryItemWithExpiry) => {
    const colorClass = getExpiryStatusColor(item.expiryStatus)
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {getExpiryStatusLabel(item.expiryStatus)}
      </span>
    )
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
        description="Track your household food items and expiry dates"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowPhotoImport(true)} variant="secondary">
              Scan Photo
            </Button>
            <Button onClick={() => setShowCSVImport(true)} variant="secondary">
              Import CSV
            </Button>
            <Button onClick={() => setShowAddForm(true)} variant="primary">
              Add Item
            </Button>
          </div>
        }
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
            <div className="text-sm text-zinc-400">Total Items</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.activeItems}</div>
            <div className="text-sm text-zinc-400">Active</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.expiringSoonCount}</div>
            <div className="text-sm text-zinc-400">Expiring Soon</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.expiredCount}</div>
            <div className="text-sm text-zinc-400">Expired</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Category:</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Location filter */}
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

            {/* Expiry Status filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Status:</label>
              <select
                value={filters.expiryStatus || ''}
                onChange={(e) => setFilters({ ...filters, expiryStatus: e.target.value as ExpiryStatus || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="expired">Expired</option>
                <option value="expiringSoon">Expiring Soon</option>
                <option value="fresh">Fresh</option>
              </select>
            </div>

            {/* Active filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Active:</label>
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

            {/* Clear filters */}
            {(filters.category || filters.location || filters.expiryStatus || filters.isActive !== undefined || searchQuery) && (
              <button
                onClick={() => {
                  setFilters({})
                  setSearchQuery('')
                }}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="card p-3 mb-4 flex items-center justify-between bg-purple-900/20 border-purple-500/30">
            <span className="text-sm text-purple-300">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkExpiryModal(true)}
                variant="secondary"
                size="sm"
                disabled={processingBulk}
              >
                Update Expiry
              </Button>
              <Button
                onClick={handleBulkMarkInactive}
                variant="secondary"
                size="sm"
                disabled={processingBulk}
              >
                Mark Inactive
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="danger"
                size="sm"
                disabled={processingBulk}
              >
                Delete
              </Button>
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
              Start tracking your food items to reduce waste and never run out of essentials.
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
              onClick={() => {
                setFilters({})
                setSearchQuery('')
              }}
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
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('itemName')}
                    >
                      Name{getSortIcon('itemName')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('quantity')}
                    >
                      Qty{getSortIcon('quantity')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('category')}
                    >
                      Category{getSortIcon('category')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('location')}
                    >
                      Location{getSortIcon('location')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('purchaseDate')}
                    >
                      Added{getSortIcon('purchaseDate')}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Active
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
                      className={`hover:bg-zinc-800/30 ${
                        !item.isActive ? 'opacity-50' : ''
                      } ${
                        item.expiryStatus === 'expired' ? 'bg-red-900/10' :
                        item.expiryStatus === 'expiringSoon' ? 'bg-amber-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{item.itemName}</span>
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
                        {getLocationLabel(item.location) || <span className="text-zinc-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatDate(item.purchaseDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        <div className="flex flex-col">
                          <span>{formatDate(item.expiryDate)}</span>
                          {item.expiryIsEstimated && item.expiryDate && (
                            <span className="text-xs text-zinc-500 italic">estimated</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.expiryDate ? getExpiryBadge(item) : (
                          <span className="text-zinc-500 text-sm">No expiry</span>
                        )}
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
          onClose={() => setShowAddForm(false)}
          title="Add Inventory Item"
          maxWidth="md"
        >
          <form onSubmit={handleAddItem} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  placeholder="e.g., Milk"
                />
              </div>
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
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
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
                  {COMMON_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
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
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={newItem.expiryDate}
                  onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                />
                <p className="text-xs text-zinc-500 mt-1">Leave blank to auto-calculate</p>
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newItemActive"
                checked={newItem.isActive}
                onChange={(e) => setNewItem({ ...newItem, isActive: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
              />
              <label htmlFor="newItemActive" className="ml-2 text-sm text-zinc-300">
                Active (include in inventory checks)
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={addingItem}
              >
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
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
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
                  {COMMON_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
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
                  Purchase Date
                </label>
                <Input
                  type="date"
                  value={editFormData.purchaseDate}
                  onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={editFormData.expiryDate}
                  onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                />
                {editingItem?.expiryIsEstimated && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Current expiry was auto-calculated. Setting a new date will mark it as user-set.
                  </p>
                )}
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="editItemActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
              />
              <label htmlFor="editItemActive" className="ml-2 text-sm text-zinc-300">
                Active (include in inventory checks)
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Duplicate Detection Modal */}
        <Modal
          isOpen={!!duplicateMatch}
          onClose={() => {
            setDuplicateMatch(null)
            setPendingNewItem(null)
          }}
          title="Item Already Exists"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <p className="text-zinc-300">
              <strong className="text-white">{pendingNewItem?.itemName}</strong> already exists in your inventory with quantity{' '}
              <strong className="text-white">{duplicateMatch?.quantity} {duplicateMatch?.unit}</strong>.
            </p>
            <p className="text-zinc-400 text-sm">What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleMergeWithExisting}
                variant="primary"
                disabled={addingItem}
                className="w-full"
              >
                Add to existing (new total: {(duplicateMatch?.quantity || 0) + (pendingNewItem?.quantity || 0)} {duplicateMatch?.unit})
              </Button>
              <Button
                onClick={handleCreateNewAnyway}
                variant="secondary"
                disabled={addingItem}
                className="w-full"
              >
                Create new entry
              </Button>
              <Button
                onClick={() => {
                  setDuplicateMatch(null)
                  setPendingNewItem(null)
                }}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Expiry Update Modal */}
        <Modal
          isOpen={showBulkExpiryModal}
          onClose={() => {
            setShowBulkExpiryModal(false)
            setBulkExpiryDate('')
          }}
          title="Update Expiry Date"
          maxWidth="sm"
        >
          <div className="p-6 space-y-4">
            <p className="text-zinc-300">
              Set a new expiry date for {selectedIds.size} selected item{selectedIds.size !== 1 ? 's' : ''}.
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                New Expiry Date
              </label>
              <Input
                type="date"
                value={bulkExpiryDate}
                onChange={(e) => setBulkExpiryDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkExpiryModal(false)
                  setBulkExpiryDate('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkUpdateExpiry}
                disabled={!bulkExpiryDate || processingBulk}
              >
                {processingBulk ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* CSV Import Modal */}
        <Modal
          isOpen={showCSVImport}
          onClose={() => {
            setShowCSVImport(false)
            setCsvSummary(null)
            setCsvFileName('')
          }}
          title="Import Inventory from CSV"
          maxWidth="lg"
        >
          <div className="p-6 space-y-6">
            {/* Step 1: Download Template */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">1</span>
                Download Template
              </h3>
              <p className="text-sm text-zinc-400 ml-8">
                Start with our template to ensure your data is formatted correctly.
              </p>
              <div className="ml-8">
                <Button onClick={handleDownloadTemplate} variant="secondary" size="sm">
                  Download CSV Template
                </Button>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">2</span>
                Upload Your File
              </h3>
              <p className="text-sm text-zinc-400 ml-8">
                Upload your completed CSV file for validation.
              </p>
              <div className="ml-8">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors">
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {csvFileName && (
                    <span className="text-sm text-zinc-400">{csvFileName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Preview & Import */}
            {csvSummary && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">3</span>
                  Preview & Import
                </h3>

                {/* Summary Stats */}
                <div className="ml-8 grid grid-cols-4 gap-3">
                  <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-white">{csvSummary.totalRows}</div>
                    <div className="text-xs text-zinc-400">Total Rows</div>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-400">{csvSummary.validCount}</div>
                    <div className="text-xs text-zinc-400">Valid</div>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-amber-400">{csvSummary.warningCount}</div>
                    <div className="text-xs text-zinc-400">Warnings</div>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                    <div className="text-xl font-bold text-red-400">{csvSummary.errorCount}</div>
                    <div className="text-xs text-zinc-400">Errors</div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="ml-8 max-h-64 overflow-y-auto border border-zinc-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-zinc-300">Row</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Status</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Name</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Qty</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Category</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {csvSummary.results.map((result) => (
                        <tr
                          key={result.row}
                          className={
                            result.status === 'error'
                              ? 'bg-red-900/20'
                              : result.status === 'warning'
                              ? 'bg-amber-900/20'
                              : ''
                          }
                        >
                          <td className="px-3 py-2 text-zinc-400">{result.row}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                result.status === 'valid'
                                  ? 'bg-green-900/50 text-green-400'
                                  : result.status === 'warning'
                                  ? 'bg-amber-900/50 text-amber-400'
                                  : 'bg-red-900/50 text-red-400'
                              }`}
                            >
                              {result.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-white">{result.data.name}</td>
                          <td className="px-3 py-2 text-zinc-300">
                            {result.data.quantity} {result.data.unit}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.category}</td>
                          <td className="px-3 py-2">
                            {result.errors.length > 0 && (
                              <span className="text-red-400 text-xs">{result.errors.join(', ')}</span>
                            )}
                            {result.warnings.length > 0 && (
                              <span className="text-amber-400 text-xs">{result.warnings.join(', ')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Info */}
                <div className="ml-8 text-sm text-zinc-400">
                  {csvSummary.validCount + csvSummary.warningCount > 0 ? (
                    <p>
                      {csvSummary.validCount + csvSummary.warningCount} item(s) will be imported.
                      {csvSummary.warningCount > 0 && ' Items with warnings will use auto-calculated expiry dates.'}
                      {csvSummary.errorCount > 0 && ` ${csvSummary.errorCount} item(s) with errors will be skipped.`}
                    </p>
                  ) : (
                    <p className="text-red-400">No valid items to import. Please fix the errors and try again.</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-zinc-700">
              <div>
                {csvSummary && (
                  <Button
                    variant="ghost"
                    onClick={handleResetCSVImport}
                    disabled={importingCSV}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCSVImport(false)
                    setCsvSummary(null)
                    setCsvFileName('')
                  }}
                  disabled={importingCSV}
                >
                  Cancel
                </Button>
                {csvSummary && csvSummary.validCount + csvSummary.warningCount > 0 && (
                  <Button
                    variant="primary"
                    onClick={handleImportCSV}
                    disabled={importingCSV}
                  >
                    {importingCSV
                      ? 'Importing...'
                      : `Import ${csvSummary.validCount + csvSummary.warningCount} Items`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* Photo Import Modal */}
        <Modal
          isOpen={showPhotoImport}
          onClose={() => {
            setShowPhotoImport(false)
            setPhotoPreview(null)
            setExtractedItems([])
            setPhotoProcessingNotes(null)
          }}
          title="Scan Groceries from Photo"
          maxWidth="lg"
        >
          <div className="p-6 space-y-6">
            {/* Step 1: Upload Photo */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">1</span>
                Upload Photo
              </h3>
              <p className="text-sm text-zinc-400 ml-8">
                Take a photo of your groceries, fridge contents, or receipt.
              </p>
              <div className="ml-8 flex items-center gap-3">
                <label className="cursor-pointer">
                  <span className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Choose Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Photo Preview */}
            {photoPreview && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">2</span>
                  Preview
                </h3>
                <div className="ml-8 flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Photo preview"
                      className="max-w-xs max-h-48 rounded-lg border border-zinc-700 object-contain"
                    />
                    <button
                      onClick={handleResetPhotoImport}
                      className="absolute -top-2 -right-2 p-1 bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-600"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1">
                    {!analyzingPhoto && extractedItems.length === 0 && (
                      <Button onClick={handleAnalyzePhoto} variant="primary">
                        Analyze Photo
                      </Button>
                    )}
                    {analyzingPhoto && (
                      <div className="flex items-center gap-3 text-zinc-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                        <span>Analyzing photo with AI...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Items */}
            {extractedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-xs">3</span>
                  Review & Import
                </h3>

                {photoProcessingNotes && (
                  <div className="ml-8 p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
                    <strong className="text-zinc-300">AI Notes:</strong> {photoProcessingNotes}
                  </div>
                )}

                <div className="ml-8 max-h-64 overflow-y-auto border border-zinc-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={extractedItems.every(i => i.selected)}
                            onChange={() => {
                              const allSelected = extractedItems.every(i => i.selected)
                              setExtractedItems(prev =>
                                prev.map(item => ({ ...item, selected: !allSelected }))
                              )
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-zinc-300">Item</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Qty</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Category</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Location</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {extractedItems.map((item, index) => (
                        <tr
                          key={index}
                          className={`${
                            item.selected ? '' : 'opacity-50'
                          } ${
                            item.confidence === 'low' ? 'bg-amber-900/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleExtractedItem(index)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                            />
                          </td>
                          <td className="px-3 py-2 text-white">{item.name}</td>
                          <td className="px-3 py-2 text-zinc-300">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">{item.suggestedCategory}</td>
                          <td className="px-3 py-2 text-zinc-300">
                            {item.suggestedLocation ? getLocationLabel(item.suggestedLocation as StorageLocation) : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.confidence === 'high'
                                  ? 'bg-green-900/50 text-green-400'
                                  : item.confidence === 'medium'
                                  ? 'bg-amber-900/50 text-amber-400'
                                  : 'bg-red-900/50 text-red-400'
                              }`}
                            >
                              {item.confidence}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ml-8 text-sm text-zinc-400">
                  {extractedItems.filter(i => i.selected).length} of {extractedItems.length} items selected for import.
                  Items with low confidence are deselected by default.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-zinc-700">
              <div>
                {(photoPreview || extractedItems.length > 0) && (
                  <Button
                    variant="ghost"
                    onClick={handleResetPhotoImport}
                    disabled={analyzingPhoto || importingPhoto}
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPhotoImport(false)
                    setPhotoPreview(null)
                    setExtractedItems([])
                    setPhotoProcessingNotes(null)
                  }}
                  disabled={analyzingPhoto || importingPhoto}
                >
                  Cancel
                </Button>
                {extractedItems.length > 0 && extractedItems.some(i => i.selected) && (
                  <Button
                    variant="primary"
                    onClick={handleImportSelectedItems}
                    disabled={importingPhoto}
                  >
                    {importingPhoto
                      ? 'Importing...'
                      : `Import ${extractedItems.filter(i => i.selected).length} Items`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  )
}
