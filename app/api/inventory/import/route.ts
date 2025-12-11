import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { StorageLocation } from '@/lib/types/inventory'
import { SHELF_LIFE_SEED_DATA } from '@/lib/inventory/shelf-life-seed-data'
import { calculateExpiryFromShelfLife } from '@/lib/inventory/expiry-calculations'

// Valid storage locations
const storageLocations = ['fridge', 'freezer', 'cupboard', 'pantry'] as const

// Schema for imported items
const importItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  location: z.enum(storageLocations).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const importRequestSchema = z.object({
  items: z.array(importItemSchema).min(1, 'At least one item is required'),
  options: z.object({
    skipDuplicates: z.boolean().optional(),
    autoExpiry: z.boolean().optional(),
    autoCategory: z.boolean().optional(),
    autoLocation: z.boolean().optional(),
  }).optional(),
})

interface ParsedCSVItem {
  itemName: string
  quantity: number
  unit: string
  category?: string
  location?: string
  expiryDate?: string
  notes?: string
}

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
function parseLocation(locationStr: string | undefined): StorageLocation | null {
  if (!locationStr) return null

  const lower = locationStr.toLowerCase().trim()

  if (lower === 'fridge' || lower.includes('refrigerat')) return 'fridge'
  if (lower === 'freezer' || lower.includes('frozen')) return 'freezer'
  if (lower === 'cupboard' || lower === 'cabinet') return 'cupboard'
  if (lower === 'pantry' || lower.includes('ambient') || lower.includes('room')) return 'pantry'

  return null
}

// Parse CSV text into items
function parseCSV(csvText: string): ParsedCSVItem[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))

  // Map header to field indices
  const fieldMap: Record<string, number> = {}
  const fieldVariants: Record<string, string[]> = {
    itemName: ['item', 'name', 'item name', 'itemname', 'ingredient', 'product'],
    quantity: ['quantity', 'qty', 'amount'],
    unit: ['unit', 'units', 'measure', 'measurement'],
    category: ['category', 'cat', 'type', 'group'],
    location: ['location', 'loc', 'storage', 'stored', 'place'],
    expiryDate: ['expiry', 'expiry date', 'expirydate', 'expires', 'use by', 'best before'],
    notes: ['notes', 'note', 'comment', 'comments', 'description'],
  }

  for (const [field, variants] of Object.entries(fieldVariants)) {
    const index = header.findIndex(h => variants.some(v => h.includes(v)))
    if (index !== -1) {
      fieldMap[field] = index
    }
  }

  if (fieldMap.itemName === undefined) {
    // Try first column as item name
    fieldMap.itemName = 0
  }

  // Parse data rows
  const items: ParsedCSVItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by comma, respecting quoted values
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const getValue = (field: string) => {
      const index = fieldMap[field]
      return index !== undefined && values[index] ? values[index].replace(/"/g, '') : undefined
    }

    const itemName = getValue('itemName')
    if (!itemName) continue

    const quantityStr = getValue('quantity')
    const quantity = quantityStr ? parseFloat(quantityStr) : 1

    if (isNaN(quantity) || quantity <= 0) continue

    items.push({
      itemName,
      quantity,
      unit: getValue('unit') || 'each',
      category: getValue('category'),
      location: getValue('location'),
      expiryDate: getValue('expiryDate'),
      notes: getValue('notes'),
    })
  }

  return items
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''

    let items: ParsedCSVItem[] = []
    let options = {
      skipDuplicates: true,
      autoExpiry: true,
      autoCategory: true,
      autoLocation: true,
    }

    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      // Raw CSV upload
      const csvText = await req.text()
      items = parseCSV(csvText)
      console.log('🔷 Parsed', items.length, 'items from CSV')
    } else {
      // JSON format with options
      const body = await req.json()
      const data = importRequestSchema.parse(body)
      items = data.items as ParsedCSVItem[]
      options = { ...options, ...data.options }
      console.log('🔷 Received', items.length, 'items via JSON')
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid items to import' }, { status: 400 })
    }

    // Get existing items for duplicate checking
    let existingItems: { itemName: string; id: string }[] = []
    if (options.skipDuplicates) {
      existingItems = await prisma.inventoryItem.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { itemName: true, id: true },
      })
    }

    const existingNames = new Set(existingItems.map(i => i.itemName.toLowerCase()))

    // Process items
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    }

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

    for (const item of items) {
      // Check for duplicates
      if (options.skipDuplicates && existingNames.has(item.itemName.toLowerCase())) {
        results.skipped++
        continue
      }

      // Look up shelf life data
      const shelfLife = lookupShelfLife(item.itemName)

      // Determine category
      let category = item.category
      if (!category && options.autoCategory && shelfLife) {
        category = shelfLife.category
      }
      if (!category) {
        category = 'Other'
      }

      // Determine location
      let location = parseLocation(item.location)
      if (!location && options.autoLocation && shelfLife) {
        location = shelfLife.defaultLocation
      }

      // Determine expiry date
      let expiryDate: Date | null = null
      let expiryIsEstimated = false

      if (item.expiryDate) {
        const parsed = new Date(item.expiryDate)
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed
        }
      }

      if (!expiryDate && options.autoExpiry && shelfLife) {
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
        addedBy: 'csv',
        notes: item.notes || null,
        userId: session.user.id,
      })
    }

    // Bulk create items
    if (itemsToCreate.length > 0) {
      const created = await prisma.inventoryItem.createMany({
        data: itemsToCreate,
      })
      results.imported = created.count
      console.log('🟢 Imported', created.count, 'items')
    }

    // Fetch all items to return
    const allItems = await prisma.inventoryItem.findMany({
      where: { userId: session.user.id },
      orderBy: [{ expiryDate: 'asc' }, { category: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      results,
      items: allItems,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error importing inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
