import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { CreateProductRequest, CSVImportResponse } from '@/lib/types/product'

// Validation schema for import confirmation
const confirmImportSchema = z.object({
  products: z.array(z.object({
    name: z.string().min(1),
    brand: z.string().optional(),
    category: z.string(),
    quantity: z.number().positive(),
    unitOfMeasure: z.string(),
    servingSize: z.string().optional(),
    caloriesPerServing: z.number().int().nonnegative().optional(),
    proteinPerServing: z.number().nonnegative().optional(),
    carbsPerServing: z.number().nonnegative().optional(),
    fatPerServing: z.number().nonnegative().optional(),
    fiberPerServing: z.number().nonnegative().optional(),
    sugarPerServing: z.number().nonnegative().optional(),
    saturatedFatPerServing: z.number().nonnegative().optional(),
    sodiumPerServing: z.number().nonnegative().optional(),
    isSnack: z.boolean().optional(),
    notes: z.string().optional(),
    barcode: z.string().optional(),
  })),
  syncSnacksToRecipes: z.boolean().default(true),
  skipDuplicates: z.boolean().default(true),
})

/**
 * POST /api/products/import/confirm
 *
 * Confirms and executes the CSV import after validation preview.
 * Creates products and optionally linked recipes for snacks.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { products, syncSnacksToRecipes, skipDuplicates } = confirmImportSchema.parse(body)

    console.log('🔷 Starting CSV import:', {
      productCount: products.length,
      syncSnacksToRecipes,
      skipDuplicates,
    })

    // Get existing products for duplicate check
    const existingProducts = await prisma.product.findMany({
      where: { userId: session.user.id },
      select: { name: true, brand: true },
    })

    const existingProductKeys = new Set(
      existingProducts.map(
        p => `${p.name.toLowerCase().trim()}|${(p.brand || '').toLowerCase().trim()}`
      )
    )

    let imported = 0
    let skipped = 0
    let recipesCreated = 0
    const errors: string[] = []

    // Process each product
    for (const productData of products) {
      const productKey = `${productData.name.toLowerCase().trim()}|${(productData.brand || '').toLowerCase().trim()}`

      // Skip duplicates if configured
      if (skipDuplicates && existingProductKeys.has(productKey)) {
        skipped++
        console.log('⏭️ Skipping duplicate:', productData.name)
        continue
      }

      try {
        // Create product
        const product = await prisma.product.create({
          data: {
            userId: session.user.id,
            createdBy: session.user.id,
            name: productData.name,
            brand: productData.brand || null,
            category: productData.category,
            quantity: productData.quantity,
            unitOfMeasure: productData.unitOfMeasure,
            servingSize: productData.servingSize || null,
            caloriesPerServing: productData.caloriesPerServing ?? null,
            proteinPerServing: productData.proteinPerServing ?? null,
            carbsPerServing: productData.carbsPerServing ?? null,
            fatPerServing: productData.fatPerServing ?? null,
            fiberPerServing: productData.fiberPerServing ?? null,
            sugarPerServing: productData.sugarPerServing ?? null,
            saturatedFatPerServing: productData.saturatedFatPerServing ?? null,
            sodiumPerServing: productData.sodiumPerServing ?? null,
            isSnack: productData.isSnack ?? false,
            notes: productData.notes || null,
            barcode: productData.barcode || null,
          },
        })

        imported++
        existingProductKeys.add(productKey) // Track to avoid duplicates within batch

        // Create linked recipe for snacks if configured
        if (syncSnacksToRecipes && productData.isSnack) {
          try {
            const recipe = await prisma.recipe.create({
              data: {
                userId: session.user.id,
                recipeName: productData.brand
                  ? `${productData.brand} ${productData.name}`
                  : productData.name,
                description: `Auto-generated recipe for snack product: ${productData.name}`,
                servings: 1,
                mealType: ['Snack'],
                isProductRecipe: true,
                sourceProductId: product.id,
                caloriesPerServing: productData.caloriesPerServing ?? null,
                proteinPerServing: productData.proteinPerServing ?? null,
                carbsPerServing: productData.carbsPerServing ?? null,
                fatPerServing: productData.fatPerServing ?? null,
                fiberPerServing: productData.fiberPerServing ?? null,
                sugarPerServing: productData.sugarPerServing ?? null,
                sodiumPerServing: productData.sodiumPerServing
                  ? Math.round(productData.sodiumPerServing)
                  : null,
                nutritionAutoCalculated: true,
                nutritionSource: 'product',
                isQuickMeal: true,
                prepTimeMinutes: 0,
                cookTimeMinutes: 0,
                totalTimeMinutes: 0,
              },
            })

            // Link recipe to product
            await prisma.product.update({
              where: { id: product.id },
              data: { linkedRecipeId: recipe.id },
            })

            recipesCreated++
            console.log('🔗 Created linked recipe:', recipe.recipeName)
          } catch (recipeError) {
            console.error('⚠️ Failed to create linked recipe for:', productData.name, recipeError)
            // Don't fail the whole import for recipe creation failure
          }
        }

        console.log('✅ Imported product:', productData.name)
      } catch (productError) {
        console.error('❌ Failed to import product:', productData.name, productError)
        errors.push(`Failed to import "${productData.name}": ${productError instanceof Error ? productError.message : 'Unknown error'}`)
      }
    }

    const response: CSVImportResponse = {
      imported,
      skipped,
      recipesCreated,
      errors,
    }

    console.log('🟢 CSV import complete:', response)

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error confirming CSV import:', error)
    return NextResponse.json(
      { error: 'Failed to import products' },
      { status: 500 }
    )
  }
}
