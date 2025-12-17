'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Package, Star, Plus } from 'lucide-react'
import type { Product } from '@/lib/types/product'

interface ProductSearchPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (product: Product, quantity: number) => void
}

export function ProductSearchPopup({
  isOpen,
  onClose,
  onSelect,
}: ProductSearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showSnacksOnly, setShowSnacksOnly] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Fetch products on mount and when filters change
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (showSnacksOnly) params.append('isSnack', 'true')
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
  }, [searchQuery, showSnacksOnly, selectedCategory])

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
  }, [searchQuery, showSnacksOnly, selectedCategory])

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProduct(null)
      setQuantity(1)
    }
  }, [isOpen])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setQuantity(1)
  }

  const handleConfirmSelection = () => {
    if (selectedProduct) {
      onSelect(selectedProduct, quantity)
      setSelectedProduct(null)
      setQuantity(1)
      setSearchQuery('')
      onClose()
    }
  }

  const renderRatingStars = (rating: number | null) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Star
            key={i}
            className={`w-2.5 h-2.5 ${
              i < rating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-600'
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
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Add Product to Recipe</h2>
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
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Snacks Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSnacksOnly}
                onChange={(e) => setShowSnacksOnly(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-zinc-400">Snacks only</span>
            </label>
          </div>
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
              <p>No products found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'bg-purple-500/20 border border-purple-500/50'
                      : 'hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Product Image or Placeholder */}
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                            {product.quantity} {product.unitOfMeasure}
                            {product.caloriesPerServing && ` • ${product.caloriesPerServing} kcal`}
                          </p>
                        </div>
                        {product.isSnack && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] flex-shrink-0">
                            Snack
                          </span>
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
              ))}
            </div>
          )}
        </div>

        {/* Selected Product & Quantity */}
        {selectedProduct && (
          <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {selectedProduct.brand ? `${selectedProduct.brand} ` : ''}
                  {selectedProduct.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {selectedProduct.quantity} {selectedProduct.unitOfMeasure} per unit
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Qty:</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                  className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={handleConfirmSelection}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 flex items-center justify-between text-xs text-zinc-500">
          <span>{products.length} products found</span>
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
