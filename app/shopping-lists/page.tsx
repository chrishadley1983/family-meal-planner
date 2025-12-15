'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useNotification } from '@/components/providers/NotificationProvider'

interface ShoppingListMealPlan {
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
  weekStartDate: string | null
  status: 'Draft' | 'Finalized' | 'Archived'
  createdAt: string
  updatedAt: string
  finalizedAt: string | null
  archivedAt: string | null
  itemCount?: number
  unpurchasedCount?: number
  mealPlans?: ShoppingListMealPlan[]
}

export default function ShoppingListsPage() {
  const router = useRouter()
  const { error, confirm } = useNotification()
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListNotes, setNewListNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchShoppingLists()
  }, [])

  const fetchShoppingLists = async () => {
    try {
      console.log('🔷 Fetching shopping lists...')
      const response = await fetch('/api/shopping-lists?includeItems=true')
      const data = await response.json()
      console.log('🟢 Shopping lists fetched:', data.shoppingLists?.length || 0)
      setShoppingLists(data.shoppingLists || [])
    } catch (error) {
      console.error('❌ Error fetching shopping lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async () => {
    if (creating) return

    setCreating(true)
    try {
      console.log('🔷 Creating new shopping list...')
      const response = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName || undefined,
          notes: newListNotes || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create shopping list')
      }

      const data = await response.json()
      console.log('🟢 Created shopping list:', data.shoppingList.name)

      // Navigate to the new list
      router.push(`/shopping-lists/${data.shoppingList.id}`)
    } catch (err) {
      console.error('❌ Error creating shopping list:', err)
      error(err instanceof Error ? err.message : 'Failed to create shopping list')
    } finally {
      setCreating(false)
      setShowCreateModal(false)
      setNewListName('')
      setNewListNotes('')
    }
  }

  const handleDeleteList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation()
    const confirmed = await confirm({
      title: 'Delete Shopping List',
      message: 'Are you sure you want to delete this shopping list?',
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    try {
      console.log('🔷 Deleting shopping list:', listId)
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete shopping list')
      }

      console.log('🟢 Shopping list deleted')
      setShoppingLists((lists) => lists.filter((l) => l.id !== listId))
    } catch (err) {
      console.error('❌ Error deleting shopping list:', err)
      error('Failed to delete shopping list')
    }
  }

  const handleArchiveList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation()

    try {
      console.log('🔷 Archiving shopping list:', listId)
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Archived' }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive shopping list')
      }

      const data = await response.json()
      console.log('🟢 Shopping list archived')
      setShoppingLists((lists) =>
        lists.map((l) => (l.id === listId ? data.shoppingList : l))
      )
    } catch (err) {
      console.error('❌ Error archiving shopping list:', err)
      error('Failed to archive shopping list')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-500">
            Draft
          </span>
        )
      case 'Finalized':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-500">
            Finalized
          </span>
        )
      case 'Archived':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/20 text-gray-500">
            Archived
          </span>
        )
      default:
        return null
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'border-l-amber-500'
      case 'Finalized':
        return 'border-l-emerald-500'
      case 'Archived':
        return 'border-l-gray-500'
      default:
        return ''
    }
  }

  const filteredLists =
    filterStatus === 'all'
      ? shoppingLists
      : shoppingLists.filter((l) => l.status === filterStatus)

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">Shopping Lists</h1>
              <p className="text-gray-400 mt-1">
                Manage your shopping lists and import from meal plans
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              + New List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 mr-2">Filter:</span>
            {['all', 'Draft', 'Finalized', 'Archived'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterStatus === status
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading shopping lists...</p>
          </div>
        ) : filteredLists.length === 0 ? (
          /* Empty State */
          <div className="bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">
              {filterStatus === 'all'
                ? 'No shopping lists yet'
                : `No ${filterStatus.toLowerCase()} shopping lists`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filterStatus === 'all'
                ? 'Create your first shopping list to get started'
                : `No shopping lists with status: ${filterStatus}`}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Shopping List
              </button>
            )}
          </div>
        ) : (
          /* Shopping Lists Grid */
          <div className="flex flex-col gap-4">
            {filteredLists.map((list) => (
              <div
                key={list.id}
                onClick={() => router.push(`/shopping-lists/${list.id}`)}
                className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-750 transition-all border border-gray-700 border-l-[3px] ${getStatusBorderColor(list.status)}`}
              >
                <div className="p-5">
                  {/* Title and Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-base font-semibold text-white">
                      {list.name}
                    </h3>
                    {getStatusBadge(list.status)}
                  </div>

                  {/* Item counts and meal plans */}
                  <div className="flex items-center gap-6 text-sm text-gray-400 mb-2">
                    <span>
                      Items:{' '}
                      {list.unpurchasedCount !== undefined ? (
                        <>
                          <span className="text-emerald-500">
                            {list.itemCount! - list.unpurchasedCount}
                          </span>
                          {' / '}
                          <span className="text-white">{list.itemCount}</span>
                          {' purchased'}
                        </>
                      ) : (
                        <span className="text-white">{list.itemCount || 0}</span>
                      )}
                    </span>
                    {list.mealPlans && list.mealPlans.length > 0 && (
                      <span>
                        📋 {list.mealPlans.length} meal plan
                        {list.mealPlans.length !== 1 ? 's' : ''} linked
                      </span>
                    )}
                  </div>

                  {/* Date info and Delete */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Created {format(new Date(list.createdAt), 'MMM d, yyyy')} · Updated {format(new Date(list.updatedAt), 'MMM d')}
                    </div>
                    <button
                      onClick={(e) => handleDeleteList(e, list.id)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <Link
            href="/shopping-lists/settings"
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            Manage shopping list categories →
          </Link>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Create Shopping List
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Weekly groceries"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank for auto-generated name based on date
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newListNotes}
                    onChange={(e) => setNewListNotes(e.target.value)}
                    placeholder="Any notes for this shopping list..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-750 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewListName('')
                  setNewListNotes('')
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
