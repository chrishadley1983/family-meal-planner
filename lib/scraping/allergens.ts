/**
 * Allergen detection from ingredient lists
 */

import { ParsedIngredient, AllergenCategory } from './types'

// Keywords that indicate each allergen category
const ALLERGEN_KEYWORDS: Record<AllergenCategory, string[]> = {
  dairy: [
    'milk', 'cream', 'cheese', 'butter', 'yogurt', 'yoghurt', 'whey',
    'casein', 'lactose', 'ghee', 'curd', 'paneer', 'mozzarella',
    'cheddar', 'parmesan', 'feta', 'brie', 'camembert', 'ricotta',
    'mascarpone', 'crème fraîche', 'creme fraiche', 'sour cream',
    'half-and-half', 'half and half', 'buttermilk', 'custard'
  ],
  gluten: [
    'wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'oats',
    'semolina', 'couscous', 'bulgur', 'spelt', 'farro', 'durum',
    'breadcrumb', 'panko', 'noodles', 'spaghetti', 'penne', 'fusilli',
    'lasagne', 'lasagna', 'macaroni', 'tortilla', 'pita', 'naan',
    'croissant', 'baguette', 'ciabatta', 'focaccia', 'crouton',
    'seitan', 'vital wheat gluten'
  ],
  nuts: [
    'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
    'macadamia', 'brazil nut', 'chestnut', 'pine nut', 'pine nuts',
    'praline', 'marzipan', 'nougat', 'frangelico', 'amaretto'
  ],
  peanuts: [
    'peanut', 'groundnut', 'arachis', 'monkey nut'
  ],
  eggs: [
    'egg', 'eggs', 'mayonnaise', 'mayo', 'meringue', 'aioli',
    'hollandaise', 'béarnaise', 'bearnaise', 'custard', 'eggnog',
    'albumin', 'globulin', 'lecithin', 'lysozyme', 'ovalbumin',
    'ovomucin', 'ovomucoid', 'ovovitellin', 'vitellin'
  ],
  shellfish: [
    'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'crawfish',
    'scallop', 'mussel', 'clam', 'oyster', 'squid', 'calamari',
    'octopus', 'langoustine', 'cockle', 'periwinkle', 'whelk',
    'abalone', 'snail', 'escargot'
  ],
  fish: [
    'salmon', 'tuna', 'cod', 'fish', 'anchovy', 'sardine', 'mackerel',
    'trout', 'haddock', 'halibut', 'herring', 'tilapia', 'bass',
    'snapper', 'swordfish', 'catfish', 'pollock', 'sole', 'flounder',
    'perch', 'pike', 'carp', 'eel', 'monkfish', 'turbot', 'bream',
    'fish sauce', 'worcestershire', 'caesar dressing'
  ],
  soy: [
    'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari',
    'soy sauce', 'soya sauce', 'soybean', 'soya bean', 'textured vegetable protein',
    'tvp', 'lecithin'
  ],
  sesame: [
    'sesame', 'tahini', 'halva', 'halvah', 'hummus', 'houmous',
    'gomashio', 'sesame oil', 'sesame seed'
  ],
  celery: [
    'celery', 'celeriac', 'celery salt', 'celery seed'
  ],
  mustard: [
    'mustard', 'dijon', 'wholegrain mustard', 'mustard seed',
    'mustard powder', 'english mustard', 'french mustard'
  ],
  sulphites: [
    'wine', 'dried fruit', 'vinegar', 'sulfite', 'sulphite',
    'sulfur dioxide', 'sulphur dioxide', 'metabisulfite', 'metabisulphite'
  ]
}

/**
 * Detect allergens present in an ingredient list
 */
export function detectAllergens(ingredients: ParsedIngredient[]): AllergenCategory[] {
  const detectedAllergens = new Set<AllergenCategory>()

  for (const ingredient of ingredients) {
    // Combine name and original text for matching
    const name = ingredient.name?.toLowerCase() || ''
    const original = ingredient.original?.toLowerCase() || ''
    const searchText = `${name} ${original}`

    // Check each allergen category
    for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        detectedAllergens.add(allergen as AllergenCategory)
      }
    }
  }

  return Array.from(detectedAllergens).sort()
}

/**
 * Check if a recipe contains a specific allergen
 */
export function containsAllergen(
  ingredients: ParsedIngredient[],
  allergen: AllergenCategory
): boolean {
  const keywords = ALLERGEN_KEYWORDS[allergen]
  if (!keywords) return false

  for (const ingredient of ingredients) {
    const name = ingredient.name?.toLowerCase() || ''
    const original = ingredient.original?.toLowerCase() || ''
    const searchText = `${name} ${original}`

    if (keywords.some(keyword => searchText.includes(keyword))) {
      return true
    }
  }

  return false
}

/**
 * Get allergen warnings for a recipe
 * Returns human-readable warnings about potential allergens
 */
export function getAllergenWarnings(ingredients: ParsedIngredient[]): string[] {
  const allergens = detectAllergens(ingredients)

  const warnings: string[] = []

  const allergenLabels: Record<AllergenCategory, string> = {
    dairy: 'Contains dairy (milk products)',
    gluten: 'Contains gluten (wheat/barley/rye)',
    nuts: 'Contains tree nuts',
    peanuts: 'Contains peanuts',
    eggs: 'Contains eggs',
    shellfish: 'Contains shellfish',
    fish: 'Contains fish',
    soy: 'Contains soy',
    sesame: 'Contains sesame',
    celery: 'Contains celery',
    mustard: 'Contains mustard',
    sulphites: 'May contain sulphites'
  }

  for (const allergen of allergens) {
    warnings.push(allergenLabels[allergen])
  }

  return warnings
}
