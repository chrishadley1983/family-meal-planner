'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input } from '@/components/ui'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
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
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading staples...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Weekly Staples"
        description="Items you buy every week"
        action={
          <Button onClick={() => setShowForm(!showForm)} variant="primary">
            {showForm ? 'Cancel' : 'Add Staple'}
          </Button>
        }
      >
        {showForm && (
          <div className="card p-6 mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Add New Staple</h3>
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
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                  <Input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Dairy, Produce"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Quantity *</label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
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
                    placeholder="e.g., dozen, lbs, gallons"
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAddToList"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                  checked={formData.autoAddToList}
                  onChange={(e) => setFormData({ ...formData, autoAddToList: e.target.checked })}
                />
                <label htmlFor="autoAddToList" className="ml-2 block text-sm text-zinc-300">
                  Automatically add to shopping lists
                </label>
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Add Staple
              </Button>
            </form>
          </div>
        )}

        {staples.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">No staples yet</h3>
            <p className="mt-1 text-zinc-400">Add items you buy regularly each week</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedStaples).map(([category, items]) => (
              <div key={category} className="card overflow-hidden">
                <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
                  <h3 className="text-lg font-medium text-white">{category}</h3>
                </div>
                <ul className="divide-y divide-zinc-700">
                  {items.map((staple) => (
                    <li key={staple.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="text-base font-medium text-white">{staple.itemName}</p>
                            {staple.autoAddToList && (
                              <Badge variant="success" size="sm">
                                Auto-add
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">
                            {staple.quantity} {staple.unit}
                            {staple.notes && ` • ${staple.notes}`}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleDelete(staple.id)}
                          variant="danger"
                          size="sm"
                          className="ml-4"
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}
