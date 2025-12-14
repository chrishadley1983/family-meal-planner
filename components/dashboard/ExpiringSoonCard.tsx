'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'

interface ExpiringItem {
  id: string
  name: string
  quantity: string
  daysUntilExpiry: number
}

interface ExpiringSoonCardProps {
  items: ExpiringItem[]
}

export function ExpiringSoonCard({ items }: ExpiringSoonCardProps) {
  // Only show top 3 items
  const displayItems = items.slice(0, 3)

  if (displayItems.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="font-semibold text-white">Expiring Soon</h2>
          </div>
          <Link href="/inventory" className="text-xs text-zinc-400 hover:text-zinc-300">
            View all
          </Link>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-zinc-500">No items expiring soon</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="font-semibold text-white">Expiring Soon</h2>
        </div>
        <Link href="/inventory" className="text-xs text-zinc-400 hover:text-zinc-300">
          View all
        </Link>
      </div>

      {/* Items list */}
      <div className="divide-y divide-zinc-800">
        {displayItems.map((item) => (
          <div key={item.id} className="px-5 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-white">{item.name}</p>
              <p className="text-xs text-zinc-500">{item.quantity}</p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                item.daysUntilExpiry === 1
                  ? 'bg-red-500/20 text-red-400'
                  : item.daysUntilExpiry === 2
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {item.daysUntilExpiry === 1 ? 'Tomorrow' : `${item.daysUntilExpiry} days`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
