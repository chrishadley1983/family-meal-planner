import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CSVRow {
  recipeName: string
  description?: string
  servings: string
  prepTimeMinutes?: string
  cookTimeMinutes?: string
  cuisineType?: string
  difficultyLevel?: string
  mealCategory?: string
  ingredientName?: string
  quantity?: string
  unit?: string
  notes?: string
  stepNumber?: string
  instruction?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { csvData } = await req.json()

    if (!csvData) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 })
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"/, '').replace(/"$/, ''))
    const rows: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: any = {}
      headers.forEach((header: string, index: number) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }

    // Group rows by recipe
    const recipeMap = new Map<string, any>()

    for (const row of rows) {
      const recipeName = row.recipeName
      if (!recipeName) continue

      if (!recipeMap.has(recipeName)) {
        // CSV template has 'mealCategory' column, but database field is 'mealType' (renamed via migration)
        const mealTypes = row.mealCategory ? row.mealCategory.split('|') : []
        recipeMap.set(recipeName, {
          recipeName,
          description: row.description || null,
          servings: parseInt(row.servings) || 4,
          prepTimeMinutes: row.prepTimeMinutes ? parseInt(row.prepTimeMinutes) : null,
          cookTimeMinutes: row.cookTimeMinutes ? parseInt(row.cookTimeMinutes) : null,
          cuisineType: row.cuisineType || null,
          difficultyLevel: row.difficultyLevel || null,
          mealType: mealTypes,
          ingredients: [],
          instructions: []
        })
      }

      const recipe = recipeMap.get(recipeName)

      // Add ingredient if present
      if (row.ingredientName && row.quantity && row.unit) {
        recipe.ingredients.push({
          ingredientName: row.ingredientName,
          quantity: parseFloat(row.quantity),
          unit: row.unit,
          notes: row.notes || null
        })
      }

      // Add instruction if present
      if (row.stepNumber && row.instruction) {
        // Check if instruction already exists (to avoid duplicates from ingredient rows)
        const stepNumber = parseInt(row.stepNumber)
        if (!recipe.instructions.find((i: any) => i.stepNumber === stepNumber)) {
          recipe.instructions.push({
            stepNumber,
            instruction: row.instruction
          })
        }
      }
    }

    // Create recipes in database
    const createdRecipes = []
    const errors = []

    for (const [recipeName, recipeData] of recipeMap) {
      try {
        const totalTimeMinutes =
          (recipeData.prepTimeMinutes || 0) + (recipeData.cookTimeMinutes || 0) || null

        const { ingredients, instructions, ...baseRecipe } = recipeData

        const recipe = await prisma.recipe.create({
          data: {
            ...baseRecipe,
            totalTimeMinutes,
            userId: session.user.id,
            ingredients: {
              create: ingredients.map((ing: any, index: number) => ({
                ...ing,
                sortOrder: index
              }))
            },
            instructions: {
              create: instructions
                .sort((a: any, b: any) => a.stepNumber - b.stepNumber)
                .map((inst: any, index: number) => ({
                  ...inst,
                  sortOrder: index
                }))
            }
          },
          include: {
            ingredients: true,
            instructions: true
          }
        })

        createdRecipes.push(recipe)
      } catch (error: any) {
        errors.push({
          recipeName,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: createdRecipes.length,
      failed: errors.length,
      recipes: createdRecipes,
      errors
    })
  } catch (error: any) {
    console.error('Error importing CSV:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import CSV' },
      { status: 500 }
    )
  }
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}
