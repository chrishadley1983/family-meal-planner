'use client'

interface SuggestedPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function SuggestedPrompts({
  prompts,
  onSelect,
  disabled = false,
}: SuggestedPromptsProps) {
  if (prompts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => !disabled && onSelect(prompt)}
          disabled={disabled}
          className={`
            px-3 py-1.5 text-xs rounded-full transition-colors
            ${disabled
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600'
            }
          `}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
