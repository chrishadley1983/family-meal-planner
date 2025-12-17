import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProductFromUrl, normalizeCategory } from '@/lib/products/ai-parser'
import { z } from 'zod'

const parseUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
})

/**
 * POST /api/products/parse-url
 *
 * Fetches a product URL and uses AI to extract product information.
 * Returns parsed product data that can be used to pre-fill the add product form.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { url } = parseUrlSchema.parse(body)

    console.log('🔷 Fetching product URL:', url)

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })

    if (!response.ok) {
      console.error('❌ Failed to fetch URL:', response.status)
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      )
    }

    const htmlContent = await response.text()
    console.log('🟢 Fetched URL, content length:', htmlContent.length)

    // Parse with AI
    const parsed = await parseProductFromUrl(url, htmlContent)

    // Normalize the category
    const normalizedCategory = normalizeCategory(parsed.category)

    console.log('🟢 Product parsed successfully:', parsed.name)

    return NextResponse.json({
      success: true,
      product: {
        ...parsed,
        category: normalizedCategory,
        sourceUrl: url,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error parsing product URL:', error)
    return NextResponse.json(
      { error: 'Failed to parse product from URL' },
      { status: 500 }
    )
  }
}
