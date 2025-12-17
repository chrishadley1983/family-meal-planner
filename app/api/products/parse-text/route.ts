import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProductFromText, normalizeCategory } from '@/lib/products/ai-parser'
import { z } from 'zod'

const parseTextSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters').max(20000, 'Text too long'),
})

/**
 * POST /api/products/parse-text
 *
 * Accepts pasted text (from clipboard) and uses AI to extract product information.
 * Useful for pasting product info from websites when URL import doesn't work.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { text } = parseTextSchema.parse(body)

    console.log('🔷 Parsing product from text, length:', text.length)

    // Parse with AI
    const parsed = await parseProductFromText(text)

    // Normalize the category
    const normalizedCategory = normalizeCategory(parsed.category)

    console.log('🟢 Product parsed from text:', parsed.name)

    return NextResponse.json({
      success: true,
      product: {
        ...parsed,
        category: normalizedCategory,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error parsing product text:', error)
    return NextResponse.json(
      { error: 'Failed to parse product from text' },
      { status: 500 }
    )
  }
}
