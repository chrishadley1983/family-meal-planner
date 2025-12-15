'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface RecipeDiscoverBannerProps {
  className?: string
}

export function RecipeDiscoverBanner({ className = '' }: RecipeDiscoverBannerProps) {
  return (
    <div
      className={`relative bg-gradient-to-r from-orange-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl p-6 overflow-hidden ${className}`}
    >
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Discover New Recipes</h3>
            <p className="text-zinc-400 text-sm">
              Emilia can recommend meals based on your family&apos;s preferences and goals
            </p>
          </div>
        </div>
        <Link
          href="/discover"
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl text-sm font-medium transition-colors border border-white/10 text-white whitespace-nowrap"
        >
          Find recipes &rarr;
        </Link>
      </div>
    </div>
  )
}
