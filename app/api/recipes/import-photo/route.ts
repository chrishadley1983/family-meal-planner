import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeRecipePhoto } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { images } = await req.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }

    // Validate all image data formats (should be base64)
    for (const imageData of images) {
      if (!imageData.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
      }
    }

    console.log(`📸 Analyzing ${images.length} image(s) for recipe import`)

    // Analyze photos using Claude Vision (supports multiple images)
    const analyzedRecipe = await analyzeRecipePhoto(images)

    // Transform the suggested ingredients and instructions to match the recipe schema
    const recipeData = {
      recipeName: analyzedRecipe.recipeName,
      description: analyzedRecipe.description,
      cuisineType: analyzedRecipe.cuisineType,
      difficultyLevel: analyzedRecipe.difficultyLevel,
      mealType: analyzedRecipe.mealType,
      servings: 4, // Default servings
      ingredients: analyzedRecipe.suggestedIngredients || [],
      instructions: analyzedRecipe.suggestedInstructions || []
    }

    return NextResponse.json({ recipe: recipeData })
  } catch (error: any) {
    console.error('❌ Error analyzing recipe photo(s):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze recipe photo(s)' },
      { status: 500 }
    )
  }
}
