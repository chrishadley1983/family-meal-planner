/**
 * Types for nutrition data from USDA FoodData Central API
 */

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

export interface USDAFoodSearchResult {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: USDANutrient[]
  brandOwner?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
}

export interface USDASearchResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFoodSearchResult[]
}

export interface NutrientsPer100g {
  calories: number      // kcal
  protein: number       // g
  carbs: number         // g
  fat: number           // g
  fiber: number         // g
  sugar: number         // g
  sodium: number        // mg
}

export interface CachedIngredient {
  ingredientName: string
  normalizedName: string
  fdcId: number
  nutrientsPer100g: NutrientsPer100g
  servingSize?: number
  servingSizeUnit?: string
  lastUpdated: Date
  source: 'usda' | 'manual'
}

// USDA nutrient IDs we care about
export const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,        // Energy (kcal)
  PROTEIN: 1003,       // Protein
  FAT: 1004,           // Total lipid (fat)
  CARBS: 1005,         // Carbohydrate, by difference
  FIBER: 1079,         // Fiber, total dietary
  SUGAR: 2000,         // Sugars, total including NLEA
  SODIUM: 1093,        // Sodium, Na
} as const

// Unit conversion factors to get to 100g equivalent
export const UNIT_TO_GRAMS: Record<string, number> = {
  // ============================================
  // WEIGHT UNITS
  // ============================================
  'g': 1,
  'gram': 1,
  'grams': 1,
  'kg': 1000,
  'kilogram': 1000,
  'kilograms': 1000,
  'oz': 28.35,
  'ounce': 28.35,
  'ounces': 28.35,
  'lb': 453.6,
  'pound': 453.6,
  'pounds': 453.6,

  // ============================================
  // VOLUME UNITS (approximate, assuming water density)
  // ============================================
  'ml': 1,
  'millilitre': 1,
  'millilitres': 1,
  'milliliter': 1,
  'milliliters': 1,
  'cl': 10,              // Centilitre
  'centilitre': 10,
  'centilitres': 10,
  'dl': 100,             // Decilitre
  'decilitre': 100,
  'decilitres': 100,
  'l': 1000,
  'litre': 1000,
  'litres': 1000,
  'liter': 1000,
  'liters': 1000,
  'fl oz': 30,           // Fluid ounce
  'fluid ounce': 30,
  'fluid ounces': 30,
  'pint': 568,           // UK pint
  'pints': 568,
  'pt': 568,
  'quart': 946,          // US quart
  'quarts': 946,
  'qt': 946,
  'gallon': 3785,        // US gallon
  'gallons': 3785,
  'gal': 3785,

  // ============================================
  // COMMON COOKING MEASUREMENTS
  // ============================================
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'cup': 240,
  'cups': 240,

  // ============================================
  // SMALL MEASUREMENTS (spices, seasonings)
  // ============================================
  'pinch': 0.3,          // ~1/16 tsp
  'pinches': 0.3,
  'dash': 0.5,           // ~1/8 tsp
  'dashes': 0.5,
  'smidgen': 0.2,
  'drop': 0.05,
  'drops': 0.05,
  'splash': 5,           // ~1 tsp liquid
  'drizzle': 10,         // ~2 tsp oil/sauce
  'handful': 30,         // Small handful of herbs/nuts
  'knob': 15,            // Knob of butter (~1 tbsp)
  'dollop': 30,          // Spoonful of cream/yogurt
  'scoop': 60,           // Ice cream scoop size

  // ============================================
  // "TO TASTE" & APPROXIMATION UNITS (Critical!)
  // ============================================
  'to taste': 2,         // Small amount for seasoning
  'to-taste': 2,
  'totaste': 2,          // No space variant
  'as needed': 5,        // Slightly more generous
  'as required': 5,
  'optional': 0,         // Skip if optional (no nutrition)
  'for garnish': 2,      // Small garnish amount
  'for serving': 10,     // Serving accompaniment

  // ============================================
  // COUNT-BASED UNITS
  // ============================================
  'whole': 100,          // Default estimate
  'piece': 100,
  'pieces': 100,
  'each': 100,
  'item': 100,
  'items': 100,
  'unit': 100,
  'units': 100,
  'serving': 100,
  'servings': 100,
  'portion': 100,
  'portions': 100,

  // ============================================
  // SIZE MODIFIERS (used with produce)
  // ============================================
  'small': 75,           // Small onion/apple
  'medium': 120,         // Medium onion/apple
  'large': 180,          // Large onion/apple
  'extra large': 220,
  'extra-large': 220,

  // ============================================
  // PRODUCE UNITS
  // ============================================
  'bunch': 50,           // Bunch of herbs/parsley
  'bunches': 50,
  'head': 300,           // Head of lettuce/cauliflower
  'heads': 300,
  'stalk': 40,           // Celery stalk
  'stalks': 40,
  'stem': 40,
  'stems': 40,
  'sprig': 2,            // Sprig of thyme/rosemary
  'sprigs': 2,
  'leaf': 1,             // Bay leaf, basil leaf
  'leaves': 1,
  'clove': 3,            // Garlic clove
  'cloves': 3,
  'slice': 20,           // Slice of bread/tomato
  'slices': 20,
  'wedge': 30,           // Lemon/lime wedge
  'wedges': 30,
  'segment': 10,         // Citrus segment
  'segments': 10,
  'floret': 25,          // Broccoli/cauliflower floret
  'florets': 25,
  'ear': 100,            // Ear of corn
  'ears': 100,
  'bulb': 60,            // Garlic bulb, fennel bulb
  'bulbs': 60,
  'root': 50,            // Ginger root piece
  'roots': 50,
  'crown': 300,          // Broccoli crown
  'crowns': 300,
  'rib': 40,             // Celery rib
  'ribs': 40,

  // ============================================
  // EGG UNITS
  // ============================================
  'egg': 50,             // Large egg
  'eggs': 50,
  'yolk': 18,            // Egg yolk only
  'yolks': 18,
  'egg yolk': 18,
  'egg yolks': 18,
  'white': 33,           // Egg white only
  'whites': 33,
  'egg white': 33,
  'egg whites': 33,

  // ============================================
  // MEAT & PROTEIN UNITS
  // ============================================
  'fillet': 150,         // Fish/chicken fillet
  'fillets': 150,
  'filet': 150,
  'filets': 150,
  'breast': 175,         // Chicken breast
  'breasts': 175,
  'thigh': 120,          // Chicken thigh
  'thighs': 120,
  'drumstick': 100,      // Chicken drumstick
  'drumsticks': 100,
  'wing': 50,            // Chicken wing
  'wings': 50,
  'leg': 150,            // Chicken/lamb leg portion
  'legs': 150,
  'rasher': 25,          // Bacon rasher
  'rashers': 25,
  'strip': 20,           // Bacon strip
  'strips': 20,
  'patty': 100,          // Burger patty
  'patties': 100,
  'steak': 200,          // Average steak
  'steaks': 200,
  'chop': 150,           // Pork/lamb chop
  'chops': 150,
  'cutlet': 150,         // Veal/pork cutlet
  'cutlets': 150,
  'sausage': 60,         // Average sausage
  'sausages': 60,
  'link': 60,            // Sausage link
  'links': 60,
  'slice deli': 30,      // Deli meat slice
  'prawn': 10,           // Single prawn
  'prawns': 10,
  'shrimp': 8,           // Single shrimp
  'mussel': 15,          // Single mussel
  'mussels': 15,
  'clam': 15,            // Single clam
  'clams': 15,
  'scallop': 20,         // Single scallop
  'scallops': 20,

  // ============================================
  // CONTAINER & PACKAGE UNITS
  // ============================================
  'can': 400,            // Standard tin
  'cans': 400,
  'tin': 400,            // UK term for can
  'tins': 400,
  'jar': 300,            // Average jar
  'jars': 300,
  'bottle': 500,         // Average bottle
  'bottles': 500,
  'packet': 100,         // Small packet
  'packets': 100,
  'pack': 200,           // Standard pack
  'packs': 200,
  'package': 200,
  'packages': 200,
  'sachet': 10,          // Small sachet
  'sachets': 10,
  'carton': 500,         // Carton of passata/stock
  'cartons': 500,
  'box': 250,            // Box of pasta
  'boxes': 250,
  'tube': 100,           // Tube of tomato paste
  'tubes': 100,
  'bag': 200,            // Bag of salad/spinach
  'bags': 200,
  'pouch': 150,          // Pouch of tuna/rice
  'pouches': 150,
  'container': 200,      // Generic container
  'containers': 200,
  'tub': 250,            // Tub of yogurt/cream
  'tubs': 250,

  // ============================================
  // BAKING UNITS
  // ============================================
  'stick': 113,          // US butter stick
  'sticks': 113,
  'block': 250,          // Block of butter/cheese
  'blocks': 250,
  'sheet': 50,           // Pastry sheet
  'sheets': 50,
  'round': 30,           // Biscuit/cookie
  'rounds': 30,
  'square': 30,          // Brownie square
  'squares': 30,
  'bar': 50,             // Chocolate bar
  'bars': 50,
  'cube': 10,            // Stock cube
  'cubes': 10,
}
