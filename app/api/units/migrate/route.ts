import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findUnitByAlias } from '@/lib/units/unit-seed-data'

/**
 * POST /api/units/migrate
 * Migrates existing data to use unitCode FK references
 * Maps existing unit strings to their corresponding unitCode values
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Migrating existing data to use unitCode FK...')

    const results = {
      recipeIngredients: { updated: 0, skipped: 0, notFound: 0 },
      staples: { updated: 0, skipped: 0, notFound: 0 },
      inventoryItems: { updated: 0, skipped: 0, notFound: 0 },
      shoppingListItems: { updated: 0, skipped: 0, notFound: 0 },
      excludedItems: { updated: 0, skipped: 0, notFound: 0 },
    }

    // Migrate RecipeIngredients
    console.log('📦 Migrating RecipeIngredients...')
    const ingredients = await prisma.recipeIngredient.findMany({
      where: { unitCode: null },
      select: { id: true, unit: true },
    })

    for (const item of ingredients) {
      const unitData = findUnitByAlias(item.unit)
      if (unitData) {
        await prisma.recipeIngredient.update({
          where: { id: item.id },
          data: { unitCode: unitData.code },
        })
        results.recipeIngredients.updated++
      } else {
        results.recipeIngredients.notFound++
        console.log(`  ⚠️ No match for unit: "${item.unit}"`)
      }
    }

    // Migrate Staples
    console.log('📦 Migrating Staples...')
    const staples = await prisma.staple.findMany({
      where: { unitCode: null },
      select: { id: true, unit: true },
    })

    for (const item of staples) {
      const unitData = findUnitByAlias(item.unit)
      if (unitData) {
        await prisma.staple.update({
          where: { id: item.id },
          data: { unitCode: unitData.code },
        })
        results.staples.updated++
      } else {
        results.staples.notFound++
        console.log(`  ⚠️ No match for unit: "${item.unit}"`)
      }
    }

    // Migrate InventoryItems
    console.log('📦 Migrating InventoryItems...')
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { unitCode: null },
      select: { id: true, unit: true },
    })

    for (const item of inventoryItems) {
      const unitData = findUnitByAlias(item.unit)
      if (unitData) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { unitCode: unitData.code },
        })
        results.inventoryItems.updated++
      } else {
        results.inventoryItems.notFound++
        console.log(`  ⚠️ No match for unit: "${item.unit}"`)
      }
    }

    // Migrate ShoppingListItems
    console.log('📦 Migrating ShoppingListItems...')
    const shoppingListItems = await prisma.shoppingListItem.findMany({
      where: { unitCode: null },
      select: { id: true, unit: true },
    })

    for (const item of shoppingListItems) {
      const unitData = findUnitByAlias(item.unit)
      if (unitData) {
        await prisma.shoppingListItem.update({
          where: { id: item.id },
          data: { unitCode: unitData.code },
        })
        results.shoppingListItems.updated++
      } else {
        results.shoppingListItems.notFound++
        console.log(`  ⚠️ No match for unit: "${item.unit}"`)
      }
    }

    // Migrate ShoppingListExcludedItems
    console.log('📦 Migrating ShoppingListExcludedItems...')
    const excludedItems = await prisma.shoppingListExcludedItem.findMany({
      where: { recipeUnitCode: null },
      select: { id: true, recipeUnit: true },
    })

    for (const item of excludedItems) {
      const unitData = findUnitByAlias(item.recipeUnit)
      if (unitData) {
        await prisma.shoppingListExcludedItem.update({
          where: { id: item.id },
          data: { recipeUnitCode: unitData.code },
        })
        results.excludedItems.updated++
      } else {
        results.excludedItems.notFound++
        console.log(`  ⚠️ No match for unit: "${item.recipeUnit}"`)
      }
    }

    console.log('✅ Migration complete')
    console.log('Results:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Migration complete',
      results,
    })
  } catch (error: any) {
    console.error('❌ Error migrating data:', error)

    // Check if the table doesn't exist yet
    if (error.message?.includes('does not exist') || error.code === 'P2021') {
      return NextResponse.json(
        {
          error: 'Units table does not exist yet. Please run the database migration first: npx prisma db push',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to migrate data' },
      { status: 500 }
    )
  }
}
