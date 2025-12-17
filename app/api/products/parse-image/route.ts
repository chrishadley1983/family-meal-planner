import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProductFromImage, normalizeCategory } from '@/lib/products/ai-parser'

/**
 * POST /api/products/parse-image
 *
 * Accepts an image upload (nutrition label, packaging photo) and uses AI
 * to extract product information. Returns parsed product data.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Supported: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    console.log('🔷 Parsing product from image:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Parse with AI
    const parsed = await parseProductFromImage(
      base64,
      file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    )

    // Normalize the category
    const normalizedCategory = normalizeCategory(parsed.category)

    console.log('🟢 Product parsed from image:', parsed.name)

    return NextResponse.json({
      success: true,
      product: {
        ...parsed,
        category: normalizedCategory,
      },
    })
  } catch (error) {
    console.error('❌ Error parsing product image:', error)
    return NextResponse.json(
      { error: 'Failed to parse product from image' },
      { status: 500 }
    )
  }
}
