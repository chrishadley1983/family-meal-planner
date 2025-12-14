'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import {
  DashboardHeader,
  AlertBanner,
  WeeklyMealsCard,
  WeeklyShoppingCard,
  DiscoverCard,
  ExpiringSoonCard,
  QuickActionsGrid,
} from '@/components/dashboard'

// Dashboard data types
interface WeeklyMeal {
  day: string           // 'Monday'
  dayShort: string      // 'Mon'
  date: string          // '2025-12-15' (ISO)
  dateDisplay: string   // '15 Dec'
  isToday: boolean
  dinner: string | null
  recipeId: string | null
  planned: boolean
}

interface ShoppingCategory {
  name: string
  count: number
}

interface ExpiringItem {
  id: string
  name: string
  quantity: string
  daysUntilExpiry: number
}

interface DashboardData {
  user: {
    firstName: string
    familyName: string
    initials: string
    email: string
  }
  weekRange: {
    start: string
    end: string
    label: string
  }
  weeklyMeals: WeeklyMeal[]
  plannedCount: number
  mealPlanId: string | null
  shoppingList: {
    id: string | null
    total: number
    purchased: number
    categories: ShoppingCategory[]
  }
  expiringItems: ExpiringItem[]
  counts: {
    recipes: number
    staplesDue: number
    inventoryItems: number
    familyMembers: number
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
  }, [status])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('🔷 Fetching dashboard data...')
        const response = await fetch('/api/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        console.log('🟢 Dashboard data received:', data)
        setDashboardData(data)
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <AppLayout userEmail={session?.user?.email || undefined}>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout userEmail={session?.user?.email || undefined}>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </AppLayout>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <AppLayout userEmail={session?.user?.email || undefined}>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Header with Week Context */}
        <DashboardHeader
          weekLabel={dashboardData.weekRange.label}
          familyName={dashboardData.user.familyName}
          mealPlanId={dashboardData.mealPlanId}
        />

        {/* Alert Banner - Contextual */}
        <AlertBanner expiringItems={dashboardData.expiringItems} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Weekly Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weekly Meal Plan Card */}
            <WeeklyMealsCard
              meals={dashboardData.weeklyMeals}
              plannedCount={dashboardData.plannedCount}
              mealPlanId={dashboardData.mealPlanId}
            />

            {/* Shopping List Summary */}
            <WeeklyShoppingCard
              shoppingListId={dashboardData.shoppingList.id}
              total={dashboardData.shoppingList.total}
              purchased={dashboardData.shoppingList.purchased}
              categories={dashboardData.shoppingList.categories}
            />
          </div>

          {/* Right Column - Quick Access */}
          <div className="space-y-6">
            {/* Discover Recipes Card */}
            <DiscoverCard />

            {/* Expiring Items */}
            <ExpiringSoonCard items={dashboardData.expiringItems} />

            {/* Quick Actions Grid */}
            <QuickActionsGrid
              recipesCount={dashboardData.counts.recipes}
              staplesDue={dashboardData.counts.staplesDue}
              inventoryCount={dashboardData.counts.inventoryItems}
              familyMembers={dashboardData.counts.familyMembers}
            />
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
