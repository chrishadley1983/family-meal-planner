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

    const { imageData } = await req.json()

    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    // Validate image data format (should be base64)
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Analyze photo using Claude Vision
    const analyzedRecipe = await analyzeRecipePhoto(imageData)

    // Transform the suggested ingredients and instructions to match the recipe schema
    const recipeData = {
      recipeName: analyzedRecipe.recipeName,
      description: analyzedRecipe.description,
      cuisineType: analyzedRecipe.cuisineType,
      difficultyLevel: analyzedRecipe.difficultyLevel,
      mealCategory: analyzedRecipe.mealCategory,
      servings: 4, // Default servings
      ingredients: analyzedRecipe.suggestedIngredients || [],
      instructions: analyzedRecipe.suggestedInstructions || []
    }

    return NextResponse.json({ recipe: recipeData })
  } catch (error: any) {
    console.error('Error analyzing recipe photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze recipe photo' },
      { status: 500 }
    )
  }
}
