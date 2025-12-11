'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
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
} from '@/lib/inventory/expiry-calculations'
import type {
  InventoryItem,
  InventoryItemWithExpiry,
  InventoryFilters,
  InventorySortField,
  InventorySortOptions,
  ExpiryStatus,
  StorageLocation,
} from '@/lib/types/inventory'
import {
  STORAGE_LOCATIONS,
  EXPIRY_STATUS_LABELS,
  EXPIRY_STATUS_COLORS,
  STORAGE_LOCATION_LABELS,
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

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
  }, [])

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
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
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
      </PageContainer>
    </AppLayout>
  )
}
