/**
 * Recipe Ingredient Metric Conversion
 * Converts any imperial units in recipe ingredients to metric
 */

import { findUnitByAlias, UNIT_SEED_DATA } from './unit-seed-data'

export interface RecipeIngredientInput {
  ingredientName: string
  quantity: number
  unit: string
  category?: string
  notes?: string
}

export interface ConvertedIngredient extends RecipeIngredientInput {
  unitCode?: string  // FK reference to UnitOfMeasure
  wasConverted?: boolean
  originalQuantity?: number
  originalUnit?: string
}

// Units that should not be converted (count-based)
const NON_CONVERTIBLE_UNITS = new Set([
  'piece', 'pieces', 'pcs', 'pc',
  'whole', 'each', 'ea',
  'clove', 'cloves',
  'slice', 'slices',
  'bunch', 'bunches',
  'sprig', 'sprigs',
  'head', 'heads',
  'stalk', 'stalks',
  'leaf', 'leaves',
  'rasher', 'rashers',
  'fillet', 'fillets',
  'breast', 'breasts',
  'thigh', 'thighs',
  'leg', 'legs',
  'wing', 'wings',
  'egg', 'eggs',
  'can', 'cans', 'tin', 'tins',
  'jar', 'jars',
  'bottle', 'bottles',
  'pack', 'packs', 'packet', 'packets', 'pkg', 'package', 'packages',
  'bag', 'bags',
  'box', 'boxes',
  'sheet', 'sheets',
  'stick', 'sticks',
  'pod', 'pods',
  'cube', 'cubes',
  'loaf', 'loaves',
  'dozen', 'doz',
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'splash', 'splashes',
  'drizzle', 'drizzles',
  'small', 'medium', 'large',
  'to taste',
])

// Spoon measures - keep as-is but normalise
const SPOON_UNITS = new Set(['tsp', 'tbsp', 'teaspoon', 'teaspoons', 'tablespoon', 'tablespoons'])

/**
 * Converts an ingredient to metric if it uses imperial units
 * Also sets the unitCode FK reference
 */
export function convertIngredientToMetric(ingredient: RecipeIngredientInput): ConvertedIngredient {
  const normalizedUnit = ingredient.unit.toLowerCase().trim()

  // Check if this is a non-convertible unit
  if (NON_CONVERTIBLE_UNITS.has(normalizedUnit)) {
    // Find the unit code for FK reference
    const unitData = findUnitByAlias(normalizedUnit)
    return {
      ...ingredient,
      unitCode: unitData?.code || undefined,
      wasConverted: false,
    }
  }

  // Check if this is a spoon measure - keep but normalise
  if (SPOON_UNITS.has(normalizedUnit)) {
    const unitData = findUnitByAlias(normalizedUnit)
    const normalizedSpoon = normalizedUnit.includes('table') ? 'tbsp' : 'tsp'
    return {
      ...ingredient,
      unit: normalizedSpoon,
      unitCode: unitData?.code || normalizedSpoon,
      wasConverted: false,
    }
  }

  // Find the unit in our database
  const unitData = findUnitByAlias(normalizedUnit)

  if (!unitData) {
    // Unknown unit - return as-is
    console.log(`⚠️ Unknown unit: "${ingredient.unit}" for "${ingredient.ingredientName}"`)
    return {
      ...ingredient,
      wasConverted: false,
    }
  }

  // If already metric and a base unit (g, ml), just return with unitCode
  if (unitData.isMetric && !unitData.baseUnitCode) {
    return {
      ...ingredient,
      unit: unitData.code,
      unitCode: unitData.code,
      wasConverted: false,
    }
  }

  // If metric but not base (kg, L), convert to base for consistency
  if (unitData.isMetric && unitData.baseUnitCode && unitData.conversionFactor) {
    // For large amounts, keep kg/L; for small amounts, convert to g/ml
    const convertedValue = ingredient.quantity * unitData.conversionFactor

    // Use kg if >= 1000g, use L if >= 1000ml
    if (convertedValue >= 1000) {
      return {
        ...ingredient,
        unit: unitData.code,
        unitCode: unitData.code,
        wasConverted: false,
      }
    }

    // Convert to base unit
    return {
      ...ingredient,
      quantity: Math.round(convertedValue * 100) / 100,
      unit: unitData.baseUnitCode,
      unitCode: unitData.baseUnitCode,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      wasConverted: true,
    }
  }

  // Imperial unit - convert to metric
  if (!unitData.isMetric && unitData.conversionFactor && unitData.baseUnitCode) {
    const convertedValue = ingredient.quantity * unitData.conversionFactor

    // Determine best metric unit based on quantity
    let finalUnit = unitData.baseUnitCode
    let finalValue = convertedValue

    // For weight: use kg if >= 1000g
    if (unitData.baseUnitCode === 'g' && convertedValue >= 1000) {
      finalUnit = 'kg'
      finalValue = convertedValue / 1000
    }

    // For volume: use L if >= 1000ml
    if (unitData.baseUnitCode === 'ml' && convertedValue >= 1000) {
      finalUnit = 'L'
      finalValue = convertedValue / 1000
    }

    // Smart rounding based on quantity
    if (finalUnit === 'g') {
      if (finalValue >= 50) {
        finalValue = Math.round(finalValue / 5) * 5  // Round to nearest 5g
      } else {
        finalValue = Math.round(finalValue)  // Round to nearest gram
      }
    } else if (finalUnit === 'ml') {
      if (finalValue >= 50) {
        finalValue = Math.round(finalValue / 5) * 5  // Round to nearest 5ml
      } else {
        finalValue = Math.round(finalValue)  // Round to nearest ml
      }
    } else {
      finalValue = Math.round(finalValue * 10) / 10  // Round to 1 decimal place
    }

    console.log(`🔄 Converted: ${ingredient.quantity} ${ingredient.unit} → ${finalValue} ${finalUnit} (${ingredient.ingredientName})`)

    return {
      ...ingredient,
      quantity: finalValue,
      unit: finalUnit,
      unitCode: finalUnit,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      wasConverted: true,
    }
  }

  // Fallback - return with unitCode if found
  return {
    ...ingredient,
    unitCode: unitData?.code || undefined,
    wasConverted: false,
  }
}

/**
 * Converts all ingredients in a recipe to metric
 */
export function convertRecipeIngredientsToMetric(
  ingredients: RecipeIngredientInput[]
): ConvertedIngredient[] {
  return ingredients.map(convertIngredientToMetric)
}

/**
 * Summary of conversions made
 */
export interface ConversionSummary {
  total: number
  converted: number
  unchanged: number
  conversions: Array<{
    ingredientName: string
    from: string
    to: string
  }>
}

/**
 * Get a summary of conversions made
 */
export function getConversionSummary(ingredients: ConvertedIngredient[]): ConversionSummary {
  const converted = ingredients.filter(i => i.wasConverted)

  return {
    total: ingredients.length,
    converted: converted.length,
    unchanged: ingredients.length - converted.length,
    conversions: converted.map(i => ({
      ingredientName: i.ingredientName,
      from: `${i.originalQuantity} ${i.originalUnit}`,
      to: `${i.quantity} ${i.unit}`,
    })),
  }
}
