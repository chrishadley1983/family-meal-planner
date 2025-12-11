import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeInventoryPhoto } from '@/lib/claude'
import { fuzzyLookupShelfLife } from '@/lib/inventory/shelf-life-data'
import { calculateEstimatedExpiry } from '@/lib/inventory/calculations'
import type { ExtractedInventoryItem, StorageLocation } from '@/lib/types/inventory'

/**
 * POST /api/inventory/import-photo
 * Analyze a photo and extract inventory items using AI
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageData } = await req.json()

    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    // Validate image data format (should be base64)
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Please upload a JPEG or PNG image.' }, { status: 400 })
    }

    console.log('🔷 Processing inventory photo upload...')

    // Analyze photo using Claude Vision
    const aiResult = await analyzeInventoryPhoto(imageData)

    // Transform AI results to our ExtractedInventoryItem format
    // and enrich with shelf life data
    const extractedItems: ExtractedInventoryItem[] = (aiResult.items || []).map((item: any) => {
      // Look up shelf life data for this item
      const shelfLife = fuzzyLookupShelfLife(item.name)

      // Calculate expiry date if not provided by AI and shelf life data exists
      let calculatedExpiry: Date | undefined
      let expiryIsEstimated = false

      if (!item.expiryDate && shelfLife) {
        calculatedExpiry = calculateEstimatedExpiry(new Date(), shelfLife.typicalShelfLifeDays)
        expiryIsEstimated = true
      }

      // Use shelf life default location if AI didn't suggest one
      const suggestedLocation = item.suggestedLocation || shelfLife?.defaultLocation || null

      return {
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'whole',
        expiryDate: item.expiryDate || undefined,
        brand: item.brand || undefined,
        confidence: item.confidence || 'medium',
        suggestedCategory: item.suggestedCategory || shelfLife?.category || 'Other',
        suggestedLocation: suggestedLocation as StorageLocation | undefined,
        calculatedExpiry,
        expiryIsEstimated,
      }
    })

    console.log('🟢 Processed', extractedItems.length, 'items from photo')

    return NextResponse.json({
      items: extractedItems,
      processingNotes: aiResult.processingNotes || null,
    })
  } catch (error: any) {
    console.error('❌ Error analyzing inventory photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze photo. Please try again.' },
      { status: 500 }
    )
  }
}
