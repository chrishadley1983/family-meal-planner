import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DEFAULT_INVENTORY_SETTINGS } from '@/lib/types/inventory'

// GET - Fetch user's inventory settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching inventory settings for user:', session.user.id)

    const settings = await prisma.inventorySettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      // Return defaults if no settings exist
      console.log('🟢 No settings found, returning defaults')
      return NextResponse.json({
        settings: {
          ...DEFAULT_INVENTORY_SETTINGS,
          id: null,
          userId: session.user.id,
        },
      })
    }

    console.log('🟢 Settings fetched:', settings)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('❌ Error fetching inventory settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Schema for updating settings
const updateSettingsSchema = z.object({
  skipInventoryCheck: z.boolean().optional(),
  smallQuantityThresholdGrams: z.number().min(0).max(100).optional(),
  smallQuantityThresholdMl: z.number().min(0).max(100).optional(),
})

// PUT - Update user's inventory settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = updateSettingsSchema.parse(body)

    console.log('🔷 Updating inventory settings:', data)

    // Upsert settings
    const settings = await prisma.inventorySettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        skipInventoryCheck: data.skipInventoryCheck ?? DEFAULT_INVENTORY_SETTINGS.skipInventoryCheck,
        smallQuantityThresholdGrams: data.smallQuantityThresholdGrams ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdGrams,
        smallQuantityThresholdMl: data.smallQuantityThresholdMl ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdMl,
      },
      update: data,
    })

    console.log('🟢 Settings updated:', settings)
    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('❌ Error updating inventory settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
