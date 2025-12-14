'use client'

import Link from 'next/link'
import { ChefHat, Package, User } from 'lucide-react'

interface QuickActionsGridProps {
  recipesCount: number
  staplesDue: number
  inventoryCount: number
  familyMembers: number
}

type ColorType = 'green' | 'amber' | 'blue' | 'purple'

interface QuickActionProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel: string
  color: ColorType
}

const colorClasses: Record<ColorType, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-emerald-500/20 text-emerald-400',
  amber: 'bg-amber-500/20 text-amber-400',
  purple: 'bg-purple-500/20 text-purple-400',
}

function QuickAction({ href, icon: Icon, label, sublabel, color }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:bg-zinc-800/70 transition-colors group block"
    >
      <div
        className={`w-9 h-9 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-medium text-sm text-white">{label}</p>
      <p className="text-xs text-zinc-500 group-hover:text-zinc-400">{sublabel}</p>
    </Link>
  )
}

export function QuickActionsGrid({
  recipesCount,
  staplesDue,
  inventoryCount,
  familyMembers,
}: QuickActionsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <QuickAction
        href="/recipes"
        icon={ChefHat}
        label="Recipes"
        sublabel={`${recipesCount} saved`}
        color="green"
      />
      <QuickAction
        href="/staples"
        icon={Package}
        label="Staples"
        sublabel={`${staplesDue} due`}
        color="amber"
      />
      <QuickAction
        href="/inventory"
        icon={Package}
        label="Inventory"
        sublabel={`${inventoryCount} items`}
        color="blue"
      />
      <QuickAction
        href="/profiles"
        icon={User}
        label="Profiles"
        sublabel={`${familyMembers} members`}
        color="purple"
      />
    </div>
  )
}
