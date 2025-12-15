'use client'

interface RecipeNotesProps {
  notes: string
  onChange?: (notes: string) => void
  editable?: boolean
  className?: string
}

export function RecipeNotes({
  notes,
  onChange,
  editable = false,
  className = '',
}: RecipeNotesProps) {
  return (
    <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-5 ${className}`}>
      <h2 className="font-semibold mb-3 text-white">Notes</h2>
      {editable ? (
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 min-h-[100px]"
          placeholder="Add your personal notes about this recipe..."
          value={notes}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : notes ? (
        <p className="text-sm text-zinc-300 leading-relaxed">{notes}</p>
      ) : (
        <p className="text-sm text-zinc-500 italic">No notes yet</p>
      )}
    </div>
  )
}
