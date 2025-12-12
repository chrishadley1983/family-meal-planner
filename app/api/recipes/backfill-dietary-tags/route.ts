import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// POST - Backfill dietary tags for all existing recipes using AI
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting dietary tags backfill for user:', session.user.id)

    // Fetch all recipes for the user
    const recipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      include: {
        ingredients: true
      }
    })

    console.log(`📊 Found ${recipes.length} recipes to analyze`)

    const results = {
      total: recipes.length,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each recipe
    for (const recipe of recipes) {
      try {
        console.log(`🔍 Analyzing recipe: ${recipe.recipeName}`)

        // Build prompt for AI analysis
        const ingredientsList = recipe.ingredients
          .map(ing => `- ${ing.quantity} ${ing.unit} ${ing.ingredientName}`)
          .join('\n')

        const prompt = `Analyze this recipe and determine its dietary properties and macros based on the ingredients:

Recipe: ${recipe.recipeName}
${recipe.description ? `Description: ${recipe.description}` : ''}
Servings: ${recipe.servings}

Ingredients:
${ingredientsList}

Return ONLY a valid JSON object with these fields:
{
  "isVegetarian": boolean (true if no meat/seafood),
  "isVegan": boolean (true if no animal products at all),
  "containsMeat": boolean (true if contains beef, pork, chicken, lamb, etc.),
  "containsSeafood": boolean (true if contains fish, shrimp, etc.),
  "isDairyFree": boolean (true if no milk, cheese, butter, cream, yogurt),
  "isGlutenFree": boolean (true if no wheat, flour, bread, pasta with gluten),
  "containsNuts": boolean (true if contains any nuts or nut products),
  "cuisineType": "string or null (e.g., 'Pasta', 'Curry', 'Stir-fry', 'Thai', 'BBQ', 'Pizza', 'Salad')",
  "caloriesPerServing": number (estimated calories per serving),
  "proteinPerServing": number (estimated protein in grams per serving),
  "carbsPerServing": number (estimated carbs in grams per serving),
  "fatPerServing": number (estimated fat in grams per serving)
}

Be thorough - check for hidden animal products (like chicken stock, gelatin, etc.).
Calculate macros based on standard USDA nutrition data for the ingredients.
Return ONLY the JSON object, no explanatory text.`

        const message = await client.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Failed to parse AI response')
        }

        const analysis = JSON.parse(jsonMatch[0])

        // Calculate isQuickMeal based on total time
        const isQuickMeal = recipe.totalTimeMinutes !== null && recipe.totalTimeMinutes < 30

        // Update recipe with dietary tags and macros
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            isVegetarian: analysis.isVegetarian,
            isVegan: analysis.isVegan,
            containsMeat: analysis.containsMeat,
            containsSeafood: analysis.containsSeafood,
            isDairyFree: analysis.isDairyFree,
            isGlutenFree: analysis.isGlutenFree,
            containsNuts: analysis.containsNuts,
            isQuickMeal,
            caloriesPerServing: analysis.caloriesPerServing ? Math.round(analysis.caloriesPerServing) : null,
            proteinPerServing: analysis.proteinPerServing ? Math.round(analysis.proteinPerServing * 10) / 10 : null,
            carbsPerServing: analysis.carbsPerServing ? Math.round(analysis.carbsPerServing * 10) / 10 : null,
            fatPerServing: analysis.fatPerServing ? Math.round(analysis.fatPerServing * 10) / 10 : null,
            ...(analysis.cuisineType && recipe.cuisineType === null && {
              cuisineType: analysis.cuisineType
            })
          }
        })

        results.updated++
        console.log(`✅ Updated ${recipe.recipeName}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        results.failed++
        const errorMsg = `Failed to analyze ${recipe.recipeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    console.log('🎉 Backfill complete:', results)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Error in backfill:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
