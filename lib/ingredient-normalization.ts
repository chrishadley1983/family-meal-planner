/**
 * Ingredient Normalization Module
 *
 * Provides smart fuzzy matching for food ingredients to identify duplicates.
 * Handles UK/US naming differences, preparation methods, and form variations.
 */

// =============================================================================
// UK/US SYNONYM MAPPINGS (normalize to UK canonical forms)
// =============================================================================

const INGREDIENT_SYNONYMS: Record<string, string> = {
  // Vegetables - normalize to UK names
  'eggplant': 'aubergine',
  'zucchini': 'courgette',
  'arugula': 'rocket',
  'green onion': 'spring onion',
  'green onions': 'spring onion',
  'scallion': 'spring onion',
  'scallions': 'spring onion',
  'bell pepper': 'pepper',
  'capsicum': 'pepper',
  'red bell pepper': 'red pepper',
  'green bell pepper': 'green pepper',
  'yellow bell pepper': 'yellow pepper',
  'snow peas': 'mangetout',
  'fava beans': 'broad beans',
  'rutabaga': 'swede',
  'beet': 'beetroot',
  'beets': 'beetroot',
  'cilantro': 'coriander',
  'fresh cilantro': 'coriander',
  'napa cabbage': 'chinese leaves',
  'bok choy': 'pak choi',
  'corn': 'sweetcorn',
  'butter lettuce': 'gem lettuce',
  'romaine lettuce': 'cos lettuce',
  'romaine': 'cos lettuce',
  'endive': 'chicory',

  // Herbs - normalize to UK
  'coriander seed': 'coriander seeds',

  // Meat & Seafood - normalize to UK names
  'ground beef': 'beef mince',
  'ground pork': 'pork mince',
  'ground lamb': 'lamb mince',
  'ground turkey': 'turkey mince',
  'ground chicken': 'chicken mince',
  'shrimp': 'prawns',
  'jumbo shrimp': 'king prawns',
  'ham': 'gammon',
  'bacon slice': 'rasher',
  'canadian bacon': 'back bacon',

  // Dairy & Eggs - normalize to UK names
  'heavy cream': 'double cream',
  'light cream': 'single cream',
  'whipping cream': 'double cream',
  'whole milk': 'full fat milk',
  '2% milk': 'semi skimmed milk',
  'skim milk': 'skimmed milk',
  'plain yogurt': 'natural yoghurt',
  'greek yogurt': 'greek style yoghurt',
  'sharp cheddar': 'mature cheddar',
  'extra sharp cheddar': 'extra mature cheddar',

  // Baking & Pantry - normalize to UK names
  'all-purpose flour': 'plain flour',
  'all purpose flour': 'plain flour',
  'self-rising flour': 'self raising flour',
  'bread flour': 'strong flour',
  'whole wheat flour': 'wholemeal flour',
  'superfine sugar': 'caster sugar',
  'powdered sugar': 'icing sugar',
  'confectioners sugar': 'icing sugar',
  'turbinado sugar': 'demerara sugar',
  'dark brown sugar': 'muscovado sugar',
  'molasses': 'treacle',
  'blackstrap molasses': 'black treacle',
  'baking soda': 'bicarbonate of soda',
  'cornstarch': 'cornflour',

  // Stock & Broth - normalize to UK (stock, not broth)
  'chicken broth': 'chicken stock',
  'beef broth': 'beef stock',
  'vegetable broth': 'vegetable stock',
  'fish broth': 'fish stock',
  'bouillon cube': 'stock cube',
  'bouillon cubes': 'stock cubes',
  'bouillon': 'stock cube',
  'chicken bouillon cube': 'chicken stock cube',
  'beef bouillon cube': 'beef stock cube',
  'vegetable bouillon cube': 'vegetable stock cube',

  // Condiments & Sauces - normalize to UK
  'marinara sauce': 'tomato sauce',
  'tomato puree': 'passata',
  'tomato ketchup': 'ketchup',
  'catsup': 'ketchup',
  'mayo': 'mayonnaise',

  // Oils & Fats - normalize to UK
  'canola oil': 'rapeseed oil',
  'peanut oil': 'groundnut oil',

  // Dried Goods - normalize to UK
  'garbanzo beans': 'chickpeas',
  'navy beans': 'haricot beans',
  'white kidney beans': 'cannellini beans',
  'lima beans': 'butter beans',
  'legumes': 'pulses',

  // Grains - normalize to UK
  'brown rice': 'wholegrain rice',
  'rolled oats': 'porridge oats',
  'oatmeal': 'porridge oats',
  'basmati': 'basmati rice',

  // Nuts & Seeds
  'peanuts': 'groundnuts',

  // Spices (normalize variations, keep UK spelling)
  'chili': 'chilli',
  'chili powder': 'chilli powder',
  'red pepper flakes': 'chilli flakes',
  'crushed red pepper': 'chilli flakes',
  'cayenne': 'cayenne pepper',
  'tumeric': 'turmeric', // common misspelling
  'cumin seed': 'cumin seeds',
  'coriander ground': 'ground coriander',
  'allspice': 'mixed spice',
  'all spice': 'mixed spice',

  // Miscellaneous - normalize to UK
  'plastic wrap': 'clingfilm',
  'paper towels': 'kitchen roll',
  'parchment paper': 'baking parchment',
  'aluminum foil': 'aluminium foil',
  'tin foil': 'aluminium foil',
}

// =============================================================================
// FORM WORDS TO STRIP (these indicate form/cut, not the ingredient itself)
// =============================================================================

const FORM_WORDS = new Set([
  // Count/portion forms
  'clove', 'cloves',
  'cube', 'cubes',
  'pod', 'pods',
  'piece', 'pieces',
  'head', 'heads',
  'bunch', 'bunches',
  'sprig', 'sprigs',
  'stalk', 'stalks',
  'stem', 'stems',
  'leaf', 'leaves',
  'slice', 'slices',
  'wedge', 'wedges',
  'segment', 'segments',
  'strip', 'strips',
  'chunk', 'chunks',
  'fillet', 'fillets',
  'breast', 'breasts',
  'thigh', 'thighs',
  'drumstick', 'drumsticks',
  'wing', 'wings',
  'leg', 'legs',
  'loin', 'loins',
  'rasher', 'rashers',
  'tin', 'tins',
  'can', 'cans',
  'jar', 'jars',
  'packet', 'packets',
  'bag', 'bags',
  'bottle', 'bottles',
  'carton', 'cartons',
  'punnet', 'punnets',
  'pack', 'packs',
  'sachet', 'sachets',
])

// =============================================================================
// PREPARATION PREFIXES TO STRIP
// =============================================================================

const PREP_PREFIXES = new Set([
  'sliced',
  'diced',
  'chopped',
  'minced',
  'crushed',
  'grated',
  'shredded',
  'julienned',
  'cubed',
  'halved',
  'quartered',
  'whole',
  'ground',
  'powdered',
  'flaked',
  'crumbled',
  'mashed',
  'pureed',
  'blended',
  'peeled',
  'deseeded',
  'seeded',
  'pitted',
  'cored',
  'trimmed',
  'washed',
  'rinsed',
  'drained',
  'strained',
  'sifted',
  'beaten',
  'whisked',
  'melted',
  'softened',
  'room temperature',
  'cold',
  'warm',
  'hot',
  'toasted',
  'roasted',
  'fried',
  'sauteed',
  'grilled',
  'baked',
  'steamed',
  'boiled',
  'blanched',
  'poached',
  'smoked',
  'cured',
  'dried',
  'rehydrated',
  'soaked',
  'marinated',
  'seasoned',
  'unseasoned',
])

// =============================================================================
// MODIFIER PREFIXES TO STRIP
// =============================================================================

const MODIFIER_PREFIXES = new Set([
  'fresh',
  'frozen',
  'dried',
  'canned',
  'tinned',
  'jarred',
  'bottled',
  'packaged',
  'organic',
  'free-range',
  'free range',
  'cage-free',
  'cage free',
  'grass-fed',
  'grass fed',
  'wild-caught',
  'wild caught',
  'farm-raised',
  'farm raised',
  'local',
  'imported',
  'raw',
  'cooked',
  'uncooked',
  'ready-to-eat',
  'ready to eat',
  'pre-cooked',
  'pre cooked',
  'pre-made',
  'pre made',
  'homemade',
  'home-made',
  'store-bought',
  'store bought',
  'low-sodium',
  'low sodium',
  'reduced-sodium',
  'reduced sodium',
  'no-salt',
  'no salt',
  'salt-free',
  'salt free',
  'unsalted',
  'salted',
  'low-fat',
  'low fat',
  'reduced-fat',
  'reduced fat',
  'fat-free',
  'fat free',
  'nonfat',
  'non-fat',
  'full-fat',
  'full fat',
  'light',
  'lite',
  'diet',
  'sugar-free',
  'sugar free',
  'no-sugar',
  'no sugar',
  'unsweetened',
  'sweetened',
  'gluten-free',
  'gluten free',
  'dairy-free',
  'dairy free',
  'vegan',
  'vegetarian',
  'kosher',
  'halal',
  'large',
  'medium',
  'small',
  'extra-large',
  'extra large',
  'baby',
  'mini',
  'jumbo',
  'regular',
  'thick',
  'thin',
  'fine',
  'coarse',
  'extra-virgin',
  'extra virgin',
  'virgin',
  'pure',
  'refined',
  'unrefined',
  'bleached',
  'unbleached',
  'enriched',
  'fortified',
  'plain',
  'flavored',
  'unflavored',
  'natural',
  'artificial',
])

// =============================================================================
// SIZE/QUALITY WORDS TO STRIP
// =============================================================================

const SIZE_QUALITY_WORDS = new Set([
  'optional',
  'to taste',
  'as needed',
  'for garnish',
  'for serving',
  'approximately',
  'approx',
  'about',
  'roughly',
  'heaped',
  'level',
  'packed',
  'loosely packed',
  'tightly packed',
  'generous',
  'scant',
  'good quality',
  'best quality',
  'cheap',
  'budget',
  'premium',
  'quality',
])

// =============================================================================
// CORE NORMALIZATION FUNCTIONS
// =============================================================================

/**
 * Normalizes an ingredient name for duplicate detection.
 * Returns a canonical form that can be compared for equality.
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim()

  // Remove content in parentheses (often contains optional info)
  normalized = normalized.replace(/\s*\([^)]*\)/g, '')

  // Remove content after comma (often preparation instructions)
  normalized = normalized.replace(/,.*$/, '')

  // Normalize hyphens and spaces
  normalized = normalized.replace(/-/g, ' ')
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Apply synonym mapping first
  normalized = applySynonymMapping(normalized)

  // Strip modifier prefixes
  normalized = stripPrefixes(normalized, MODIFIER_PREFIXES)

  // Strip preparation prefixes
  normalized = stripPrefixes(normalized, PREP_PREFIXES)

  // Strip form words
  normalized = stripFormWords(normalized)

  // Handle common plural forms
  normalized = normalizePlurals(normalized)

  // Final cleanup
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Applies synonym mapping to normalize UK/US variations
 */
function applySynonymMapping(text: string): string {
  // Try exact match first
  if (INGREDIENT_SYNONYMS[text]) {
    return INGREDIENT_SYNONYMS[text]
  }

  // Try matching substrings for compound ingredients
  let result = text
  for (const [variant, canonical] of Object.entries(INGREDIENT_SYNONYMS)) {
    // Only replace if it's a word boundary match
    const regex = new RegExp(`\\b${escapeRegex(variant)}\\b`, 'gi')
    result = result.replace(regex, canonical)
  }

  return result
}

/**
 * Strips prefixes from a set
 */
function stripPrefixes(text: string, prefixes: Set<string>): string {
  const words = text.split(' ')
  const result: string[] = []
  let skipNext = false

  for (let i = 0; i < words.length; i++) {
    if (skipNext) {
      skipNext = false
      continue
    }

    const word = words[i]
    const twoWordPrefix = i < words.length - 1 ? `${word} ${words[i + 1]}` : ''

    // Check two-word prefixes first
    if (twoWordPrefix && prefixes.has(twoWordPrefix)) {
      skipNext = true
      continue
    }

    // Check single-word prefixes
    if (!prefixes.has(word)) {
      result.push(word)
    }
  }

  return result.join(' ')
}

/**
 * Strips form words that indicate portion/cut type
 */
function stripFormWords(text: string): string {
  const words = text.split(' ')

  // If there's only one word, don't strip it (e.g., "cloves" alone shouldn't become empty)
  if (words.length === 1) {
    return text
  }

  // Remove form words from the end primarily
  // e.g., "garlic cloves" -> "garlic", but "cloves" alone stays as "cloves"
  const result = words.filter((word, index) => {
    // Keep the word if it's not a form word
    if (!FORM_WORDS.has(word)) {
      return true
    }

    // If it's a form word but it's the only remaining content word, keep it
    const remainingWords = words.filter((w, i) => i !== index && !FORM_WORDS.has(w))
    return remainingWords.length === 0
  })

  return result.join(' ')
}

/**
 * Normalizes common plural forms
 */
function normalizePlurals(text: string): string {
  const words = text.split(' ')

  const normalized = words.map(word => {
    // Handle -ies -> -y (berries -> berry)
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y'
    }

    // Handle -oes -> -o (tomatoes -> tomato, potatoes -> potato)
    if (word.endsWith('oes') && word.length > 4) {
      return word.slice(0, -2)
    }

    // Handle -es -> remove (dishes -> dish)
    if (word.endsWith('es') && word.length > 3) {
      const stem = word.slice(0, -2)
      // Only remove if it ends in s, sh, ch, x, z
      if (/[sxz]$/.test(stem) || /[sc]h$/.test(stem)) {
        return stem
      }
    }

    // Handle regular -s plurals
    if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
      return word.slice(0, -1)
    }

    return word
  })

  return normalized.join(' ')
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// =============================================================================
// ADVANCED MATCHING FUNCTIONS
// =============================================================================

/**
 * Calculates similarity between two ingredient names (0-1 scale)
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeIngredientName(name1)
  const norm2 = normalizeIngredientName(name2)

  // Exact match after normalization
  if (norm1 === norm2) {
    return 1.0
  }

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = norm1.length > norm2.length ? norm1 : norm2
    const shorter = norm1.length > norm2.length ? norm2 : norm1
    return shorter.length / longer.length
  }

  // Calculate word overlap (Jaccard similarity)
  const words1 = new Set(norm1.split(' '))
  const words2 = new Set(norm2.split(' '))

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  if (union.size === 0) return 0

  return intersection.size / union.size
}

/**
 * Groups items by their normalized names for duplicate detection
 */
export function groupByNormalizedName<T extends { itemName: string }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const normalized = normalizeIngredientName(item.itemName)

    if (!groups.has(normalized)) {
      groups.set(normalized, [])
    }
    groups.get(normalized)!.push(item)
  }

  return groups
}

/**
 * Finds potential duplicate groups, returning only groups with 2+ items
 */
export function findPotentialDuplicates<T extends { itemName: string }>(
  items: T[]
): Array<{ normalizedName: string; items: T[] }> {
  const groups = groupByNormalizedName(items)
  const duplicates: Array<{ normalizedName: string; items: T[] }> = []

  for (const [normalizedName, groupItems] of groups) {
    if (groupItems.length >= 2) {
      duplicates.push({ normalizedName, items: groupItems })
    }
  }

  return duplicates
}

// =============================================================================
// CONFIDENCE SCORING FOR AI-DETECTED MATCHES
// =============================================================================

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface SemanticMatch {
  items: string[]
  normalizedName: string
  confidence: MatchConfidence
  reason: string
}

/**
 * Determines confidence level based on similarity score
 */
export function getConfidenceFromSimilarity(similarity: number): MatchConfidence {
  if (similarity >= 0.9) return 'HIGH'
  if (similarity >= 0.6) return 'MEDIUM'
  return 'LOW'
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _testExports = {
  INGREDIENT_SYNONYMS,
  FORM_WORDS,
  PREP_PREFIXES,
  MODIFIER_PREFIXES,
  applySynonymMapping,
  stripPrefixes,
  stripFormWords,
  normalizePlurals,
}
