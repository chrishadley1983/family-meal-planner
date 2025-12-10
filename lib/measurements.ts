/**
 * Standardized Measurements Configuration
 * Defines common units, aliases, and smart rounding rules
 */

// Unit categories for rounding logic
export type UnitCategory = 'weight' | 'volume' | 'count' | 'spoon' | 'other'

export interface StandardUnit {
  name: string           // The standard unit name to use
  category: UnitCategory
  aliases: string[]      // Alternative names that map to this unit
}

/**
 * Standard units configuration
 * All ingredient quantities should use one of these units
 */
export const STANDARD_UNITS: StandardUnit[] = [
  // Weight
  { name: 'g', category: 'weight', aliases: ['gram', 'grams', 'gm', 'gms'] },
  { name: 'kg', category: 'weight', aliases: ['kilogram', 'kilograms', 'kilo', 'kilos'] },

  // Volume
  { name: 'ml', category: 'volume', aliases: ['milliliter', 'millilitre', 'milliliters', 'millilitres', 'mL'] },
  { name: 'L', category: 'volume', aliases: ['l', 'liter', 'litre', 'liters', 'litres'] },

  // Spoon measures (kept separate for rounding)
  { name: 'tsp', category: 'spoon', aliases: ['teaspoon', 'teaspoons', 't', 'ts'] },
  { name: 'tbsp', category: 'spoon', aliases: ['tablespoon', 'tablespoons', 'T', 'tbs', 'tb'] },

  // Count-based (no rounding)
  { name: 'piece', category: 'count', aliases: ['pieces', 'pcs', 'pc', 'whole', 'each', 'ea', 'unit', 'units'] },
  { name: 'slice', category: 'count', aliases: ['slices'] },
  { name: 'clove', category: 'count', aliases: ['cloves'] },
  { name: 'bunch', category: 'count', aliases: ['bunches'] },
  { name: 'sprig', category: 'count', aliases: ['sprigs'] },
  { name: 'head', category: 'count', aliases: ['heads'] },
  { name: 'stalk', category: 'count', aliases: ['stalks'] },
  { name: 'leaf', category: 'count', aliases: ['leaves'] },
  { name: 'rasher', category: 'count', aliases: ['rashers'] },
  { name: 'fillet', category: 'count', aliases: ['fillets'] },
  { name: 'breast', category: 'count', aliases: ['breasts'] },
  { name: 'thigh', category: 'count', aliases: ['thighs'] },
  { name: 'leg', category: 'count', aliases: ['legs'] },
  { name: 'wing', category: 'count', aliases: ['wings'] },
  { name: 'egg', category: 'count', aliases: ['eggs'] },
  { name: 'can', category: 'count', aliases: ['cans', 'tin', 'tins'] },
  { name: 'jar', category: 'count', aliases: ['jars'] },
  { name: 'bottle', category: 'count', aliases: ['bottles'] },
  { name: 'pack', category: 'count', aliases: ['packs', 'packet', 'packets', 'pkg', 'package', 'packages'] },
  { name: 'bag', category: 'count', aliases: ['bags'] },
  { name: 'box', category: 'count', aliases: ['boxes'] },
  { name: 'sheet', category: 'count', aliases: ['sheets'] },
  { name: 'stick', category: 'count', aliases: ['sticks'] },
  { name: 'pod', category: 'count', aliases: ['pods'] },
  { name: 'cube', category: 'count', aliases: ['cubes'] },

  // Small amounts (no rounding)
  { name: 'pinch', category: 'count', aliases: ['pinches'] },
  { name: 'dash', category: 'count', aliases: ['dashes'] },
  { name: 'handful', category: 'count', aliases: ['handfuls'] },
  { name: 'splash', category: 'count', aliases: ['splashes'] },
  { name: 'drizzle', category: 'count', aliases: ['drizzles'] },

  // Other common units
  { name: 'cup', category: 'volume', aliases: ['cups', 'c'] },
]

// Build lookup maps for fast access
const unitAliasMap = new Map<string, string>()
const unitCategoryMap = new Map<string, UnitCategory>()

for (const unit of STANDARD_UNITS) {
  // Map the standard name to itself
  unitAliasMap.set(unit.name.toLowerCase(), unit.name)
  unitCategoryMap.set(unit.name.toLowerCase(), unit.category)

  // Map all aliases to the standard name
  for (const alias of unit.aliases) {
    unitAliasMap.set(alias.toLowerCase(), unit.name)
    unitCategoryMap.set(alias.toLowerCase(), unit.category)
  }
}

/**
 * Normalizes a unit to its standard form
 * Returns the standard unit name, or the original if not recognized
 */
export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim()
  return unitAliasMap.get(normalized) || unit.trim()
}

/**
 * Gets the category of a unit (for rounding logic)
 */
export function getUnitCategory(unit: string): UnitCategory {
  const normalized = unit.toLowerCase().trim()
  return unitCategoryMap.get(normalized) || 'other'
}

/**
 * Checks if a unit is recognized/valid
 */
export function isValidUnit(unit: string): boolean {
  const normalized = unit.toLowerCase().trim()
  return unitAliasMap.has(normalized)
}

/**
 * Gets all valid unit names (for dropdowns, validation messages, etc.)
 */
export function getValidUnitNames(): string[] {
  return STANDARD_UNITS.map(u => u.name)
}

/**
 * Smart rounding based on unit type and quantity
 *
 * Rules:
 * - Count units (piece, egg, clove, etc.): no rounding, keep as-is
 * - ml: round to nearest 5
 * - L: round to nearest 0.1
 * - g >= 50: round to nearest 10
 * - g < 50: round to nearest 1
 * - kg: round to nearest 0.1
 * - tsp/tbsp: round to nearest 0.25
 * - cup: round to nearest 0.25
 * - other: round to 2 decimal places
 */
export function roundQuantity(quantity: number, unit: string): number {
  const category = getUnitCategory(unit)
  const normalizedUnit = normalizeUnit(unit).toLowerCase()

  // Count-based units: no rounding
  if (category === 'count') {
    // Round to whole numbers for count units
    return Math.round(quantity)
  }

  // Spoon measures: round to nearest 0.25
  if (category === 'spoon') {
    return Math.round(quantity * 4) / 4
  }

  // Volume units
  if (normalizedUnit === 'ml') {
    // Round to nearest 5ml
    return Math.round(quantity / 5) * 5
  }

  if (normalizedUnit === 'l') {
    // Round to nearest 0.1L
    return Math.round(quantity * 10) / 10
  }

  if (normalizedUnit === 'cup') {
    // Round to nearest 0.25 cup
    return Math.round(quantity * 4) / 4
  }

  // Weight units
  if (normalizedUnit === 'g') {
    if (quantity >= 50) {
      // Large amounts: round to nearest 10g
      return Math.round(quantity / 10) * 10
    } else {
      // Small amounts: round to nearest 1g
      return Math.round(quantity)
    }
  }

  if (normalizedUnit === 'kg') {
    // Round to nearest 0.1kg (100g)
    return Math.round(quantity * 10) / 10
  }

  // Other/unknown: round to 2 decimal places
  return Math.round(quantity * 100) / 100
}

/**
 * Normalizes and rounds a quantity/unit pair
 * Returns normalized unit and appropriately rounded quantity
 */
export function normalizeAndRound(quantity: number, unit: string): { quantity: number; unit: string } {
  const normalizedUnit = normalizeUnit(unit)
  const roundedQuantity = roundQuantity(quantity, normalizedUnit)

  return {
    quantity: roundedQuantity,
    unit: normalizedUnit,
  }
}

/**
 * Validates a unit and returns an error message if invalid
 * Returns null if valid
 */
export function validateUnit(unit: string): string | null {
  if (!unit || unit.trim() === '') {
    return 'Unit is required'
  }

  if (!isValidUnit(unit)) {
    const validUnits = getValidUnitNames().join(', ')
    return `Unknown unit "${unit}". Valid units are: ${validUnits}`
  }

  return null
}

/**
 * Formats a quantity for display based on unit type
 */
export function formatQuantityForDisplay(quantity: number, unit: string): string {
  const rounded = roundQuantity(quantity, unit)
  const category = getUnitCategory(unit)

  // Count units: show as whole numbers
  if (category === 'count') {
    return Math.round(rounded).toString()
  }

  // Remove unnecessary decimal places
  if (Number.isInteger(rounded)) {
    return rounded.toString()
  }

  // Format with appropriate decimal places
  const formatted = rounded.toString()
  return formatted
}
