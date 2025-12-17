'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Package, Star, Plus, Check } from 'lucide-react'
import type { Product } from '@/lib/types/product'

interface ProductSlotSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (product: Product) => void
  dayOfWeek: string
  mealSlot: string
  currentProductId?: string | null
}

export function ProductSlotSelector({
  isOpen,
  onClose,
  onSelect,
  dayOfWeek,
  mealSlot,
  currentProductId,
}: ProductSlotSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])

  // Fetch snack products on mount and when filters change
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('isSnack', 'true') // Only show snack products
      if (selectedCategory) params.append('category', selectedCategory)
      params.append('isActive', 'true')

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        if (data.filters?.categories) {
          setCategories(data.filters.categories)
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory])

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [isOpen, fetchProducts])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory])

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedCategory('')
    }
  }, [isOpen])

  const handleSelectProduct = (product: Product) => {
    onSelect(product)
    onClose()
  }

  const renderRatingStars = (rating: number | null) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-2.5 h-2.5 ${
              i < Math.round(rating / 2) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'
            }`}
          />
        ))}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Select Snack</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {dayOfWeek} • {mealSlot}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 space-y-3 border-b border-zinc-800">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search snacks..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Snack Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No snack products found</p>
              <p className="text-sm mt-1">Add snack products in the Products page</p>
              <a
                href="/products"
                target="_blank"
                className="inline-block mt-3 text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                + Create New Product
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              {products.map((product) => {
                const isCurrentlySelected = product.id === currentProductId
                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      isCurrentlySelected
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Image or Placeholder */}
                      <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-white line-clamp-1">
                              {product.brand ? `${product.brand} ` : ''}
                              {product.name}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {product.caloriesPerServing && `${product.caloriesPerServing} kcal`}
                              {product.proteinPerServing && ` • ${product.proteinPerServing}g protein`}
                            </p>
                          </div>
                          {isCurrentlySelected && (
                            <Check className="w-5 h-5 text-purple-400 shrink-0" />
                          )}
                        </div>
                        {product.familyRating && (
                          <div className="mt-1">
                            {renderRatingStars(product.familyRating)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 flex items-center justify-between text-xs text-zinc-500">
          <span>{products.length} snack products</span>
          <a
            href="/products"
            target="_blank"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            + Create New Product
          </a>
        </div>
      </div>
    </div>
  )
}
