'use client'

import { useEffect, useState, use } from 'react'
import { format } from 'date-fns'

interface ShoppingListItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
}

interface SharedData {
  shoppingList: {
    id: string
    name: string
    status: string
    itemCount: number
    createdAt: string
  }
  itemsByCategory: Record<string, ShoppingListItem[]>
  expiresAt: string
}

export default function SharedShoppingListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedList()
  }, [token])

  const fetchSharedList = async () => {
    try {
      const response = await fetch(`/api/shared/shopping-list/${token}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('This shopping list link is invalid or has been removed.')
        } else if (response.status === 410) {
          setError('This shopping list link has expired.')
        } else {
          setError('Failed to load shopping list.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching shared list:', err)
      setError('Failed to load shopping list.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shopping list...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link Not Available</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { shoppingList, itemsByCategory, expiresAt } = data
  const expiryDate = new Date(expiresAt)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-purple-700 text-white py-6">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{shoppingList.name}</h1>
              <p className="text-purple-200 text-sm">
                {shoppingList.itemCount} items • Shared from FamilyFuel
              </p>
            </div>
          </div>
          <p className="text-purple-200 text-xs mt-2">
            Link expires: {format(expiryDate, 'PPp')}
          </p>
        </div>
      </div>

      {/* Shopping List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {Object.keys(itemsByCategory).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No items in this shopping list.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-800">{category}</h3>
                  <span className="text-sm text-gray-500">{items.length} items</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0"></div>
                      <div className="flex-1">
                        <span className="text-gray-800">{item.itemName}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Powered by <span className="text-purple-600 font-semibold">FamilyFuel</span></p>
          <p className="mt-1">Family Meal Planning Made Easy</p>
        </div>
      </div>
    </div>
  )
}
