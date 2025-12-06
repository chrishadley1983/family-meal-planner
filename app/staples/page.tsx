'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Staple {
  id: string
  itemName: string
  quantity: number
  unit: string
  category?: string
  autoAddToList: boolean
  notes?: string
}

export default function StaplesPage() {
  const [staples, setStaples] = useState<Staple[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    autoAddToList: true,
    notes: ''
  })

  useEffect(() => {
    fetchStaples()
  }, [])

  const fetchStaples = async () => {
    try {
      const response = await fetch('/api/staples')
      const data = await response.json()
      setStaples(data.staples || [])
    } catch (error) {
      console.error('Error fetching staples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/staples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setStaples([...staples, data.staple])
        setFormData({
          itemName: '',
          quantity: 1,
          unit: '',
          category: '',
          autoAddToList: true,
          notes: ''
        })
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error creating staple:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staple?')) return

    try {
      const response = await fetch(`/api/staples?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setStaples(staples.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting staple:', error)
    }
  }

  const groupedStaples = staples.reduce((acc, staple) => {
    const category = staple.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(staple)
    return acc
  }, {} as Record<string, Staple[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading staples...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Staples</h1>
            <p className="text-gray-600 mt-1">Items you buy every week</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add Staple'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Staple</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name *</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Dairy, Produce"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit *</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., dozen, lbs, gallons"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAddToList"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={formData.autoAddToList}
                  onChange={(e) => setFormData({ ...formData, autoAddToList: e.target.checked })}
                />
                <label htmlFor="autoAddToList" className="ml-2 block text-sm text-gray-900">
                  Automatically add to shopping lists
                </label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Staple
              </button>
            </form>
          </div>
        )}

        {staples.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No staples yet</h3>
            <p className="mt-1 text-gray-500">Add items you buy regularly each week</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedStaples).map(([category, items]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {items.map((staple) => (
                    <li key={staple.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-base font-medium text-gray-900">{staple.itemName}</p>
                            {staple.autoAddToList && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Auto-add
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {staple.quantity} {staple.unit}
                            {staple.notes && ` • ${staple.notes}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(staple.id)}
                          className="ml-4 text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
