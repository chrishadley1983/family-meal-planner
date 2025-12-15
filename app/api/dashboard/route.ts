import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays, format, differenceInDays, isToday, startOfDay } from 'date-fns'

// Inline types for callback parameters
interface MealWithRecipe {
  dayOfWeek: string
  mealType: string
  recipeId: string | null
  recipeName: string | null
  recipe: { id: string; recipeName: string } | null
}

interface ShoppingItem {
  category: string | null
  isPurchased: boolean
}

interface InventoryItemType {
  id: string
  itemName: string
  quantity: number
  unit: string
  expiryDate: Date | null
}

// Dashboard data types - updated for expandable meals
interface DayMeal {
  type: string          // 'Breakfast', 'Lunch', 'Dinner', etc.
  name: string          // Recipe name
  recipeId: string | null
}

interface WeeklyMeal {
  day: string           // 'Sunday'
  dayShort: string      // 'Sun'
  date: string          // '2025-12-15' (ISO)
  dateDisplay: string   // '15 Dec'
  isToday: boolean
  meals: DayMeal[]      // All meals for this day
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
  plannedDays: number      // Days with at least 1 meal
  totalMeals: number       // Total meals across all days
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

/**
 * GET /api/dashboard
 * Fetch aggregated dashboard data for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching dashboard data for user:', session.user.id)

    const today = startOfDay(new Date())

    // Fetch all data in parallel for performance
    const [
      mainProfile,
      profileCount,
      currentMealPlan,
      activeShoppingList,
      expiringInventory,
      recipeCount,
      staplesCount,
      inventoryCount,
    ] = await Promise.all([
      // Get main user profile for name
      prisma.familyProfile.findFirst({
        where: {
          userId: session.user.id,
          isMainUser: true,
        },
      }),
      // Count family members
      prisma.familyProfile.count({
        where: { userId: session.user.id },
      }),
      // Get meal plan that covers today OR starts within the next 7 days
      // This ensures we show upcoming meal plans even if they haven't started yet
      prisma.mealPlan.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            // Option 1: Meal plan covers today (already started, not yet ended)
            { weekStartDate: { lte: today }, weekEndDate: { gte: today } },
            // Option 2: Upcoming meal plan starts within next 7 days
            { weekStartDate: { gt: today, lte: addDays(today, 7) } }
          ]
        },
        include: {
          meals: {
            include: {
              recipe: {
                select: {
                  id: true,
                  recipeName: true,
                },
              },
            },
          },
        },
        orderBy: { weekStartDate: 'asc' }, // Prefer the soonest meal plan
      }),
      // Get active shopping list (most recent non-archived)
      prisma.shoppingList.findFirst({
        where: {
          userId: session.user.id,
          status: { not: 'Archived' },
        },
        include: {
          items: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      // Get expiring inventory items (within 3 days)
      prisma.inventoryItem.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          expiryDate: {
            not: null,
            lte: addDays(today, 3),
            gte: today,
          },
        },
        orderBy: {
          expiryDate: 'asc',
        },
        take: 5,
      }),
      // Count recipes
      prisma.recipe.count({
        where: {
          userId: session.user.id,
          isArchived: false,
        },
      }),
      // Count staples due this week
      prisma.staple.count({
        where: {
          userId: session.user.id,
          isActive: true,
          frequency: 'weekly',
        },
      }),
      // Count active inventory items
      prisma.inventoryItem.count({
        where: {
          userId: session.user.id,
          isActive: true,
        },
      }),
    ])

    console.log('🔷 Meal plan found:', currentMealPlan?.id || 'none')
    if (currentMealPlan) {
      console.log('🔷 Meal plan dates:', currentMealPlan.weekStartDate, 'to', currentMealPlan.weekEndDate)
      console.log('🔷 Meals found:', currentMealPlan.meals.length)
    }

    // Build user info
    const firstName = mainProfile?.profileName?.split(' ')[0] || session.user.email?.split('@')[0] || 'User'
    const familyName = mainProfile?.profileName?.includes(' ')
      ? mainProfile.profileName.split(' ').slice(1).join(' ') + ' Family'
      : 'Family'
    const initials = firstName.charAt(0).toUpperCase() + (familyName.charAt(0)?.toUpperCase() || '')

    // Build week range label from meal plan dates (or fallback)
    let weekLabel: string
    let weekStart: Date
    let weekEnd: Date

    if (currentMealPlan) {
      weekStart = new Date(currentMealPlan.weekStartDate)
      weekEnd = new Date(currentMealPlan.weekEndDate)
      weekLabel = `${format(weekStart, 'd')}–${format(weekEnd, 'd MMMM yyyy')}`
    } else {
      // Fallback: show next 7 days from today
      weekStart = today
      weekEnd = addDays(today, 6)
      weekLabel = `${format(weekStart, 'd')}–${format(weekEnd, 'd MMMM yyyy')}`
    }

    // Build weekly meals array - use meal plan's dates if available, otherwise from today
    // Now with multiple meals per day (expandable view)
    const weeklyMeals: WeeklyMeal[] = []

    // Meal type display order
    const mealTypeOrder = ['breakfast', 'lunch', 'afternoon-snack', 'dinner', 'dessert']
    const mealTypeLabels: Record<string, string> = {
      'breakfast': 'Breakfast',
      'lunch': 'Lunch',
      'afternoon-snack': 'Snack',
      'dinner': 'Dinner',
      'dessert': 'Dessert',
    }

    // Use meal plan's week dates if available, otherwise start from today
    const displayStartDate = currentMealPlan ? weekStart : today

    for (let i = 0; i < 7; i++) {
      const date = addDays(displayStartDate, i)
      const dayName = format(date, 'EEEE') // 'Monday', 'Tuesday', etc.
      const dayShort = format(date, 'EEE')  // 'Mon', 'Tue', etc.
      const dateDisplay = format(date, 'd MMM') // '15 Dec'

      // Check if this date is today
      const dateIsToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

      // Find ALL meals for this day (database stores full day names like 'Monday', 'Tuesday')
      const dayMeals = currentMealPlan?.meals
        .filter((m: MealWithRecipe) => m.dayOfWeek === dayName)
        .sort((a: MealWithRecipe, b: MealWithRecipe) => {
          const aIndex = mealTypeOrder.indexOf(a.mealType.toLowerCase())
          const bIndex = mealTypeOrder.indexOf(b.mealType.toLowerCase())
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
        })
        .map((m: MealWithRecipe): DayMeal => ({
          type: mealTypeLabels[m.mealType.toLowerCase()] || m.mealType,
          name: m.recipe?.recipeName || m.recipeName || 'Unknown',
          recipeId: m.recipeId,
        })) || []

      weeklyMeals.push({
        day: dayName,
        dayShort,
        date: format(date, 'yyyy-MM-dd'),
        dateDisplay,
        isToday: dateIsToday, // True if this date matches today's date
        meals: dayMeals,
      })
    }

    const plannedDays = weeklyMeals.filter((m) => m.meals.length > 0).length
    const totalMeals = weeklyMeals.reduce((acc, m) => acc + m.meals.length, 0)

    // Build shopping list summary with categories
    const categories: ShoppingCategory[] = []
    if (activeShoppingList?.items) {
      const categoryMap = new Map<string, number>()
      activeShoppingList.items.forEach((item: ShoppingItem) => {
        const cat = item.category || 'Other'
        // Map to simpler category names
        let displayCat = cat
        if (cat.toLowerCase().includes('fresh') || cat.toLowerCase().includes('produce')) {
          displayCat = 'Fresh'
        } else if (cat.toLowerCase().includes('meat') || cat.toLowerCase().includes('fish') || cat.toLowerCase().includes('seafood')) {
          displayCat = 'Meat & Fish'
        } else if (cat.toLowerCase().includes('dairy')) {
          displayCat = 'Dairy'
        } else {
          displayCat = 'Cupboard'
        }
        categoryMap.set(displayCat, (categoryMap.get(displayCat) || 0) + 1)
      })
      // Convert to array with consistent order
      const categoryOrder = ['Fresh', 'Meat & Fish', 'Dairy', 'Cupboard']
      categoryOrder.forEach((cat) => {
        categories.push({ name: cat, count: categoryMap.get(cat) || 0 })
      })
    } else {
      // Default empty categories
      categories.push(
        { name: 'Fresh', count: 0 },
        { name: 'Meat & Fish', count: 0 },
        { name: 'Dairy', count: 0 },
        { name: 'Cupboard', count: 0 }
      )
    }

    // Build expiring items
    const expiringItems: ExpiringItem[] = expiringInventory.map((item: InventoryItemType) => {
      const daysUntil = item.expiryDate ? differenceInDays(item.expiryDate, today) : 0
      return {
        id: item.id,
        name: item.itemName,
        quantity: `${item.quantity}${item.unit ? ' ' + item.unit : ''}`,
        daysUntilExpiry: Math.max(0, daysUntil) + 1, // +1 because differenceInDays returns 0 for today
      }
    })

    const dashboardData: DashboardData = {
      user: {
        firstName,
        familyName,
        initials,
        email: session.user.email || '',
      },
      weekRange: {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
        label: weekLabel,
      },
      weeklyMeals,
      plannedDays,
      totalMeals,
      mealPlanId: currentMealPlan?.id || null,
      shoppingList: {
        id: activeShoppingList?.id || null,
        total: activeShoppingList?.items.length || 0,
        purchased: activeShoppingList?.items.filter((i: ShoppingItem) => i.isPurchased).length || 0,
        categories,
      },
      expiringItems,
      counts: {
        recipes: recipeCount,
        staplesDue: staplesCount,
        inventoryItems: inventoryCount,
        familyMembers: profileCount,
      },
    }

    console.log('🟢 Dashboard data fetched successfully')
    console.log('🟢 Weekly meals:', weeklyMeals.map(m => `${m.dayShort} ${m.dateDisplay}: ${m.meals.length} meals`))

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
