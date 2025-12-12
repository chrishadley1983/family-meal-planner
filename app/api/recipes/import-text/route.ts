import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeRecipeText } from '@/lib/claude'
import { convertRecipeIngredientsToMetric, getConversionSummary } from '@/lib/units/convert-recipe-to-metric'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = await req.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Recipe text is required' }, { status: 400 })
    }

    console.log('🔷 Parsing recipe text with Claude AI...')
    console.log('📝 Text length:', text.length, 'characters')

    // Parse recipe text using Claude
    const analyzedRecipe = await analyzeRecipeText(text)

    console.log('🟢 Recipe parsed successfully:', analyzedRecipe.recipeName)

    // Convert ingredients to metric if they have imperial units
    let convertedIngredients = analyzedRecipe.ingredients || []
    if (convertedIngredients.length > 0) {
      convertedIngredients = convertRecipeIngredientsToMetric(convertedIngredients)
      const summary = getConversionSummary(convertedIngredients)
      if (summary.converted > 0) {
        console.log(`🔄 Converted ${summary.converted}/${summary.total} ingredients to metric`)
      }
    }

    // Transform the response to match the recipe schema
    const recipeData = {
      recipeName: analyzedRecipe.recipeName,
      description: analyzedRecipe.description,
      cuisineType: analyzedRecipe.cuisineType,
      difficultyLevel: analyzedRecipe.difficultyLevel,
      mealType: analyzedRecipe.mealType || [],
      servings: analyzedRecipe.servings || 4,
      prepTimeMinutes: analyzedRecipe.prepTimeMinutes,
      cookTimeMinutes: analyzedRecipe.cookTimeMinutes,
      isVegetarian: analyzedRecipe.isVegetarian || false,
      isVegan: analyzedRecipe.isVegan || false,
      containsMeat: analyzedRecipe.containsMeat || false,
      containsSeafood: analyzedRecipe.containsSeafood || false,
      isDairyFree: analyzedRecipe.isDairyFree || false,
      isGlutenFree: analyzedRecipe.isGlutenFree || false,
      containsNuts: analyzedRecipe.containsNuts || false,
      ingredients: convertedIngredients,
      instructions: analyzedRecipe.instructions || []
    }

    return NextResponse.json({ recipe: recipeData })
  } catch (error: any) {
    console.error('❌ Error parsing recipe text:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse recipe text' },
      { status: 500 }
    )
  }
}
