'use client'

import Link from 'next/link'
import { ShoppingCart, Clock, Check } from 'lucide-react'

interface ShoppingCategory {
  name: string
  count: number
}

interface WeeklyShoppingCardProps {
  shoppingListId: string | null
  total: number
  purchased: number
  categories: ShoppingCategory[]
}

export function WeeklyShoppingCard({
  shoppingListId,
  total,
  purchased,
  categories,
}: WeeklyShoppingCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Weekly Shopping</h2>
            <p className="text-sm text-zinc-500">{total} items for this week</p>
          </div>
        </div>
        <Link
          href={shoppingListId ? `/shopping-lists/${shoppingListId}` : '/shopping-lists'}
          className="text-sm text-purple-400 hover:text-purple-300 font-medium"
        >
          View list &rarr;
        </Link>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {categories.map((cat) => (
          <div key={cat.name} className="bg-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{cat.count}</div>
            <div className="text-xs text-zinc-500">{cat.name}</div>
          </div>
        ))}
      </div>

      {/* Shopping status */}
      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
        {purchased === 0 ? (
          <>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-sm text-zinc-400 flex-1">
              Shopping list ready - <span className="text-white font-medium">not yet started</span>
            </p>
            <Link
              href={shoppingListId ? `/shopping-lists/${shoppingListId}` : '/shopping-lists'}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Start shopping
            </Link>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm text-zinc-400 flex-1">
              <span className="text-white font-medium">
                {purchased} of {total}
              </span>{' '}
              items purchased
            </p>
            <Link
              href={shoppingListId ? `/shopping-lists/${shoppingListId}` : '/shopping-lists'}
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              Continue &rarr;
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
