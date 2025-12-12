import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeRecipePhoto } from '@/lib/claude'
import { convertRecipeIngredientsToMetric, getConversionSummary } from '@/lib/units/convert-recipe-to-metric'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Accept both 'images' (array) and 'imageData' (single string) for backwards compatibility
    let imagesToAnalyze: string[] = []

    if (body.images && Array.isArray(body.images)) {
      imagesToAnalyze = body.images
    } else if (body.imageData) {
      imagesToAnalyze = [body.imageData]
    }

    // Check if we have any images to analyze
    if (imagesToAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No images provided - please add at least one photo' },
        { status: 400 }
      )
    }

    // Validate all images are base64 format
    const validImages = imagesToAnalyze.filter(img =>
      typeof img === 'string' && img.startsWith('data:image/')
    )

    if (validImages.length === 0) {
      return NextResponse.json(
        { error: 'No valid images found - please use JPG, PNG, or other image formats' },
        { status: 400 }
      )
    }

    console.log(`🔷 Analyzing ${validImages.length} image(s) for recipe extraction...`)

    // Analyze photos using Claude Vision - let it try to extract whatever it can
    const analyzedRecipe = await analyzeRecipePhoto(validImages)

    // Validate that we got something useful back
    if (!analyzedRecipe) {
      return NextResponse.json(
        { error: 'Could not analyze the images. Please try clearer photos.' },
        { status: 400 }
      )
    }

    // Check if extraction produced meaningful results
    const hasRecipeName = analyzedRecipe.recipeName && analyzedRecipe.recipeName.trim().length > 0
    const hasIngredients = analyzedRecipe.suggestedIngredients && analyzedRecipe.suggestedIngredients.length > 0
    const hasInstructions = analyzedRecipe.suggestedInstructions && analyzedRecipe.suggestedInstructions.length > 0

    if (!hasRecipeName && !hasIngredients && !hasInstructions) {
      return NextResponse.json(
        { error: 'Could not extract recipe details from these images. Try photos with visible recipe text, ingredient lists, or clearer images of the dish.' },
        { status: 400 }
      )
    }

    console.log(`🟢 Recipe extracted: "${analyzedRecipe.recipeName}" with ${analyzedRecipe.suggestedIngredients?.length || 0} ingredients`)

    // Convert ingredients to metric if they have imperial units
    let convertedIngredients = analyzedRecipe.suggestedIngredients || []
    if (convertedIngredients.length > 0) {
      convertedIngredients = convertRecipeIngredientsToMetric(convertedIngredients)
      const summary = getConversionSummary(convertedIngredients)
      if (summary.converted > 0) {
        console.log(`🔄 Converted ${summary.converted}/${summary.total} ingredients to metric`)
      }
    }

    // Transform the suggested ingredients and instructions to match the recipe schema
    const recipeData = {
      recipeName: analyzedRecipe.recipeName || 'Untitled Recipe',
      description: analyzedRecipe.description,
      cuisineType: analyzedRecipe.cuisineType,
      difficultyLevel: analyzedRecipe.difficultyLevel,
      mealType: analyzedRecipe.mealType || [],
      servings: 4, // Default servings
      ingredients: convertedIngredients,
      instructions: analyzedRecipe.suggestedInstructions || []
    }

    return NextResponse.json({ recipe: recipeData })
  } catch (error: any) {
    console.error('❌ Error analyzing recipe photo:', error)

    // Provide more helpful error messages
    const errorMessage = error.message || 'Failed to analyze recipe photo'

    // Check for common API errors
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service is busy. Please try again in a moment.' },
        { status: 429 }
      )
    }

    if (errorMessage.includes('too large') || errorMessage.includes('size')) {
      return NextResponse.json(
        { error: 'One or more images are too large. Please use smaller images (under 3.75MB each).' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
