'use client'

interface Instruction {
  stepNumber: number
  instruction: string
}

interface RecipeInstructionsProps {
  instructions: Instruction[]
  className?: string
}

export function RecipeInstructions({
  instructions,
  className = '',
}: RecipeInstructionsProps) {
  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-5 ${className}`}>
      <h2 className="font-semibold mb-4 text-white">Instructions</h2>
      <ol className="space-y-4">
        {instructions.map((inst, idx) => (
          <li key={idx} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-medium">
              {inst.stepNumber}
            </div>
            <p className="text-zinc-300 leading-relaxed pt-1">
              {inst.instruction}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
