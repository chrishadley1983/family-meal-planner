'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Upload, ImageIcon } from 'lucide-react'
import { getRecipeGradient, getRecipeEmoji } from '@/lib/recipe-helpers'

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  notes?: string | null
}

interface RecipeEditHeroProps {
  recipeName: string
  description: string
  cuisineType: string
  imageUrl: string
  imagePreview: string
  ingredients: Ingredient[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}

export function RecipeEditHero({
  recipeName,
  description,
  cuisineType,
  imageUrl,
  imagePreview,
  ingredients,
  onNameChange,
  onDescriptionChange,
  onImageChange,
  className = '',
}: RecipeEditHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const gradient = getRecipeGradient(ingredients)
  const emoji = getRecipeEmoji(ingredients)

  const handleChooseImage = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex ${className}`}>
      {/* Image Preview - 192px (12rem) */}
      <div
        className={`w-48 h-48 flex-shrink-0 relative flex items-center justify-center bg-gradient-to-br ${gradient} group cursor-pointer`}
        onClick={handleChooseImage}
      >
        {/* Show image if uploaded, otherwise show emoji */}
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="Recipe image"
            fill
            className="object-cover"
            unoptimized={imagePreview.startsWith('data:')}
          />
        ) : (
          <span className="text-7xl opacity-90">{emoji}</span>
        )}

        {/* Cuisine tag */}
        {cuisineType && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/40 backdrop-blur rounded-lg text-xs font-medium text-white">
            {cuisineType}
          </span>
        )}

        {/* Upload overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <Upload className="w-8 h-8 text-white" />
          <span className="text-white text-sm font-medium">Upload Image</span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="flex-1 p-5">
        <input
          type="text"
          value={recipeName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Recipe name"
          className="w-full bg-transparent border-none text-2xl font-bold text-white mb-3 outline-none placeholder-zinc-500"
        />
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleChooseImage}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Choose Image
          </button>
          <span className="text-sm text-zinc-500">Recommended: 800x600px</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}
