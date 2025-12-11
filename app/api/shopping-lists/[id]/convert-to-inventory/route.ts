import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { StorageLocation } from '@/lib/types/inventory'
import { SHELF_LIFE_SEED_DATA } from '@/lib/inventory/shelf-life-seed-data'
import { calculateExpiryFromShelfLife } from '@/lib/inventory/expiry-calculations'
import { normalizeIngredientName } from '@/lib/ingredient-normalization'

// Schema for conversion request
const convertToInventorySchema = z.object({
  itemIds: z.array(z.string()).min(1, 'At least one item is required'),
  purchaseDate: z.string().optional(), // ISO date string
  autoExpiry: z.boolean().optional().default(true),
  autoCategory: z.boolean().optional().default(true),
  autoLocation: z.boolean().optional().default(true),
  mergeWithExisting: z.boolean().optional().default(true),
})

// Look up shelf life data for item
function lookupShelfLife(itemName: string) {
  const normalizedInput = itemName.toLowerCase().trim()

  // Try exact match first
  const exactMatch = SHELF_LIFE_SEED_DATA.find(
    item => item.ingredientName.toLowerCase() === normalizedInput
  )
  if (exactMatch) return exactMatch

  // Try partial match
  const partialMatch = SHELF_LIFE_SEED_DATA.find(item => {
    const refLower = item.ingredientName.toLowerCase()
    return normalizedInput.includes(refLower) || refLower.includes(normalizedInput)
  })
  if (partialMatch) return partialMatch

  // Try word-based matching
  const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2)
  const wordMatch = SHELF_LIFE_SEED_DATA.find(item => {
    const refWords = item.ingredientName.toLowerCase().split(/\s+/)
    return inputWords.some(iw => refWords.some(rw => rw.includes(iw) || iw.includes(rw)))
  })

  return wordMatch || null
}

// Infer category from item name
function inferCategory(itemName: string): string {
  const lower = itemName.toLowerCase()

  // Produce
  if (/\b(apple|banana|orange|grape|strawberr|blueberr|lemon|lime|avocado|tomato|lettuce|spinach|kale|carrot|onion|potato|broccoli|pepper|cucumber|celery|mushroom|garlic|ginger)\b/.test(lower)) {
    return 'Produce'
  }
  // Dairy
  if (/\b(milk|cheese|yogurt|cream|butter|egg)\b/.test(lower)) {
    return 'Dairy & Eggs'
  }
  // Meat
  if (/\b(chicken|beef|pork|lamb|turkey|bacon|sausage|steak|ground|mince|ham)\b/.test(lower)) {
    return 'Meat'
  }
  // Seafood
  if (/\b(fish|salmon|tuna|shrimp|prawn|cod|tilapia|crab|lobster|mussel|oyster)\b/.test(lower)) {
    return 'Seafood'
  }
  // Bakery
  if (/\b(bread|bagel|muffin|croissant|roll|bun|loaf|tortilla)\b/.test(lower)) {
    return 'Bakery'
  }
  // Frozen
  if (/\b(frozen|ice cream)\b/.test(lower)) {
    return 'Frozen'
  }
  // Beverages
  if (/\b(juice|soda|water|tea|coffee|wine|beer)\b/.test(lower)) {
    return 'Beverages'
  }
  // Pantry staples
  if (/\b(rice|pasta|flour|sugar|salt|oil|vinegar|sauce|stock|broth|can|tin|cereal|oat)\b/.test(lower)) {
    return 'Pantry'
  }
  // Spices
  if (/\b(spice|herb|pepper|paprika|cumin|cinnamon|oregano|basil|thyme|rosemary|bay|nutmeg|clove)\b/.test(lower)) {
    return 'Spices & Herbs'
  }
  // Condiments
  if (/\b(ketchup|mustard|mayo|mayonnaise|relish|dressing|spread|jam|jelly|honey|syrup|peanut butter)\b/.test(lower)) {
    return 'Condiments'
  }
  // Snacks
  if (/\b(chip|crisp|cracker|cookie|biscuit|popcorn|nut|pretzel)\b/.test(lower)) {
    return 'Snacks'
  }

  return 'Other'
}

// Infer storage location from category
function inferLocation(category: string): StorageLocation {
  const lower = category.toLowerCase()

  if (lower === 'produce' || lower === 'dairy & eggs' || lower === 'seafood') {
    return 'fridge'
  }
  if (lower === 'meat') {
    return 'fridge' // Could also be freezer
  }
  if (lower === 'frozen') {
    return 'freezer'
  }
  if (lower === 'pantry' || lower === 'spices & herbs' || lower === 'condiments' || lower === 'snacks' || lower === 'beverages') {
    return 'pantry'
  }

  return 'pantry' // Default
}

// POST /api/shopping-lists/[id]/convert-to-inventory - Convert purchased items to inventory
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params
    const body = await req.json()
    const data = convertToInventorySchema.parse(body)

    // Verify shopping list belongs to user
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id: shoppingListId },
      select: { userId: true },
    })

    if (!shoppingList || shoppingList.userId !== session.user.id) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    // Fetch selected items
    const items = await prisma.shoppingListItem.findMany({
      where: {
        id: { in: data.itemIds },
        shoppingListId,
      },
    })

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 400 })
    }

    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date()

    // Fetch existing inventory items for duplicate checking
    const existingInventory = data.mergeWithExisting
      ? await prisma.inventoryItem.findMany({
          where: { userId: session.user.id, isActive: true },
        })
      : []

    const results = {
      created: 0,
      merged: 0,
      errors: [] as string[],
    }

    for (const item of items) {
      try {
        // Look up shelf life data
        const shelfLife = lookupShelfLife(item.itemName)

        // Determine category
        let category = item.category
        if (!category && data.autoCategory) {
          category = shelfLife?.category || inferCategory(item.itemName)
        }
        if (!category) {
          category = 'Other'
        }

        // Determine location
        let location: StorageLocation | null = null
        if (data.autoLocation) {
          location = shelfLife?.defaultLocation || inferLocation(category)
        }

        // Determine expiry date
        let expiryDate: Date | null = null
        let expiryIsEstimated = false

        if (data.autoExpiry && shelfLife) {
          expiryDate = calculateExpiryFromShelfLife(purchaseDate, shelfLife.shelfLifeDays)
          expiryIsEstimated = true
        }

        // Check for existing duplicate
        const normalizedName = normalizeIngredientName(item.itemName)
        const existingItem = existingInventory.find((inv: { id: string; itemName: string; quantity: number; unit: string; purchaseDate: Date; expiryDate: Date | null; notes: string | null }) => {
          const normalizedInvName = normalizeIngredientName(inv.itemName)
          return (
            normalizedInvName === normalizedName ||
            normalizedInvName.includes(normalizedName) ||
            normalizedName.includes(normalizedInvName)
          )
        })

        if (existingItem && data.mergeWithExisting) {
          // Merge with existing item - add quantities if units match
          const unitsMatch = item.unit.toLowerCase() === existingItem.unit.toLowerCase()
          const newQuantity = unitsMatch
            ? existingItem.quantity + item.quantity
            : existingItem.quantity // Keep existing if units don't match

          await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQuantity,
              // Update purchase date to most recent
              purchaseDate:
                purchaseDate > existingItem.purchaseDate ? purchaseDate : existingItem.purchaseDate,
              // Keep earlier expiry date if exists
              expiryDate:
                expiryDate && existingItem.expiryDate
                  ? expiryDate < existingItem.expiryDate
                    ? expiryDate
                    : existingItem.expiryDate
                  : expiryDate || existingItem.expiryDate,
              notes: existingItem.notes
                ? `${existingItem.notes}; Added from shopping list`
                : 'Added from shopping list',
            },
          })
          results.merged++
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
              addedBy: 'shopping_list',
              notes: `Converted from shopping list`,
            },
          })
          results.created++
        }
      } catch (err) {
        console.error(`❌ Error converting item ${item.itemName}:`, err)
        results.errors.push(item.itemName)
      }
    }

    // Optionally mark converted items as "in inventory" on the shopping list
    await prisma.shoppingListItem.updateMany({
      where: {
        id: { in: data.itemIds },
        shoppingListId,
      },
      data: {
        inInventory: true,
      },
    })

    console.log(`🟢 Converted ${results.created + results.merged} shopping list items to inventory`)

    return NextResponse.json({
      success: true,
      created: results.created,
      merged: results.merged,
      errors: results.errors,
      total: results.created + results.merged,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('❌ Error converting to inventory:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/shopping-lists/[id]/convert-to-inventory - Preview conversion
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params
    const { searchParams } = new URL(req.url)
    const purchasedOnly = searchParams.get('purchasedOnly') === 'true'

    // Verify shopping list belongs to user
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id: shoppingListId },
      select: { userId: true },
    })

    if (!shoppingList || shoppingList.userId !== session.user.id) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    // Fetch items eligible for conversion
    const items = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        ...(purchasedOnly ? { isPurchased: true } : {}),
        inInventory: false, // Only items not already in inventory
      },
    })

    // Get existing inventory for duplicate checking
    const existingInventory = await prisma.inventoryItem.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { itemName: true, quantity: true, unit: true },
    })

    // Preview what would happen
    const preview = items.map((item: { id: string; itemName: string; quantity: number; unit: string; category: string | null; isPurchased: boolean }) => {
      const shelfLife = lookupShelfLife(item.itemName)
      const category = item.category || shelfLife?.category || inferCategory(item.itemName)
      const location = shelfLife?.defaultLocation || inferLocation(category)

      // Check for duplicate
      const normalizedName = normalizeIngredientName(item.itemName)
      const existingItem = existingInventory.find((inv: { itemName: string; quantity: number; unit: string }) => {
        const normalizedInvName = normalizeIngredientName(inv.itemName)
        return (
          normalizedInvName === normalizedName ||
          normalizedInvName.includes(normalizedName) ||
          normalizedName.includes(normalizedInvName)
        )
      })

      return {
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        category,
        location,
        shelfLifeDays: shelfLife?.shelfLifeDays || null,
        isPurchased: item.isPurchased,
        hasDuplicate: !!existingItem,
        existingQuantity: existingItem?.quantity || null,
        existingUnit: existingItem?.unit || null,
      }
    })

    return NextResponse.json({
      success: true,
      items: preview,
      purchasedCount: items.filter((i: { isPurchased: boolean }) => i.isPurchased).length,
      totalCount: items.length,
    })
  } catch (error) {
    console.error('❌ Error previewing conversion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
