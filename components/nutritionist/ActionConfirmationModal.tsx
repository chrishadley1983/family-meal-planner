'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  NutritionistAction,
  CreateRecipeAction,
  UpdateMacrosAction,
  UpdatePreferencesAction,
  AddInventoryAction,
  AddStapleAction,
} from '@/lib/nutritionist/types'
import { formatActionForDisplay } from '@/lib/nutritionist/format'

interface ActionConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  action: NutritionistAction | null
  onConfirm: () => void
  isLoading?: boolean
}

export function ActionConfirmationModal({
  isOpen,
  onClose,
  action,
  onConfirm,
  isLoading = false,
}: ActionConfirmationModalProps) {
  if (!action) return null

  const displayInfo = formatActionForDisplay(action)

  // Render different preview based on action type
  const renderPreview = () => {
    switch (action.type) {
      case 'CREATE_RECIPE':
        return renderRecipePreview(action as CreateRecipeAction)
      case 'UPDATE_MACROS':
        return renderMacrosPreview(action as UpdateMacrosAction)
      case 'UPDATE_PREFERENCES':
        return renderPreferencesPreview(action as UpdatePreferencesAction)
      case 'ADD_INVENTORY_ITEM':
        return renderInventoryPreview(action as AddInventoryAction)
      case 'ADD_STAPLE':
        return renderStaplePreview(action as AddStapleAction)
      default:
        return renderGenericPreview(displayInfo.details)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={displayInfo.title} maxWidth="xl">
      <div className="p-6">
        <p className="text-zinc-300 mb-4">{displayInfo.description}</p>

        {renderPreview()}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function renderRecipePreview(action: CreateRecipeAction) {
  const { data } = action

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4 border border-zinc-700">
      {/* Recipe header */}
      <div>
        <h3 className="text-lg font-semibold text-white">{data.name}</h3>
        {data.description && (
          <p className="text-sm text-zinc-400 mt-1">{data.description}</p>
        )}
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">Servings:</span>
          <span className="text-zinc-200">{data.servings}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">Prep:</span>
          <span className="text-zinc-200">{data.prepTimeMinutes} mins</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">Cook:</span>
          <span className="text-zinc-200">{data.cookTimeMinutes} mins</span>
        </div>
        {data.cuisineType && (
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Cuisine:</span>
            <span className="text-zinc-200">{data.cuisineType}</span>
          </div>
        )}
      </div>

      {/* Macros - now showing calculated values from ingredients */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-900/50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-amber-400">{data.caloriesPerServing}</div>
          <div className="text-xs text-zinc-500">kcal</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-400">{data.proteinPerServing}g</div>
          <div className="text-xs text-zinc-500">protein</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-400">{data.carbsPerServing}g</div>
          <div className="text-xs text-zinc-500">carbs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-400">{data.fatPerServing}g</div>
          <div className="text-xs text-zinc-500">fat</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center -mt-2">
        Calculated from ingredients
      </p>

      {/* Ingredients */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-2">Ingredients</h4>
        <ul className="space-y-1">
          {data.ingredients.slice(0, 8).map((ing, idx) => (
            <li key={idx} className="text-sm text-zinc-400">
              • {ing.quantity} {ing.unit} {ing.name}
            </li>
          ))}
          {data.ingredients.length > 8 && (
            <li className="text-sm text-zinc-500 italic">
              + {data.ingredients.length - 8} more ingredients...
            </li>
          )}
        </ul>
      </div>

      {/* Instructions preview */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-2">
          Instructions ({data.instructions.length} steps)
        </h4>
        <ol className="space-y-1">
          {data.instructions.slice(0, 3).map((inst, idx) => (
            <li key={idx} className="text-sm text-zinc-400">
              {inst.stepNumber}. {inst.instruction.substring(0, 100)}
              {inst.instruction.length > 100 ? '...' : ''}
            </li>
          ))}
          {data.instructions.length > 3 && (
            <li className="text-sm text-zinc-500 italic">
              + {data.instructions.length - 3} more steps...
            </li>
          )}
        </ol>
      </div>
    </div>
  )
}

function renderMacrosPreview(action: UpdateMacrosAction) {
  const { data } = action

  // Check if we have valid data
  const hasValidData = data &&
    typeof data.dailyCalorieTarget === 'number' &&
    typeof data.dailyProteinTarget === 'number' &&
    typeof data.dailyCarbsTarget === 'number' &&
    typeof data.dailyFatTarget === 'number'

  if (!hasValidData) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <div className="text-center text-zinc-400">
          <p>Unable to display macro targets.</p>
          <p className="text-sm mt-2">The AI response may be missing required values.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <h4 className="text-sm font-medium text-zinc-300 mb-4">New Daily Targets</h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{data.dailyCalorieTarget}</div>
          <div className="text-xs text-zinc-500">Calories (kcal)</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{data.dailyProteinTarget}g</div>
          <div className="text-xs text-zinc-500">Protein</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{data.dailyCarbsTarget}g</div>
          <div className="text-xs text-zinc-500">Carbs</div>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{data.dailyFatTarget}g</div>
          <div className="text-xs text-zinc-500">Fat</div>
        </div>
      </div>

      {typeof data.dailyFiberTarget === 'number' && data.dailyFiberTarget > 0 && (
        <div className="mt-4 bg-zinc-900/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-orange-400">{data.dailyFiberTarget}g</div>
          <div className="text-xs text-zinc-500">Fiber</div>
        </div>
      )}
    </div>
  )
}

function renderPreferencesPreview(action: UpdatePreferencesAction) {
  const { data } = action

  const hasAddLikes = data.addLikes && data.addLikes.length > 0
  const hasRemoveLikes = data.removeLikes && data.removeLikes.length > 0
  const hasAddDislikes = data.addDislikes && data.addDislikes.length > 0
  const hasRemoveDislikes = data.removeDislikes && data.removeDislikes.length > 0

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <div className="space-y-4">
        {/* Likes Section */}
        {(hasAddLikes || hasRemoveLikes) && (
          <div>
            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
              <span>👍</span> Likes
            </h4>
            <div className="space-y-2">
              {hasAddLikes && (
                <div className="flex flex-wrap gap-2">
                  {data.addLikes!.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-green-900/50 text-green-300 rounded-full text-sm flex items-center gap-1"
                    >
                      <span className="text-green-500">+</span> {item}
                    </span>
                  ))}
                </div>
              )}
              {hasRemoveLikes && (
                <div className="flex flex-wrap gap-2">
                  {data.removeLikes!.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded-full text-sm flex items-center gap-1 line-through"
                    >
                      <span className="text-red-500">-</span> {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dislikes Section */}
        {(hasAddDislikes || hasRemoveDislikes) && (
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
              <span>👎</span> Dislikes
            </h4>
            <div className="space-y-2">
              {hasAddDislikes && (
                <div className="flex flex-wrap gap-2">
                  {data.addDislikes!.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-red-900/50 text-red-300 rounded-full text-sm flex items-center gap-1"
                    >
                      <span className="text-red-500">+</span> {item}
                    </span>
                  ))}
                </div>
              )}
              {hasRemoveDislikes && (
                <div className="flex flex-wrap gap-2">
                  {data.removeDislikes!.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded-full text-sm flex items-center gap-1 line-through"
                    >
                      <span className="text-green-500">-</span> {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderInventoryPreview(action: AddInventoryAction) {
  const { data } = action

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-2xl">
          {data.location === 'fridge' ? '🥶' : data.location === 'freezer' ? '❄️' : '🗄️'}
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-medium text-white">{data.itemName}</h4>
          <div className="text-sm text-zinc-400 space-y-1 mt-1">
            <div>Quantity: {data.quantity} {data.unit}</div>
            <div>Category: {data.category}</div>
            {data.location && <div>Location: {data.location}</div>}
            {data.expiryDate && <div>Expires: {data.expiryDate}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function renderStaplePreview(action: AddStapleAction) {
  const { data } = action

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    every_2_weeks: 'Every 2 weeks',
    every_4_weeks: 'Every 4 weeks',
    every_3_months: 'Every 3 months',
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-2xl">
          📋
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-medium text-white">{data.itemName}</h4>
          <div className="text-sm text-zinc-400 space-y-1 mt-1">
            <div>Quantity: {data.quantity} {data.unit}</div>
            <div>Frequency: {frequencyLabels[data.frequency || 'weekly']}</div>
            {data.category && <div>Category: {data.category}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function renderGenericPreview(details: Record<string, string | number | string[]>) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <dl className="space-y-2">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <dt className="text-zinc-500">{key}</dt>
            <dd className="text-zinc-200">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
