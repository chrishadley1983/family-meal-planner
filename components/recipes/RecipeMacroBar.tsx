'use client'

interface RecipeMacroBarProps {
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  showLabels?: boolean
  className?: string
}

export function RecipeMacroBar({
  calories,
  protein,
  carbs,
  fat,
  showLabels = true,
  className = '',
}: RecipeMacroBarProps) {
  // If no nutrition data, don't render anything
  if (!calories && !protein && !carbs && !fat) {
    return null
  }

  // Calculate bar widths as percentages (with sensible max values)
  const calorieWidth = calories ? Math.min((calories / 600) * 100, 100) : 0
  const proteinWidth = protein ? Math.min((protein / 50) * 100, 100) : 0
  const carbsWidth = carbs ? Math.min((carbs / 60) * 100, 100) : 0
  const fatWidth = fat ? Math.min((fat / 30) * 100, 100) : 0

  return (
    <div className={className}>
      {/* Visual macro bar */}
      <div className="flex gap-1 mb-2">
        {calories && calories > 0 && (
          <div
            className="h-1.5 rounded-full bg-orange-500"
            style={{ width: `${calorieWidth}%` }}
            title={`${calories} kcal`}
          />
        )}
        {protein && protein > 0 && (
          <div
            className="h-1.5 rounded-full bg-blue-500"
            style={{ width: `${proteinWidth}%` }}
            title={`${protein}g protein`}
          />
        )}
        {carbs && carbs > 0 && (
          <div
            className="h-1.5 rounded-full bg-amber-500"
            style={{ width: `${carbsWidth}%` }}
            title={`${carbs}g carbs`}
          />
        )}
        {fat && fat > 0 && (
          <div
            className="h-1.5 rounded-full bg-purple-500"
            style={{ width: `${fatWidth}%` }}
            title={`${fat}g fat`}
          />
        )}
      </div>

      {/* Macro labels */}
      {showLabels && (
        <div className="flex gap-2 text-xs">
          {calories && calories > 0 && (
            <span className="text-orange-400">{calories} kcal</span>
          )}
          {protein && protein > 0 && (
            <span className="text-blue-400">{Math.round(protein)}g P</span>
          )}
          {carbs && carbs > 0 && (
            <span className="text-amber-400">{Math.round(carbs)}g C</span>
          )}
          {fat && fat > 0 && (
            <span className="text-purple-400">{Math.round(fat)}g F</span>
          )}
        </div>
      )}
    </div>
  )
}
