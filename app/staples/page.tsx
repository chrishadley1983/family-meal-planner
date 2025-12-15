'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/components/providers/NotificationProvider'
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
import { COMMON_UNITS } from '@/lib/unit-conversion'
import { SHELF_LIFE_SEED_DATA } from '@/lib/inventory'
import type { ShelfLifeSeedItem } from '@/lib/inventory'
import { STORAGE_LOCATION_LABELS } from '@/lib/types/inventory'
import { ImportButtons } from '@/components/shared/ImportButtons'

// Shopping list category from API
interface ShoppingListCategory {
  id: string
  name: string
  displayOrder: number
}

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
  const { success, error, warning, confirm } = useNotification()
  const [rawStaples, setRawStaples] = useState<RawStaple[]>([])
  const [loading, setLoading] = useState(true)
  const [shoppingListCategories, setShoppingListCategories] = useState<ShoppingListCategory[]>([])

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

  // AI suggestion state
  const [shelfLifeSuggestion, setShelfLifeSuggestion] = useState<ShelfLifeSeedItem | null>(null)

  // Photo import state
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoImages, setPhotoImages] = useState<string[]>([])
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const [extractedItems, setExtractedItems] = useState<Array<{
    itemName: string
    quantity: number
    unit: string
    category?: string
    frequency?: StapleFrequency
    confidence?: string
    selected: boolean
  }>>([])
  const [photoSummary, setPhotoSummary] = useState('')
  const [importingPhoto, setImportingPhoto] = useState(false)

  // URL import state
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [analyzingUrl, setAnalyzingUrl] = useState(false)
  const [urlExtractedItems, setUrlExtractedItems] = useState<Array<{
    itemName: string
    quantity: number
    unit: string
    category?: string
    frequency?: StapleFrequency
    confidence?: string
    selected: boolean
  }>>([])
  const [urlSummary, setUrlSummary] = useState('')
  const [importingUrl, setImportingUrl] = useState(false)

  // Import notification state
  const [importNotification, setImportNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  } | null>(null)

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
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log('🔷 Fetching shopping list categories...')
      const response = await fetch('/api/shopping-lists/categories')
      const data = await response.json()
      console.log('🟢 Categories fetched:', data.categories?.length || 0)
      setShoppingListCategories(data.categories || [])
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
    }
  }

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

  // Look up shelf life data for item name
  const lookupShelfLife = (itemName: string): ShelfLifeSeedItem | null => {
    if (!itemName || itemName.length < 2) return null

    const normalizedInput = itemName.toLowerCase().trim()

    // Try exact match first
    const exactMatch = SHELF_LIFE_SEED_DATA.find(
      item => item.ingredientName.toLowerCase() === normalizedInput
    )
    if (exactMatch) return exactMatch

    // Try partial match (input contains reference or vice versa)
    const partialMatch = SHELF_LIFE_SEED_DATA.find(item => {
      const refLower = item.ingredientName.toLowerCase()
      return normalizedInput.includes(refLower) || refLower.includes(normalizedInput)
    })
    if (partialMatch) return partialMatch

    // Try word-based matching
    const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2)
    const wordMatch = SHELF_LIFE_SEED_DATA.find(item => {
      const refWords = item.ingredientName.toLowerCase().split(/\s+/)
      return inputWords.some(iw => refWords.some(rw => rw.includes(iw) || iw.includes(rw)))
    })

    return wordMatch || null
  }

  // Suggest frequency based on shelf life
  const suggestFrequencyFromShelfLife = (shelfLifeDays: number): StapleFrequency => {
    if (shelfLifeDays <= 7) return 'weekly'
    if (shelfLifeDays <= 14) return 'every_2_weeks'
    if (shelfLifeDays <= 60) return 'every_4_weeks'
    return 'every_3_months'
  }

  // Format frequency for display
  const formatFrequencyLabel = (freq: StapleFrequency | string | undefined): string => {
    const labels: Record<string, string> = {
      'weekly': 'Weekly',
      'every_2_weeks': 'Every 2 weeks',
      'every_4_weeks': 'Every 4 weeks',
      'every_3_months': 'Every 3 months',
    }
    return labels[freq || 'weekly'] || freq || 'Weekly'
  }

  // Handle item name change with shelf life lookup
  const handleItemNameChange = (value: string) => {
    setNewStaple({ ...newStaple, itemName: value })

    // Look up shelf life
    const shelfLife = lookupShelfLife(value)
    setShelfLifeSuggestion(shelfLife)
    if (shelfLife) {
      console.log('🔄 Shelf life suggestion:', shelfLife.ingredientName, shelfLife.shelfLifeDays, 'days')
    }
  }

  // Apply shelf life suggestion to form
  const applyShelfLifeSuggestion = () => {
    if (!shelfLifeSuggestion) return

    const updates: Partial<typeof newStaple> = {}

    // Set category if not already set
    if (!newStaple.category && shelfLifeSuggestion.category) {
      updates.category = shelfLifeSuggestion.category
    }

    // Set frequency based on shelf life
    updates.frequency = suggestFrequencyFromShelfLife(shelfLifeSuggestion.shelfLifeDays)

    setNewStaple({ ...newStaple, ...updates })
    console.log('⚡ Applied shelf life suggestion:', updates)
  }

  // Photo import handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve(event.target?.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    Promise.all(Array.from(files).map(readFile)).then(images => {
      setPhotoImages(prev => [...prev, ...images])
      setExtractedItems([])
      setPhotoSummary('')
    })
  }

  const handleAnalyzePhoto = async () => {
    if (photoImages.length === 0 || analyzingPhoto) return

    setAnalyzingPhoto(true)
    setExtractedItems([])
    setPhotoSummary('')

    try {
      console.log('🔷 Analyzing', photoImages.length, 'photo(s) for staples...')
      const response = await fetch('/api/staples/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photoImages }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      console.log('🟢 Extracted', data.items?.length || 0, 'staple items')

      setExtractedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: true,
        }))
      )
      setPhotoSummary(data.summary || '')
    } catch (err) {
      console.error('❌ Error analyzing photo:', err)
      error("Couldn't read items from photo. Please try a clearer image.")
    } finally {
      setAnalyzingPhoto(false)
    }
  }

  const handleImportPhotoItems = async () => {
    const selectedItems = extractedItems.filter(i => i.selected)
    if (selectedItems.length === 0 || importingPhoto) return

    setImportingPhoto(true)

    try {
      console.log('🔷 Importing', selectedItems.length, 'staples from photo...')

      // Import each item
      const imported: RawStaple[] = []
      for (const item of selectedItems) {
        const response = await fetch('/api/staples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category || null,
            frequency: item.frequency || 'weekly',
            isActive: true,
            notes: null,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          imported.push(data.staple)
        }
      }

      console.log('🟢 Imported', imported.length, 'staples from photo')
      setRawStaples([...rawStaples, ...imported])
      setShowPhotoModal(false)
      setPhotoImages([])
      setExtractedItems([])
      setPhotoSummary('')
      showNotification(`Successfully imported ${imported.length} staple${imported.length !== 1 ? 's' : ''}`, 'success')
    } catch (error) {
      console.error('❌ Error importing staples:', error)
      showNotification(error instanceof Error ? error.message : 'Failed to import staples', 'error')
    } finally {
      setImportingPhoto(false)
    }
  }

  const togglePhotoItemSelection = (index: number) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // Update an extracted photo item field
  const updatePhotoItem = (index: number, field: string, value: any) => {
    setExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  const removePhoto = (index: number) => {
    setPhotoImages(prev => prev.filter((_, i) => i !== index))
    setExtractedItems([])
    setPhotoSummary('')
  }

  // URL import handlers
  const handleAnalyzeUrl = async () => {
    if (!importUrl.trim() || analyzingUrl) return

    setAnalyzingUrl(true)
    setUrlExtractedItems([])
    setUrlSummary('')

    try {
      console.log('🔷 Analyzing URL for staples:', importUrl)
      const response = await fetch('/api/staples/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      console.log('🟢 Extracted', data.items?.length || 0, 'staple items from URL')

      setUrlExtractedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          selected: true,
        }))
      )
      setUrlSummary(data.summary || '')
    } catch (err) {
      console.error('❌ Error analyzing URL:', err)
      const errorMessage = err instanceof Error ? err.message : ''

      // Provide user-friendly messages based on the error
      if (errorMessage.includes('403')) {
        error('This website blocked our request. Try Photo Import instead.')
      } else if (errorMessage.includes('404')) {
        error('Page not found. Please check the URL and try again.')
      } else if (errorMessage.includes('Failed to fetch')) {
        error("Couldn't access this URL. Please check the link or try Photo Import.")
      } else {
        error("Couldn't analyze this page. Try Photo Import or add items manually.")
      }
    } finally {
      setAnalyzingUrl(false)
    }
  }

  const handleImportUrlItems = async () => {
    const selectedItems = urlExtractedItems.filter(i => i.selected)
    if (selectedItems.length === 0 || importingUrl) return

    setImportingUrl(true)

    try {
      console.log('🔷 Importing', selectedItems.length, 'staples from URL...')

      // Import each item
      const imported: RawStaple[] = []
      for (const item of selectedItems) {
        const response = await fetch('/api/staples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category || null,
            frequency: item.frequency || 'weekly',
            isActive: true,
            notes: null,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          imported.push(data.staple)
        }
      }

      console.log('🟢 Imported', imported.length, 'staples from URL')
      setRawStaples([...rawStaples, ...imported])
      setShowUrlModal(false)
      setImportUrl('')
      setUrlExtractedItems([])
      setUrlSummary('')
      showNotification(`Successfully imported ${imported.length} staple${imported.length !== 1 ? 's' : ''}`, 'success')
    } catch (error) {
      console.error('❌ Error importing staples:', error)
      showNotification(error instanceof Error ? error.message : 'Failed to import staples', 'error')
    } finally {
      setImportingUrl(false)
    }
  }

  const toggleUrlItemSelection = (index: number) => {
    setUrlExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // Update an extracted URL item field
  const updateUrlItem = (index: number, field: string, value: any) => {
    setUrlExtractedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  // Show notification with auto-dismiss
  const showNotification = (message: string, type: 'success' | 'error') => {
    setImportNotification({ show: true, message, type })
    setTimeout(() => setImportNotification(null), 5000)
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
      setShelfLifeSuggestion(null)
      setShowAddForm(false)
    } catch (err) {
      console.error('❌ Error creating staple:', err)
      error(err instanceof Error ? err.message : 'Failed to create staple')
    } finally {
      setAddingStaple(false)
    }
  }

  const handleDeleteStaple = async (id: string, itemName: string) => {
    const confirmed = await confirm({
      title: 'Delete Staple',
      message: `Delete "${itemName}"? This cannot be undone.`,
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    try {
      console.log('🔷 Deleting staple:', itemName)
      const response = await fetch(`/api/staples?id=${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete staple')
      }

      console.log('🟢 Staple deleted')
      setRawStaples(rawStaples.filter(s => s.id !== id))
    } catch (err) {
      console.error('❌ Error deleting staple:', err)
      error('Failed to delete staple')
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
    } catch (err) {
      console.error('❌ Error updating staple:', err)
      error('Failed to update staple')
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
    } catch (err) {
      console.error('❌ Error updating staple:', err)
      error(err instanceof Error ? err.message : 'Failed to update staple')
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
        warning('No data found in CSV file')
        return
      }

      console.log('🔷 Validating CSV with', rows.length, 'rows')
      const existingNames = rawStaples.map(s => s.itemName)
      const summary = validateCSVData(rows, existingNames)
      console.log('🟢 CSV validation complete:', summary.validCount, 'valid,', summary.errorCount, 'errors')
      setCsvSummary(summary)
    } catch (err) {
      console.error('❌ Error parsing CSV:', err)
      error(err instanceof Error ? err.message : 'Failed to parse CSV file')
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
      warning('No valid items to import')
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
      success(`Successfully imported ${imported.length} staple${imported.length !== 1 ? 's' : ''}`)
    } catch (err) {
      console.error('❌ Error importing staples:', err)
      error('Failed to import staples')
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
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-500">
            {formatDueStatus(status, daysUntilDue)}
          </span>
        )
      case 'dueToday':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-500">
            Due today
          </span>
        )
      case 'dueSoon':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-500">
            {formatDueStatus(status, daysUntilDue)}
          </span>
        )
      case 'upcoming':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400">
            {formatDueStatus(status, daysUntilDue)}
          </span>
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
            <button
              onClick={() => setShowCSVImport(true)}
              className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-purple-500 rounded-lg text-white hover:opacity-90 transition-opacity"
            >
              + Add Staple
            </button>
          </div>
        }
      >
        {/* Filters */}
        <div className="bg-gray-900/50 rounded-lg p-2 mb-6">
          <div className="flex flex-wrap items-center">
            <div className="flex items-center px-3">
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Category: All</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-zinc-800">Category: {cat}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            <div className="flex items-center px-3">
              <select
                value={filters.frequency || ''}
                onChange={(e) => setFilters({ ...filters, frequency: e.target.value as StapleFrequency || undefined })}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Frequency: All</option>
                {STAPLE_FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value} className="bg-zinc-800">Frequency: {f.label}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            <div className="flex items-center px-3">
              <select
                value={filters.isActive === undefined ? '' : filters.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters({
                    ...filters,
                    isActive: value === '' ? undefined : value === 'active',
                  })
                }}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Status: All</option>
                <option value="active" className="bg-zinc-800">Status: Active</option>
                <option value="inactive" className="bg-zinc-800">Status: Inactive</option>
              </select>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            <div className="flex items-center px-3">
              <select
                value={filters.dueStatus || ''}
                onChange={(e) => setFilters({ ...filters, dueStatus: e.target.value as StapleDueStatus || undefined })}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Due: All</option>
                <option value="overdue" className="bg-zinc-800">Due: Overdue</option>
                <option value="dueToday" className="bg-zinc-800">Due: Today</option>
                <option value="dueSoon" className="bg-zinc-800">Due: Soon</option>
                <option value="upcoming" className="bg-zinc-800">Due: Upcoming</option>
                <option value="notDue" className="bg-zinc-800">Due: Not Due</option>
              </select>
            </div>

            {(filters.category || filters.frequency || filters.isActive !== undefined || filters.dueStatus) && (
              <>
                <div className="w-px h-6 bg-gray-700" />
                <button
                  onClick={() => setFilters({})}
                  className="px-3 text-sm text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 text-center rounded-lg border bg-gray-900 border-gray-700">
            <div className="text-2xl font-bold text-white">{staples.length}</div>
            <div className="text-sm text-zinc-400">Total Staples</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-500">
              {staples.filter(s => s.isActive).length}
            </div>
            <div className="text-sm text-zinc-400">Active</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
            <div className="text-2xl font-bold text-amber-500">
              {staples.filter(s => s.dueStatus === 'dueToday' || s.dueStatus === 'dueSoon').length}
            </div>
            <div className="text-sm text-zinc-400">Due Soon</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30">
            <div className="text-2xl font-bold text-red-500">
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
                              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30'
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
          onClose={() => {
            setShowAddForm(false)
            setShelfLifeSuggestion(null)
          }}
          title="Add New Staple"
          maxWidth="md"
        >
          <form onSubmit={handleAddStaple} className="p-6 space-y-4">
            {/* Import buttons */}
            <ImportButtons
              onUrlClick={() => {
                setShowAddForm(false)
                setShelfLifeSuggestion(null)
                setShowUrlModal(true)
              }}
              onPhotoClick={() => {
                setShowAddForm(false)
                setShelfLifeSuggestion(null)
                setShowPhotoModal(true)
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newStaple.itemName}
                  onChange={(e) => handleItemNameChange(e.target.value)}
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
                  {shoppingListCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
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

            {/* AI Suggestion Box */}
            {shelfLifeSuggestion && (
              <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-600/50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-300">
                      Matched: <span className="font-medium">{shelfLifeSuggestion.ingredientName}</span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Typical shelf life: {shelfLifeSuggestion.shelfLifeDays} days
                      {shelfLifeSuggestion.defaultLocation && (
                        <> | Store in: {STORAGE_LOCATION_LABELS[shelfLifeSuggestion.defaultLocation]}</>
                      )}
                      {shelfLifeSuggestion.category && (
                        <> | Category: {shelfLifeSuggestion.category}</>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Suggested frequency: {suggestFrequencyFromShelfLife(shelfLifeSuggestion.shelfLifeDays)}
                    </p>
                    {shelfLifeSuggestion.notes && (
                      <p className="text-xs text-zinc-500 mt-1 italic">{shelfLifeSuggestion.notes}</p>
                    )}
                    <button
                      type="button"
                      onClick={applyShelfLifeSuggestion}
                      className="mt-2 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Apply Suggestions
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  {shoppingListCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
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
            <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-medium">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Download Template</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Start with our template CSV for the correct format
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
                >
                  Download Template
                </button>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-medium">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-2">Upload Your CSV</h4>
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

        {/* Photo Import Modal */}
        <Modal
          isOpen={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false)
            setPhotoImages([])
            setExtractedItems([])
            setPhotoSummary('')
          }}
          title="Import Staples from Photo"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4">
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-sm text-zinc-300 font-medium mb-2">Photo Recognition</p>
              <p className="text-xs text-zinc-400">
                Upload photos of your shopping list, pantry, or receipts. Our AI will identify items and suggest staple entries with appropriate frequencies.
              </p>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Upload Photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              />
            </div>

            {/* Photo previews */}
            {photoImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-300">
                  {photoImages.length} photo{photoImages.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {photoImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={img}
                        alt={`Photo ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleAnalyzePhoto}
                  variant="secondary"
                  disabled={analyzingPhoto}
                >
                  {analyzingPhoto ? 'Analyzing...' : 'Analyze Photos'}
                </Button>
              </div>
            )}

            {/* Analyzing indicator */}
            {analyzingPhoto && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
                <span className="text-zinc-300">AI is analyzing your photos...</span>
              </div>
            )}

            {/* Extracted items */}
            {extractedItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-300">
                  {extractedItems.length} items found - edit and select which to import:
                </p>
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {extractedItems.map((item, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border transition-colors ${
                        item.selected
                          ? 'bg-purple-900/30 border-purple-600/50'
                          : 'bg-zinc-800/50 border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => togglePhotoItemSelection(i)}
                          className="mt-2 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                        />
                        <div className="flex-1 space-y-2">
                          {/* Item name input */}
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updatePhotoItem(i, 'itemName', e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Item name"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {/* Quantity input */}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updatePhotoItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              min="0.01"
                              step="0.01"
                              placeholder="Qty"
                            />
                            {/* Unit select */}
                            <select
                              value={item.unit}
                              onChange={(e) => updatePhotoItem(i, 'unit', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Unit...</option>
                              {COMMON_UNITS.map(unit => (
                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                              ))}
                            </select>
                            {/* Frequency select */}
                            <select
                              value={item.frequency || 'weekly'}
                              onChange={(e) => updatePhotoItem(i, 'frequency', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              {STAPLE_FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            {/* Category select */}
                            <select
                              value={item.category || ''}
                              onChange={(e) => updatePhotoItem(i, 'category', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Category...</option>
                              {shoppingListCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {item.confidence && (
                          <Badge
                            variant={
                              item.confidence === 'high' ? 'success' :
                              item.confidence === 'medium' ? 'warning' : 'default'
                            }
                            size="sm"
                          >
                            {item.confidence}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: true })))}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Select all
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: false })))}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPhotoModal(false)
                  setPhotoImages([])
                  setExtractedItems([])
                  setPhotoSummary('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImportPhotoItems}
                disabled={extractedItems.filter(i => i.selected).length === 0 || importingPhoto}
              >
                {importingPhoto
                  ? 'Importing...'
                  : `Import ${extractedItems.filter(i => i.selected).length} Staple${extractedItems.filter(i => i.selected).length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </Modal>

        {/* URL Import Modal */}
        <Modal
          isOpen={showUrlModal}
          onClose={() => {
            setShowUrlModal(false)
            setImportUrl('')
            setUrlExtractedItems([])
            setUrlSummary('')
          }}
          title="Import Staples from URL"
          maxWidth="lg"
        >
          <div className="p-6 space-y-4">
            {/* Instructions */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-sm text-zinc-300 font-medium mb-2">URL Import</p>
              <p className="text-xs text-zinc-400">
                Paste a URL to a shopping list, meal plan, or grocery list. Our AI will extract items and suggest staple entries with appropriate frequencies.
              </p>
            </div>

            {/* URL input */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/shopping-list"
                  className="flex-1"
                />
                <Button
                  onClick={handleAnalyzeUrl}
                  variant="secondary"
                  disabled={!importUrl.trim() || analyzingUrl}
                >
                  {analyzingUrl ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>

            {/* Analyzing indicator */}
            {analyzingUrl && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
                <span className="text-zinc-300">AI is analyzing the URL...</span>
              </div>
            )}

            {/* Extracted items */}
            {urlExtractedItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-300">
                  {urlExtractedItems.length} items found - edit and select which to import:
                </p>
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {urlExtractedItems.map((item, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border transition-colors ${
                        item.selected
                          ? 'bg-purple-900/30 border-purple-600/50'
                          : 'bg-zinc-800/50 border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleUrlItemSelection(i)}
                          className="mt-2 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                        />
                        <div className="flex-1 space-y-2">
                          {/* Item name input */}
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateUrlItem(i, 'itemName', e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Item name"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {/* Quantity input */}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateUrlItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              min="0.01"
                              step="0.01"
                              placeholder="Qty"
                            />
                            {/* Unit select */}
                            <select
                              value={item.unit}
                              onChange={(e) => updateUrlItem(i, 'unit', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Unit...</option>
                              {COMMON_UNITS.map(unit => (
                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                              ))}
                            </select>
                            {/* Frequency select */}
                            <select
                              value={item.frequency || 'weekly'}
                              onChange={(e) => updateUrlItem(i, 'frequency', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              {STAPLE_FREQUENCIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            {/* Category select */}
                            <select
                              value={item.category || ''}
                              onChange={(e) => updateUrlItem(i, 'category', e.target.value)}
                              className="px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Category...</option>
                              {shoppingListCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {item.confidence && (
                          <Badge
                            variant={
                              item.confidence === 'high' ? 'success' :
                              item.confidence === 'medium' ? 'warning' : 'default'
                            }
                            size="sm"
                          >
                            {item.confidence}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setUrlExtractedItems(prev => prev.map(i => ({ ...i, selected: true })))}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Select all
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => setUrlExtractedItems(prev => prev.map(i => ({ ...i, selected: false })))}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUrlModal(false)
                  setImportUrl('')
                  setUrlExtractedItems([])
                  setUrlSummary('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImportUrlItems}
                disabled={urlExtractedItems.filter(i => i.selected).length === 0 || importingUrl}
              >
                {importingUrl
                  ? 'Importing...'
                  : `Import ${urlExtractedItems.filter(i => i.selected).length} Staple${urlExtractedItems.filter(i => i.selected).length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </Modal>

        {/* Import Notification Toast */}
        {importNotification && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
                importNotification.type === 'success'
                  ? 'bg-green-900/90 border-green-600/50 text-green-100'
                  : 'bg-red-900/90 border-red-600/50 text-red-100'
              }`}
            >
              {importNotification.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{importNotification.message}</span>
              <button
                onClick={() => setImportNotification(null)}
                className="ml-2 text-current opacity-70 hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}
