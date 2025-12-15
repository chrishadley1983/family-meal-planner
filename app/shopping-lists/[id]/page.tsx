'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import ExportShareModal from '@/components/shopping-list/ExportShareModal'
import { useNotification } from '@/components/providers/NotificationProvider'
import { AppLayout } from '@/components/layout'

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
  updatedAt: string
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

type StapleDueStatus = 'overdue' | 'dueToday' | 'dueSoon' | 'upcoming' | 'notDue'

interface Staple {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  frequency: 'weekly' | 'every_2_weeks' | 'every_4_weeks' | 'every_3_months'
  isActive: boolean
  lastAddedDate: string | null
  nextDueDate: string | null
  dueStatus: StapleDueStatus
  daysUntilDue: number | null
  alreadyImported?: boolean
  inInventory?: boolean
  inventoryQuantity?: number | null
  inventoryUnit?: string | null
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
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
}

interface ExcludedItem {
  id: string
  itemName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryQuantity: number
  inventoryItemId: string | null
  addedBackAt: string | null
}

export default function ShoppingListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { success, error, warning, confirm } = useNotification()

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
  const [forceAddMode, setForceAddMode] = useState(false)
  const [mealPlanOptions, setMealPlanOptions] = useState<MealPlanOption[]>([])
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [checkInventoryOnImport, setCheckInventoryOnImport] = useState(true)
  const [excludedItemsNotification, setExcludedItemsNotification] = useState<{
    count: number
    items: Array<{ itemName: string; inventoryQuantity: number; inventoryUnit: string }>
  } | null>(null)
  const [notificationExpanded, setNotificationExpanded] = useState(false)

  // Excluded items section (persistent)
  const [excludedItems, setExcludedItems] = useState<ExcludedItem[]>([])
  const [excludedSectionExpanded, setExcludedSectionExpanded] = useState(false)
  const [showAddBackModal, setShowAddBackModal] = useState(false)
  const [addBackItem, setAddBackItem] = useState<ExcludedItem | null>(null)
  const [addBackQuantity, setAddBackQuantity] = useState<string>('')
  const [addBackMode, setAddBackMode] = useState<'full' | 'difference' | 'custom'>('full')
  const [addingBack, setAddingBack] = useState(false)

  // Deduplication
  const [showDedupeModal, setShowDedupeModal] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(new Set()) // Track dismissed groups
  const [combiningGroups, setCombiningGroups] = useState<Set<string>>(new Set()) // Track which groups are being combined
  const [combiningAll, setCombiningAll] = useState(false) // Track "Combine All" operation

  // Export & Share
  const [showExportModal, setShowExportModal] = useState(false)

  // Mark All Purchased
  const [showMarkAllModal, setShowMarkAllModal] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Convert to Inventory
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertPreview, setConvertPreview] = useState<Array<{
    id: string
    itemName: string
    quantity: number
    unit: string
    category: string
    location: string | null
    shelfLifeDays: number | null
    isPurchased: boolean
    hasDuplicate: boolean
    existingQuantity: number | null
    existingUnit: string | null
  }>>([])
  const [selectedConvertItems, setSelectedConvertItems] = useState<Set<string>>(new Set())
  const [converting, setConverting] = useState(false)
  const [convertPurchasedOnly, setConvertPurchasedOnly] = useState(true)

  // Edit item modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemQuantity, setEditItemQuantity] = useState('')
  const [editItemUnit, setEditItemUnit] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
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

  // Available units for dropdown
  const [availableUnits, setAvailableUnits] = useState<Record<string, Array<{
    code: string
    name: string
    abbreviation: string
  }>>>({})

  useEffect(() => {
    fetchShoppingList()
    fetchExcludedItems()
    // Fetch available units
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units?groupByCategory=true')
        if (response.ok) {
          const data = await response.json()
          setAvailableUnits(data.units || {})
        }
      } catch (err) {
        console.error('Failed to fetch units:', err)
      }
    }
    fetchUnits()
  }, [id])

  const fetchExcludedItems = async () => {
    try {
      const response = await fetch(`/api/shopping-lists/${id}/excluded-items`)
      if (response.ok) {
        const data = await response.json()
        setExcludedItems(data.excludedItems || [])
      }
    } catch (error) {
      console.error('❌ Error fetching excluded items:', error)
    }
  }

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
    } catch (err) {
      console.error('❌ Error updating status:', err)
      error('Failed to update status')
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
    } catch (err) {
      console.error('❌ Error updating name:', err)
      error('Failed to update name')
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
    } catch (err) {
      console.error('❌ Error updating notes:', err)
      error('Failed to update notes')
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

  const handleUndoAllPurchased = async () => {
    if (!shoppingList || saving) return

    const purchasedItemsList = shoppingList.items.filter((i) => i.isPurchased)
    if (purchasedItemsList.length === 0) return

    const confirmed = await confirm({
      title: 'Undo Purchased Items',
      message: `Undo ${purchasedItemsList.length} purchased items?`,
      confirmText: 'Undo All',
    })
    if (!confirmed) return

    setSaving(true)
    try {
      console.log('🔷 Undoing all purchased items:', purchasedItemsList.length)

      // Update all purchased items to unpurchased
      await Promise.all(
        purchasedItemsList.map((item) =>
          fetch(`/api/shopping-lists/${id}/items?itemId=${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPurchased: false }),
          })
        )
      )

      console.log('🟢 All items marked as unpurchased')
      await fetchShoppingList()
    } catch (err) {
      console.error('❌ Error undoing purchased:', err)
      error('Failed to undo purchased items')
    } finally {
      setSaving(false)
    }
  }

  const handleUndoLastPurchased = async () => {
    if (!shoppingList || saving) return

    // Find the most recently updated purchased item
    const purchasedItemsList = shoppingList.items
      .filter((i) => i.isPurchased)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    if (purchasedItemsList.length === 0) return

    const lastPurchased = purchasedItemsList[0]

    setSaving(true)
    try {
      console.log('🔷 Undoing last purchased item:', lastPurchased.itemName)

      await fetch(`/api/shopping-lists/${id}/items?itemId=${lastPurchased.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPurchased: false }),
      })

      console.log('🟢 Item marked as unpurchased:', lastPurchased.itemName)
      await fetchShoppingList()
    } catch (err) {
      console.error('❌ Error undoing last purchased:', err)
      error('Failed to undo last purchased item')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAllPurchased = async () => {
    if (!shoppingList || markingAll) return

    const unpurchasedItemsList = shoppingList.items.filter((i) => !i.isPurchased)
    if (unpurchasedItemsList.length === 0) return

    setMarkingAll(true)
    try {
      console.log('🔷 Marking all items as purchased:', unpurchasedItemsList.length)

      // Update all unpurchased items to purchased
      await Promise.all(
        unpurchasedItemsList.map((item) =>
          fetch(`/api/shopping-lists/${id}/items?itemId=${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPurchased: true }),
          })
        )
      )

      console.log('🟢 All items marked as purchased')
      success(`Marked ${unpurchasedItemsList.length} items as purchased`)
      setShowMarkAllModal(false)
      await fetchShoppingList()
    } catch (err) {
      console.error('❌ Error marking all purchased:', err)
      error('Failed to mark all items as purchased')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleOpenEditModal = (item: ShoppingListItem) => {
    setEditingItem(item)
    setEditItemName(item.itemName)
    setEditItemQuantity(item.quantity.toString())
    setEditItemUnit(item.unit)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingItem || savingEdit) return
    if (!editItemName.trim() || !editItemQuantity || !editItemUnit.trim()) return

    setSavingEdit(true)
    try {
      console.log('🔷 Updating item:', editingItem.id)
      const response = await fetch(`/api/shopping-lists/${id}/items?itemId=${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: editItemName.trim(),
          quantity: parseFloat(editItemQuantity),
          unit: editItemUnit.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to update item')

      console.log('🟢 Item updated')
      setShowEditModal(false)
      setEditingItem(null)
      await fetchShoppingList()
    } catch (err) {
      console.error('❌ Error updating item:', err)
      error('Failed to update item')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleAddItem = async (skipInventoryCheck = false) => {
    if (!newItemName.trim() || !newItemQuantity || !newItemUnit.trim() || addingItem) return

    setAddingItem(true)
    try {
      console.log('🔷 Adding item:', newItemName)

      // Check inventory for existing item (unless skipped)
      if (!skipInventoryCheck) {
        try {
          const inventoryResponse = await fetch('/api/inventory')
          if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json()
            const normalizedNewName = newItemName.trim().toLowerCase()
            const matchingItem = inventoryData.items?.find((inv: { itemName: string; quantity: number; unit: string; isActive: boolean }) => {
              if (!inv.isActive) return false
              const normalizedInvName = inv.itemName.toLowerCase()
              return (
                normalizedInvName === normalizedNewName ||
                normalizedInvName.includes(normalizedNewName) ||
                normalizedNewName.includes(normalizedInvName)
              )
            })

            if (matchingItem) {
              const confirmAdd = await confirm({
                title: 'Item in Inventory',
                message: `"${matchingItem.itemName}" is in your inventory (${matchingItem.quantity} ${matchingItem.unit}). Add anyway?`,
                confirmText: 'Add Anyway',
              })
              if (!confirmAdd) {
                setAddingItem(false)
                return
              }
            }
          }
        } catch (invError) {
          console.warn('⚠️ Could not check inventory:', invError)
        }
      }

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
    } catch (err) {
      console.error('❌ Error adding item:', err)
      error('Failed to add item')
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

  // Add back excluded item
  const handleOpenAddBackModal = (item: ExcludedItem) => {
    setAddBackItem(item)
    setAddBackMode('full')
    setAddBackQuantity(item.recipeQuantity.toString())
    setShowAddBackModal(true)
  }

  const handleAddBackItem = async () => {
    if (!addBackItem || addingBack) return

    let quantity: number
    if (addBackMode === 'full') {
      quantity = addBackItem.recipeQuantity
    } else if (addBackMode === 'difference') {
      quantity = Math.max(0, addBackItem.recipeQuantity - addBackItem.inventoryQuantity)
    } else {
      quantity = parseFloat(addBackQuantity) || addBackItem.recipeQuantity
    }

    if (quantity <= 0) {
      warning('Quantity must be greater than 0')
      return
    }

    setAddingBack(true)
    try {
      console.log('🔷 Adding back excluded item:', addBackItem.itemName, 'qty:', quantity)
      const response = await fetch(`/api/shopping-lists/${id}/excluded-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludedItemId: addBackItem.id,
          quantity,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add item')
      }

      const data = await response.json()
      setExcludedItems(data.excludedItems || [])
      setShowAddBackModal(false)
      setAddBackItem(null)
      await fetchShoppingList()
      console.log('🟢 Item added back to shopping list')
    } catch (err) {
      console.error('❌ Error adding back item:', err)
      error(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAddingBack(false)
    }
  }

  const handleDismissExcludedItem = async (itemId: string) => {
    // Mark item as added back with 0 quantity (effectively dismissing it)
    try {
      const response = await fetch(`/api/shopping-lists/${id}/excluded-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludedItemId: itemId,
          quantity: 0.001, // Tiny amount to mark as "dismissed"
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setExcludedItems(data.excludedItems || [])
      }
    } catch (error) {
      console.error('❌ Error dismissing excluded item:', error)
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
      setForceAddMode(false)

      // Pre-select items that are due (overdue, dueToday, dueSoon) and not already imported
      const dueStatuses: StapleDueStatus[] = ['overdue', 'dueToday', 'dueSoon']
      const defaultSelected = new Set<string>(
        data.staples
          .filter((s: Staple) => !s.alreadyImported && dueStatuses.includes(s.dueStatus))
          .map((s: Staple) => s.id)
      )
      setSelectedStaples(defaultSelected)
      setShowStaplesModal(true)
      console.log('🟢 Loaded', data.staples.length, 'staples,', data.dueCount, 'due')
    } catch (err) {
      console.error('❌ Error fetching staples:', err)
      error('Failed to load staples')
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
    } catch (err) {
      console.error('❌ Error importing staples:', err)
      error('Failed to import staples')
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
    } catch (err) {
      console.error('❌ Error fetching meal plans:', err)
      error('Failed to load meal plans')
    }
  }

  const handleImportMealPlan = async () => {
    if (!selectedMealPlan || importing) return

    setImporting(true)
    setExcludedItemsNotification(null) // Clear previous notification
    try {
      console.log('🔷 Importing from meal plan:', selectedMealPlan, 'checkInventory:', checkInventoryOnImport)
      const response = await fetch(`/api/shopping-lists/${id}/import/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId: selectedMealPlan,
          checkInventory: checkInventoryOnImport,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import from meal plan')
      }

      const data = await response.json()
      console.log('🟢 Imported', data.importedCount, 'ingredients')
      console.log('🟢 Duplicates removed (server-side):', data.duplicatesRemoved || 0)
      console.log('🟢 Excluded from inventory:', data.excludedFromInventory || 0)
      console.log('🟢 Final item count:', data.finalItemCount || data.importedCount)
      setShowMealPlanModal(false)
      await fetchShoppingList()

      // Show excluded items notification if any items were excluded due to inventory
      if (data.excludedFromInventory > 0 && data.items) {
        // Fetch the excluded items details
        try {
          const excludedResponse = await fetch(`/api/shopping-lists/${id}/excluded-items`)
          if (excludedResponse.ok) {
            const excludedData = await excludedResponse.json()
            setExcludedItemsNotification({
              count: data.excludedFromInventory,
              items: excludedData.excludedItems?.map((item: { itemName: string; inventoryQuantity: number; recipeUnit: string; inventoryItem?: { unit: string } }) => ({
                itemName: item.itemName,
                inventoryQuantity: item.inventoryQuantity,
                inventoryUnit: item.inventoryItem?.unit || item.recipeUnit || '',
              })) || [],
            })
            setNotificationExpanded(false) // Reset expansion state for new notification
          }
        } catch (excludedError) {
          console.warn('⚠️ Could not fetch excluded items details:', excludedError)
          // Still show notification with count only
          setExcludedItemsNotification({
            count: data.excludedFromInventory,
            items: [],
          })
        }
      }
    } catch (err) {
      console.error('❌ Error importing meal plan:', err)
      error(err instanceof Error ? err.message : 'Failed to import from meal plan')
    } finally {
      setImporting(false)
    }
  }

  // Deduplication
  const handleOpenDedupeModal = async () => {
    // Reset dismissed groups when opening modal
    setDismissedGroups(new Set())
    setLastCombineResult(null)

    try {
      console.log('🔷 Finding duplicates with AI semantic matching')
      // Use AI matching for comprehensive duplicate detection
      const response = await fetch(`/api/shopping-lists/${id}/deduplicate?useAI=true`)
      if (!response.ok) throw new Error('Failed to find duplicates')

      const data = await response.json()
      console.log('🟢 Duplicate summary:', data.summary)
      setDuplicateGroups(data.duplicateGroups || [])
      setShowDedupeModal(true)
    } catch (err) {
      console.error('❌ Error finding duplicates:', err)
      error('Failed to find duplicates')
    }
  }

  const handleDeduplicate = async (itemIds: string[], useAI: boolean = true, groupKey: string) => {
    // Check if this specific group is already being combined
    if (combiningGroups.has(groupKey) || combiningAll) return

    // Capture the current total before combining
    const previousTotal = shoppingList?.items.length || 0

    // Add this group to the combining set
    setCombiningGroups(prev => new Set(prev).add(groupKey))
    setLastCombineResult(null) // Clear previous result
    try {
      console.log('🔷 Deduplicating items:', itemIds, 'useAI:', useAI, 'group:', groupKey)
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

      // Refresh duplicates list (use AI matching to stay consistent)
      const refreshResponse = await fetch(`/api/shopping-lists/${id}/deduplicate?useAI=true`)
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
    } catch (err) {
      console.error('❌ Error deduplicating:', err)
      error(err instanceof Error ? err.message : 'Failed to deduplicate')
    } finally {
      // Remove this group from the combining set
      setCombiningGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupKey)
        return newSet
      })
    }
  }

  // Combine all duplicate groups at once (only non-dismissed)
  const handleCombineAll = async () => {
    // Use visible groups (filter out dismissed) - we access visibleDuplicateGroups at call time
    const groupsToCombine = duplicateGroups.filter((g) => !dismissedGroups.has(g.normalizedName))
    if (combiningAll || combiningGroups.size > 0 || groupsToCombine.length === 0) return

    const previousTotal = shoppingList?.items.length || 0
    const groupCount = groupsToCombine.length

    setCombiningAll(true)
    setLastCombineResult(null)

    let totalItemsCombined = 0

    try {
      console.log('🔷 Combining all', groupCount, 'duplicate groups (excluding dismissed)')

      // Process each group sequentially
      for (const group of groupsToCombine) {
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
      const refreshResponse = await fetch(`/api/shopping-lists/${id}/deduplicate?useAI=true`)
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
    } catch (err) {
      console.error('❌ Error combining all:', err)
      error(err instanceof Error ? err.message : 'Failed to combine all')
    } finally {
      setCombiningAll(false)
    }
  }

  // Dismiss a duplicate group (removes from current suggestions)
  const handleDismissGroup = (normalizedName: string) => {
    setDismissedGroups((prev) => new Set([...prev, normalizedName]))
    console.log('🔷 Dismissed duplicate group:', normalizedName)
  }

  // Get visible (non-dismissed) duplicate groups
  const visibleDuplicateGroups = duplicateGroups.filter(
    (group) => !dismissedGroups.has(group.normalizedName)
  )

  // Convert to Inventory
  const handleOpenConvertModal = async () => {
    try {
      console.log('🔷 Fetching conversion preview')
      const response = await fetch(`/api/shopping-lists/${id}/convert-to-inventory?purchasedOnly=${convertPurchasedOnly}`)
      if (!response.ok) throw new Error('Failed to fetch preview')

      const data = await response.json()
      setConvertPreview(data.items || [])

      // Pre-select all purchased items
      const purchasedIds = new Set<string>(
        data.items.filter((i: { isPurchased: boolean }) => i.isPurchased).map((i: { id: string }) => i.id)
      )
      setSelectedConvertItems(purchasedIds)
      setShowConvertModal(true)
      console.log('🟢 Loaded', data.items.length, 'items for conversion preview')
    } catch (err) {
      console.error('❌ Error fetching conversion preview:', err)
      error('Failed to load conversion preview')
    }
  }

  const handleConvertToInventory = async () => {
    if (selectedConvertItems.size === 0 || converting) return

    setConverting(true)
    try {
      console.log('🔷 Converting', selectedConvertItems.size, 'items to inventory')
      const response = await fetch(`/api/shopping-lists/${id}/convert-to-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: Array.from(selectedConvertItems),
          autoExpiry: true,
          autoCategory: true,
          autoLocation: true,
          mergeWithExisting: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert items')
      }

      const data = await response.json()
      console.log('🟢 Converted to inventory:', data)
      setShowConvertModal(false)
      await fetchShoppingList()

      // Show success message
      success(`Successfully added to inventory: ${data.created} new items created, ${data.merged} items merged with existing`)
    } catch (err) {
      console.error('❌ Error converting to inventory:', err)
      error(err instanceof Error ? err.message : 'Failed to convert items')
    } finally {
      setConverting(false)
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

  // Get unpurchased items grouped by category, sorted alphabetically
  const unpurchasedItemsByCategory = Object.entries(itemsByCategory).reduce(
    (acc, [category, items]) => {
      const unpurchased = items
        .filter((item) => !item.isPurchased)
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
      if (unpurchased.length > 0) {
        acc[category] = unpurchased
      }
      return acc
    },
    {} as Record<string, ShoppingListItem[]>
  )

  // Get purchased items grouped by category, sorted alphabetically
  const purchasedItemsByCategory = Object.entries(itemsByCategory).reduce(
    (acc, [category, items]) => {
      const purchased = items
        .filter((item) => item.isPurchased)
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
      if (purchased.length > 0) {
        acc[category] = purchased
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
    <AppLayout userEmail={session?.user?.email || undefined}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/shopping-lists" className="text-purple-400 hover:text-purple-300 mb-4 inline-block text-sm">
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
            <div className="flex gap-2">
              {/* Export & Share - always visible */}
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:opacity-90 text-sm flex items-center gap-2"
                title="Export & Share"
              >
                ↗ Export & Share
              </button>

              {shoppingList.status === 'Draft' && (
                <>
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
                </>
              )}
              {shoppingList.status === 'Finalized' && (
                <>
                  {purchasedItems > 0 && (
                    <>
                      <button
                        onClick={handleOpenConvertModal}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-2"
                        title="Add purchased items to inventory"
                      >
                        📦 Add to Inventory
                      </button>
                    </>
                  )}
                  {/* Mark All Purchased button - only show when there are unpurchased items */}
                  {totalItems > purchasedItems && (
                    <button
                      onClick={() => setShowMarkAllModal(true)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm flex items-center gap-2"
                      title="Mark all remaining items as purchased"
                    >
                      ✓ Mark All Purchased
                    </button>
                  )}
                  {purchasedItems > 0 && (
                    <button
                      onClick={handleUndoLastPurchased}
                      disabled={saving}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm"
                      title="Undo the most recently purchased item"
                    >
                      Undo Last
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus('Archived')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                  >
                    Archive
                  </button>
                </>
              )}
            </div>
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

        {/* Excluded Items Notification (shown after meal plan import) */}
        {excludedItemsNotification && (
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-blue-300 font-medium">
                  {excludedItemsNotification.count} item{excludedItemsNotification.count !== 1 ? 's' : ''} skipped
                </p>
                <p className="text-blue-300/80 text-sm mt-1">
                  Already in your inventory - no need to buy:
                </p>
                {excludedItemsNotification.items.length > 0 && (
                  <ul className="text-sm text-blue-300/70 mt-2 space-y-0.5">
                    {(notificationExpanded
                      ? excludedItemsNotification.items
                      : excludedItemsNotification.items.slice(0, 5)
                    ).map((item, idx) => (
                      <li key={idx}>• {item.itemName} ({item.inventoryQuantity}{item.inventoryUnit ? ` ${item.inventoryUnit}` : ''} in stock)</li>
                    ))}
                    {excludedItemsNotification.items.length > 5 && (
                      <li>
                        <button
                          onClick={() => setNotificationExpanded(!notificationExpanded)}
                          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          {notificationExpanded
                            ? '▲ show less'
                            : `...and ${excludedItemsNotification.items.length - 5} more ▼`
                          }
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setExcludedItemsNotification(null)}
                className="text-blue-400 hover:text-blue-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                onClick={() => handleAddItem()}
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
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            {totalItems === 0 ? (
              <>
                {/* Empty list state with emojis */}
                <div className="mb-4">
                  <div className="text-5xl mb-2">🛒</div>
                  <div className="flex justify-center gap-2 opacity-50">
                    <span className="text-2xl">🥕</span>
                    <span className="text-2xl">🥛</span>
                    <span className="text-2xl">🍞</span>
                    <span className="text-2xl">🧀</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Your shopping list is empty
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  Add items manually or import from your meal plans and staples
                </p>
                {shoppingList.status === 'Draft' && (
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
                    >
                      + Add First Item
                    </button>
                    <button
                      onClick={handleOpenMealPlanModal}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                    >
                      Import from Meal Plan
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* All done state */}
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                  All done!
                </h3>
                <p className="text-sm text-gray-400">
                  You&apos;ve purchased all {totalItems} items
                </p>
              </>
            )}
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
                        onClick={() => shoppingList.status === 'Finalized' && handleTogglePurchased(item.id, item.isPurchased)}
                        disabled={shoppingList.status !== 'Finalized'}
                        title={shoppingList.status !== 'Finalized' ? 'Finalize the list to mark items as purchased' : 'Mark as purchased'}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${
                          shoppingList.status === 'Finalized'
                            ? 'border-gray-500 hover:border-green-500 cursor-pointer'
                            : 'border-gray-700 cursor-not-allowed opacity-50'
                        }`}
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Edit item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Purchased Items Section */}
        {Object.keys(purchasedItemsByCategory).length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-400">Purchased Items ({purchasedItems})</h3>
            </div>
            <div className="space-y-4 opacity-60">
              {Object.entries(purchasedItemsByCategory).map(([category, items]) => (
                <div key={`purchased-${category}`} className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-750 border-b border-gray-700">
                    <h3 className="text-gray-400 font-medium">{category}</h3>
                    <span className="text-sm text-gray-500">{items.length} items</span>
                  </div>
                  <ul className="divide-y divide-gray-700">
                    {items.map((item) => (
                      <li key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-750">
                        <button
                          onClick={() => shoppingList.status === 'Finalized' && handleTogglePurchased(item.id, item.isPurchased)}
                          disabled={shoppingList.status !== 'Finalized'}
                          title={shoppingList.status !== 'Finalized' ? 'List must be finalized to modify items' : 'Undo purchase'}
                          className={`w-6 h-6 rounded-full flex-shrink-0 transition-colors flex items-center justify-center ${
                            shoppingList.status === 'Finalized'
                              ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                              : 'bg-green-800 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 line-through">{item.itemName}</span>
                            {item.isConsolidated && (
                              <span className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">
                                combined
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

        {/* Excluded Items Section (items skipped due to inventory) */}
        {excludedItems.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExcludedSectionExpanded(!excludedSectionExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${excludedSectionExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-400 font-medium">
                  Excluded Items ({excludedItems.length})
                </span>
              </div>
              <span className="text-xs text-gray-500">Already in inventory</span>
            </button>

            {excludedSectionExpanded && (
              <div className="border-t border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-750">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Recipe Needed</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">In Inventory</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {excludedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-750">
                          <td className="px-4 py-3 text-white">{item.itemName}</td>
                          <td className="px-4 py-3 text-gray-400">
                            {item.recipeQuantity} {item.recipeUnit}
                          </td>
                          <td className="px-4 py-3 text-green-400">
                            {item.inventoryQuantity} {item.recipeUnit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {shoppingList.status === 'Draft' && (
                                <>
                                  <button
                                    onClick={() => handleOpenAddBackModal(item)}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => handleDismissExcludedItem(item.id)}
                                    className="text-xs px-2 py-1 text-gray-400 hover:text-gray-300"
                                    title="Dismiss"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Back Excluded Item Modal */}
      {showAddBackModal && addBackItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Add {addBackItem.itemName}</h2>
              <p className="text-sm text-gray-400 mt-1">Choose how much to add to shopping list</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-750 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Recipe needs:</span>
                  <span>{addBackItem.recipeQuantity} {addBackItem.recipeUnit}</span>
                </div>
                <div className="flex justify-between text-green-400 mt-1">
                  <span>In inventory:</span>
                  <span>{addBackItem.inventoryQuantity} {addBackItem.recipeUnit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={addBackMode === 'full'}
                    onChange={() => {
                      setAddBackMode('full')
                      setAddBackQuantity(addBackItem.recipeQuantity.toString())
                    }}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">
                    Add full amount ({addBackItem.recipeQuantity} {addBackItem.recipeUnit})
                  </span>
                </label>

                {addBackItem.inventoryQuantity < addBackItem.recipeQuantity && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={addBackMode === 'difference'}
                      onChange={() => {
                        setAddBackMode('difference')
                        setAddBackQuantity((addBackItem.recipeQuantity - addBackItem.inventoryQuantity).toString())
                      }}
                      className="text-blue-500"
                    />
                    <span className="text-gray-300">
                      Add difference ({(addBackItem.recipeQuantity - addBackItem.inventoryQuantity).toFixed(1)} {addBackItem.recipeUnit})
                    </span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={addBackMode === 'custom'}
                    onChange={() => setAddBackMode('custom')}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">Custom amount:</span>
                  <input
                    type="number"
                    value={addBackQuantity}
                    onChange={(e) => {
                      setAddBackQuantity(e.target.value)
                      setAddBackMode('custom')
                    }}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    min="0.1"
                    step="0.1"
                  />
                  <span className="text-gray-400">{addBackItem.recipeUnit}</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddBackModal(false)
                  setAddBackItem(null)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBackItem}
                disabled={addingBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addingBack ? 'Adding...' : 'Add to List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Staples Modal */}
      {showStaplesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Import from Staples</h2>
              <p className="text-sm text-gray-400 mt-1">Items due for restocking are pre-selected</p>
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(() => {
                  const dueToday = staples.filter(s => s.dueStatus === 'dueToday' && !s.alreadyImported).length
                  const overdue = staples.filter(s => s.dueStatus === 'overdue' && !s.alreadyImported).length
                  const dueSoon = staples.filter(s => s.dueStatus === 'dueSoon' && !s.alreadyImported).length
                  return (
                    <>
                      {overdue > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-300 border border-red-700">
                          {overdue} Overdue
                        </span>
                      )}
                      {dueToday > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">
                          {dueToday} Due Today
                        </span>
                      )}
                      {dueSoon > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                          {dueSoon} Due Soon
                        </span>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {staples.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No active staples found.</p>
                  <a href="/staples" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
                    Go to Staples to add items →
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Selection controls */}
                  <div className="flex justify-between items-center text-sm mb-3">
                    <div className="flex gap-3 text-gray-400">
                      <button
                        onClick={() => {
                          const dueStatuses: StapleDueStatus[] = ['overdue', 'dueToday', 'dueSoon']
                          setSelectedStaples(new Set(
                            staples.filter(s => !s.alreadyImported && dueStatuses.includes(s.dueStatus)).map(s => s.id)
                          ))
                        }}
                        className="hover:text-white"
                      >
                        Select due
                      </button>
                      <button
                        onClick={() => setSelectedStaples(new Set(staples.filter((s) => !s.alreadyImported).map((s) => s.id)))}
                        className="hover:text-white"
                      >
                        Select all
                      </button>
                      <button onClick={() => setSelectedStaples(new Set())} className="hover:text-white">
                        Clear
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceAddMode}
                        onChange={(e) => setForceAddMode(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs">Show all (force add)</span>
                    </label>
                  </div>

                  {/* Staples list */}
                  {staples
                    .filter(staple => forceAddMode || staple.dueStatus !== 'notDue' || staple.alreadyImported)
                    .map((staple) => {
                      // Due status badge helper
                      const getDueStatusBadge = (status: StapleDueStatus) => {
                        switch (status) {
                          case 'overdue':
                            return <span className="px-1.5 py-0.5 text-xs rounded bg-red-900/50 text-red-300">Overdue</span>
                          case 'dueToday':
                            return <span className="px-1.5 py-0.5 text-xs rounded bg-orange-900/50 text-orange-300">Due Today</span>
                          case 'dueSoon':
                            return <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-900/50 text-yellow-300">Due Soon</span>
                          case 'upcoming':
                            return <span className="px-1.5 py-0.5 text-xs rounded bg-blue-900/50 text-blue-300">Upcoming</span>
                          case 'notDue':
                            return <span className="px-1.5 py-0.5 text-xs rounded bg-gray-700 text-gray-400">Not Due</span>
                          default:
                            return null
                        }
                      }

                      return (
                        <label
                          key={staple.id}
                          className={`flex items-center gap-3 p-3 rounded border transition-colors cursor-pointer ${
                            staple.alreadyImported
                              ? 'opacity-50 border-gray-700 bg-gray-800/50'
                              : selectedStaples.has(staple.id)
                              ? 'border-purple-500 bg-purple-900/20'
                              : 'border-gray-700 hover:bg-gray-700'
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
                            className="w-4 h-4 rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium">{staple.itemName}</span>
                              {getDueStatusBadge(staple.dueStatus)}
                              {staple.inInventory && (
                                <span
                                  className="px-1.5 py-0.5 text-xs rounded bg-green-900/50 text-green-300 border border-green-700"
                                  title={`In inventory: ${staple.inventoryQuantity} ${staple.inventoryUnit}`}
                                >
                                  In Inventory
                                </span>
                              )}
                              {staple.alreadyImported && (
                                <span className="text-yellow-500 text-xs">(imported)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 mt-0.5">
                              {staple.quantity} {staple.unit}
                              {staple.category && (
                                <span className="text-gray-500 ml-2">• {staple.category}</span>
                              )}
                              {staple.daysUntilDue !== null && staple.daysUntilDue > 0 && (
                                <span className="text-gray-500 ml-2">• in {staple.daysUntilDue}d</span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}

                  {/* Show count of hidden items when not in force-add mode */}
                  {!forceAddMode && (() => {
                    const hiddenCount = staples.filter(s => s.dueStatus === 'notDue' && !s.alreadyImported).length
                    if (hiddenCount > 0) {
                      return (
                        <p className="text-center text-sm text-gray-500 py-2 mt-2 border-t border-gray-700">
                          {hiddenCount} items not yet due.{' '}
                          <button
                            onClick={() => setForceAddMode(true)}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            Show all
                          </button>
                        </p>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-750 border-t border-gray-700 flex justify-between items-center">
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
                  {importing ? 'Importing...' : `Import ${selectedStaples.size} Item${selectedStaples.size !== 1 ? 's' : ''}`}
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
              {/* Inventory check toggle */}
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkInventoryOnImport}
                  onChange={(e) => setCheckInventoryOnImport(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500"
                />
                <span className="text-sm text-gray-300">Skip items already in inventory</span>
                <span className="text-xs text-gray-500">(recommended)</span>
              </label>
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
              {visibleDuplicateGroups.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✨</div>
                  <p className="text-emerald-400 font-medium mb-1">
                    {lastCombineResult ? 'All duplicates have been combined!' : 'No duplicates found!'}
                  </p>
                  <p className="text-sm text-gray-400">Your shopping list is already optimized</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleDuplicateGroups.map((group) => (
                    <div key={group.normalizedName} className="bg-gray-750 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-semibold">{group.normalizedName}</h4>
                          {/* Confidence badge with updated colors */}
                          {group.confidence && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                              group.confidence === 'HIGH'
                                ? 'bg-red-500/20 text-red-500'
                                : group.confidence === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {group.confidence}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeduplicate(group.items.map((i) => i.id), true, group.normalizedName)}
                            disabled={combiningGroups.has(group.normalizedName) || combiningAll}
                            className="px-3 py-1 text-xs rounded-md bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
                          >
                            {combiningGroups.has(group.normalizedName) ? 'Combining...' : 'Combine'}
                          </button>
                          <button
                            onClick={() => handleDismissGroup(group.normalizedName)}
                            className="px-3 py-1 text-xs rounded-md bg-gray-600 hover:bg-gray-500 text-gray-300 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <ul className="text-sm text-gray-400 space-y-0.5 mb-2">
                        {group.items.map((item) => (
                          <li key={item.id}>
                            {item.itemName}: {item.quantity} {item.unit}
                          </li>
                        ))}
                      </ul>
                      {group.canCombine && group.combinedResult && (
                        <p className="text-sm text-emerald-400">
                          → Combined: {group.combinedResult.quantity} {group.combinedResult.unit}
                        </p>
                      )}
                      {!group.canCombine && (
                        <p className="text-sm text-emerald-400">→ AI will determine best combination</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-between">
              <div className="text-sm text-gray-400">
                {visibleDuplicateGroups.length > 0 && `${visibleDuplicateGroups.length} duplicate group${visibleDuplicateGroups.length !== 1 ? 's' : ''} found`}
              </div>
              <div className="flex gap-3">
                {visibleDuplicateGroups.length > 0 && (
                  <button
                    onClick={handleCombineAll}
                    disabled={combiningAll || combiningGroups.size > 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {combiningAll ? 'Combining...' : 'Combine All'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDedupeModal(false)
                    setLastCombineResult(null)
                    setCombiningGroups(new Set())
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

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Edit Item</h2>
              <p className="text-sm text-gray-400 mt-1">Update the item name or quantity</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Item name"
                />
                {editingItem.itemName !== editItemName.trim() && editItemName.trim() && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Original: {editingItem.itemName}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editItemQuantity}
                    onChange={(e) => setEditItemQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Quantity"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Unit</label>
                  <select
                    value={editItemUnit}
                    onChange={(e) => setEditItemUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">Select Unit</option>
                    {Object.entries(availableUnits).map(([category, units]) => (
                      <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                        {units.map((unit) => (
                          <option key={unit.code} value={unit.abbreviation}>
                            {unit.abbreviation} ({unit.name})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-750 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingItem(null)
                }}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editItemName.trim() || !editItemQuantity || !editItemUnit.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Inventory Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Add to Inventory</h2>
              <p className="text-sm text-gray-400 mt-1">
                Convert purchased shopping list items to your inventory
              </p>
              <div className="flex items-center gap-4 mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertPurchasedOnly}
                    onChange={(e) => {
                      setConvertPurchasedOnly(e.target.checked)
                      // Refetch preview with new filter
                      fetch(`/api/shopping-lists/${id}/convert-to-inventory?purchasedOnly=${e.target.checked}`)
                        .then(res => res.json())
                        .then(data => {
                          setConvertPreview(data.items || [])
                          const purchasedIds = new Set<string>(
                            data.items.filter((i: { isPurchased: boolean }) => i.isPurchased).map((i: { id: string }) => i.id)
                          )
                          setSelectedConvertItems(purchasedIds)
                        })
                        .catch(err => console.error('❌ Error refetching:', err))
                    }}
                    className="w-4 h-4 rounded"
                  />
                  Purchased only
                </label>
                <span className="text-xs text-gray-500">
                  {convertPreview.filter(i => i.isPurchased).length} purchased / {convertPreview.length} total
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {convertPreview.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No items eligible for conversion.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {convertPurchasedOnly
                      ? 'Mark items as purchased to add them to inventory.'
                      : 'All items have already been added to inventory.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Selection controls */}
                  <div className="flex justify-between items-center text-sm mb-3">
                    <div className="flex gap-3 text-gray-400">
                      <button
                        onClick={() => setSelectedConvertItems(new Set(convertPreview.map(i => i.id)))}
                        className="hover:text-white"
                      >
                        Select all
                      </button>
                      <button
                        onClick={() => setSelectedConvertItems(new Set(
                          convertPreview.filter(i => i.isPurchased).map(i => i.id)
                        ))}
                        className="hover:text-white"
                      >
                        Select purchased
                      </button>
                      <button
                        onClick={() => setSelectedConvertItems(new Set())}
                        className="hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <span className="text-gray-500">{selectedConvertItems.size} selected</span>
                  </div>

                  {/* Items list */}
                  {convertPreview.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
                        selectedConvertItems.has(item.id)
                          ? 'border-teal-500 bg-teal-900/20'
                          : 'border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedConvertItems.has(item.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedConvertItems)
                          if (e.target.checked) {
                            newSet.add(item.id)
                          } else {
                            newSet.delete(item.id)
                          }
                          setSelectedConvertItems(newSet)
                        }}
                        className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium">{item.itemName}</span>
                          {item.isPurchased && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-green-900/50 text-green-400">
                              Purchased
                            </span>
                          )}
                          {item.hasDuplicate && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-900/50 text-yellow-400">
                              Will merge
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>{item.quantity} {item.unit}</span>
                          <span className="text-gray-500">→ {item.category}</span>
                          {item.location && (
                            <span className="text-gray-500">• {item.location}</span>
                          )}
                          {item.shelfLifeDays && (
                            <span className="text-gray-500">• ~{item.shelfLifeDays} days shelf life</span>
                          )}
                        </div>
                        {item.hasDuplicate && item.existingQuantity !== null && (
                          <p className="text-xs text-yellow-400/80 mt-1">
                            Existing: {item.existingQuantity} {item.existingUnit} (will be merged)
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-750 border-t border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {selectedConvertItems.size > 0 && (
                  <>
                    {selectedConvertItems.size} item{selectedConvertItems.size !== 1 ? 's' : ''} will be added
                    {convertPreview.filter(i => selectedConvertItems.has(i.id) && i.hasDuplicate).length > 0 && (
                      <span className="text-yellow-400 ml-2">
                        ({convertPreview.filter(i => selectedConvertItems.has(i.id) && i.hasDuplicate).length} will merge)
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertToInventory}
                  disabled={selectedConvertItems.size === 0 || converting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {converting ? 'Adding...' : `Add ${selectedConvertItems.size} to Inventory`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark All Purchased Confirmation Modal */}
      {showMarkAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mark All as Purchased?</h3>
              <p className="text-sm text-gray-400 mb-6">
                This will mark all <strong className="text-white">{totalItems - purchasedItems} remaining items</strong> as purchased.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowMarkAllModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAllPurchased}
                  disabled={markingAll}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium"
                >
                  {markingAll ? 'Marking...' : 'Yes, Mark All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export & Share Modal */}
      <ExportShareModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        shoppingList={shoppingList}
        itemsByCategory={itemsByCategory}
      />
    </AppLayout>
  )
}
