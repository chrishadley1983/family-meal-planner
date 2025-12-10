'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface SourceDetail {
  type: 'recipe' | 'staple' | 'manual'
  id?: string
  name?: string
  quantity: number
  unit: string
  mealPlanId?: string
}

interface ShoppingListItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  source: string | null
  sourceDetails: SourceDetail[]
  isConsolidated: boolean
  isPurchased: boolean
  customNote: string | null
  priority: string
  displayOrder: number
}

interface MealPlanLink {
  id: string
  mealPlanId: string
  importedAt: string
  mealPlan?: {
    id: string
    weekStartDate: string
    weekEndDate: string
    status: string
  }
}

interface ShoppingList {
  id: string
  name: string
  notes: string | null
  status: 'Draft' | 'Finalized' | 'Archived'
  createdAt: string
  updatedAt: string
  items: ShoppingListItem[]
  mealPlans: MealPlanLink[]
}

interface Staple {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  autoAddToList: boolean
  alreadyImported?: boolean
}

interface MealPlanOption {
  id: string
  weekStartDate: string
  weekEndDate: string
  mealCount: number
  alreadyImported: boolean
}

interface DuplicateGroup {
  normalizedName: string
  items: Array<{
    id: string
    itemName: string
    quantity: number
    unit: string
  }>
  canCombine: boolean
  combinedResult?: {
    quantity: number
    unit: string
  }
}

export default function ShoppingListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, ShoppingListItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit states
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState('')

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Import modals
  const [showStaplesModal, setShowStaplesModal] = useState(false)
  const [showMealPlanModal, setShowMealPlanModal] = useState(false)
  const [staples, setStaples] = useState<Staple[]>([])
  const [selectedStaples, setSelectedStaples] = useState<Set<string>>(new Set())
  const [mealPlanOptions, setMealPlanOptions] = useState<MealPlanOption[]>([])
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('')
  const [importing, setImporting] = useState(false)

  // Deduplication
  const [showDedupeModal, setShowDedupeModal] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [deduping, setDeduping] = useState(false)
  const [lastCombineResult, setLastCombineResult] = useState<{
    message: string
    itemName?: string
    quantity?: number
    unit?: string
    deletedCount: number
    previousTotal: number
    newTotal: number
    isBulk?: boolean
  } | null>(null)

  useEffect(() => {
    fetchShoppingList()
  }, [id])

  const fetchShoppingList = async () => {
    try {
      console.log('🔷 Fetching shopping list:', id)
      const response = await fetch(`/api/shopping-lists/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/shopping-lists')
          return
        }
        throw new Error('Failed to fetch shopping list')
      }

      const data = await response.json()
      console.log('🟢 Shopping list fetched:', data.shoppingList?.name)
      setShoppingList(data.shoppingList)
      setItemsByCategory(data.itemsByCategory || {})
      setEditName(data.shoppingList?.name || '')
      setEditNotes(data.shoppingList?.notes || '')
    } catch (error) {
      console.error('❌ Error fetching shopping list:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: 'Draft' | 'Finalized' | 'Archived') => {
    if (!shoppingList || saving) return

    setSaving(true)
    try {
      console.log('🔷 Updating status to:', newStatus)
      const response = await fetch(`/api/shopping-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      const data = await response.json()
      setShoppingList(data.shoppingList)
      console.log('🟢 Status updated')
    } catch (error) {
      console.error('❌ Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveName = async () => {
    if (!shoppingList || saving || !editName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/shopping-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })

      if (!response.ok) throw new Error('Failed to update name')

      const data = await response.json()
      setShoppingList(data.shoppingList)
      setEditingName(false)
    } catch (error) {
      console.error('❌ Error updating name:', error)
      alert('Failed to update name')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!shoppingList || saving) return

    setSaving(true)
    try {
      const response = await fetch(`/api/shopping-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes.trim() || null }),
      })

      if (!response.ok) throw new Error('Failed to update notes')

      const data = await response.json()
      setShoppingList(data.shoppingList)
      setEditingNotes(false)
    } catch (error) {
      console.error('❌ Error updating notes:', error)
      alert('Failed to update notes')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePurchased = async (itemId: string, isPurchased: boolean) => {
    try {
      console.log('🔷 Toggling purchased:', itemId, '→', !isPurchased)
      const response = await fetch(`/api/shopping-lists/${id}/items?itemId=${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPurchased: !isPurchased }),
      })

      if (!response.ok) throw new Error('Failed to update item')

      // Refresh the list
      await fetchShoppingList()
    } catch (error) {
      console.error('❌ Error toggling purchased:', error)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemQuantity || !newItemUnit.trim() || addingItem) return

    setAddingItem(true)
    try {
      console.log('🔷 Adding item:', newItemName)

      // Get category suggestion from AI
      let category = 'Other'
      try {
        const categoryResponse = await fetch('/api/shopping-lists/suggest-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: newItemName.trim() }),
        })
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json()
          category = categoryData.suggestedCategory
          console.log('🟢 AI suggested category:', category)
        }
      } catch (error) {
        console.warn('⚠️ Could not get category suggestion, using Other')
      }

      const response = await fetch(`/api/shopping-lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: newItemName.trim(),
          quantity: parseFloat(newItemQuantity),
          unit: newItemUnit.trim(),
          category,
          source: 'manual',
        }),
      })

      if (!response.ok) throw new Error('Failed to add item')

      console.log('🟢 Item added')
      setNewItemName('')
      setNewItemQuantity('')
      setNewItemUnit('')
      setShowAddItem(false)
      await fetchShoppingList()
    } catch (error) {
      console.error('❌ Error adding item:', error)
      alert('Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      console.log('🔷 Deleting item:', itemId)
      const response = await fetch(`/api/shopping-lists/${id}/items?itemId=${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete item')

      await fetchShoppingList()
    } catch (error) {
      console.error('❌ Error deleting item:', error)
    }
  }

  // Import Staples
  const handleOpenStaplesModal = async () => {
    try {
      console.log('🔷 Fetching staples for import')
      const response = await fetch(`/api/shopping-lists/${id}/import/staples`)
      if (!response.ok) throw new Error('Failed to fetch staples')

      const data = await response.json()
      setStaples(data.staples || [])

      // Select all by default (excluding already imported)
      const defaultSelected = new Set<string>(
        data.staples
          .filter((s: Staple) => !s.alreadyImported)
          .map((s: Staple) => s.id)
      )
      setSelectedStaples(defaultSelected)
      setShowStaplesModal(true)
    } catch (error) {
      console.error('❌ Error fetching staples:', error)
      alert('Failed to load staples')
    }
  }

  const handleImportStaples = async () => {
    if (selectedStaples.size === 0 || importing) return

    setImporting(true)
    try {
      console.log('🔷 Importing', selectedStaples.size, 'staples')
      const response = await fetch(`/api/shopping-lists/${id}/import/staples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stapleIds: Array.from(selectedStaples) }),
      })

      if (!response.ok) throw new Error('Failed to import staples')

      const data = await response.json()
      console.log('🟢 Imported', data.importedCount, 'staples')
      setShowStaplesModal(false)
      await fetchShoppingList()
    } catch (error) {
      console.error('❌ Error importing staples:', error)
      alert('Failed to import staples')
    } finally {
      setImporting(false)
    }
  }

  // Import Meal Plan
  const handleOpenMealPlanModal = async () => {
    try {
      console.log('🔷 Fetching meal plans for import')
      const response = await fetch(`/api/shopping-lists/${id}/import/meal-plan`)
      if (!response.ok) throw new Error('Failed to fetch meal plans')

      const data = await response.json()
      setMealPlanOptions(data.mealPlans || [])
      setSelectedMealPlan('')
      setShowMealPlanModal(true)
    } catch (error) {
      console.error('❌ Error fetching meal plans:', error)
      alert('Failed to load meal plans')
    }
  }

  const handleImportMealPlan = async () => {
    if (!selectedMealPlan || importing) return

    setImporting(true)
    try {
      console.log('🔷 Importing from meal plan:', selectedMealPlan)
      const response = await fetch(`/api/shopping-lists/${id}/import/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlanId: selectedMealPlan }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import from meal plan')
      }

      const data = await response.json()
      console.log('🟢 Imported', data.importedCount, 'ingredients')
      setShowMealPlanModal(false)
      await fetchShoppingList()

      // Auto-run AI deduplication after import
      console.log('🔷 Auto-deduplicating after meal plan import...')
      const dedupeResponse = await fetch(`/api/shopping-lists/${id}/deduplicate`)
      if (dedupeResponse.ok) {
        const dedupeData = await dedupeResponse.json()
        const groups = dedupeData.duplicateGroups || []

        if (groups.length > 0) {
          console.log('🔷 Found', groups.length, 'duplicate groups, auto-combining...')
          const previousTotal = shoppingList?.items.length || 0
          let totalItemsCombined = 0

          // Combine all duplicate groups
          for (const group of groups) {
            const itemIds = group.items.map((i: { id: string }) => i.id)
            const combineResponse = await fetch(`/api/shopping-lists/${id}/deduplicate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemIds, useAI: true }),
            })

            if (combineResponse.ok) {
              totalItemsCombined += itemIds.length
            }
          }

          // Refresh the shopping list
          await fetchShoppingList()
          const newTotal = shoppingList?.items.length || previousTotal - (totalItemsCombined - groups.length)

          console.log('🟢 Auto-combined', totalItemsCombined, 'items from', groups.length, 'groups')
          alert(`Imported ${data.importedCount} ingredients and combined ${totalItemsCombined} duplicate items.`)
        } else {
          console.log('🟢 No duplicates found after import')
        }
      }
    } catch (error) {
      console.error('❌ Error importing meal plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to import from meal plan')
    } finally {
      setImporting(false)
    }
  }

  // Deduplication
  const handleOpenDedupeModal = async () => {
    try {
      console.log('🔷 Finding duplicates')
      const response = await fetch(`/api/shopping-lists/${id}/deduplicate`)
      if (!response.ok) throw new Error('Failed to find duplicates')

      const data = await response.json()
      setDuplicateGroups(data.duplicateGroups || [])
      setShowDedupeModal(true)
    } catch (error) {
      console.error('❌ Error finding duplicates:', error)
      alert('Failed to find duplicates')
    }
  }

  const handleDeduplicate = async (itemIds: string[], useAI: boolean = true) => {
    if (deduping) return

    // Capture the current total before combining
    const previousTotal = shoppingList?.items.length || 0

    setDeduping(true)
    setLastCombineResult(null) // Clear previous result
    try {
      console.log('🔷 Deduplicating items:', itemIds, 'useAI:', useAI)
      const response = await fetch(`/api/shopping-lists/${id}/deduplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, useAI }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to deduplicate')
      }

      const result = await response.json()
      console.log('🟢 Items deduplicated:', result)

      // Refresh duplicates list
      const refreshResponse = await fetch(`/api/shopping-lists/${id}/deduplicate`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setDuplicateGroups(data.duplicateGroups || [])
      }

      // Fetch updated shopping list and get new total
      await fetchShoppingList()

      // Calculate new total after refresh (items.length will be updated by fetchShoppingList)
      const newTotal = previousTotal - (result.deletedCount || 0)

      // Store the result for display with count info
      if (result.combinedItem) {
        setLastCombineResult({
          message: result.message,
          itemName: result.combinedItem.itemName,
          quantity: result.combinedItem.quantity,
          unit: result.combinedItem.unit,
          deletedCount: result.deletedCount || 0,
          previousTotal,
          newTotal,
        })
      }
    } catch (error) {
      console.error('❌ Error deduplicating:', error)
      alert(error instanceof Error ? error.message : 'Failed to deduplicate')
    } finally {
      setDeduping(false)
    }
  }

  // Combine all duplicate groups at once
  const handleCombineAll = async () => {
    if (deduping || duplicateGroups.length === 0) return

    const previousTotal = shoppingList?.items.length || 0
    const groupCount = duplicateGroups.length

    setDeduping(true)
    setLastCombineResult(null)

    let totalItemsCombined = 0

    try {
      console.log('🔷 Combining all', groupCount, 'duplicate groups')

      // Process each group sequentially
      for (const group of duplicateGroups) {
        const itemIds = group.items.map((i) => i.id)
        console.log('🔷 Combining group:', group.normalizedName, 'with', itemIds.length, 'items')

        const response = await fetch(`/api/shopping-lists/${id}/deduplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds, useAI: true }),
        })

        if (response.ok) {
          const result = await response.json()
          totalItemsCombined += itemIds.length
          console.log('🟢 Group combined:', group.normalizedName, 'deleted:', result.deletedCount)
        }
      }

      // Refresh duplicates list (should be empty now)
      const refreshResponse = await fetch(`/api/shopping-lists/${id}/deduplicate`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setDuplicateGroups(data.duplicateGroups || [])
      }

      // Fetch updated shopping list
      await fetchShoppingList()

      // Calculate new total
      const newTotal = shoppingList?.items.length || previousTotal - (totalItemsCombined - groupCount)

      // Set bulk combine result
      setLastCombineResult({
        message: `${totalItemsCombined} items combined successfully`,
        deletedCount: totalItemsCombined - groupCount,
        previousTotal,
        newTotal,
        isBulk: true,
      })

      console.log('🟢 All groups combined:', totalItemsCombined, 'items total')
    } catch (error) {
      console.error('❌ Error combining all:', error)
      alert(error instanceof Error ? error.message : 'Failed to combine all')
    } finally {
      setDeduping(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'Finalized':
        return 'bg-green-100 text-green-800'
      case 'Archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get unpurchased items grouped by category
  const unpurchasedItemsByCategory = Object.entries(itemsByCategory).reduce(
    (acc, [category, items]) => {
      const unpurchased = items.filter((item) => !item.isPurchased)
      if (unpurchased.length > 0) {
        acc[category] = unpurchased
      }
      return acc
    },
    {} as Record<string, ShoppingListItem[]>
  )

  const totalItems = shoppingList?.items.length || 0
  const purchasedItems = shoppingList?.items.filter((i) => i.isPurchased).length || 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading shopping list...</p>
        </div>
      </div>
    )
  }

  if (!shoppingList) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Shopping list not found</p>
          <Link href="/shopping-lists" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
            ← Back to Shopping Lists
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/shopping-lists" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Shopping Lists
          </Link>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 w-full max-w-md"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-green-400 hover:text-green-300">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false)
                      setEditName(shoppingList.name)
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-white cursor-pointer hover:text-gray-300"
                  onClick={() => shoppingList.status === 'Draft' && setEditingName(true)}
                >
                  {shoppingList.name}
                  {shoppingList.status === 'Draft' && (
                    <span className="text-sm text-gray-500 ml-2">(click to edit)</span>
                  )}
                </h1>
              )}

              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(shoppingList.status)}`}>
                  {shoppingList.status}
                </span>
                <span className="text-gray-400 text-sm">
                  {purchasedItems} / {totalItems} purchased
                </span>
              </div>
            </div>

            {/* Status Actions */}
            {shoppingList.status === 'Draft' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus('Finalized')}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Finalize
                </button>
                <button
                  onClick={() => handleUpdateStatus('Archived')}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Archive
                </button>
              </div>
            )}
            {shoppingList.status === 'Finalized' && (
              <button
                onClick={() => handleUpdateStatus('Archived')}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Archive
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="mt-4">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add notes..."
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveNotes} className="text-sm text-green-400 hover:text-green-300">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false)
                      setEditNotes(shoppingList.notes || '')
                    }}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`text-sm cursor-pointer ${
                  shoppingList.notes ? 'text-gray-400' : 'text-gray-600'
                } ${shoppingList.status === 'Draft' ? 'hover:text-gray-300' : ''}`}
                onClick={() => shoppingList.status === 'Draft' && setEditingNotes(true)}
              >
                {shoppingList.notes || (shoppingList.status === 'Draft' ? '+ Add notes...' : 'No notes')}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons (Draft only) */}
        {shoppingList.status === 'Draft' && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddItem(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
            <button
              onClick={handleOpenStaplesModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Import Staples
            </button>
            <button
              onClick={handleOpenMealPlanModal}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            >
              Import from Meal Plan
            </button>
            <button
              onClick={handleOpenDedupeModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Find Duplicates
            </button>
          </div>
        )}

        {/* Add Item Form */}
        {showAddItem && shoppingList.status === 'Draft' && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Add New Item</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-400 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Tomatoes"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  placeholder="2"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm text-gray-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  placeholder="kg"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={addingItem || !newItemName.trim() || !newItemQuantity || !newItemUnit.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {addingItem ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItemName('')
                  setNewItemQuantity('')
                  setNewItemUnit('')
                }}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shopping Items by Category */}
        {Object.keys(unpurchasedItemsByCategory).length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">
              {totalItems === 0 ? 'No items yet' : 'All done!'}
            </h3>
            <p className="text-gray-400">
              {totalItems === 0
                ? 'Add items or import from staples/meal plans'
                : `You've purchased all ${totalItems} items`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(unpurchasedItemsByCategory).map(([category, items]) => (
              <div key={category} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-750 border-b border-gray-700">
                  <h3 className="text-white font-medium">{category}</h3>
                  <span className="text-sm text-gray-400">{items.length} items</span>
                </div>
                <ul className="divide-y divide-gray-700">
                  {items.map((item) => (
                    <li key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-750">
                      <button
                        onClick={() => handleTogglePurchased(item.id, item.isPurchased)}
                        className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-green-500 flex-shrink-0 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{item.itemName}</span>
                          {item.isConsolidated && (
                            <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">
                              combined
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {item.quantity} {item.unit}
                          {item.source && item.source !== 'manual' && (
                            <span className="text-gray-500 ml-2">
                              from {item.source}
                            </span>
                          )}
                        </div>
                      </div>
                      {shoppingList.status === 'Draft' && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Linked Meal Plans */}
        {shoppingList.mealPlans && shoppingList.mealPlans.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Linked Meal Plans</h3>
            <ul className="space-y-2">
              {shoppingList.mealPlans.map((link) => (
                <li key={link.id} className="text-sm text-gray-400">
                  Week of {link.mealPlan ? format(new Date(link.mealPlan.weekStartDate), 'MMM d, yyyy') : 'Unknown'}
                  <span className="text-gray-500 ml-2">
                    (imported {format(new Date(link.importedAt), 'MMM d')})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Import Staples Modal */}
      {showStaplesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Import from Staples</h2>
              <p className="text-sm text-gray-400 mt-1">Select staples to add to your shopping list</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {staples.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No staples found. Add staples first.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <button
                      onClick={() => setSelectedStaples(new Set(staples.filter((s) => !s.alreadyImported).map((s) => s.id)))}
                      className="hover:text-white"
                    >
                      Select all
                    </button>
                    <button onClick={() => setSelectedStaples(new Set())} className="hover:text-white">
                      Clear all
                    </button>
                  </div>
                  {staples.map((staple) => (
                    <label
                      key={staple.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer ${
                        staple.alreadyImported ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaples.has(staple.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedStaples)
                          if (e.target.checked) {
                            newSet.add(staple.id)
                          } else {
                            newSet.delete(staple.id)
                          }
                          setSelectedStaples(newSet)
                        }}
                        disabled={staple.alreadyImported}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-white">{staple.itemName}</span>
                        <span className="text-gray-400 text-sm ml-2">
                          {staple.quantity} {staple.unit}
                        </span>
                        {staple.alreadyImported && (
                          <span className="text-yellow-500 text-sm ml-2">(already imported)</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-between items-center">
              <span className="text-sm text-gray-400">{selectedStaples.size} selected</span>
              <div className="flex gap-3">
                <button onClick={() => setShowStaplesModal(false)} className="px-4 py-2 text-gray-300 hover:text-white">
                  Cancel
                </button>
                <button
                  onClick={handleImportStaples}
                  disabled={selectedStaples.size === 0 || importing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Meal Plan Modal */}
      {showMealPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Import from Meal Plan</h2>
              <p className="text-sm text-gray-400 mt-1">Select a finalized meal plan to import ingredients</p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {mealPlanOptions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No finalized meal plans available.</p>
              ) : (
                <div className="space-y-2">
                  {mealPlanOptions.map((mp) => (
                    <label
                      key={mp.id}
                      className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                        selectedMealPlan === mp.id
                          ? 'border-orange-500 bg-orange-900/20'
                          : 'border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mealPlan"
                        checked={selectedMealPlan === mp.id}
                        onChange={() => setSelectedMealPlan(mp.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-white">
                          Week of {format(new Date(mp.weekStartDate), 'MMM d')} - {format(new Date(mp.weekEndDate), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-400">
                          {mp.mealCount} meals
                          {mp.alreadyImported && (
                            <span className="text-yellow-500 ml-2">(already imported)</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-end gap-3">
              <button onClick={() => setShowMealPlanModal(false)} className="px-4 py-2 text-gray-300 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleImportMealPlan}
                disabled={!selectedMealPlan || importing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import Ingredients'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedupe Modal */}
      {showDedupeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Find Duplicates</h2>
              <p className="text-sm text-gray-400 mt-1">Combine similar items into one</p>
            </div>

            {/* Success notification */}
            {lastCombineResult && (
              <div className="mx-4 mt-4 p-4 bg-green-900/30 border border-green-600 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">{lastCombineResult.message}</p>
                    {/* Show detailed info for single combines, summary for bulk */}
                    {!lastCombineResult.isBulk && lastCombineResult.itemName && (
                      <p className="text-green-300 text-sm mt-1">
                        Combined into: <span className="font-semibold">{lastCombineResult.quantity} {lastCombineResult.unit} {lastCombineResult.itemName}</span>
                      </p>
                    )}
                    {lastCombineResult.deletedCount > 0 && (
                      <p className="text-green-300/70 text-xs mt-2">
                        {lastCombineResult.isBulk
                          ? <>Total items: <span className="line-through opacity-60">{lastCombineResult.previousTotal}</span> → <span className="font-semibold">{lastCombineResult.newTotal}</span></>
                          : <>Removed {lastCombineResult.deletedCount} duplicate{lastCombineResult.deletedCount !== 1 ? 's' : ''}<span className="mx-1">•</span>Total items: <span className="line-through opacity-60">{lastCombineResult.previousTotal}</span> → <span className="font-semibold">{lastCombineResult.newTotal}</span></>
                        }
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setLastCombineResult(null)}
                    className="text-green-400 hover:text-green-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 flex-1 overflow-y-auto">
              {duplicateGroups.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {lastCombineResult ? 'All duplicates have been combined!' : 'No duplicates found!'}
                </p>
              ) : (
                <div className="space-y-4">
                  {duplicateGroups.map((group) => (
                    <div key={group.normalizedName} className="bg-gray-750 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-medium capitalize">{group.normalizedName}</h4>
                        <button
                          onClick={() => handleDeduplicate(group.items.map((i) => i.id), true)}
                          disabled={deduping}
                          className={`px-3 py-1 text-sm rounded-lg disabled:opacity-50 transition-colors ${
                            group.canCombine
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          {deduping ? 'Combining...' : (group.canCombine ? 'Combine' : 'AI Combine')}
                        </button>
                      </div>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {group.items.map((item) => (
                          <li key={item.id}>
                            {item.itemName}: {item.quantity} {item.unit}
                          </li>
                        ))}
                      </ul>
                      {group.canCombine && group.combinedResult && (
                        <p className="text-sm text-green-400 mt-2">
                          → Combined: {group.combinedResult.quantity} {group.combinedResult.unit}
                        </p>
                      )}
                      {!group.canCombine && (
                        <p className="text-sm text-purple-400 mt-2">AI will determine the best unit</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-between">
              <div className="text-sm text-gray-400">
                {duplicateGroups.length > 0 && `${duplicateGroups.length} duplicate group${duplicateGroups.length !== 1 ? 's' : ''} found`}
              </div>
              <div className="flex gap-3">
                {duplicateGroups.length > 0 && (
                  <button
                    onClick={handleCombineAll}
                    disabled={deduping}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {deduping ? 'Combining...' : 'Combine All'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDedupeModal(false)
                    setLastCombineResult(null)
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
