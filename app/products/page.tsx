'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/components/providers/NotificationProvider'
import type {
  Product,
  ProductFilters,
  ProductSortField,
  ProductSortOptions,
  CreateProductRequest,
  CSVImportSummary,
  CSVValidationResult,
} from '@/lib/types/product'
import { PRODUCT_CATEGORIES, PRODUCT_VALIDATION } from '@/lib/types/product'

// Raw product from API
interface RawProduct {
  id: string
  userId: string
  name: string
  brand: string | null
  notes: string | null
  quantity: number
  unitOfMeasure: string
  category: string
  barcode: string | null
  imageUrl: string | null
  sourceUrl: string | null
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
  fiberPerServing: number | null
  sugarPerServing: number | null
  saturatedFatPerServing: number | null
  sodiumPerServing: number | null
  servingSize: string | null
  isSnack: boolean
  isActive: boolean
  familyRating: number | null
  timesUsed: number
  linkedRecipeId: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  linkedRecipe?: {
    id: string
    recipeName: string
    isArchived: boolean
  } | null
}

// Common units for products
const PRODUCT_UNITS = [
  { value: 'pieces', label: 'pieces' },
  { value: 'pack', label: 'pack' },
  { value: 'box', label: 'box' },
  { value: 'bag', label: 'bag' },
  { value: 'bottle', label: 'bottle' },
  { value: 'can', label: 'can' },
  { value: 'jar', label: 'jar' },
  { value: 'g', label: 'grams (g)' },
  { value: 'kg', label: 'kilograms (kg)' },
  { value: 'ml', label: 'millilitres (ml)' },
  { value: 'l', label: 'litres (l)' },
]

export default function ProductsPage() {
  const { data: session } = useSession()
  const { success, error, warning, confirm } = useNotification()
  const [products, setProducts] = useState<RawProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [availableBrands, setAvailableBrands] = useState<string[]>([])

  // Filters state
  const [filters, setFilters] = useState<ProductFilters>({})
  const [sortOptions, setSortOptions] = useState<ProductSortOptions>({
    field: 'name',
    direction: 'asc',
  })

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [newProduct, setNewProduct] = useState<CreateProductRequest>({
    name: '',
    brand: '',
    quantity: 1,
    unitOfMeasure: 'pieces',
    category: 'Snacks',
    isSnack: false,
    notes: '',
  })

  // Quick Actions state (for add form)
  const [addToInventory, setAddToInventory] = useState(false)
  const [inventoryExpiryDate, setInventoryExpiryDate] = useState('')
  const [addToStaples, setAddToStaples] = useState(false)
  const [stapleFrequency, setStapleFrequency] = useState<'weekly' | 'every_2_weeks' | 'every_4_weeks' | 'every_3_months'>('every_2_weeks')

  // Edit form state
  const [editingProduct, setEditingProduct] = useState<RawProduct | null>(null)
  const [editFormData, setEditFormData] = useState<CreateProductRequest & { isActive?: boolean }>({
    name: '',
    brand: '',
    quantity: 1,
    unitOfMeasure: 'pieces',
    category: 'Snacks',
    isSnack: false,
    notes: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Nutrition panel state
  const [showNutritionPanel, setShowNutritionPanel] = useState(false)
  const [editShowNutritionPanel, setEditShowNutritionPanel] = useState(false)

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<CSVImportSummary | null>(null)
  const [validatingCSV, setValidatingCSV] = useState(false)
  const [importingCSV, setImportingCSV] = useState(false)
  const [syncSnacksToRecipes, setSyncSnacksToRecipes] = useState(true)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; recipesCreated: number; errors: string[] } | null>(null)

  // AI Import state
  const [showAIImportModal, setShowAIImportModal] = useState(false)
  const [aiImportTab, setAiImportTab] = useState<'url' | 'image' | 'text'>('url')
  const [aiParseUrl, setAiParseUrl] = useState('')
  const [aiParseText, setAiParseText] = useState('')
  const [aiParseImage, setAiParseImage] = useState<File | null>(null)
  const [aiParsing, setAiParsing] = useState(false)
  const [aiParsedProduct, setAiParsedProduct] = useState<CreateProductRequest | null>(null)

  // Apply client-side filtering and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // Apply filters
    if (filters.category) {
      result = result.filter(p => p.category === filters.category)
    }
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand)
    }
    if (filters.isSnack !== undefined) {
      result = result.filter(p => p.isSnack === filters.isSnack)
    }
    if (filters.isActive !== undefined) {
      result = result.filter(p => p.isActive === filters.isActive)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.brand && p.brand.toLowerCase().includes(searchLower))
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      const direction = sortOptions.direction === 'asc' ? 1 : -1
      switch (sortOptions.field) {
        case 'name':
          return direction * a.name.localeCompare(b.name)
        case 'brand':
          return direction * (a.brand || '').localeCompare(b.brand || '')
        case 'category':
          return direction * a.category.localeCompare(b.category)
        case 'familyRating':
          return direction * ((a.familyRating || 0) - (b.familyRating || 0))
        case 'timesUsed':
          return direction * (a.timesUsed - b.timesUsed)
        case 'createdAt':
          return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        default:
          return 0
      }
    })

    return result
  }, [products, filters, sortOptions])

  // Get unique categories and brands for filters
  const uniqueCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category))
    return Array.from(cats).sort()
  }, [products])

  const uniqueBrands = useMemo(() => {
    const brands = products.map(p => p.brand).filter((b): b is string => b !== null)
    return Array.from(new Set(brands)).sort()
  }, [products])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      console.log('🔷 Fetching products...')
      const response = await fetch('/api/products')
      const data = await response.json()
      console.log('🟢 Products fetched:', data.products?.length || 0)
      setProducts(data.products || [])
      setAvailableBrands(data.filters?.brands || [])
    } catch (err) {
      console.error('❌ Error fetching products:', err)
      error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addingProduct) return

    setAddingProduct(true)
    try {
      console.log('🔷 Creating product:', newProduct.name)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          brand: newProduct.brand || null,
          notes: newProduct.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const data = await response.json()
      console.log('🟢 Created product:', data.product.name)

      // Quick Actions: Add to Inventory if selected
      if (addToInventory) {
        console.log('🔷 Adding product to inventory...')
        try {
          const inventoryResponse = await fetch(`/api/products/${data.product.id}/add-to-inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expiryDate: inventoryExpiryDate || null,
            }),
          })
          if (inventoryResponse.ok) {
            console.log('🟢 Product added to inventory')
          } else {
            console.warn('⚠️ Failed to add to inventory')
          }
        } catch (invErr) {
          console.error('❌ Error adding to inventory:', invErr)
        }
      }

      // Quick Actions: Add to Staples if selected
      if (addToStaples) {
        console.log('🔷 Adding product to staples...')
        try {
          const staplesResponse = await fetch(`/api/products/${data.product.id}/add-to-staples`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frequency: stapleFrequency,
            }),
          })
          if (staplesResponse.ok) {
            console.log('🟢 Product added to staples')
          } else {
            console.warn('⚠️ Failed to add to staples')
          }
        } catch (stapErr) {
          console.error('❌ Error adding to staples:', stapErr)
        }
      }

      setProducts([...products, data.product])
      setNewProduct({
        name: '',
        brand: '',
        quantity: 1,
        unitOfMeasure: 'pieces',
        category: 'Snacks',
        isSnack: false,
        notes: '',
      })
      setShowNutritionPanel(false)
      setShowAddForm(false)
      // Reset quick actions
      setAddToInventory(false)
      setInventoryExpiryDate('')
      setAddToStaples(false)
      setStapleFrequency('every_2_weeks')

      const successMsg = [
        'Product created',
        addToInventory && 'added to inventory',
        addToStaples && 'added to staples',
      ].filter(Boolean).join(', ')
      success(successMsg)
    } catch (err) {
      console.error('❌ Error creating product:', err)
      error(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setAddingProduct(false)
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    try {
      console.log('🔷 Deleting product:', name)
      const response = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      console.log('🟢 Product deleted')
      setProducts(products.filter(p => p.id !== id))
      success('Product deleted')
    } catch (err) {
      console.error('❌ Error deleting product:', err)
      error('Failed to delete product')
    }
  }

  const handleToggleActive = async (product: RawProduct) => {
    try {
      console.log('🔷 Toggling active status for:', product.name)
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update product')
      }

      const data = await response.json()
      console.log('🟢 Product updated:', data.product.isActive ? 'Active' : 'Inactive')
      setProducts(products.map(p => p.id === product.id ? data.product : p))
    } catch (err) {
      console.error('❌ Error updating product:', err)
      error('Failed to update product')
    }
  }

  const handleEditClick = (product: RawProduct) => {
    setEditingProduct(product)
    setEditFormData({
      name: product.name,
      brand: product.brand || '',
      quantity: product.quantity,
      unitOfMeasure: product.unitOfMeasure,
      category: product.category,
      barcode: product.barcode || undefined,
      imageUrl: product.imageUrl || undefined,
      sourceUrl: product.sourceUrl || undefined,
      caloriesPerServing: product.caloriesPerServing || undefined,
      proteinPerServing: product.proteinPerServing || undefined,
      carbsPerServing: product.carbsPerServing || undefined,
      fatPerServing: product.fatPerServing || undefined,
      fiberPerServing: product.fiberPerServing || undefined,
      sugarPerServing: product.sugarPerServing || undefined,
      saturatedFatPerServing: product.saturatedFatPerServing || undefined,
      sodiumPerServing: product.sodiumPerServing || undefined,
      servingSize: product.servingSize || undefined,
      isSnack: product.isSnack,
      isActive: product.isActive,
      familyRating: product.familyRating || undefined,
      notes: product.notes || '',
    })
    setEditShowNutritionPanel(
      !!(product.caloriesPerServing || product.proteinPerServing || product.carbsPerServing)
    )
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || savingEdit) return

    setSavingEdit(true)
    try {
      console.log('🔷 Updating product:', editFormData.name)
      const response = await fetch(`/api/products?id=${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          brand: editFormData.brand || null,
          notes: editFormData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update product')
      }

      const data = await response.json()
      console.log('🟢 Updated product:', data.product.name)
      setProducts(products.map(p => p.id === editingProduct.id ? data.product : p))
      setEditingProduct(null)
      success('Product updated')
    } catch (err) {
      console.error('❌ Error updating product:', err)
      error(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSortChange = (field: ProductSortField) => {
    if (sortOptions.field === field) {
      setSortOptions({
        field,
        direction: sortOptions.direction === 'asc' ? 'desc' : 'asc',
      })
    } else {
      setSortOptions({ field, direction: 'asc' })
    }
  }

  const getSortIcon = (field: ProductSortField) => {
    if (sortOptions.field !== field) return null
    return sortOptions.direction === 'asc' ? ' ↑' : ' ↓'
  }

  // CSV Import handlers
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleValidateCSV = async () => {
    if (!importFile) return

    setValidatingCSV(true)
    try {
      console.log('🔷 Validating CSV file:', importFile.name)
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/products/import/validate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to validate CSV')
      }

      const data = await response.json()
      console.log('🟢 CSV validation complete:', data.summary)
      setImportSummary(data.summary)
      setImportStep('preview')
    } catch (err) {
      console.error('❌ Error validating CSV:', err)
      error('Failed to validate CSV file')
    } finally {
      setValidatingCSV(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importSummary) return

    const validProducts = importSummary.results
      .filter(r => r.status !== 'error' && r.parsedData)
      .map(r => r.parsedData!)

    if (validProducts.length === 0) {
      warning('No valid products to import')
      return
    }

    setImportingCSV(true)
    setImportStep('importing')
    try {
      console.log('🔷 Importing', validProducts.length, 'products...')
      const response = await fetch('/api/products/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validProducts,
          syncSnacksToRecipes,
          skipDuplicates,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to import products')
      }

      const result = await response.json()
      console.log('🟢 Import complete:', result)
      setImportResult(result)
      setImportStep('complete')

      // Refresh products list
      await fetchProducts()

      if (result.imported > 0) {
        success(`Imported ${result.imported} product${result.imported !== 1 ? 's' : ''}${result.recipesCreated > 0 ? ` and created ${result.recipesCreated} linked recipe${result.recipesCreated !== 1 ? 's' : ''}` : ''}`)
      }
    } catch (err) {
      console.error('❌ Error importing products:', err)
      error('Failed to import products')
      setImportStep('preview')
    } finally {
      setImportingCSV(false)
    }
  }

  const handleDownloadTemplate = () => {
    window.location.href = '/api/products/import/validate'
  }

  const resetImportModal = () => {
    setShowImportModal(false)
    setImportStep('upload')
    setImportFile(null)
    setImportSummary(null)
    setImportResult(null)
  }

  const getValidationStatusBadge = (result: CSVValidationResult) => {
    switch (result.status) {
      case 'valid':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">Valid</span>
      case 'warning':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">Warning</span>
      case 'error':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400">Error</span>
    }
  }

  // AI Import handlers
  const handleAIParseUrl = async () => {
    if (!aiParseUrl.trim()) return

    setAiParsing(true)
    try {
      console.log('🔷 AI parsing URL:', aiParseUrl)
      const response = await fetch('/api/products/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiParseUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse URL')
      }

      const data = await response.json()
      console.log('🟢 AI parsed product:', data.product)
      setAiParsedProduct({
        name: data.product.name || '',
        brand: data.product.brand || '',
        category: data.product.category || 'Other',
        quantity: data.product.quantity || 1,
        unitOfMeasure: data.product.unitOfMeasure || 'pieces',
        servingSize: data.product.servingSize || undefined,
        caloriesPerServing: data.product.caloriesPerServing || undefined,
        proteinPerServing: data.product.proteinPerServing || undefined,
        carbsPerServing: data.product.carbsPerServing || undefined,
        fatPerServing: data.product.fatPerServing || undefined,
        fiberPerServing: data.product.fiberPerServing || undefined,
        sugarPerServing: data.product.sugarPerServing || undefined,
        saturatedFatPerServing: data.product.saturatedFatPerServing || undefined,
        sodiumPerServing: data.product.sodiumPerServing || undefined,
        isSnack: data.product.isSnack ?? false,
        imageUrl: data.product.imageUrl || undefined,
        sourceUrl: data.product.sourceUrl || aiParseUrl,
      })
      success('Product info extracted! Review and save below.')
    } catch (err) {
      console.error('❌ Error AI parsing URL:', err)
      error(err instanceof Error ? err.message : 'Failed to parse URL')
    } finally {
      setAiParsing(false)
    }
  }

  const handleAIParseImage = async () => {
    if (!aiParseImage) return

    setAiParsing(true)
    try {
      console.log('🔷 AI parsing image:', aiParseImage.name)
      const formData = new FormData()
      formData.append('image', aiParseImage)

      const response = await fetch('/api/products/parse-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse image')
      }

      const data = await response.json()
      console.log('🟢 AI parsed product from image:', data.product)
      setAiParsedProduct({
        name: data.product.name || '',
        brand: data.product.brand || '',
        category: data.product.category || 'Other',
        quantity: data.product.quantity || 1,
        unitOfMeasure: data.product.unitOfMeasure || 'pieces',
        servingSize: data.product.servingSize || undefined,
        caloriesPerServing: data.product.caloriesPerServing || undefined,
        proteinPerServing: data.product.proteinPerServing || undefined,
        carbsPerServing: data.product.carbsPerServing || undefined,
        fatPerServing: data.product.fatPerServing || undefined,
        fiberPerServing: data.product.fiberPerServing || undefined,
        sugarPerServing: data.product.sugarPerServing || undefined,
        saturatedFatPerServing: data.product.saturatedFatPerServing || undefined,
        sodiumPerServing: data.product.sodiumPerServing || undefined,
        isSnack: data.product.isSnack ?? false,
      })
      success('Product info extracted from image! Review and save below.')
    } catch (err) {
      console.error('❌ Error AI parsing image:', err)
      error(err instanceof Error ? err.message : 'Failed to parse image')
    } finally {
      setAiParsing(false)
    }
  }

  const handleAIParseText = async () => {
    if (!aiParseText.trim()) return

    setAiParsing(true)
    try {
      console.log('🔷 AI parsing text, length:', aiParseText.length)
      const response = await fetch('/api/products/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiParseText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse text')
      }

      const data = await response.json()
      console.log('🟢 AI parsed product from text:', data.product)
      setAiParsedProduct({
        name: data.product.name || '',
        brand: data.product.brand || '',
        category: data.product.category || 'Other',
        quantity: data.product.quantity || 1,
        unitOfMeasure: data.product.unitOfMeasure || 'pieces',
        servingSize: data.product.servingSize || undefined,
        caloriesPerServing: data.product.caloriesPerServing || undefined,
        proteinPerServing: data.product.proteinPerServing || undefined,
        carbsPerServing: data.product.carbsPerServing || undefined,
        fatPerServing: data.product.fatPerServing || undefined,
        fiberPerServing: data.product.fiberPerServing || undefined,
        sugarPerServing: data.product.sugarPerServing || undefined,
        saturatedFatPerServing: data.product.saturatedFatPerServing || undefined,
        sodiumPerServing: data.product.sodiumPerServing || undefined,
        isSnack: data.product.isSnack ?? false,
      })
      success('Product info extracted from text! Review and save below.')
    } catch (err) {
      console.error('❌ Error AI parsing text:', err)
      error(err instanceof Error ? err.message : 'Failed to parse text')
    } finally {
      setAiParsing(false)
    }
  }

  const handleSaveAIParsedProduct = async () => {
    if (!aiParsedProduct) return

    setAiParsing(true)
    try {
      console.log('🔷 Saving AI parsed product:', aiParsedProduct.name)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...aiParsedProduct,
          brand: aiParsedProduct.brand || null,
          notes: aiParsedProduct.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const data = await response.json()
      console.log('🟢 Created AI parsed product:', data.product.name)
      setProducts([...products, data.product])
      resetAIImportModal()
      success('Product created successfully')
    } catch (err) {
      console.error('❌ Error saving AI parsed product:', err)
      error(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setAiParsing(false)
    }
  }

  const resetAIImportModal = () => {
    setShowAIImportModal(false)
    setAiImportTab('url')
    setAiParseUrl('')
    setAiParseText('')
    setAiParseImage(null)
    setAiParsedProduct(null)
  }

  const getRatingDisplay = (rating: number | null) => {
    if (!rating) return <span className="text-zinc-500">-</span>
    return (
      <span className="flex items-center gap-1">
        <span className="text-amber-400">★</span>
        <span>{rating}/10</span>
      </span>
    )
  }

  const getMacrosSummary = (product: RawProduct) => {
    if (!product.caloriesPerServing && !product.proteinPerServing) {
      return <span className="text-zinc-500">No data</span>
    }
    return (
      <div className="text-xs space-y-0.5">
        {product.caloriesPerServing && (
          <div>{product.caloriesPerServing} kcal</div>
        )}
        {product.proteinPerServing && (
          <div className="text-zinc-400">P: {product.proteinPerServing}g</div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Products"
        description="Branded snacks, ready meals, and convenience items"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAIImportModal(true)}
              className="px-4 py-2 text-sm font-medium border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Import
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 text-sm font-medium border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg text-white hover:opacity-90 transition-opacity"
            >
              + Add Product
            </button>
          </div>
        }
      >
        {/* Search Bar */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search products by name or brand..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="max-w-md"
          />
        </div>

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
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-zinc-800">Category: {cat}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            <div className="flex items-center px-3">
              <select
                value={filters.brand || ''}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value || undefined })}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Brand: All</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand} className="bg-zinc-800">Brand: {brand}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            <div className="flex items-center px-3">
              <select
                value={filters.isSnack === undefined ? '' : filters.isSnack ? 'true' : 'false'}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters({
                    ...filters,
                    isSnack: value === '' ? undefined : value === 'true',
                  })
                }}
                className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="" className="bg-zinc-800">Type: All</option>
                <option value="true" className="bg-zinc-800">Type: Snacks</option>
                <option value="false" className="bg-zinc-800">Type: Non-Snacks</option>
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

            {(filters.category || filters.brand || filters.isSnack !== undefined || filters.isActive !== undefined || filters.search) && (
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
            <div className="text-2xl font-bold text-white">{products.length}</div>
            <div className="text-sm text-zinc-400">Total Products</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30">
            <div className="text-2xl font-bold text-orange-500">
              {products.filter(p => p.isSnack).length}
            </div>
            <div className="text-sm text-zinc-400">Snacks</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-500">
              {products.filter(p => p.isActive).length}
            </div>
            <div className="text-sm text-zinc-400">Active</div>
          </div>
          <div className="p-4 text-center rounded-lg border bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
            <div className="text-2xl font-bold text-amber-500">
              {products.filter(p => p.familyRating && p.familyRating >= 7).length}
            </div>
            <div className="text-sm text-zinc-400">Top Rated (7+)</div>
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No products yet</h3>
            <p className="text-zinc-400 mb-6">
              Add your favourite snacks, ready meals, and convenience items. Products marked as snacks will be available for meal planning.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowAddForm(true)} variant="primary">
                Add Product
              </Button>
            </div>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="card p-12 text-center">
            <h3 className="text-lg font-medium text-white mb-2">No products match your filters</h3>
            <p className="text-zinc-400 mb-4">Try adjusting your filter criteria</p>
            <button
              onClick={() => setFilters({})}
              className="text-orange-400 hover:text-orange-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Products Table */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('name')}
                    >
                      Product{getSortIcon('name')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('brand')}
                    >
                      Brand{getSortIcon('brand')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('category')}
                    >
                      Category{getSortIcon('category')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Macros
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-300 cursor-pointer hover:text-white"
                      onClick={() => handleSortChange('familyRating')}
                    >
                      Rating{getSortIcon('familyRating')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300">
                      Type
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
                  {filteredAndSortedProducts.map((product) => (
                    <tr key={product.id} className={`hover:bg-zinc-800/30 ${!product.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">{product.name}</div>
                            {product.notes && (
                              <div className="text-xs text-zinc-500 truncate max-w-[200px]">{product.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {product.brand || <span className="text-zinc-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {product.quantity} {product.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {getMacrosSummary(product)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {getRatingDisplay(product.familyRating)}
                      </td>
                      <td className="px-4 py-3">
                        {product.isSnack ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400">
                            Snack
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-500/20 text-zinc-400">
                            Product
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            product.isActive
                              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(product)}
                            className="text-orange-400 hover:text-orange-300 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
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

        {/* Add Product Modal */}
        <Modal
          isOpen={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setShowNutritionPanel(false)
          }}
          title="Add New Product"
          maxWidth="lg"
        >
          <form onSubmit={handleAddProduct} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Product Name *
                </label>
                <Input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Protein Bar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Brand
                </label>
                <Input
                  type="text"
                  value={newProduct.brand || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  placeholder="e.g., Grenade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Quantity *
                  </label>
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Unit *
                  </label>
                  <select
                    required
                    value={newProduct.unitOfMeasure}
                    onChange={(e) => setNewProduct({ ...newProduct, unitOfMeasure: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PRODUCT_UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Family Rating (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newProduct.familyRating || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, familyRating: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Rate 1-10"
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="isSnack"
                  checked={newProduct.isSnack}
                  onChange={(e) => setNewProduct({ ...newProduct, isSnack: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-600 rounded"
                />
                <label htmlFor="isSnack" className="ml-2 text-sm text-zinc-300">
                  This is a snack (available for meal planning)
                </label>
              </div>
            </div>

            {/* Nutrition toggle */}
            <button
              type="button"
              onClick={() => setShowNutritionPanel(!showNutritionPanel)}
              className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300"
            >
              <svg className={`w-4 h-4 transition-transform ${showNutritionPanel ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showNutritionPanel ? 'Hide' : 'Show'} Nutritional Information
            </button>

            {/* Nutrition panel */}
            {showNutritionPanel && (
              <div className="p-4 bg-zinc-800/50 rounded-lg space-y-4">
                <h4 className="text-sm font-medium text-zinc-300">Per Serving</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Serving Size</label>
                    <Input
                      type="text"
                      value={newProduct.servingSize || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, servingSize: e.target.value })}
                      placeholder="e.g., 60g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Calories</label>
                    <Input
                      type="number"
                      min="0"
                      value={newProduct.caloriesPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, caloriesPerServing: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Protein (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newProduct.proteinPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, proteinPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Carbs (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newProduct.carbsPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, carbsPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Fat (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newProduct.fatPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, fatPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Fibre (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newProduct.fiberPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, fiberPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Sugar (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newProduct.sugarPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, sugarPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Sodium (mg)</label>
                    <Input
                      type="number"
                      min="0"
                      value={newProduct.sodiumPerServing || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, sodiumPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
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
                value={newProduct.notes || ''}
                onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            {/* Quick Actions Section */}
            <div className="p-4 bg-emerald-900/10 border border-emerald-600/20 rounded-lg space-y-4">
              <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h4>

              {/* Add to Inventory */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addToInventory"
                    checked={addToInventory}
                    onChange={(e) => setAddToInventory(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-600 rounded"
                  />
                  <label htmlFor="addToInventory" className="text-sm text-zinc-300">
                    Add to Inventory
                  </label>
                </div>
                {addToInventory && (
                  <div className="ml-6 flex items-center gap-2">
                    <label className="text-xs text-zinc-400">Expiry:</label>
                    <Input
                      type="date"
                      value={inventoryExpiryDate}
                      onChange={(e) => setInventoryExpiryDate(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-zinc-500">(auto-estimated if blank)</span>
                  </div>
                )}
              </div>

              {/* Add to Staples */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addToStaples"
                    checked={addToStaples}
                    onChange={(e) => setAddToStaples(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-600 rounded"
                  />
                  <label htmlFor="addToStaples" className="text-sm text-zinc-300">
                    Add to Staples (recurring purchase)
                  </label>
                </div>
                {addToStaples && (
                  <div className="ml-6 flex items-center gap-2">
                    <label className="text-xs text-zinc-400">Frequency:</label>
                    <select
                      value={stapleFrequency}
                      onChange={(e) => setStapleFrequency(e.target.value as typeof stapleFrequency)}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="every_2_weeks">Every 2 Weeks</option>
                      <option value="every_4_weeks">Every 4 Weeks</option>
                      <option value="every_3_months">Every 3 Months</option>
                    </select>
                  </div>
                )}
              </div>
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
                disabled={addingProduct}
              >
                {addingProduct ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Product Modal */}
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title="Edit Product"
          maxWidth="lg"
        >
          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Product Name *
                </label>
                <Input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g., Protein Bar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Brand
                </label>
                <Input
                  type="text"
                  value={editFormData.brand || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                  placeholder="e.g., Grenade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Unit *
                  </label>
                  <select
                    required
                    value={editFormData.unitOfMeasure}
                    onChange={(e) => setEditFormData({ ...editFormData, unitOfMeasure: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PRODUCT_UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Family Rating (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={editFormData.familyRating || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, familyRating: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Rate 1-10"
                />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsSnack"
                    checked={editFormData.isSnack}
                    onChange={(e) => setEditFormData({ ...editFormData, isSnack: e.target.checked })}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-600 rounded"
                  />
                  <label htmlFor="editIsSnack" className="ml-2 text-sm text-zinc-300">
                    This is a snack
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-600 rounded"
                  />
                  <label htmlFor="editIsActive" className="ml-2 text-sm text-zinc-300">
                    Active (available for use)
                  </label>
                </div>
              </div>
            </div>

            {/* Nutrition toggle */}
            <button
              type="button"
              onClick={() => setEditShowNutritionPanel(!editShowNutritionPanel)}
              className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300"
            >
              <svg className={`w-4 h-4 transition-transform ${editShowNutritionPanel ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {editShowNutritionPanel ? 'Hide' : 'Show'} Nutritional Information
            </button>

            {/* Nutrition panel */}
            {editShowNutritionPanel && (
              <div className="p-4 bg-zinc-800/50 rounded-lg space-y-4">
                <h4 className="text-sm font-medium text-zinc-300">Per Serving</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Serving Size</label>
                    <Input
                      type="text"
                      value={editFormData.servingSize || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, servingSize: e.target.value })}
                      placeholder="e.g., 60g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Calories</label>
                    <Input
                      type="number"
                      min="0"
                      value={editFormData.caloriesPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, caloriesPerServing: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Protein (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFormData.proteinPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, proteinPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Carbs (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFormData.carbsPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, carbsPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Fat (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFormData.fatPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fatPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Fibre (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFormData.fiberPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fiberPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Sugar (g)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editFormData.sugarPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sugarPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Sodium (mg)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editFormData.sodiumPerServing || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sodiumPerServing: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
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
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            {/* Linked recipe info */}
            {editingProduct?.linkedRecipe && (
              <div className="p-3 rounded-lg bg-orange-900/20 border border-orange-600/30">
                <p className="text-sm text-orange-300">
                  <span className="font-medium">Linked Recipe:</span> {editingProduct.linkedRecipe.recipeName}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  This product is synced with a recipe for meal planning
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingProduct(null)}
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
          isOpen={showImportModal}
          onClose={resetImportModal}
          title="Import Products from CSV"
          maxWidth="xl"
        >
          <div className="p-6">
            {/* Upload Step */}
            {importStep === 'upload' && (
              <div className="space-y-6">
                <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-zinc-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="mb-4">
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                        Choose CSV File
                      </span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {importFile && (
                    <p className="text-sm text-zinc-300">
                      Selected: <span className="font-medium">{importFile.name}</span>
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    Upload a CSV file with product data
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Template
                  </button>

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={resetImportModal}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleValidateCSV}
                      disabled={!importFile || validatingCSV}
                    >
                      {validatingCSV ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Expected CSV Format</h4>
                  <p className="text-xs text-zinc-400 mb-2">
                    Your CSV should include these columns (headers are case-insensitive):
                  </p>
                  <code className="text-xs text-orange-400 block overflow-x-auto">
                    name, brand, category, quantity, unit_of_measure, serving_size, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, is_snack, notes, barcode
                  </code>
                </div>
              </div>
            )}

            {/* Preview Step */}
            {importStep === 'preview' && importSummary && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 text-center rounded-lg bg-zinc-800">
                    <div className="text-xl font-bold text-white">{importSummary.totalRows}</div>
                    <div className="text-xs text-zinc-400">Total Rows</div>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-xl font-bold text-emerald-400">{importSummary.validCount}</div>
                    <div className="text-xs text-zinc-400">Valid</div>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="text-xl font-bold text-amber-400">{importSummary.warningCount}</div>
                    <div className="text-xs text-zinc-400">Warnings</div>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="text-xl font-bold text-red-400">{importSummary.errorCount}</div>
                    <div className="text-xs text-zinc-400">Errors</div>
                  </div>
                </div>

                {importSummary.duplicateCount > 0 && (
                  <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
                    <p className="text-sm text-amber-300">
                      {importSummary.duplicateCount} product{importSummary.duplicateCount !== 1 ? 's' : ''} already exist{importSummary.duplicateCount === 1 ? 's' : ''} in your library
                    </p>
                  </div>
                )}

                {/* Validation Results Table */}
                <div className="max-h-64 overflow-y-auto border border-zinc-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-zinc-300">Row</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Product</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Brand</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Status</th>
                        <th className="px-3 py-2 text-left text-zinc-300">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {importSummary.results.map((result, index) => (
                        <tr key={index} className={result.status === 'error' ? 'bg-red-900/10' : ''}>
                          <td className="px-3 py-2 text-zinc-400">{result.row}</td>
                          <td className="px-3 py-2 text-white">{result.data.name || '-'}</td>
                          <td className="px-3 py-2 text-zinc-300">{result.data.brand || '-'}</td>
                          <td className="px-3 py-2">{getValidationStatusBadge(result)}</td>
                          <td className="px-3 py-2">
                            {result.errors.length > 0 && (
                              <span className="text-red-400 text-xs">{result.errors.join(', ')}</span>
                            )}
                            {result.warnings.length > 0 && (
                              <span className="text-amber-400 text-xs">{result.warnings.join(', ')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Options */}
                <div className="p-4 bg-zinc-800/50 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-zinc-300">Import Options</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="syncSnacks"
                      checked={syncSnacksToRecipes}
                      onChange={(e) => setSyncSnacksToRecipes(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-600 rounded"
                    />
                    <label htmlFor="syncSnacks" className="text-sm text-zinc-300">
                      Create linked recipes for snack products
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="skipDupes"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-600 rounded"
                    />
                    <label htmlFor="skipDupes" className="text-sm text-zinc-300">
                      Skip duplicate products
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={() => setImportStep('upload')}>
                    Back
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={resetImportModal}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleConfirmImport}
                      disabled={importSummary.validCount + importSummary.warningCount === 0}
                    >
                      Import {importSummary.validCount + importSummary.warningCount} Product{importSummary.validCount + importSummary.warningCount !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Importing Step */}
            {importStep === 'importing' && (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
                <p className="text-zinc-300">Importing products...</p>
                <p className="text-sm text-zinc-500 mt-1">This may take a moment</p>
              </div>
            )}

            {/* Complete Step */}
            {importStep === 'complete' && importResult && (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">Import Complete</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 text-center rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-2xl font-bold text-emerald-400">{importResult.imported}</div>
                    <div className="text-sm text-zinc-400">Imported</div>
                  </div>
                  <div className="p-4 text-center rounded-lg bg-zinc-800">
                    <div className="text-2xl font-bold text-zinc-400">{importResult.skipped}</div>
                    <div className="text-sm text-zinc-400">Skipped</div>
                  </div>
                  <div className="p-4 text-center rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <div className="text-2xl font-bold text-orange-400">{importResult.recipesCreated}</div>
                    <div className="text-sm text-zinc-400">Recipes Created</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-900/20 border border-red-600/30">
                    <h4 className="text-sm font-medium text-red-400 mb-2">Errors</h4>
                    <ul className="text-sm text-zinc-300 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button variant="primary" onClick={resetImportModal}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* AI Import Modal */}
        <Modal
          isOpen={showAIImportModal}
          onClose={resetAIImportModal}
          title="AI-Powered Product Import"
          maxWidth="xl"
        >
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-zinc-800 rounded-lg">
              {[
                { key: 'url', label: 'From URL', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
                { key: 'image', label: 'From Image', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { key: 'text', label: 'From Text', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setAiImportTab(tab.key as 'url' | 'image' | 'text')
                    setAiParsedProduct(null)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    aiImportTab === tab.key
                      ? 'bg-purple-500 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* URL Tab */}
            {aiImportTab === 'url' && !aiParsedProduct && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Product URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.tesco.com/groceries/product/..."
                    value={aiParseUrl}
                    onChange={(e) => setAiParseUrl(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Paste a product URL from Tesco, Sainsbury's, ASDA, or any supermarket website
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={resetAIImportModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAIParseUrl}
                    disabled={!aiParseUrl.trim() || aiParsing}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {aiParsing ? (
                      <>
                        <span className="animate-spin mr-2">⚡</span>
                        Extracting...
                      </>
                    ) : (
                      'Extract Product Info'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Image Tab */}
            {aiImportTab === 'image' && !aiParsedProduct && (
              <div className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-zinc-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="mb-4">
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors">
                        Choose Image
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => setAiParseImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {aiParseImage && (
                    <p className="text-sm text-zinc-300">
                      Selected: <span className="font-medium">{aiParseImage.name}</span>
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    Upload a photo of a nutrition label or product packaging
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={resetAIImportModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAIParseImage}
                    disabled={!aiParseImage || aiParsing}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {aiParsing ? (
                      <>
                        <span className="animate-spin mr-2">⚡</span>
                        Analyzing...
                      </>
                    ) : (
                      'Extract from Image'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Text Tab */}
            {aiImportTab === 'text' && !aiParsedProduct && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Paste Product Information
                  </label>
                  <textarea
                    placeholder="Paste product details, nutritional info, or copy-paste from a product page..."
                    value={aiParseText}
                    onChange={(e) => setAiParseText(e.target.value)}
                    className="w-full h-40 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Copy and paste product info from any website or label
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={resetAIImportModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAIParseText}
                    disabled={!aiParseText.trim() || aiParsing}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    {aiParsing ? (
                      <>
                        <span className="animate-spin mr-2">⚡</span>
                        Extracting...
                      </>
                    ) : (
                      'Extract Product Info'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Parsed Product Preview/Edit */}
            {aiParsedProduct && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-600/30 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-emerald-300">Product info extracted! Review and edit below.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Name *</label>
                    <Input
                      type="text"
                      value={aiParsedProduct.name}
                      onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Brand</label>
                    <Input
                      type="text"
                      value={aiParsedProduct.brand || ''}
                      onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                    <select
                      value={aiParsedProduct.category}
                      onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, category: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {PRODUCT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Quantity</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={aiParsedProduct.quantity}
                        onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, quantity: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Unit</label>
                      <select
                        value={aiParsedProduct.unitOfMeasure}
                        onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, unitOfMeasure: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {PRODUCT_UNITS.map(unit => (
                          <option key={unit.value} value={unit.value}>{unit.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Nutrition Info (collapsed by default if data exists) */}
                {(aiParsedProduct.caloriesPerServing || aiParsedProduct.proteinPerServing) && (
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Extracted Nutrition (per serving)</h4>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      {aiParsedProduct.servingSize && (
                        <div className="col-span-4">
                          <span className="text-zinc-500">Serving:</span>{' '}
                          <span className="text-white">{aiParsedProduct.servingSize}</span>
                        </div>
                      )}
                      {aiParsedProduct.caloriesPerServing && (
                        <div>
                          <span className="text-zinc-500">Calories:</span>{' '}
                          <span className="text-white">{aiParsedProduct.caloriesPerServing}</span>
                        </div>
                      )}
                      {aiParsedProduct.proteinPerServing && (
                        <div>
                          <span className="text-zinc-500">Protein:</span>{' '}
                          <span className="text-white">{aiParsedProduct.proteinPerServing}g</span>
                        </div>
                      )}
                      {aiParsedProduct.carbsPerServing && (
                        <div>
                          <span className="text-zinc-500">Carbs:</span>{' '}
                          <span className="text-white">{aiParsedProduct.carbsPerServing}g</span>
                        </div>
                      )}
                      {aiParsedProduct.fatPerServing && (
                        <div>
                          <span className="text-zinc-500">Fat:</span>{' '}
                          <span className="text-white">{aiParsedProduct.fatPerServing}g</span>
                        </div>
                      )}
                      {aiParsedProduct.fiberPerServing && (
                        <div>
                          <span className="text-zinc-500">Fibre:</span>{' '}
                          <span className="text-white">{aiParsedProduct.fiberPerServing}g</span>
                        </div>
                      )}
                      {aiParsedProduct.sugarPerServing && (
                        <div>
                          <span className="text-zinc-500">Sugar:</span>{' '}
                          <span className="text-white">{aiParsedProduct.sugarPerServing}g</span>
                        </div>
                      )}
                      {aiParsedProduct.sodiumPerServing && (
                        <div>
                          <span className="text-zinc-500">Sodium:</span>{' '}
                          <span className="text-white">{aiParsedProduct.sodiumPerServing}mg</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="aiIsSnack"
                    checked={aiParsedProduct.isSnack}
                    onChange={(e) => setAiParsedProduct({ ...aiParsedProduct, isSnack: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                  />
                  <label htmlFor="aiIsSnack" className="text-sm text-zinc-300">
                    This is a snack (available for meal planning)
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setAiParsedProduct(null)}
                  >
                    Start Over
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={resetAIImportModal}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveAIParsedProduct}
                      disabled={!aiParsedProduct.name || aiParsing}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      {aiParsing ? 'Saving...' : 'Save Product'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  )
}
