import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseRecipeFromUrl } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch recipe from URL' },
        { status: 400 }
      )
    }

    const htmlContent = await response.text()

    // Parse recipe using Claude
    const parsedRecipe = await parseRecipeFromUrl(url, htmlContent)

    // Add the source URL to the parsed recipe
    const recipeData = {
      ...parsedRecipe,
      sourceUrl: url,
      recipeSource: new URL(url).hostname
    }

<<<<<<< HEAD
    return NextResponse.json({
      recipe: recipeData
    })
=======
    return NextResponse.json({ recipe: recipeData })
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
  } catch (error: any) {
    console.error('Error importing recipe from URL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import recipe from URL' },
      { status: 500 }
    )
  }
}
