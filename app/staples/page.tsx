'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import type {
  StapleFrequency,
  StapleDueStatus,
  StapleWithDueStatus,
  StapleFilters,
  StapleSortField,
  StapleSortOptions,
  CSVImportSummary,
} from '@/lib/types/staples'
import { STAPLE_FREQUENCIES } from '@/lib/types/staples'
import {
  enrichStapleWithDueStatus,
  sortStaplesByDueStatus,
  sortStaples,
  filterStaples,
  formatFrequency,
  formatDueStatus,
  formatDate,
  getUniqueCategories,
} from '@/lib/staples/calculations'
import { parseCSV, generateCSVTemplate, downloadCSV } from '@/lib/staples/csv-parser'
import { validateCSVData, getImportableItems, generateErrorReport } from '@/lib/staples/csv-validator'
import { DEFAULT_CATEGORIES, COMMON_UNITS } from '@/lib/unit-conversion'

// Raw staple from API
interface RawStaple {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  frequency: StapleFrequency
  isActive: boolean
  lastAddedDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default function StaplesPage() {
  const { data: session } = useSession()
  const [rawStaples, setRawStaples] = useState<RawStaple[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [filters, setFilters] = useState<StapleFilters>({})
  const [sortOptions, setSortOptions] = useState<StapleSortOptions>({
    field: 'nextDueDate',
    order: 'asc',
  })

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingStaple, setAddingStaple] = useState(false)
  const [newStaple, setNewStaple] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    frequency: 'weekly' as StapleFrequency,
    isActive: true,
    notes: '',
  })

  // Edit form state
  const [editingStaple, setEditingStaple] = useState<StapleWithDueStatus | null>(null)
  const [editFormData, setEditFormData] = useState({
    itemName: '',
    quantity: 1,
    unit: '',
    category: '',
    frequency: 'weekly' as StapleFrequency,
    isActive: true,
    notes: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // CSV Import state
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [csvSummary, setCsvSummary] = useState<CSVImportSummary | null>(null)
  const [importingCSV, setImportingCSV] = useState(false)
  const [csvFileName, setCsvFileName] = useState('')

  // Enrich staples with due status
  const staples = useMemo(() => {
    return rawStaples.map(s => enrichStapleWithDueStatus({
      ...s,
      lastAddedDate: s.lastAddedDate ? new Date(s.lastAddedDate) : null,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }))
  }, [rawStaples])

  // Apply filters and sorting
  const filteredAndSortedStaples = useMemo(() => {
    let result = filterStaples(staples, filters)

    // Default sort: by due status priority, then by nextDueDate
    if (sortOptions.field === 'nextDueDate' && sortOptions.order === 'asc') {
      result = sortStaplesByDueStatus(result)
    } else {
      result = sortStaples(result, sortOptions)
    }

    return result
  }, [staples, filters, sortOptions])

  // Get unique categories for filter dropdown
  const categories = useMemo(() => getUniqueCategories(staples), [staples])

  useEffect(() => {
    fetchStaples()
  }, [])

  const fetchStaples = async () => {
    try {
      console.log('🔷 Fetching staples...')
      const response = await fetch('/api/staples')
      const data = await response.json()
      console.log('🟢 Staples fetched:', data.staples?.length || 0)
      setRawStaples(data.staples || [])
    } catch (error) {
      console.error('❌ Error fetching staples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaple = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addingStaple) return

    setAddingStaple(true)
    try {
      console.log('🔷 Creating staple:', newStaple.itemName)
      const response = await fetch('/api/staples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStaple,
          category: newStaple.category || null,
          notes: newStaple.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create staple')
      }

      const data = await response.json()
      console.log('🟢 Created staple:', data.staple.itemName)
      setRawStaples([...rawStaples, data.staple])
      setNewStaple({
        itemName: '',
        quantity: 1,
        unit: '',
        category: '',
        frequency: 'weekly',
        isActive: true,
        notes: '',
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('❌ Error creating staple:', error)
      alert(error instanceof Error ? error.message : 'Failed to create staple')
    } finally {
      setAddingStaple(false)
    }
  }

  const handleDeleteStaple = async (id: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"? This cannot be undone.`)) return

    try {
      console.log('🔷 Deleting staple:', itemName)
      const response = await fetch(`/api/staples?id=${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete staple')
      }

      console.log('🟢 Staple deleted')
      setRawStaples(rawStaples.filter(s => s.id !== id))
    } catch (error) {
      console.error('❌ Error deleting staple:', error)
      alert('Failed to delete staple')
    }
  }

  const handleToggleActive = async (staple: StapleWithDueStatus) => {
    try {
      console.log('🔷 Toggling active status for:', staple.itemName)
      const response = await fetch(`/api/staples?id=${staple.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staple.isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update staple')
      }

      const data = await response.json()
      console.log('🟢 Staple updated:', data.staple.isActive ? 'Active' : 'Inactive')
      setRawStaples(rawStaples.map(s => s.id === staple.id ? data.staple : s))
    } catch (error) {
      console.error('❌ Error updating staple:', error)
      alert('Failed to update staple')
    }
  }

  const handleEditClick = (staple: StapleWithDueStatus) => {
    setEditingStaple(staple)
    setEditFormData({
      itemName: staple.itemName,
      quantity: staple.quantity,
      unit: staple.unit,
      category: staple.category || '',
      frequency: staple.frequency,
      isActive: staple.isActive,
      notes: staple.notes || '',
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaple || savingEdit) return

    setSavingEdit(true)
    try {
      console.log('🔷 Updating staple:', editFormData.itemName)
      const response = await fetch(`/api/staples?id=${editingStaple.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          category: editFormData.category || null,
          notes: editFormData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update staple')
      }

      const data = await response.json()
      console.log('🟢 Updated staple:', data.staple.itemName)
      setRawStaples(rawStaples.map(s => s.id === editingStaple.id ? data.staple : s))
      setEditingStaple(null)
    } catch (error) {
      console.error('❌ Error updating staple:', error)
      alert(error instanceof Error ? error.message : 'Failed to update staple')
    } finally {
      setSavingEdit(false)
    }
  }

  // CSV Import handlers
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate()
    downloadCSV(template, 'staples-template.csv')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)

    try {
      const content = await file.text()
      const rows = parseCSV(content)

      if (rows.length === 0) {
        alert('No data found in CSV file')
        return
      }

      console.log('🔷 Validating CSV with', rows.length, 'rows')
      const existingNames = rawStaples.map(s => s.itemName)
      const summary = validateCSVData(rows, existingNames)
      console.log('🟢 CSV validation complete:', summary.validCount, 'valid,', summary.errorCount, 'errors')
      setCsvSummary(summary)
    } catch (error) {
      console.error('❌ Error parsing CSV:', error)
      alert(error instanceof Error ? error.message : 'Failed to parse CSV file')
    }

    // Reset file input
    e.target.value = ''
  }

  const handleDownloadErrorReport = () => {
    if (!csvSummary) return
    const report = generateErrorReport(csvSummary)
    downloadCSV(report, 'staples-import-errors.csv')
  }

  const handleImportCSV = async () => {
    if (!csvSummary || importingCSV) return

    const itemsToImport = getImportableItems(csvSummary)
    if (itemsToImport.length === 0) {
      alert('No valid items to import')
      return
    }

    setImportingCSV(true)
    try {
      console.log('🔷 Importing', itemsToImport.length, 'staples')

      // Import each item
      const imported: RawStaple[] = []
      for (const item of itemsToImport) {
        const response = await fetch('/api/staples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })

        if (response.ok) {
          const data = await response.json()
          imported.push(data.staple)
        }
      }

      console.log('🟢 Imported', imported.length, 'staples')
      setRawStaples([...rawStaples, ...imported])
      setShowCSVImport(false)
      setCsvSummary(null)
      setCsvFileName('')
      alert(`Successfully imported ${imported.length} staple${imported.length !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('❌ Error importing staples:', error)
      alert('Failed to import staples')
    } finally {
      setImportingCSV(false)
    }
  }

  const handleCloseCSVImport = () => {
    setShowCSVImport(false)
    setCsvSummary(null)
    setCsvFileName('')
  }

  const getDueStatusBadge = (status: StapleDueStatus, daysUntilDue: number | null) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge variant="error" size="sm">
            {formatDueStatus(status, daysUntilDue)}
          </Badge>
        )
      case 'dueToday':
        return (
          <Badge variant="warning" size="sm">
            Due today
          </Badge>
        )
      case 'dueSoon':
        return (
          <Badge variant="warning" size="sm">
            {formatDueStatus(status, daysUntilDue)}
          </Badge>
        )
      case 'upcoming':
        return (
          <Badge variant="default" size="sm">
            {formatDueStatus(status, daysUntilDue)}
          </Badge>
        )
      case 'notDue':
      default:
        return null
    }
  }

  const handleSortChange = (field: StapleSortField) => {
    if (sortOptions.field === field) {
      // Toggle order if same field
      setSortOptions({
        field,
        order: sortOptions.order === 'asc' ? 'desc' : 'asc',
      })
    } else {
      // New field, default to ascending
      setSortOptions({ field, order: 'asc' })
    }
  }

  const getSortIcon = (field: StapleSortField) => {
    if (sortOptions.field !== field) return null
    return sortOptions.order === 'asc' ? ' ↑' : ' ↓'
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
        title="Staples"
        description="Recurring household items that get suggested for shopping lists"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowCSVImport(true)} variant="secondary">
              Import CSV
            </Button>
            <Button onClick={() => setShowAddForm(true)} variant="primary">
              Add Staple
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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Frequency:</label>
              <select
                value={filters.frequency || ''}
                onChange={(e) => setFilters({ ...filters, frequency: e.target.value as StapleFrequency || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                {STAPLE_FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
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

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Due:</label>
              <select
                value={filters.dueStatus || ''}
                onChange={(e) => setFilters({ ...filters, dueStatus: e.target.value as StapleDueStatus || undefined })}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="overdue">Overdue</option>
                <option value="dueToday">Due Today</option>
                <option value="dueSoon">Due Soon</option>
                <option value="upcoming">Upcoming</option>
                <option value="notDue">Not Due</option>
              </select>
            </div>

            {(filters.category || filters.frequency || filters.isActive !== undefined || filters.dueStatus) && (
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
            <div className="text-2xl font-bold text-white">{staples.length}</div>
            <div className="text-sm text-zinc-400">Total Staples</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {staples.filter(s => s.isActive).length}
            </div>
            <div className="text-sm text-zinc-400">Active</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {staples.filter(s => s.dueStatus === 'dueToday' || s.dueStatus === 'dueSoon').length}
            </div>
            <div className="text-sm text-zinc-400">Due Soon</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {staples.filter(s => s.dueStatus === 'overdue').length}
            </div>
            <div className="text-sm text-zinc-400">Overdue</div>
          </div>
        </div>

        {/* Empty State */}
        {staples.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No staples yet</h3>
            <p className="text-zinc-400 mb-6">
              Add recurring items you buy regularly. They&apos;ll be suggested for your shopping lists based on their frequency.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowAddForm(true)} variant="primary">
                Add Staple
              </Button>
            </div>
          </div>
        ) : filteredAndSortedStaples.length === 0 ? (
          <div className="card p-12 text-center">
            <h3 className="text-lg font-medium text-white mb-2">No staples match your filters</h3>
            <p className="text-zinc-400 mb-4">Try adjusting your filter criteria</p>
            <button
              onClick={() => setFilters({})}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Staples Table */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
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
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('frequency')}
                    >
                      Frequency{getSortIcon('frequency')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('lastAddedDate')}
                    >
                      Last Added{getSortIcon('lastAddedDate')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('nextDueDate')}
                    >
                      Next Due{getSortIcon('nextDueDate')}
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
                  {filteredAndSortedStaples.map((staple) => (
                    <tr key={staple.id} className={`hover:bg-zinc-800/30 ${!staple.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{staple.itemName}</span>
                          {getDueStatusBadge(staple.dueStatus, staple.daysUntilDue)}
                        </div>
                        {staple.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5">{staple.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {staple.quantity} {staple.unit}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {staple.category || <span className="text-zinc-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatFrequency(staple.frequency)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatDate(staple.lastAddedDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {staple.nextDueDate
                          ? formatDate(staple.nextDueDate)
                          : <span className="text-yellow-400">Immediately</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(staple)}
                          className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            staple.isActive
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                        >
                          {staple.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(staple)}
                            className="text-purple-400 hover:text-purple-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStaple(staple.id, staple.itemName)}
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

        {/* Add Staple Modal */}
        <Modal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Add New Staple"
          maxWidth="md"
        >
          <form onSubmit={handleAddStaple} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newStaple.itemName}
                  onChange={(e) => setNewStaple({ ...newStaple, itemName: e.target.value })}
                  placeholder="e.g., Milk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={newStaple.category}
                  onChange={(e) => setNewStaple({ ...newStaple, category: e.target.value })}
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
                  value={newStaple.quantity}
                  onChange={(e) => setNewStaple({ ...newStaple, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Unit *
                </label>
                <select
                  required
                  value={newStaple.unit}
                  onChange={(e) => setNewStaple({ ...newStaple, unit: e.target.value })}
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
                  Frequency *
                </label>
                <select
                  required
                  value={newStaple.frequency}
                  onChange={(e) => setNewStaple({ ...newStaple, frequency: e.target.value as StapleFrequency })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {STAPLE_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newStaple.isActive}
                  onChange={(e) => setNewStaple({ ...newStaple, isActive: e.target.checked })}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-zinc-300">
                  Active (will be suggested for shopping lists)
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Notes
              </label>
              <Input
                type="text"
                value={newStaple.notes}
                onChange={(e) => setNewStaple({ ...newStaple, notes: e.target.value })}
                placeholder="Optional notes..."
              />
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
                disabled={addingStaple}
              >
                {addingStaple ? 'Adding...' : 'Add Staple'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Staple Modal */}
        <Modal
          isOpen={!!editingStaple}
          onClose={() => setEditingStaple(null)}
          title="Edit Staple"
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
                  placeholder="e.g., Milk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category
                </label>
                <select
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
                  Frequency *
                </label>
                <select
                  required
                  value={editFormData.frequency}
                  onChange={(e) => setEditFormData({ ...editFormData, frequency: e.target.value as StapleFrequency })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {STAPLE_FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                />
                <label htmlFor="editIsActive" className="ml-2 text-sm text-zinc-300">
                  Active (will be suggested for shopping lists)
                </label>
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
            {editingStaple && (
              <div className="text-xs text-zinc-500 pt-2">
                Last added: {formatDate(editingStaple.lastAddedDate)}
                {editingStaple.lastAddedDate && (
                  <span className="ml-2">
                    (Note: editing does not reset the schedule)
                  </span>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingStaple(null)}
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

        {/* CSV Import Modal */}
        <Modal
          isOpen={showCSVImport}
          onClose={handleCloseCSVImport}
          title="Import Staples from CSV"
          maxWidth="4xl"
        >
          <div className="p-6 space-y-6">
            {/* Step 1: Download Template */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Step 1: Download Template</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Start with our template CSV for the correct format
                </p>
              </div>
              <Button onClick={handleDownloadTemplate} variant="secondary" size="sm">
                Download Template
              </Button>
            </div>

            {/* Step 2: Upload File */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">Step 2: Upload Your CSV</h4>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center px-4 py-8 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-zinc-800/50 transition-colors">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-zinc-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-zinc-400">
                      {csvFileName ? csvFileName : 'Click to select a CSV file'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Step 3: Preview & Validate */}
            {csvSummary && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Step 3: Preview & Validate</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">{csvSummary.validCount} valid</span>
                    <span className="text-yellow-400">{csvSummary.warningCount} warnings</span>
                    <span className="text-red-400">{csvSummary.errorCount} errors</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-300">
                    {csvSummary.validCount} item{csvSummary.validCount !== 1 ? 's' : ''} ready to import
                    {csvSummary.duplicateCount > 0 && (
                      <span className="text-yellow-400">
                        , {csvSummary.duplicateCount} will be skipped (duplicates)
                      </span>
                    )}
                    {csvSummary.errorCount > 0 && (
                      <span className="text-red-400">
                        , {csvSummary.errorCount} have errors (cannot import)
                      </span>
                    )}
                  </p>
                </div>

                {/* Preview Table */}
                <div className="max-h-64 overflow-auto rounded-lg border border-zinc-700">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-zinc-300">Row</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Name</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Qty</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Unit</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Category</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Frequency</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Status</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {csvSummary.results.map((result) => (
                        <tr
                          key={result.row}
                          className={
                            result.status === 'error'
                              ? 'bg-red-900/20'
                              : result.status === 'warning'
                              ? 'bg-yellow-900/20'
                              : ''
                          }
                        >
                          <td className="px-3 py-2 text-zinc-400">{result.row}</td>
                          <td className="px-3 py-2 text-white">{result.data.name}</td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.quantity}</td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.unit}</td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.category || '-'}</td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.frequency || 'weekly'}</td>
                          <td className="px-3 py-2">
                            {result.status === 'valid' && (
                              <span className="text-green-400">Valid</span>
                            )}
                            {result.status === 'warning' && (
                              <span className="text-yellow-400">Warning</span>
                            )}
                            {result.status === 'error' && (
                              <span className="text-red-400">Error</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {result.errors.map((e, i) => (
                              <div key={i} className="text-red-400">{e}</div>
                            ))}
                            {result.warnings.map((w, i) => (
                              <div key={i} className="text-yellow-400">{w}</div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Error Report Download */}
                {(csvSummary.errorCount > 0 || csvSummary.warningCount > 0) && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleDownloadErrorReport}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Download Error Report
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
              <Button
                variant="secondary"
                onClick={handleCloseCSVImport}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImportCSV}
                disabled={!csvSummary || csvSummary.validCount === 0 || csvSummary.errorCount > 0 || importingCSV}
              >
                {importingCSV
                  ? 'Importing...'
                  : csvSummary
                  ? `Import ${csvSummary.validCount} Staple${csvSummary.validCount !== 1 ? 's' : ''}`
                  : 'Import'
                }
              </Button>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  )
}
