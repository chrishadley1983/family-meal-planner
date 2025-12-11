import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeStaplesPhoto } from '@/lib/claude'
import { z } from 'zod'

// Schema for analyzing photo
const analyzePhotoSchema = z.object({
  images: z.array(z.string()).min(1, 'At least one image is required'),
})

// POST /api/staples/photo - Analyze photos and extract staple items
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate request
    const data = analyzePhotoSchema.parse(body)
    console.log('🔷 Analyzing', data.images.length, 'photo(s) for staple items...')

    const result = await analyzeStaplesPhoto(data.images)
    console.log('🟢 Extracted', result.items?.length || 0, 'staple items from photo')

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

    console.error('❌ Error processing photo:', error)
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    )
  }
}
