'use client'

import { Button } from '@/components/ui'

interface Instruction {
  stepNumber: number
  instruction: string
}

interface RecipeEditInstructionsProps {
  instructions: Instruction[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, value: string) => void
  className?: string
}

export function RecipeEditInstructions({
  instructions,
  onAdd,
  onRemove,
  onUpdate,
  className = '',
}: RecipeEditInstructionsProps) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Instructions</h2>
        <Button onClick={onAdd} variant="primary" size="sm">
          + Add Step
        </Button>
      </div>

      {/* Instruction Rows */}
      <div className="flex flex-col gap-3">
        {instructions.map((inst, index) => (
          <div key={index} className="flex gap-3">
            {/* Step number */}
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-medium">
              {inst.stepNumber}
            </div>

            {/* Instruction textarea */}
            <textarea
              value={inst.instruction}
              onChange={(e) => onUpdate(index, e.target.value)}
              placeholder="Describe this step..."
              rows={2}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none min-h-[60px]"
            />

            {/* Delete button */}
            <button
              onClick={() => onRemove(index)}
              className="text-red-400 hover:text-red-300 self-start mt-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
