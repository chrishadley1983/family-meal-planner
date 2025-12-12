/**
 * Unit of Measure Seed Data
 * Comprehensive list of cooking units with conversion factors
 * This data seeds the units_of_measure table
 */

export interface UnitSeedData {
  code: string             // Unique code used as FK reference
  name: string             // Full name (e.g., 'grams')
  pluralName: string | null // Plural form (e.g., 'grams')
  abbreviation: string     // Display abbreviation (e.g., 'g')
  category: 'weight' | 'volume' | 'count' | 'spoon'
  displayOrder: number     // For dropdown ordering
  isMetric: boolean        // True for metric units
  conversionFactor: number | null  // Factor to convert to base unit (g or ml)
  baseUnitCode: string | null      // Reference to base unit (e.g., 'g' for 'kg')
  aliases: string[]        // Alternative names for matching
}

/**
 * Comprehensive UK-focused unit of measure seed data
 * Metric units are prioritised; imperial units included for conversion
 */
export const UNIT_SEED_DATA: UnitSeedData[] = [
  // ============================================
  // WEIGHT UNITS (base unit: grams)
  // ============================================
  {
    code: 'g',
    name: 'gram',
    pluralName: 'grams',
    abbreviation: 'g',
    category: 'weight',
    displayOrder: 1,
    isMetric: true,
    conversionFactor: 1,
    baseUnitCode: null,
    aliases: ['gram', 'grams', 'gm', 'gms'],
  },
  {
    code: 'kg',
    name: 'kilogram',
    pluralName: 'kilograms',
    abbreviation: 'kg',
    category: 'weight',
    displayOrder: 2,
    isMetric: true,
    conversionFactor: 1000,
    baseUnitCode: 'g',
    aliases: ['kilogram', 'kilograms', 'kilo', 'kilos'],
  },
  {
    code: 'oz',
    name: 'ounce',
    pluralName: 'ounces',
    abbreviation: 'oz',
    category: 'weight',
    displayOrder: 100,
    isMetric: false,
    conversionFactor: 28.3495,
    baseUnitCode: 'g',
    aliases: ['ounce', 'ounces'],
  },
  {
    code: 'lb',
    name: 'pound',
    pluralName: 'pounds',
    abbreviation: 'lb',
    category: 'weight',
    displayOrder: 101,
    isMetric: false,
    conversionFactor: 453.592,
    baseUnitCode: 'g',
    aliases: ['lbs', 'pound', 'pounds'],
  },

  // ============================================
  // VOLUME UNITS (base unit: millilitres)
  // ============================================
  {
    code: 'ml',
    name: 'millilitre',
    pluralName: 'millilitres',
    abbreviation: 'ml',
    category: 'volume',
    displayOrder: 10,
    isMetric: true,
    conversionFactor: 1,
    baseUnitCode: null,
    aliases: ['milliliter', 'millilitre', 'milliliters', 'millilitres', 'mL'],
  },
  {
    code: 'L',
    name: 'litre',
    pluralName: 'litres',
    abbreviation: 'L',
    category: 'volume',
    displayOrder: 11,
    isMetric: true,
    conversionFactor: 1000,
    baseUnitCode: 'ml',
    aliases: ['l', 'liter', 'litre', 'liters', 'litres'],
  },
  {
    code: 'cup',
    name: 'cup',
    pluralName: 'cups',
    abbreviation: 'cup',
    category: 'volume',
    displayOrder: 102,
    isMetric: false,
    conversionFactor: 236.588,
    baseUnitCode: 'ml',
    aliases: ['cups', 'c'],
  },
  {
    code: 'fl_oz',
    name: 'fluid ounce',
    pluralName: 'fluid ounces',
    abbreviation: 'fl oz',
    category: 'volume',
    displayOrder: 103,
    isMetric: false,
    conversionFactor: 29.5735,
    baseUnitCode: 'ml',
    aliases: ['fl oz', 'fluid ounce', 'fluid ounces', 'floz'],
  },
  {
    code: 'pint',
    name: 'pint',
    pluralName: 'pints',
    abbreviation: 'pt',
    category: 'volume',
    displayOrder: 104,
    isMetric: false,
    conversionFactor: 568.261,  // UK pint (not US)
    baseUnitCode: 'ml',
    aliases: ['pints', 'pt'],
  },
  {
    code: 'quart',
    name: 'quart',
    pluralName: 'quarts',
    abbreviation: 'qt',
    category: 'volume',
    displayOrder: 105,
    isMetric: false,
    conversionFactor: 946.353,
    baseUnitCode: 'ml',
    aliases: ['quarts', 'qt'],
  },
  {
    code: 'gallon',
    name: 'gallon',
    pluralName: 'gallons',
    abbreviation: 'gal',
    category: 'volume',
    displayOrder: 106,
    isMetric: false,
    conversionFactor: 4546.09,  // UK gallon (not US)
    baseUnitCode: 'ml',
    aliases: ['gallons', 'gal'],
  },

  // ============================================
  // SPOON MEASURES (universal, not converted)
  // ============================================
  {
    code: 'tsp',
    name: 'teaspoon',
    pluralName: 'teaspoons',
    abbreviation: 'tsp',
    category: 'spoon',
    displayOrder: 20,
    isMetric: true,  // Considered universal
    conversionFactor: 5,  // ~5ml
    baseUnitCode: 'ml',
    aliases: ['teaspoon', 'teaspoons', 't', 'ts'],
  },
  {
    code: 'tbsp',
    name: 'tablespoon',
    pluralName: 'tablespoons',
    abbreviation: 'tbsp',
    category: 'spoon',
    displayOrder: 21,
    isMetric: true,  // Considered universal
    conversionFactor: 15,  // ~15ml
    baseUnitCode: 'ml',
    aliases: ['tablespoon', 'tablespoons', 'T', 'tbs', 'tb'],
  },

  // ============================================
  // COUNT UNITS (no conversion, universal)
  // ============================================
  {
    code: 'piece',
    name: 'piece',
    pluralName: 'pieces',
    abbreviation: 'pc',
    category: 'count',
    displayOrder: 30,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['pieces', 'pcs', 'pc', 'whole', 'each', 'ea', 'unit', 'units'],
  },
  {
    code: 'slice',
    name: 'slice',
    pluralName: 'slices',
    abbreviation: 'slice',
    category: 'count',
    displayOrder: 31,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['slices'],
  },
  {
    code: 'clove',
    name: 'clove',
    pluralName: 'cloves',
    abbreviation: 'clove',
    category: 'count',
    displayOrder: 32,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['cloves'],
  },
  {
    code: 'bunch',
    name: 'bunch',
    pluralName: 'bunches',
    abbreviation: 'bunch',
    category: 'count',
    displayOrder: 33,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['bunches'],
  },
  {
    code: 'sprig',
    name: 'sprig',
    pluralName: 'sprigs',
    abbreviation: 'sprig',
    category: 'count',
    displayOrder: 34,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['sprigs'],
  },
  {
    code: 'head',
    name: 'head',
    pluralName: 'heads',
    abbreviation: 'head',
    category: 'count',
    displayOrder: 35,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['heads'],
  },
  {
    code: 'stalk',
    name: 'stalk',
    pluralName: 'stalks',
    abbreviation: 'stalk',
    category: 'count',
    displayOrder: 36,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['stalks'],
  },
  {
    code: 'leaf',
    name: 'leaf',
    pluralName: 'leaves',
    abbreviation: 'leaf',
    category: 'count',
    displayOrder: 37,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['leaves'],
  },
  {
    code: 'rasher',
    name: 'rasher',
    pluralName: 'rashers',
    abbreviation: 'rasher',
    category: 'count',
    displayOrder: 38,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['rashers'],
  },
  {
    code: 'fillet',
    name: 'fillet',
    pluralName: 'fillets',
    abbreviation: 'fillet',
    category: 'count',
    displayOrder: 39,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['fillets'],
  },
  {
    code: 'breast',
    name: 'breast',
    pluralName: 'breasts',
    abbreviation: 'breast',
    category: 'count',
    displayOrder: 40,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['breasts'],
  },
  {
    code: 'thigh',
    name: 'thigh',
    pluralName: 'thighs',
    abbreviation: 'thigh',
    category: 'count',
    displayOrder: 41,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['thighs'],
  },
  {
    code: 'leg',
    name: 'leg',
    pluralName: 'legs',
    abbreviation: 'leg',
    category: 'count',
    displayOrder: 42,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['legs'],
  },
  {
    code: 'wing',
    name: 'wing',
    pluralName: 'wings',
    abbreviation: 'wing',
    category: 'count',
    displayOrder: 43,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['wings'],
  },
  {
    code: 'egg',
    name: 'egg',
    pluralName: 'eggs',
    abbreviation: 'egg',
    category: 'count',
    displayOrder: 44,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['eggs'],
  },
  {
    code: 'can',
    name: 'can',
    pluralName: 'cans',
    abbreviation: 'can',
    category: 'count',
    displayOrder: 45,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['cans', 'tin', 'tins'],
  },
  {
    code: 'jar',
    name: 'jar',
    pluralName: 'jars',
    abbreviation: 'jar',
    category: 'count',
    displayOrder: 46,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['jars'],
  },
  {
    code: 'bottle',
    name: 'bottle',
    pluralName: 'bottles',
    abbreviation: 'bottle',
    category: 'count',
    displayOrder: 47,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['bottles'],
  },
  {
    code: 'pack',
    name: 'pack',
    pluralName: 'packs',
    abbreviation: 'pack',
    category: 'count',
    displayOrder: 48,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['packs', 'packet', 'packets', 'pkg', 'package', 'packages'],
  },
  {
    code: 'bag',
    name: 'bag',
    pluralName: 'bags',
    abbreviation: 'bag',
    category: 'count',
    displayOrder: 49,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['bags'],
  },
  {
    code: 'box',
    name: 'box',
    pluralName: 'boxes',
    abbreviation: 'box',
    category: 'count',
    displayOrder: 50,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['boxes'],
  },
  {
    code: 'sheet',
    name: 'sheet',
    pluralName: 'sheets',
    abbreviation: 'sheet',
    category: 'count',
    displayOrder: 51,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['sheets'],
  },
  {
    code: 'stick',
    name: 'stick',
    pluralName: 'sticks',
    abbreviation: 'stick',
    category: 'count',
    displayOrder: 52,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['sticks'],
  },
  {
    code: 'pod',
    name: 'pod',
    pluralName: 'pods',
    abbreviation: 'pod',
    category: 'count',
    displayOrder: 53,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['pods'],
  },
  {
    code: 'cube',
    name: 'cube',
    pluralName: 'cubes',
    abbreviation: 'cube',
    category: 'count',
    displayOrder: 54,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['cubes'],
  },
  {
    code: 'loaf',
    name: 'loaf',
    pluralName: 'loaves',
    abbreviation: 'loaf',
    category: 'count',
    displayOrder: 55,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['loaves'],
  },
  {
    code: 'dozen',
    name: 'dozen',
    pluralName: 'dozen',
    abbreviation: 'doz',
    category: 'count',
    displayOrder: 56,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['doz'],
  },

  // ============================================
  // SMALL AMOUNTS (approximate, no conversion)
  // ============================================
  {
    code: 'pinch',
    name: 'pinch',
    pluralName: 'pinches',
    abbreviation: 'pinch',
    category: 'count',
    displayOrder: 60,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['pinches'],
  },
  {
    code: 'dash',
    name: 'dash',
    pluralName: 'dashes',
    abbreviation: 'dash',
    category: 'count',
    displayOrder: 61,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['dashes'],
  },
  {
    code: 'handful',
    name: 'handful',
    pluralName: 'handfuls',
    abbreviation: 'handful',
    category: 'count',
    displayOrder: 62,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['handfuls'],
  },
  {
    code: 'splash',
    name: 'splash',
    pluralName: 'splashes',
    abbreviation: 'splash',
    category: 'count',
    displayOrder: 63,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['splashes'],
  },
  {
    code: 'drizzle',
    name: 'drizzle',
    pluralName: 'drizzles',
    abbreviation: 'drizzle',
    category: 'count',
    displayOrder: 64,
    isMetric: true,
    conversionFactor: null,
    baseUnitCode: null,
    aliases: ['drizzles'],
  },
]

/**
 * Get all units organised by category
 */
export function getUnitsByCategory(): Record<string, UnitSeedData[]> {
  const byCategory: Record<string, UnitSeedData[]> = {}

  for (const unit of UNIT_SEED_DATA) {
    if (!byCategory[unit.category]) {
      byCategory[unit.category] = []
    }
    byCategory[unit.category].push(unit)
  }

  // Sort each category by displayOrder
  for (const category of Object.keys(byCategory)) {
    byCategory[category].sort((a, b) => a.displayOrder - b.displayOrder)
  }

  return byCategory
}

/**
 * Get only metric units (for dropdowns)
 */
export function getMetricUnits(): UnitSeedData[] {
  return UNIT_SEED_DATA
    .filter(u => u.isMetric)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Get unit by code
 */
export function getUnitByCode(code: string): UnitSeedData | undefined {
  return UNIT_SEED_DATA.find(u => u.code === code)
}

/**
 * Find unit by alias (case-insensitive)
 */
export function findUnitByAlias(alias: string): UnitSeedData | undefined {
  const normalised = alias.toLowerCase().trim()

  return UNIT_SEED_DATA.find(u =>
    u.code.toLowerCase() === normalised ||
    u.name.toLowerCase() === normalised ||
    (u.pluralName && u.pluralName.toLowerCase() === normalised) ||
    u.abbreviation.toLowerCase() === normalised ||
    u.aliases.some(a => a.toLowerCase() === normalised)
  )
}

/**
 * Convert a value from one unit to its base metric unit
 * Returns null if conversion is not possible (count units)
 */
export function convertToBaseMetric(value: number, unitCode: string): { value: number; unit: string } | null {
  const unit = getUnitByCode(unitCode)
  if (!unit || unit.conversionFactor === null) {
    return null
  }

  const baseUnit = unit.baseUnitCode || unit.code
  const convertedValue = value * unit.conversionFactor

  return {
    value: Math.round(convertedValue * 100) / 100,
    unit: baseUnit,
  }
}
