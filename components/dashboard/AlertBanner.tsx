'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface ExpiringItem {
  id: string
  name: string
  quantity: string
  daysUntilExpiry: number
}

interface AlertBannerProps {
  expiringItems: ExpiringItem[]
}

export function AlertBanner({ expiringItems }: AlertBannerProps) {
  // Only show if there are items expiring within 3 days
  if (expiringItems.length === 0) {
    return null
  }

  // Get the most urgent item
  const mostUrgent = expiringItems[0]
  const urgencyText =
    mostUrgent.daysUntilExpiry === 1
      ? 'expires tomorrow'
      : `expires in ${mostUrgent.daysUntilExpiry} days`

  return (
    <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-xl p-4 mb-6 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-amber-200">
          {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
        </p>
        <p className="text-sm text-amber-300/70 truncate">
          {mostUrgent.name} {urgencyText}
        </p>
      </div>
      <Link
        href="/discover"
        className="text-sm text-amber-300 hover:text-amber-200 font-medium whitespace-nowrap"
      >
        View recipes &rarr;
      </Link>
    </div>
  )
}
