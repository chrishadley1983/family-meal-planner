'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'

interface InventoryItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: string
  expiryDate?: string
  notes?: string
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    location: '',
    expiryDate: '',
    notes: ''
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory')
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setItems([...items, data.item])
        setFormData({
          itemName: '',
          quantity: 1,
          unit: '',
          category: '',
          location: '',
          expiryDate: '',
          notes: ''
        })
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error creating item:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this item from inventory?')) return

    try {
      const response = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setItems(items.filter(i => i.id !== id))
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0
  }

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading inventory...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Inventory"
        description="Track food items and expiry dates"
        action={
          <Button onClick={() => setShowForm(!showForm)} variant="primary">
            {showForm ? 'Cancel' : 'Add Item'}
          </Button>
        }
      >
        {showForm && (
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Add Inventory Item</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Item Name *</label>
                  <Input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Category *</label>
                  <Select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat">Meat</option>
                    <option value="Produce">Produce</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Beverages">Beverages</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Quantity *</label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Unit *</label>
                  <Input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., lbs, oz, count"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Location *</label>
                  <Select
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    <option value="">Select location</option>
                    <option value="Refrigerator">Refrigerator</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Cabinet">Cabinet</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Expiry Date</label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
                <Input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Add to Inventory
              </Button>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">No items in inventory</h3>
            <p className="mt-1 text-zinc-400">Start tracking your food items</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-zinc-700">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`px-6 py-4 ${
                    isExpired(item.expiryDate)
                      ? 'bg-red-900/20'
                      : isExpiringSoon(item.expiryDate)
                      ? 'bg-yellow-900/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="text-base font-medium text-white">{item.itemName}</p>
                        <Badge variant="default" size="sm">
                          {item.category}
                        </Badge>
                        <span className="text-sm text-zinc-400">
                          📍 {item.location}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-4 text-sm text-zinc-300">
                        <span>{item.quantity} {item.unit}</span>
                        {item.expiryDate && (
                          <span className={
                            isExpired(item.expiryDate)
                              ? 'text-red-400 font-medium'
                              : isExpiringSoon(item.expiryDate)
                              ? 'text-yellow-400 font-medium'
                              : ''
                          }>
                            {isExpired(item.expiryDate) ? '⚠️ Expired' : '📅'} {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                        {item.notes && <span className="text-zinc-500">• {item.notes}</span>}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="danger"
                      size="sm"
                      className="ml-4"
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}
