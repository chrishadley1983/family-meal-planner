'use client'

import { Button } from '@/components/ui'

interface IngredientRating {
  ingredientName: string
  rating: 'green' | 'yellow' | 'red'
  reason: string
}

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  notes?: string | null
}

interface RecipeEditIngredientsProps {
  ingredients: Ingredient[]
  ingredientRatings?: IngredientRating[]
  availableUnits: Record<string, Array<{
    code: string
    name: string
    abbreviation: string
  }>>
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: string, value: any) => void
  onAnalyzeNutrition?: () => void
  showAnalyzeButton?: boolean
  className?: string
}

function getRatingColor(rating: 'green' | 'yellow' | 'red' | 'amber'): string {
  switch (rating) {
    case 'green': return 'bg-emerald-500'
    case 'yellow':
    case 'amber': return 'bg-amber-500'
    case 'red': return 'bg-red-500'
    default: return 'bg-zinc-500'
  }
}

function getIngredientRating(
  ingredientName: string,
  ratings?: IngredientRating[]
): IngredientRating | undefined {
  if (!ratings) return undefined

  const searchName = ingredientName.toLowerCase().trim()

  // First try exact match
  let match = ratings.find(
    r => r.ingredientName.toLowerCase().trim() === searchName
  )
  if (match) return match

  // Then try partial match
  match = ratings.find(r => {
    const ratingName = r.ingredientName.toLowerCase().trim()
    return searchName.includes(ratingName) || ratingName.includes(searchName)
  })
  if (match) return match

  // Try matching main ingredient word
  const mainWords = searchName.split(/\s+/).filter(w => w.length > 3)
  for (const word of mainWords) {
    match = ratings.find(r =>
      r.ingredientName.toLowerCase().includes(word)
    )
    if (match) return match
  }

  return undefined
}

// Generate preview text for ingredient
function getPreviewText(ing: Ingredient): string {
  if (ing.notes && ing.notes.trim()) {
    // If there are notes, show the notes
    return ing.notes
  }
  // Otherwise show formatted ingredient
  const qty = ing.quantity || ''
  const unit = ing.unit || ''
  const name = ing.ingredientName || ''
  return `${qty} ${unit} ${name}`.trim()
}

export function RecipeEditIngredients({
  ingredients,
  ingredientRatings,
  availableUnits,
  onAdd,
  onRemove,
  onUpdate,
  onAnalyzeNutrition,
  showAnalyzeButton = false,
  className = '',
}: RecipeEditIngredientsProps) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Ingredients</h2>
        <div className="flex gap-2">
          {showAnalyzeButton && onAnalyzeNutrition && (
            <Button
              onClick={onAnalyzeNutrition}
              variant="secondary"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Analyze Nutrition
            </Button>
          )}
          <Button onClick={onAdd} variant="primary" size="sm">
            + Add Ingredient
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-2 mb-2 text-xs text-zinc-500">
        <div className="col-span-4">Ingredient</div>
        <div className="col-span-1">Qty</div>
        <div className="col-span-2">Unit</div>
        <div className="col-span-4">Preview / Notes</div>
        <div className="col-span-1"></div>
      </div>

      {/* Ingredient Rows */}
      <div className="flex flex-col gap-2">
        {ingredients.map((ing, index) => {
          const rating = getIngredientRating(ing.ingredientName, ingredientRatings)
          return (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-center"
            >
              {/* Ingredient name with traffic light */}
              <div className="col-span-4 flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    rating ? getRatingColor(rating.rating) : 'bg-zinc-600'
                  }`}
                  title={rating?.reason}
                />
                <input
                  type="text"
                  placeholder="Ingredient"
                  value={ing.ingredientName}
                  onChange={(e) => onUpdate(index, 'ingredientName', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Quantity */}
              <div className="col-span-1">
                <input
                  type="text"
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Unit dropdown */}
              <div className="col-span-2">
                <select
                  value={ing.unit}
                  onChange={(e) => onUpdate(index, 'unit', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Unit</option>
                  {Object.entries(availableUnits).map(([category, units]) => (
                    <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                      {units.map((unit) => (
                        <option key={unit.code} value={unit.abbreviation}>
                          {unit.abbreviation} ({unit.name})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Preview / Notes */}
              <div className="col-span-4">
                <input
                  type="text"
                  placeholder={getPreviewText(ing) || 'Notes (e.g., halved, chopped)'}
                  value={ing.notes || ''}
                  onChange={(e) => onUpdate(index, 'notes', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-purple-500 placeholder-zinc-600"
                />
              </div>

              {/* Delete button */}
              <div className="col-span-1 text-center">
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-400 hover:text-red-300 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
