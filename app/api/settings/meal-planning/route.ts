import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SETTINGS, MealPlanSettings } from '@/lib/types/meal-plan-settings'

// GET /api/settings/meal-planning
// Fetch user's meal planning settings or return defaults
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching meal plan settings for user:', session.user.id)

    // Find settings for this user
    const dbSettings = await prisma.mealPlanSettings.findUnique({
      where: { userId: session.user.id }
    })

    // If no settings exist, return defaults
    if (!dbSettings) {
      console.log('🟢 No settings found, returning defaults')
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    // Convert database model to MealPlanSettings interface
    const settings: MealPlanSettings = {
      macroMode: dbSettings.macroMode as any,
      varietyEnabled: dbSettings.varietyEnabled,
      dinnerCooldown: dbSettings.dinnerCooldown,
      lunchCooldown: dbSettings.lunchCooldown,
      breakfastCooldown: dbSettings.breakfastCooldown,
      snackCooldown: dbSettings.snackCooldown,
      minCuisines: dbSettings.minCuisines,
      maxSameCuisine: dbSettings.maxSameCuisine,
      shoppingMode: dbSettings.shoppingMode as any,
      expiryPriority: dbSettings.expiryPriority as any,
      expiryWindow: dbSettings.expiryWindow,
      useItUpItems: dbSettings.useItUpItems,
      batchCookingEnabled: dbSettings.batchCookingEnabled,
      maxLeftoverDays: dbSettings.maxLeftoverDays,
      priorityOrder: dbSettings.priorityOrder as any,
      feedbackDetail: dbSettings.feedbackDetail as any
    }

    console.log('🟢 Settings loaded successfully')
    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('❌ Error fetching meal plan settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings/meal-planning
// Create or update user's meal planning settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    console.log('🔷 Saving meal plan settings for user:', session.user.id)

    // Validate required fields
    const settings: MealPlanSettings = {
      macroMode: body.macroMode || DEFAULT_SETTINGS.macroMode,
      varietyEnabled: body.varietyEnabled ?? DEFAULT_SETTINGS.varietyEnabled,
      dinnerCooldown: body.dinnerCooldown ?? DEFAULT_SETTINGS.dinnerCooldown,
      lunchCooldown: body.lunchCooldown ?? DEFAULT_SETTINGS.lunchCooldown,
      breakfastCooldown: body.breakfastCooldown ?? DEFAULT_SETTINGS.breakfastCooldown,
      snackCooldown: body.snackCooldown ?? DEFAULT_SETTINGS.snackCooldown,
      minCuisines: body.minCuisines ?? DEFAULT_SETTINGS.minCuisines,
      maxSameCuisine: body.maxSameCuisine ?? DEFAULT_SETTINGS.maxSameCuisine,
      shoppingMode: body.shoppingMode || DEFAULT_SETTINGS.shoppingMode,
      expiryPriority: body.expiryPriority || DEFAULT_SETTINGS.expiryPriority,
      expiryWindow: body.expiryWindow ?? DEFAULT_SETTINGS.expiryWindow,
      useItUpItems: body.useItUpItems || DEFAULT_SETTINGS.useItUpItems,
      batchCookingEnabled: body.batchCookingEnabled ?? DEFAULT_SETTINGS.batchCookingEnabled,
      maxLeftoverDays: body.maxLeftoverDays ?? DEFAULT_SETTINGS.maxLeftoverDays,
      priorityOrder: body.priorityOrder || DEFAULT_SETTINGS.priorityOrder,
      feedbackDetail: body.feedbackDetail || DEFAULT_SETTINGS.feedbackDetail
    }

    // Upsert settings in database
    const dbSettings = await prisma.mealPlanSettings.upsert({
      where: { userId: session.user.id },
      update: {
        macroMode: settings.macroMode,
        varietyEnabled: settings.varietyEnabled,
        dinnerCooldown: settings.dinnerCooldown,
        lunchCooldown: settings.lunchCooldown,
        breakfastCooldown: settings.breakfastCooldown,
        snackCooldown: settings.snackCooldown,
        minCuisines: settings.minCuisines,
        maxSameCuisine: settings.maxSameCuisine,
        shoppingMode: settings.shoppingMode,
        expiryPriority: settings.expiryPriority,
        expiryWindow: settings.expiryWindow,
        useItUpItems: settings.useItUpItems,
        batchCookingEnabled: settings.batchCookingEnabled,
        maxLeftoverDays: settings.maxLeftoverDays,
        priorityOrder: settings.priorityOrder,
        feedbackDetail: settings.feedbackDetail,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        macroMode: settings.macroMode,
        varietyEnabled: settings.varietyEnabled,
        dinnerCooldown: settings.dinnerCooldown,
        lunchCooldown: settings.lunchCooldown,
        breakfastCooldown: settings.breakfastCooldown,
        snackCooldown: settings.snackCooldown,
        minCuisines: settings.minCuisines,
        maxSameCuisine: settings.maxSameCuisine,
        shoppingMode: settings.shoppingMode,
        expiryPriority: settings.expiryPriority,
        expiryWindow: settings.expiryWindow,
        useItUpItems: settings.useItUpItems,
        batchCookingEnabled: settings.batchCookingEnabled,
        maxLeftoverDays: settings.maxLeftoverDays,
        priorityOrder: settings.priorityOrder,
        feedbackDetail: settings.feedbackDetail
      }
    })

    console.log('🟢 Settings saved successfully')

    return NextResponse.json({
      settings,
      message: 'Settings saved successfully'
    })
  } catch (error: any) {
    console.error('❌ Error saving meal plan settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}
