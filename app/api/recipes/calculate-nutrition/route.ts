import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateNutrition } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ingredients, servings } = await req.json()

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 })
    }

    if (!servings || servings < 1) {
      return NextResponse.json({ error: 'Valid servings count required' }, { status: 400 })
    }

    // Calculate nutrition using Claude
    const nutrition = await calculateNutrition(ingredients, servings)

    return NextResponse.json({
      nutrition
    })
  } catch (error: any) {
    console.error('Error calculating nutrition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate nutrition' },
      { status: 500 }
    )
  }
}
