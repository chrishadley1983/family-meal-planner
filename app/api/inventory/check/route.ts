import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import {
  checkInventoryForShoppingList,
  getInventorySettings,
} from '@/lib/inventory/inventory-check'

const checkInventorySchema = z.object({
  items: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
  })),
})

/**
 * POST /api/inventory/check
 * Check a list of items against the user's inventory
 * Returns which items can be excluded or reduced
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = checkInventorySchema.parse(body)

    console.log('🔷 Checking', data.items.length, 'items against inventory')

    // Check user's inventory settings
    const settings = await getInventorySettings(session.user.id)

    if (settings.skipInventoryCheck) {
      console.log('⚠️ User has disabled inventory check')
      return NextResponse.json({
        enabled: false,
        message: 'Inventory check is disabled in settings',
        report: {
          checkedItems: data.items.map((item: { itemName: string; quantity: number; unit: string }) => ({
            itemName: item.itemName,
            recipeQuantity: item.quantity,
            recipeUnit: item.unit,
            inventoryMatch: null,
            inventoryQuantity: 0,
            action: 'add' as const,
            netQuantityNeeded: item.quantity,
          })),
          excludedCount: 0,
          reducedCount: 0,
          addedCount: data.items.length,
        },
      })
    }

    // Perform inventory check
    const report = await checkInventoryForShoppingList(session.user.id, data.items)

    console.log('🟢 Inventory check complete:', {
      excluded: report.excludedCount,
      reduced: report.reducedCount,
      added: report.addedCount,
    })

    return NextResponse.json({
      enabled: true,
      report,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error checking inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
