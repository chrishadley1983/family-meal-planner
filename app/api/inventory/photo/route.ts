import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeInventoryPhoto } from '@/lib/claude'
import { z } from 'zod'
import type { StorageLocation } from '@/lib/types/inventory'
import { SHELF_LIFE_SEED_DATA } from '@/lib/inventory/shelf-life-seed-data'
import { calculateExpiryFromShelfLife } from '@/lib/inventory/expiry-calculations'

// Valid storage locations
const storageLocations = ['fridge', 'freezer', 'cupboard', 'pantry'] as const

// Schema for analyzing photo
const analyzePhotoSchema = z.object({
  images: z.array(z.string()).min(1, 'At least one image is required'),
})

// Schema for importing extracted items
const importPhotoItemsSchema = z.object({
  items: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    category: z.string().optional(),
    location: z.enum(storageLocations).optional().nullable(),
    selected: z.boolean().optional(),
  })).min(1, 'At least one item is required'),
  options: z.object({
    autoExpiry: z.boolean().optional(),
  }).optional(),
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

// Parse storage location from string
function parseLocation(locationStr: string | undefined | null): StorageLocation | null {
  if (!locationStr) return null

  const lower = locationStr.toLowerCase().trim()

  if (lower === 'fridge' || lower.includes('refrigerat')) return 'fridge'
  if (lower === 'freezer' || lower.includes('frozen')) return 'freezer'
  if (lower === 'cupboard' || lower === 'cabinet') return 'cupboard'
  if (lower === 'pantry' || lower.includes('ambient') || lower.includes('room')) return 'pantry'

  return null
}

// POST /api/inventory/photo - Analyze photos and extract items
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Check if this is an analyze request or import request
    if (body.images) {
      // Analyze photos
      const data = analyzePhotoSchema.parse(body)
      console.log('🔷 Analyzing', data.images.length, 'photo(s) for inventory items...')

      const result = await analyzeInventoryPhoto(data.images)
      console.log('🟢 Extracted', result.items?.length || 0, 'items from photo')

      return NextResponse.json({
        success: true,
        items: result.items || [],
        summary: result.summary || '',
      })
    } else if (body.items) {
      // Import selected items
      const data = importPhotoItemsSchema.parse(body)
      const options = {
        autoExpiry: true,
        ...data.options,
      }

      console.log('🔷 Importing', data.items.length, 'items from photo analysis...')

      const itemsToCreate: Array<{
        itemName: string
        quantity: number
        unit: string
        category: string
        location: StorageLocation | null
        purchaseDate: Date
        expiryDate: Date | null
        expiryIsEstimated: boolean
        isActive: boolean
        addedBy: string
        notes: string | null
        userId: string
      }> = []

      for (const item of data.items) {
        if (item.selected === false) continue

        // Look up shelf life data
        const shelfLife = lookupShelfLife(item.itemName)

        // Determine category
        let category = item.category
        if (!category && shelfLife) {
          category = shelfLife.category
        }
        if (!category) {
          category = 'Other'
        }

        // Determine location
        let location = parseLocation(item.location)
        if (!location && shelfLife) {
          location = shelfLife.defaultLocation
        }

        // Determine expiry date
        let expiryDate: Date | null = null
        let expiryIsEstimated = false

        if (options.autoExpiry && shelfLife) {
          expiryDate = calculateExpiryFromShelfLife(new Date(), shelfLife.shelfLifeDays)
          expiryIsEstimated = true
        }

        itemsToCreate.push({
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          category,
          location,
          purchaseDate: new Date(),
          expiryDate,
          expiryIsEstimated,
          isActive: true,
          addedBy: 'photo',
          notes: null,
          userId: session.user.id,
        })
      }

      // Bulk create items
      if (itemsToCreate.length > 0) {
        const created = await prisma.inventoryItem.createMany({
          data: itemsToCreate,
        })
        console.log('🟢 Imported', created.count, 'items from photo')
      }

      // Fetch all items to return
      const allItems = await prisma.inventoryItem.findMany({
        where: { userId: session.user.id },
        orderBy: [{ expiryDate: 'asc' }, { category: 'asc' }],
      })

      return NextResponse.json({
        success: true,
        imported: itemsToCreate.length,
        items: allItems,
      })
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error processing photo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
