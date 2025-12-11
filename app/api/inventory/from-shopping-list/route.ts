import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { fuzzyLookupShelfLife } from '@/lib/inventory/shelf-life-data'
import { calculateEstimatedExpiry } from '@/lib/inventory/calculations'
import type { StorageLocation } from '@/lib/types/inventory'

const importFromShoppingListSchema = z.object({
  shoppingListId: z.string().uuid().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    category: z.string().optional(),
  })),
})

/**
 * POST /api/inventory/from-shopping-list
 * Add items from a shopping list to inventory (e.g., after purchase)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = importFromShoppingListSchema.parse(body)

    console.log('🔷 Adding', data.items.length, 'items from shopping list to inventory')

    const results = {
      added: 0,
      merged: 0,
      errors: 0,
      items: [] as Array<{
        itemName: string
        action: 'added' | 'merged' | 'error'
        error?: string
      }>,
    }

    for (const item of data.items) {
      try {
        // Check for existing inventory item with same name
        const existing = await prisma.inventoryItem.findFirst({
          where: {
            userId: session.user.id,
            itemName: {
              equals: item.itemName,
              mode: 'insensitive',
            },
            isActive: true,
          },
        })

        // Look up shelf life data for expiry calculation
        const shelfLife = fuzzyLookupShelfLife(item.itemName)
        const purchaseDate = new Date()

        // Determine expiry date
        let expiryDate: Date | null = null
        let expiryIsEstimated = false
        let location: StorageLocation | null = null

        if (shelfLife) {
          expiryDate = calculateEstimatedExpiry(purchaseDate, shelfLife.typicalShelfLifeDays)
          expiryIsEstimated = true
          location = shelfLife.defaultLocation
        }

        // Determine category (from item, shelf life, or default)
        const category = item.category || shelfLife?.category || 'Other'

        if (existing) {
          // Merge with existing - add quantity if units match
          const isSameUnit = existing.unit.toLowerCase() === item.unit.toLowerCase()

          if (isSameUnit) {
            await prisma.inventoryItem.update({
              where: { id: existing.id },
              data: {
                quantity: existing.quantity + item.quantity,
                updatedAt: new Date(),
              },
            })
            results.merged++
            results.items.push({ itemName: item.itemName, action: 'merged' })
            console.log(`🔄 Merged ${item.itemName}: +${item.quantity} ${item.unit}`)
          } else {
            // Different units - create new item
            await prisma.inventoryItem.create({
              data: {
                userId: session.user.id,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                category,
                location,
                purchaseDate,
                expiryDate,
                expiryIsEstimated,
                isActive: true,
                addedBy: 'ShoppingList',
              },
            })
            results.added++
            results.items.push({ itemName: item.itemName, action: 'added' })
            console.log(`🟢 Added ${item.itemName}: ${item.quantity} ${item.unit} (different unit from existing)`)
          }
        } else {
          // Create new inventory item
          await prisma.inventoryItem.create({
            data: {
              userId: session.user.id,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              category,
              location,
              purchaseDate,
              expiryDate,
              expiryIsEstimated,
              isActive: true,
              addedBy: 'ShoppingList',
            },
          })
          results.added++
          results.items.push({ itemName: item.itemName, action: 'added' })
          console.log(`🟢 Added ${item.itemName}: ${item.quantity} ${item.unit}`)
        }
      } catch (itemError) {
        console.error(`❌ Error adding ${item.itemName}:`, itemError)
        results.errors++
        results.items.push({
          itemName: item.itemName,
          action: 'error',
          error: itemError instanceof Error ? itemError.message : 'Unknown error',
        })
      }
    }

    console.log('🟢 Shopping list to inventory complete:', {
      added: results.added,
      merged: results.merged,
      errors: results.errors,
    })

    return NextResponse.json({
      message: `Added ${results.added} new items, merged ${results.merged} existing items`,
      ...results,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error adding items from shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
