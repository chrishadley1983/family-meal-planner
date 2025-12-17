/**
 * Product-Recipe Sync Utility
 *
 * When a product is flagged as isSnack = true, it must be automatically
 * added to the Recipe Database as a snack recipe. This ensures the AI
 * meal plan generator can include it when generating meal plans.
 */

import { prisma } from '@/lib/prisma'
import type { Product, Recipe } from '@prisma/client'

interface SyncResult {
  success: boolean
  recipeId?: string
  created?: boolean
  deleted?: boolean
  error?: string
}

/**
 * Create or update a linked recipe for a snack product
 * Called when a product is created/updated with isSnack = true
 */
export async function syncProductToRecipe(product: Product): Promise<SyncResult> {
  try {
    console.log('🔷 Syncing product to recipe:', product.name, 'isSnack:', product.isSnack)

    // If product is not a snack, check if we need to delete existing linked recipe
    if (!product.isSnack) {
      if (product.linkedRecipeId) {
        return await unlinkRecipeFromProduct(product)
      }
      return { success: true }
    }

    // Product IS a snack - create or update linked recipe
    const recipeName = product.brand
      ? `${product.brand} ${product.name}`
      : product.name

    // Check if linked recipe already exists
    if (product.linkedRecipeId) {
      // Update existing recipe
      const existingRecipe = await prisma.recipe.findUnique({
        where: { id: product.linkedRecipeId }
      })

      if (existingRecipe) {
        const updatedRecipe = await prisma.recipe.update({
          where: { id: product.linkedRecipeId },
          data: {
            recipeName,
            caloriesPerServing: product.caloriesPerServing,
            proteinPerServing: product.proteinPerServing,
            carbsPerServing: product.carbsPerServing,
            fatPerServing: product.fatPerServing,
            fiberPerServing: product.fiberPerServing,
            sugarPerServing: product.sugarPerServing,
            sodiumPerServing: product.sodiumPerServing,
            familyRating: product.familyRating,
            imageUrl: product.imageUrl,
            isArchived: false, // Ensure it's active
            updatedAt: new Date(),
          }
        })

        console.log('🟢 Updated linked recipe:', updatedRecipe.recipeName)
        return { success: true, recipeId: updatedRecipe.id, created: false }
      }
    }

    // Create new recipe linked to this product
    const newRecipe = await prisma.recipe.create({
      data: {
        userId: product.userId,
        recipeName,
        description: product.notes || `Snack product: ${recipeName}`,
        imageUrl: product.imageUrl,
        servings: 1,
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        totalTimeMinutes: 0,
        difficultyLevel: 'Easy',
        mealType: ['Snack'],
        caloriesPerServing: product.caloriesPerServing,
        proteinPerServing: product.proteinPerServing,
        carbsPerServing: product.carbsPerServing,
        fatPerServing: product.fatPerServing,
        fiberPerServing: product.fiberPerServing,
        sugarPerServing: product.sugarPerServing,
        sodiumPerServing: product.sodiumPerServing,
        familyRating: product.familyRating,
        isProductRecipe: true,
        sourceProductId: product.id,
        nutritionAutoCalculated: true,
        nutritionConfidence: 'high',
        nutritionSource: 'product',
      }
    })

    // Create single ingredient - the product itself
    await prisma.recipeIngredient.create({
      data: {
        recipeId: newRecipe.id,
        ingredientName: product.name,
        quantity: product.quantity,
        unit: product.unitOfMeasure,
        category: product.category,
        productId: product.id,
        isProduct: true,
        sortOrder: 0,
      }
    })

    // Update product with linked recipe ID
    await prisma.product.update({
      where: { id: product.id },
      data: { linkedRecipeId: newRecipe.id }
    })

    console.log('🟢 Created linked recipe:', newRecipe.recipeName, 'ID:', newRecipe.id)
    return { success: true, recipeId: newRecipe.id, created: true }

  } catch (error) {
    console.error('❌ Error syncing product to recipe:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync product to recipe'
    }
  }
}

/**
 * Unlink and archive the recipe when product is no longer a snack
 */
async function unlinkRecipeFromProduct(product: Product): Promise<SyncResult> {
  try {
    console.log('🔷 Unlinking recipe from product:', product.name)

    // Archive the linked recipe (soft delete)
    if (product.linkedRecipeId) {
      await prisma.recipe.update({
        where: { id: product.linkedRecipeId },
        data: { isArchived: true }
      })
      console.log('🟢 Archived linked recipe:', product.linkedRecipeId)
    }

    // Clear the linked recipe ID from product
    await prisma.product.update({
      where: { id: product.id },
      data: { linkedRecipeId: null }
    })

    return { success: true, deleted: true }
  } catch (error) {
    console.error('❌ Error unlinking recipe from product:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink recipe'
    }
  }
}

/**
 * Sync multiple products to recipes (for batch import)
 */
export async function syncProductsToRecipes(
  products: Product[]
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const product of products) {
    if (product.isSnack) {
      const result = await syncProductToRecipe(product)
      if (result.success) {
        results.synced++
      } else {
        results.failed++
        if (result.error) {
          results.errors.push(`${product.name}: ${result.error}`)
        }
      }
    }
  }

  console.log(`🟢 Batch sync complete: ${results.synced} synced, ${results.failed} failed`)
  return results
}

/**
 * Get all product-based recipes for a user
 */
export async function getProductRecipes(userId: string) {
  return prisma.recipe.findMany({
    where: {
      userId,
      isProductRecipe: true,
      isArchived: false,
    },
    include: {
      sourceProduct: true,
    },
    orderBy: { recipeName: 'asc' }
  })
}

/**
 * Check if a recipe is a product recipe (read-only)
 */
export function isProductRecipe(recipe: { isProductRecipe: boolean }): boolean {
  return recipe.isProductRecipe
}
