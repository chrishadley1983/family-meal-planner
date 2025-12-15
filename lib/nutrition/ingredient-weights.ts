/**
 * Ingredient Weight Mappings
 *
 * Used when unit is generic (whole, piece, each, etc.) to provide
 * more accurate gram weights based on the ingredient type.
 *
 * All weights are in GRAMS for a single item.
 *
 * This solves the problem where "1 whole egg" would use the generic
 * "whole" = 100g instead of the correct ~50g for an egg.
 */

export const INGREDIENT_WEIGHTS: Record<string, number> = {
  // ============================================
  // EGGS
  // ============================================
  'egg': 50,
  'eggs': 50,
  'large egg': 50,
  'medium egg': 44,
  'small egg': 38,
  'duck egg': 70,
  'quail egg': 9,
  'goose egg': 144,

  // ============================================
  // SMALL PRODUCE (under 30g each)
  // ============================================
  'cherry tomato': 15,
  'cherry tomatoes': 15,
  'grape tomato': 12,
  'grape tomatoes': 12,
  'baby tomato': 15,
  'baby tomatoes': 15,

  'olive': 4,
  'olives': 4,
  'black olive': 4,
  'black olives': 4,
  'green olive': 5,
  'green olives': 5,
  'kalamata olive': 5,
  'kalamata olives': 5,

  'grape': 5,
  'grapes': 5,
  'cherry': 8,
  'cherries': 8,
  'blueberry': 1,
  'blueberries': 1,
  'raspberry': 4,
  'raspberries': 4,
  'blackberry': 5,
  'blackberries': 5,
  'strawberry': 12,
  'strawberries': 12,

  'radish': 10,
  'radishes': 10,
  'baby corn': 10,

  'garlic clove': 3,
  'clove garlic': 3,
  'shallot': 30,
  'shallots': 30,
  'spring onion': 15,
  'spring onions': 15,
  'green onion': 15,
  'green onions': 15,
  'scallion': 15,
  'scallions': 15,

  'chilli': 15,
  'chillies': 15,
  'chili': 15,
  'chilies': 15,
  'jalapeño': 15,
  'jalapeño pepper': 15,
  'serrano': 10,

  'date': 8,
  'dates': 8,
  'medjool date': 24,
  'medjool dates': 24,
  'dried apricot': 8,
  'dried apricots': 8,
  'prune': 10,
  'prunes': 10,
  'raisin': 1,
  'raisins': 1,
  'sultana': 1,
  'sultanas': 1,

  'almond': 1.2,
  'almonds': 1.2,
  'walnut': 4,
  'walnuts': 4,
  'walnut half': 2,
  'walnut halves': 2,
  'pecan': 4,
  'pecans': 4,
  'cashew': 1.5,
  'cashews': 1.5,
  'pistachio': 0.6,
  'pistachios': 0.6,
  'hazelnut': 1.5,
  'hazelnuts': 1.5,
  'macadamia': 2,
  'macadamias': 2,
  'brazil nut': 5,
  'brazil nuts': 5,
  'peanut': 0.5,
  'peanuts': 0.5,

  // ============================================
  // MEDIUM PRODUCE (30-150g each)
  // ============================================
  'tomato': 125,
  'tomatoes': 125,
  'plum tomato': 60,
  'plum tomatoes': 60,
  'roma tomato': 60,
  'roma tomatoes': 60,
  'vine tomato': 100,
  'vine tomatoes': 100,
  'beef tomato': 250,
  'beef tomatoes': 250,
  'beefsteak tomato': 250,
  'beefsteak tomatoes': 250,

  'onion': 150,
  'onions': 150,
  'red onion': 150,
  'red onions': 150,
  'white onion': 150,
  'white onions': 150,
  'yellow onion': 150,
  'yellow onions': 150,
  'brown onion': 150,
  'brown onions': 150,
  'spanish onion': 200,
  'spanish onions': 200,

  'pepper': 150,
  'peppers': 150,
  'bell pepper': 150,
  'bell peppers': 150,
  'red pepper': 150,
  'red peppers': 150,
  'green pepper': 150,
  'green peppers': 150,
  'yellow pepper': 160,
  'yellow peppers': 160,
  'orange pepper': 160,
  'orange peppers': 160,
  'capsicum': 150,
  'capsicums': 150,

  'potato': 150,
  'potatoes': 150,
  'baking potato': 200,
  'baking potatoes': 200,
  'new potato': 50,
  'new potatoes': 50,
  'baby potato': 40,
  'baby potatoes': 40,
  'sweet potato': 200,
  'sweet potatoes': 200,

  'carrot': 60,
  'carrots': 60,
  'baby carrot': 10,
  'baby carrots': 10,

  'courgette': 200,
  'courgettes': 200,
  'zucchini': 200,
  'zucchinis': 200,
  'baby courgette': 50,
  'baby courgettes': 50,

  'cucumber': 300,
  'cucumbers': 300,
  'baby cucumber': 100,
  'baby cucumbers': 100,

  'aubergine': 300,
  'aubergines': 300,
  'eggplant': 300,
  'eggplants': 300,

  'beetroot': 80,
  'beetroots': 80,
  'beet': 80,
  'beets': 80,

  'parsnip': 100,
  'parsnips': 100,
  'turnip': 120,
  'turnips': 120,
  'swede': 300,
  'swedes': 300,

  'leek': 100,
  'leeks': 100,
  'celery stick': 40,
  'celery sticks': 40,
  'celery stalk': 40,
  'celery stalks': 40,
  'celery rib': 40,
  'celery': 40,

  'mushroom': 20,
  'mushrooms': 20,
  'button mushroom': 10,
  'button mushrooms': 10,
  'chestnut mushroom': 15,
  'chestnut mushrooms': 15,
  'portobello mushroom': 80,
  'portobello mushrooms': 80,
  'portobello': 80,
  'shiitake mushroom': 10,
  'shiitake mushrooms': 10,

  'avocado': 170,
  'avocados': 170,

  'corn cob': 200,
  'corn on the cob': 200,
  'sweetcorn cob': 200,

  // ============================================
  // LARGE PRODUCE (over 150g each)
  // ============================================
  'cabbage': 900,
  'cabbages': 900,
  'red cabbage': 1000,
  'white cabbage': 1000,
  'savoy cabbage': 700,

  'cauliflower': 600,
  'cauliflowers': 600,
  'broccoli': 350,
  'broccoli head': 350,

  'lettuce': 300,
  'iceberg lettuce': 500,
  'romaine lettuce': 300,
  'cos lettuce': 300,
  'little gem lettuce': 100,
  'little gem': 100,

  'butternut squash': 1000,
  'butternut': 1000,
  'pumpkin': 2000,
  'acorn squash': 500,
  'spaghetti squash': 1500,

  'watermelon': 5000,
  'cantaloupe': 1000,
  'honeydew melon': 1500,
  'melon': 1000,

  // ============================================
  // FRUITS
  // ============================================
  'apple': 180,
  'apples': 180,
  'green apple': 180,
  'red apple': 180,
  'granny smith': 180,
  'pink lady': 180,
  'gala apple': 180,

  'pear': 180,
  'pears': 180,
  'conference pear': 180,

  'banana': 120,
  'bananas': 120,

  'orange': 180,
  'oranges': 180,
  'navel orange': 180,
  'blood orange': 150,
  'clementine': 75,
  'clementines': 75,
  'satsuma': 75,
  'satsumas': 75,
  'mandarin': 75,
  'mandarins': 75,
  'tangerine': 75,
  'tangerines': 75,

  'lemon': 85,
  'lemons': 85,
  'lime': 65,
  'limes': 65,

  'grapefruit': 250,
  'grapefruits': 250,

  'peach': 150,
  'peaches': 150,
  'nectarine': 140,
  'nectarines': 140,
  'plum': 65,
  'plums': 65,
  'apricot': 35,
  'apricots': 35,

  'mango': 300,
  'mangos': 300,
  'mangoes': 300,

  'pineapple': 900,
  'pineapples': 900,

  'kiwi': 75,
  'kiwis': 75,
  'kiwi fruit': 75,
  'kiwifruit': 75,

  'fig': 50,
  'figs': 50,
  'fresh fig': 50,
  'fresh figs': 50,

  'pomegranate': 280,
  'pomegranates': 280,

  'passion fruit': 18,
  'passionfruit': 18,

  // ============================================
  // BREADS, WRAPS & BAKED GOODS
  // ============================================
  'tortilla': 65,
  'tortillas': 65,
  'flour tortilla': 50,
  'flour tortillas': 50,
  'corn tortilla': 25,
  'corn tortillas': 25,
  'wholemeal tortilla': 65,
  'wholemeal tortillas': 65,
  'whole wheat tortilla': 65,
  'whole wheat tortillas': 65,
  'wrap': 65,
  'wraps': 65,
  'tortilla wrap': 65,
  'tortilla wraps': 65,
  'wholemeal wrap': 65,
  'wholemeal wraps': 65,
  'wholemeal tortilla wrap': 65,
  'wholemeal tortilla wraps': 65,

  'pitta': 60,
  'pitta bread': 60,
  'pita': 60,
  'pita bread': 60,
  'naan': 90,
  'naan bread': 90,
  'chapati': 40,
  'chapatis': 40,
  'roti': 40,
  'rotis': 40,
  'flatbread': 60,
  'flatbreads': 60,

  'bread slice': 30,
  'slice bread': 30,
  'slice of bread': 30,
  'bread roll': 50,
  'bread rolls': 50,
  'roll': 50,
  'rolls': 50,
  'dinner roll': 35,
  'bun': 50,
  'buns': 50,
  'burger bun': 50,
  'burger buns': 50,
  'hot dog bun': 45,
  'brioche bun': 55,
  'brioche': 55,

  'bagel': 100,
  'bagels': 100,
  'english muffin': 60,
  'english muffins': 60,
  'crumpet': 40,
  'crumpets': 40,

  'croissant': 60,
  'croissants': 60,
  'pain au chocolat': 70,
  'danish pastry': 80,
  'danish': 80,

  'muffin': 115,
  'muffins': 115,
  'blueberry muffin': 115,
  'chocolate muffin': 115,

  'scone': 60,
  'scones': 60,

  'cookie': 30,
  'cookies': 30,
  'biscuit': 15,
  'biscuits': 15,
  'digestive': 15,
  'digestives': 15,
  'shortbread': 20,

  'pancake': 40,
  'pancakes': 40,
  'waffle': 75,
  'waffles': 75,

  // ============================================
  // PROTEINS - MEAT
  // ============================================
  'chicken breast': 175,
  'chicken breasts': 175,
  'chicken thigh': 85,
  'chicken thighs': 85,
  'chicken leg': 120,
  'chicken legs': 120,
  'chicken drumstick': 75,
  'chicken drumsticks': 75,
  'chicken wing': 35,
  'chicken wings': 35,

  'turkey breast': 200,
  'turkey thigh': 120,
  'turkey leg': 200,

  'pork chop': 150,
  'pork chops': 150,
  'pork loin': 150,
  'pork tenderloin': 350,
  'pork fillet': 150,

  'lamb chop': 100,
  'lamb chops': 100,
  'lamb cutlet': 80,
  'lamb cutlets': 80,
  'lamb leg steak': 150,
  'lamb shank': 250,

  'beef steak': 200,
  'steak': 200,
  'sirloin steak': 225,
  'ribeye steak': 250,
  'ribeye': 250,
  'fillet steak': 175,
  'rump steak': 200,

  'burger patty': 100,
  'beef patty': 100,
  'burger': 100,
  'meatball': 30,
  'meatballs': 30,

  'sausage': 60,
  'sausages': 60,
  'pork sausage': 60,
  'beef sausage': 70,
  'chipolata': 30,
  'chipolatas': 30,
  'frankfurter': 50,
  'frankfurters': 50,
  'hot dog': 50,
  'hot dogs': 50,

  'bacon rasher': 25,
  'bacon rashers': 25,
  'rasher': 25,
  'rashers': 25,
  'streaky bacon': 20,
  'back bacon': 30,
  'bacon strip': 15,
  'bacon strips': 15,

  'ham slice': 30,
  'slice ham': 30,
  'deli meat slice': 25,

  // ============================================
  // PROTEINS - SEAFOOD
  // ============================================
  'salmon fillet': 150,
  'salmon fillets': 150,
  'salmon steak': 175,

  'cod fillet': 150,
  'cod fillets': 150,
  'haddock fillet': 150,
  'haddock fillets': 150,
  'sea bass fillet': 125,
  'tilapia fillet': 115,

  'tuna steak': 175,
  'swordfish steak': 175,

  'fish finger': 28,
  'fish fingers': 28,
  'fish stick': 28,
  'fish sticks': 28,

  'prawn': 10,
  'prawns': 10,
  'king prawn': 15,
  'king prawns': 15,
  'tiger prawn': 20,
  'tiger prawns': 20,
  'shrimp': 8,
  'shrimps': 8,
  'jumbo shrimp': 15,

  'scallop': 20,
  'scallops': 20,
  'king scallop': 35,
  'king scallops': 35,

  'mussel': 15,
  'mussels': 15,
  'clam': 15,
  'clams': 15,
  'oyster': 15,
  'oysters': 15,

  'crab cake': 60,
  'crab cakes': 60,
  'fish cake': 75,
  'fish cakes': 75,

  // ============================================
  // DAIRY
  // ============================================
  'cheese slice': 20,
  'cheese slices': 20,
  'slice cheese': 20,
  'cheddar slice': 25,
  'processed cheese slice': 20,

  'butter pat': 10,
  'pat butter': 10,

  // ============================================
  // TOFU & PLANT PROTEINS
  // ============================================
  'tofu block': 300,
  'tempeh block': 200,
  'veggie burger': 100,
  'veggie patty': 100,
  'falafel': 25,
  'falafels': 25,

  // ============================================
  // PASTA & NOODLES (dry, per serving)
  // ============================================
  'pasta nest': 75,
  'noodle nest': 60,
  'lasagne sheet': 25,
  'lasagna sheet': 25,
  'cannelloni tube': 15,

  // ============================================
  // HERBS (fresh)
  // ============================================
  'basil leaf': 0.5,
  'basil leaves': 0.5,
  'mint leaf': 0.3,
  'mint leaves': 0.3,
  'bay leaf': 0.3,
  'bay leaves': 0.3,
  'sage leaf': 0.3,
  'sage leaves': 0.3,
  'kaffir lime leaf': 0.5,
  'kaffir lime leaves': 0.5,
  'curry leaf': 0.2,
  'curry leaves': 0.2,
}

/**
 * Get the typical weight for an ingredient when unit is generic (whole, piece, etc.)
 *
 * @param ingredientName - The name of the ingredient
 * @returns Weight in grams, or null if not found
 */
export function getIngredientWeight(ingredientName: string): number | null {
  const normalized = ingredientName.toLowerCase().trim()

  // Direct match (most efficient)
  if (INGREDIENT_WEIGHTS[normalized] !== undefined) {
    return INGREDIENT_WEIGHTS[normalized]
  }

  // Try removing common prefixes/suffixes
  const cleanedName = normalized
    .replace(/^(fresh|frozen|dried|raw|cooked|organic|free-range|boneless|skinless)\s+/i, '')
    .replace(/\s+(fresh|frozen|dried|raw|cooked)$/i, '')
    .trim()

  if (cleanedName !== normalized && INGREDIENT_WEIGHTS[cleanedName] !== undefined) {
    return INGREDIENT_WEIGHTS[cleanedName]
  }

  // Partial match - check if ingredient name contains a known item
  // Sort by key length descending to match more specific items first
  const sortedKeys = Object.keys(INGREDIENT_WEIGHTS).sort((a, b) => b.length - a.length)

  for (const key of sortedKeys) {
    // Check if the normalized name contains the key
    if (normalized.includes(key)) {
      return INGREDIENT_WEIGHTS[key]
    }
    // Check if the key contains the normalized name (for short names like "egg")
    if (key.includes(normalized) && normalized.length >= 3) {
      return INGREDIENT_WEIGHTS[key]
    }
  }

  return null // Not found - caller should use default
}

/**
 * List of generic units that should trigger smart ingredient weight lookup
 */
export const GENERIC_UNITS = [
  'whole',
  'piece',
  'pieces',
  'each',
  'item',
  'items',
  'unit',
  'units',
]
