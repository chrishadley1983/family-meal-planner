import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeInventoryUrl } from '@/lib/claude'
import { z } from 'zod'

// Schema for analyzing URL
const analyzeUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
})

// POST /api/inventory/url - Analyze URL and extract inventory items
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate request
    const data = analyzeUrlSchema.parse(body)
    console.log('🔷 Analyzing URL for inventory items:', data.url)

    // Fetch the webpage content
    const response = await fetch(data.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch content from URL' },
        { status: 400 }
      )
    }

    const htmlContent = await response.text()
    console.log('🟢 Fetched URL content, length:', htmlContent.length)

    // Analyze content using Claude
    const result = await analyzeInventoryUrl(data.url, htmlContent)
    console.log('🟢 Extracted', result.items?.length || 0, 'inventory items from URL')

    return NextResponse.json({
      success: true,
      items: result.items || [],
      summary: result.summary || '',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error processing URL:', error)
    return NextResponse.json(
      { error: 'Failed to analyze URL' },
      { status: 500 }
    )
  }
}
