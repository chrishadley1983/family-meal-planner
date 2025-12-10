'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  displayOrder: number
  isDefault: boolean
}

export default function ShoppingListSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add category state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  // Edit category state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log('🔷 Fetching categories')
      const response = await fetch('/api/shopping-lists/categories')
      const data = await response.json()
      console.log('🟢 Categories fetched:', data.categories?.length || 0)
      setCategories(data.categories || [])
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || addingCategory) return

    setAddingCategory(true)
    try {
      console.log('🔷 Adding category:', newCategoryName)
      const response = await fetch('/api/shopping-lists/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add category')
      }

      console.log('🟢 Category added')
      setNewCategoryName('')
      await fetchCategories()
    } catch (error) {
      console.error('❌ Error adding category:', error)
      alert(error instanceof Error ? error.message : 'Failed to add category')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editName.trim() || saving) return

    setSaving(true)
    try {
      console.log('🔷 Updating category:', id)
      const response = await fetch(`/api/shopping-lists/categories?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update category')
      }

      console.log('🟢 Category updated')
      setEditingId(null)
      setEditName('')
      await fetchCategories()
    } catch (error) {
      console.error('❌ Error updating category:', error)
      alert(error instanceof Error ? error.message : 'Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Items in this category will become uncategorized.`)) return

    try {
      console.log('🔷 Deleting category:', id)
      const response = await fetch(`/api/shopping-lists/categories?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete category')

      console.log('🟢 Category deleted')
      await fetchCategories()
    } catch (error) {
      console.error('❌ Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  const handleResetToDefaults = async () => {
    if (!confirm('Reset all categories to defaults? This will delete any custom categories.')) return

    try {
      console.log('🔷 Resetting categories to defaults')
      const response = await fetch('/api/shopping-lists/categories?action=reset', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to reset categories')

      console.log('🟢 Categories reset to defaults')
      await fetchCategories()
    } catch (error) {
      console.error('❌ Error resetting categories:', error)
      alert('Failed to reset categories')
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    // Reorder categories
    const draggedIndex = categories.findIndex((c) => c.id === draggedId)
    const targetIndex = categories.findIndex((c) => c.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    // Create new order
    const newCategories = [...categories]
    const [removed] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, removed)

    // Optimistically update UI
    setCategories(newCategories)
    setDraggedId(null)

    // Save to backend
    try {
      console.log('🔷 Reordering categories')
      const response = await fetch('/api/shopping-lists/categories?action=reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: newCategories.map((c) => c.id) }),
      })

      if (!response.ok) throw new Error('Failed to reorder categories')

      console.log('🟢 Categories reordered')
    } catch (error) {
      console.error('❌ Error reordering categories:', error)
      // Revert on failure
      await fetchCategories()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/shopping-lists" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Shopping Lists
          </Link>
          <h1 className="text-2xl font-bold text-white">Shopping List Categories</h1>
          <p className="text-gray-400 mt-1">Manage how your shopping items are organized</p>
        </div>

        {/* Add Category Form */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-white font-medium mb-3">Add New Category</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || addingCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCategory ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-750 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-white font-medium">Categories</h2>
            <span className="text-sm text-gray-400">Drag to reorder</span>
          </div>

          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No categories yet</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {categories.map((category, index) => (
                <li
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category.id)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-move hover:bg-gray-750 transition-colors ${
                    draggedId === category.id ? 'opacity-50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-gray-500 flex-shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>

                  {/* Order Number */}
                  <span className="text-gray-500 text-sm w-6 flex-shrink-0">{index + 1}</span>

                  {/* Category Name */}
                  <div className="flex-1 min-w-0">
                    {editingId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(category.id)
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditName('')
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUpdateCategory(category.id)}
                          disabled={saving}
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditName('')
                          }}
                          className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white">{category.name}</span>
                        {category.isDefault && (
                          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">default</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== category.id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(category.id)
                          setEditName(category.name)
                        }}
                        className="text-gray-400 hover:text-white p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reset to Defaults */}
        <div className="text-center">
          <button
            onClick={handleResetToDefaults}
            className="text-sm text-gray-400 hover:text-gray-300 underline"
          >
            Reset to default categories
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2">Tips</h3>
          <ul className="text-sm text-blue-300/80 space-y-1">
            <li>• Drag categories to reorder them - this affects how items appear in your shopping lists</li>
            <li>• Add custom categories to match your supermarket layout</li>
            <li>• AI will automatically suggest categories when you add items manually</li>
            <li>• Deleting a category will move its items to "Uncategorized"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
