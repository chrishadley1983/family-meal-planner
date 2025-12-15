'use client'

interface RecipeEditDetailsProps {
  servings: number
  prepTimeMinutes: number | ''
  cookTimeMinutes: number | ''
  cuisineType: string
  difficultyLevel: string
  mealCategories: string[]
  scaleIngredients: boolean
  onServingsChange: (servings: number) => void
  onPrepTimeChange: (time: number | '') => void
  onCookTimeChange: (time: number | '') => void
  onCuisineChange: (cuisine: string) => void
  onDifficultyChange: (difficulty: string) => void
  onCategoryToggle: (category: string) => void
  onScaleIngredientsChange: (scale: boolean, currentServings: number) => void
  className?: string
}

const allMealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']

export function RecipeEditDetails({
  servings,
  prepTimeMinutes,
  cookTimeMinutes,
  cuisineType,
  difficultyLevel,
  mealCategories,
  scaleIngredients,
  onServingsChange,
  onPrepTimeChange,
  onCookTimeChange,
  onCuisineChange,
  onDifficultyChange,
  onCategoryToggle,
  onScaleIngredientsChange,
  className = '',
}: RecipeEditDetailsProps) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 p-5 ${className}`}>
      {/* Times Row - 3 columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Servings */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Servings</label>
          <input
            type="number"
            value={servings}
            onChange={(e) => onServingsChange(parseInt(e.target.value) || 1)}
            min="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
          <label className="flex items-center gap-2 mt-2 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={scaleIngredients}
              onChange={(e) => onScaleIngredientsChange(e.target.checked, servings)}
              className="rounded border-gray-600"
            />
            Scale ingredients
          </label>
        </div>

        {/* Prep Time */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Prep Time (min)</label>
          <input
            type="number"
            value={prepTimeMinutes}
            onChange={(e) => onPrepTimeChange(e.target.value ? parseInt(e.target.value) : '')}
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Cook Time */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Cook Time (min)</label>
          <input
            type="number"
            value={cookTimeMinutes}
            onChange={(e) => onCookTimeChange(e.target.value ? parseInt(e.target.value) : '')}
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Cuisine & Difficulty Row - 2 columns */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Cuisine Type */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Cuisine Type</label>
          <input
            type="text"
            value={cuisineType}
            onChange={(e) => onCuisineChange(e.target.value)}
            placeholder="e.g., Mexican, Italian"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Difficulty</label>
          <select
            value={difficultyLevel}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">Select...</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Meal Categories */}
      <div>
        <label className="text-xs text-zinc-500 block mb-2">Meal Categories</label>
        <div className="flex flex-wrap gap-2">
          {allMealCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryToggle(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mealCategories.includes(cat)
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-zinc-400 hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
