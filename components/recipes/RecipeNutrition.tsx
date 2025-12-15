'use client'

interface MacroAnalysis {
  perServing: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  overallRating: 'green' | 'yellow' | 'red'
  overallExplanation: string
}

interface RecipeNutritionProps {
  macroAnalysis: MacroAnalysis
  onRefresh: () => void
  loading?: boolean
  className?: string
}

function getOverallRatingColor(rating: 'green' | 'yellow' | 'red' | 'amber'): string {
  switch (rating) {
    case 'green': return 'bg-emerald-500'
    case 'yellow':
    case 'amber': return 'bg-amber-500'
    case 'red': return 'bg-red-500'
    default: return 'bg-zinc-500'
  }
}

export function RecipeNutrition({
  macroAnalysis,
  onRefresh,
  loading = false,
  className = '',
}: RecipeNutritionProps) {
  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Nutritional Analysis</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm transition-colors text-white disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Overall Rating */}
      <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 flex gap-3">
        <div className={`w-5 h-5 rounded-full ${getOverallRatingColor(macroAnalysis.overallRating)} flex-shrink-0 mt-0.5`} />
        <div>
          <h3 className="font-medium mb-1 text-white">Overall Rating</h3>
          <p className="text-sm text-zinc-400">{macroAnalysis.overallExplanation}</p>
        </div>
      </div>

      {/* Macro Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{Math.round(macroAnalysis.perServing.calories)}</div>
          <div className="text-xs text-zinc-400">Calories</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{Math.round(macroAnalysis.perServing.protein)}g</div>
          <div className="text-xs text-zinc-400">Protein</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{Math.round(macroAnalysis.perServing.carbs)}g</div>
          <div className="text-xs text-zinc-400">Carbs</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{Math.round(macroAnalysis.perServing.fat)}g</div>
          <div className="text-xs text-zinc-400">Fat</div>
        </div>
      </div>

      {/* Secondary Nutrition */}
      <div className="flex justify-center gap-8 text-sm text-zinc-500">
        <span><strong className="text-zinc-300">{Math.round(macroAnalysis.perServing.fiber)}g</strong> Fiber</span>
        <span><strong className="text-zinc-300">{Math.round(macroAnalysis.perServing.sugar)}g</strong> Sugar</span>
        <span><strong className="text-zinc-300">{Math.round(macroAnalysis.perServing.sodium)}mg</strong> Sodium</span>
      </div>
    </div>
  )
}
