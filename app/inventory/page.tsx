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
      </PageContainer>
    </AppLayout>
  )
}
