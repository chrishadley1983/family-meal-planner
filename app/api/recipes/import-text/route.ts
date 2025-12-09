import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeRecipeText } from '@/lib/claude'

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

>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
    console.log('🟢 Recipe parsed successfully:', analyzedRecipe.recipeName)

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
      ingredients: analyzedRecipe.ingredients || [],
      instructions: analyzedRecipe.instructions || []
    }

    return NextResponse.json({ recipe: recipeData })
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
  } catch (error: any) {
    console.error('❌ Error parsing recipe text:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse recipe text' },
      { status: 500 }
    )
  }
}
