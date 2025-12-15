'use client'

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

interface RecipeIngredientsProps {
  ingredients: Ingredient[]
  ingredientRatings?: IngredientRating[]
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

// Check if notes is just a duplicate of the ingredient info
function isDuplicateNote(ing: Ingredient): boolean {
  if (!ing.notes) return true

  const notesLower = ing.notes.toLowerCase().trim()
  const nameLower = ing.ingredientName.toLowerCase().trim()
  const fullIngredient = `${ing.quantity} ${ing.unit} ${ing.ingredientName}`.toLowerCase().trim()

  // Check various duplicate patterns
  return (
    notesLower === nameLower ||
    notesLower === fullIngredient ||
    notesLower.includes(nameLower) && notesLower.includes(String(ing.quantity)) ||
    nameLower.includes(notesLower)
  )
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

export function RecipeIngredients({
  ingredients,
  ingredientRatings,
  className = '',
}: RecipeIngredientsProps) {
  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-5 sticky top-6 ${className}`}>
      <h2 className="font-semibold mb-4 flex items-center justify-between text-white">
        Ingredients
        <span className="text-sm text-zinc-500 font-normal">{ingredients.length} items</span>
      </h2>
      <ul className="space-y-3">
        {ingredients.map((ing, idx) => {
          const rating = getIngredientRating(ing.ingredientName, ingredientRatings)
          return (
            <li key={idx} className="flex items-start gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                  rating ? getRatingColor(rating.rating) : 'bg-zinc-600'
                }`}
                title={rating?.reason}
              />
              <div className="text-zinc-300">
                <span className="font-medium text-white">{ing.quantity} {ing.unit}</span>
                {' '}
                <span>{ing.ingredientName}</span>
                {ing.notes && !isDuplicateNote(ing) && (
                  <span className="text-zinc-500 text-sm"> ({ing.notes})</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
