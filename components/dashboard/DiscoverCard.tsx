'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function DiscoverCard() {
  return (
    <div className="bg-gradient-to-br from-orange-900/40 to-rose-900/40 rounded-xl border border-orange-700/30 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-orange-200">Discover Recipes</h3>
          <p className="text-xs text-orange-300/70">Find your next family favourite</p>
        </div>
      </div>
      <p className="text-sm text-orange-100/80 leading-relaxed mb-4">
        Browse hundreds of recipes matched to your family's tastes and dietary needs. Emilia, your AI
        nutritionist, helps guide you towards meals that meet your goals.
      </p>
      <Link
        href="/discover"
        className="block w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-orange-200 text-center transition-colors"
      >
        Explore recipes &rarr;
      </Link>
    </div>
  )
}
