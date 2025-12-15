'use client'

import Image from 'next/image'

interface RecipeEmiliaTipsProps {
  tips: string
  className?: string
}

export function RecipeEmiliaTips({
  tips,
  className = '',
}: RecipeEmiliaTipsProps) {
  if (!tips) return null

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-700/30 p-5 ${className}`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Image
            src="/sarah-nutritionist.png"
            alt="Emilia - Your AI Nutritionist"
            width={48}
            height={48}
            className="rounded-full border-2 border-purple-500/50"
          />
        </div>
        <div>
          <h3 className="font-semibold text-purple-200 mb-2">Emilia's Nutritionist Tips</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            {tips}
          </p>
        </div>
      </div>
    </div>
  )
}
