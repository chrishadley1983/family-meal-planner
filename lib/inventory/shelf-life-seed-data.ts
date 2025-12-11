/**
 * Shelf Life Seed Data
 * UK grocery items with typical shelf life and storage information
 * This data is used to auto-calculate expiry dates for inventory items
 */

import type { StorageLocation } from '@/lib/types/inventory'

export interface ShelfLifeSeedItem {
  ingredientName: string
  shelfLifeDays: number
  defaultLocation: StorageLocation | null
  category: string
  notes: string | null
}

/**
 * Comprehensive UK grocery shelf life data
 * Categories match the shopping list categories for consistency
 */
export const SHELF_LIFE_SEED_DATA: ShelfLifeSeedItem[] = [
  // ============================================
  // MEAT & FISH
  // ============================================
  { ingredientName: 'Chicken (Whole)', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Check cavity smell; raw poultry juice risk' },
  { ingredientName: 'Chicken Breasts', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Slimy texture indicates spoilage' },
  { ingredientName: 'Chicken Breast Fillets', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Slimy texture indicates spoilage' },
  { ingredientName: 'Chicken Thighs', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Bones can harbor bacteria deep inside' },
  { ingredientName: 'Chicken Wings', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'High skin surface area' },
  { ingredientName: 'Chicken Mince', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Highest Risk: Cook immediately' },
  { ingredientName: 'Turkey Mince', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Highest Risk: Cook immediately' },
  { ingredientName: 'Beef Mince', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Oxidises brown quickly; use ASAP' },
  { ingredientName: 'Ground Beef', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Oxidises brown quickly; use ASAP' },
  { ingredientName: 'Beef Steak', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Surface bacteria only; interior sterile' },
  { ingredientName: 'Sirloin Steak', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Surface bacteria only; interior sterile' },
  { ingredientName: 'Rump Steak', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Surface bacteria only; interior sterile' },
  { ingredientName: 'Beef Roasting Joint', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Meat & Fish', notes: null },
  { ingredientName: 'Pork Chops', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Fat oxidises faster than beef' },
  { ingredientName: 'Pork Sausages', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Preservatives extend life slightly' },
  { ingredientName: 'Bacon', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Cured; check Use By date' },
  { ingredientName: 'Bacon (Opened)', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Wrap tightly to prevent drying' },
  { ingredientName: 'Gammon Joint', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Salt cured' },
  { ingredientName: 'Lamb Chops', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Hard fat is relatively stable' },
  { ingredientName: 'Lamb Mince', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'High risk; cook immediately' },
  { ingredientName: 'Salmon Fillets', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Oily fish goes rancid quickly' },
  { ingredientName: 'Cod Fillets', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'White fish smells of ammonia when bad' },
  { ingredientName: 'Haddock Fillets', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'White fish smells of ammonia when bad' },
  { ingredientName: 'Smoked Salmon', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Once opened' },
  { ingredientName: 'Prawns (Raw)', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Must smell fresh/sea-like' },
  { ingredientName: 'Prawns (Cooked)', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: null },
  { ingredientName: 'Sea Bass', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: null },
  { ingredientName: 'Mackerel', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: 'Oily fish' },
  { ingredientName: 'Tuna Steak', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish', notes: null },

  // ============================================
  // FRESH PRODUCE
  // ============================================
  { ingredientName: 'Apples', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'High ethylene producer; store separate' },
  { ingredientName: 'Bananas', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'DO NOT FRIDGE; skin turns black' },
  { ingredientName: 'Avocado', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Fridge slows ripening; store ambient if hard' },
  { ingredientName: 'Strawberries', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Do not wash until eating' },
  { ingredientName: 'Raspberries', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Extremely perishable' },
  { ingredientName: 'Blueberries', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Waxy bloom protects them' },
  { ingredientName: 'Grapes', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Store unwashed on stem' },
  { ingredientName: 'Lemons', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Peel hardens at room temp' },
  { ingredientName: 'Limes', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Peel hardens at room temp' },
  { ingredientName: 'Oranges', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Tomatoes', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Fridge destroys flavor compounds' },
  { ingredientName: 'Cherry Tomatoes', shelfLifeDays: 7, defaultLocation: 'pantry', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Cucumber', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Plastic wrap prevents dehydration' },
  { ingredientName: 'Lettuce (Iceberg)', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Remove wilted outer leaves' },
  { ingredientName: 'Salad Leaves', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'High bacteria risk once opened' },
  { ingredientName: 'Mixed Salad', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'High bacteria risk once opened' },
  { ingredientName: 'Spinach', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Slimy leaves = discard' },
  { ingredientName: 'Baby Spinach', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Slimy leaves = discard' },
  { ingredientName: 'Kale', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Broccoli', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Wrap in damp towel' },
  { ingredientName: 'Cauliflower', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Carrots', shelfLifeDays: 28, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Remove green tops if present' },
  { ingredientName: 'Potatoes', shelfLifeDays: 60, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Light causes greening (toxins)' },
  { ingredientName: 'Sweet Potatoes', shelfLifeDays: 30, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Fridge causes hard core' },
  { ingredientName: 'Onions', shelfLifeDays: 60, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Keep away from potatoes' },
  { ingredientName: 'Red Onions', shelfLifeDays: 60, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Keep away from potatoes' },
  { ingredientName: 'Spring Onions', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Garlic', shelfLifeDays: 90, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Fridge causes sprouting' },
  { ingredientName: 'Ginger', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Mushrooms', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Plastic causes sliminess' },
  { ingredientName: 'Bell Peppers', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Green lasts longer than Red' },
  { ingredientName: 'Red Peppers', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Green Peppers', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Chilli Peppers', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Asparagus', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Store upright in water or damp towel' },
  { ingredientName: 'Courgette', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Zucchini', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Aubergine', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Eggplant', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Celery', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Wrap in foil' },
  { ingredientName: 'Leeks', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Cabbage', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Fresh Basil', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Fresh Produce', notes: 'Fridge turns leaves black' },
  { ingredientName: 'Fresh Coriander', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Treat like cut flowers' },
  { ingredientName: 'Fresh Parsley', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Treat like cut flowers' },
  { ingredientName: 'Fresh Mint', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Fresh Rosemary', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Woody herbs last longer' },
  { ingredientName: 'Fresh Thyme', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Pears', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Ripen at room temp first' },
  { ingredientName: 'Peaches', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Ripen at room temp first' },
  { ingredientName: 'Nectarines', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Plums', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Mangoes', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Ripen at room temp first' },
  { ingredientName: 'Pineapple', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Once cut' },
  { ingredientName: 'Watermelon', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Once cut' },
  { ingredientName: 'Melon', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce', notes: 'Once cut' },
  { ingredientName: 'Kiwi', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },
  { ingredientName: 'Pomegranate', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce', notes: null },

  // ============================================
  // DAIRY & EGGS
  // ============================================
  { ingredientName: 'Milk', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Door storage fluctuates temp too much' },
  { ingredientName: 'Whole Milk', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Semi-Skimmed Milk', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Skimmed Milk', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Oat Milk', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Separates; shake well' },
  { ingredientName: 'Almond Milk', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Separates; shake well' },
  { ingredientName: 'Soy Milk', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Coconut Milk', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened (carton)' },
  { ingredientName: 'Cheddar Cheese', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Wrap in wax paper; cut off mold' },
  { ingredientName: 'Mozzarella', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Fresh ball - liquid turns sour quickly' },
  { ingredientName: 'Parmesan', shelfLifeDays: 42, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Hard cheese lasts longer' },
  { ingredientName: 'Brie', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Do not eat rind if moldy' },
  { ingredientName: 'Camembert', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Feta Cheese', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Keep in brine' },
  { ingredientName: 'Cream Cheese', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Cottage Cheese', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Ricotta', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Yoghurt', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Acidic nature protects it slightly' },
  { ingredientName: 'Greek Yoghurt', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Natural Yoghurt', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Butter', shelfLifeDays: 30, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Absorbs fridge odors easily' },
  { ingredientName: 'Unsalted Butter', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Less shelf life than salted' },
  { ingredientName: 'Eggs', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Safe ambient but last longer in fridge' },
  { ingredientName: 'Free Range Eggs', shelfLifeDays: 21, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Double Cream', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Single Cream', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: 'Once opened' },
  { ingredientName: 'Whipping Cream', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Sour Cream', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Crème Fraîche', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },
  { ingredientName: 'Mascarpone', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs', notes: null },

  // ============================================
  // BAKERY
  // ============================================
  { ingredientName: 'Bread', shelfLifeDays: 4, defaultLocation: 'pantry', category: 'Bakery', notes: 'Fridge accelerates staling' },
  { ingredientName: 'White Bread', shelfLifeDays: 4, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Wholemeal Bread', shelfLifeDays: 4, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Sourdough Bread', shelfLifeDays: 2, defaultLocation: 'pantry', category: 'Bakery', notes: 'No preservatives; stales fast' },
  { ingredientName: 'Artisan Bread', shelfLifeDays: 2, defaultLocation: 'pantry', category: 'Bakery', notes: 'No preservatives' },
  { ingredientName: 'Bagels', shelfLifeDays: 4, defaultLocation: 'pantry', category: 'Bakery', notes: 'Denser crumb lasts longer' },
  { ingredientName: 'Tortilla Wraps', shelfLifeDays: 2, defaultLocation: 'pantry', category: 'Bakery', notes: 'Crack/dry out rapidly once opened' },
  { ingredientName: 'Crumpets', shelfLifeDays: 4, defaultLocation: 'pantry', category: 'Bakery', notes: 'High moisture; prone to mold' },
  { ingredientName: 'Pitta Bread', shelfLifeDays: 3, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Naan Bread', shelfLifeDays: 3, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Scones', shelfLifeDays: 2, defaultLocation: 'pantry', category: 'Bakery', notes: 'Best frozen if not eaten fresh' },
  { ingredientName: 'Croissants', shelfLifeDays: 2, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'English Muffins', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Hot Dog Buns', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Burger Buns', shelfLifeDays: 5, defaultLocation: 'pantry', category: 'Bakery', notes: null },
  { ingredientName: 'Breadcrumbs', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Bakery', notes: 'Dried' },

  // ============================================
  // CHILLED & DELI
  // ============================================
  { ingredientName: 'Cooked Ham', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Slimy texture = discard' },
  { ingredientName: 'Sliced Ham', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Salami', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Cured; lower water activity' },
  { ingredientName: 'Chorizo', shelfLifeDays: 10, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Cured' },
  { ingredientName: 'Pepperoni', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Prosciutto', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Hummus', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Bacteria grows despite lemon/garlic' },
  { ingredientName: 'Fresh Pasta', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Moisture causes mold' },
  { ingredientName: 'Filled Pasta', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Ravioli', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Fresh' },
  { ingredientName: 'Tortellini', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Fresh' },
  { ingredientName: 'Coleslaw', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Mayonnaise base spoils' },
  { ingredientName: 'Guacamole', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Oxidises brown instantly' },
  { ingredientName: 'Fresh Pizza', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Follow Use By strictly' },
  { ingredientName: 'Pesto', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Fresh, once opened' },
  { ingredientName: 'Taramasalata', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Tzatziki', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },
  { ingredientName: 'Olives', shelfLifeDays: 14, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'In brine' },
  { ingredientName: 'Tofu', shelfLifeDays: 5, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: 'Once opened, keep in water' },
  { ingredientName: 'Tempeh', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Chilled & Deli', notes: null },

  // ============================================
  // FROZEN
  // ============================================
  { ingredientName: 'Ice Cream', shelfLifeDays: 90, defaultLocation: 'freezer', category: 'Frozen', notes: 'Ice crystals ruin texture' },
  { ingredientName: 'Frozen Peas', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: 'Blanched before freezing; very stable' },
  { ingredientName: 'Frozen Vegetables', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Sweetcorn', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Chips', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Fries', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Fish Fingers', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Pizza', shelfLifeDays: 180, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Berries', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Spinach', shelfLifeDays: 365, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Prawns', shelfLifeDays: 180, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Chicken', shelfLifeDays: 270, defaultLocation: 'freezer', category: 'Frozen', notes: null },
  { ingredientName: 'Frozen Mince', shelfLifeDays: 120, defaultLocation: 'freezer', category: 'Frozen', notes: null },

  // ============================================
  // CUPBOARD STAPLES
  // ============================================
  { ingredientName: 'Pasta', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Indefinite if kept dry' },
  { ingredientName: 'Spaghetti', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Penne', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Fusilli', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Rice', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Indefinite' },
  { ingredientName: 'White Rice', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Indefinite' },
  { ingredientName: 'Brown Rice', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Oils in bran layer go rancid' },
  { ingredientName: 'Basmati Rice', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Risotto Rice', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Canned Tomatoes', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Acid corrodes can over years' },
  { ingredientName: 'Chopped Tomatoes', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Tomato Puree', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Unopened' },
  { ingredientName: 'Passata', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Canned Beans', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Bulging can = botulism' },
  { ingredientName: 'Baked Beans', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Chickpeas', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Canned' },
  { ingredientName: 'Kidney Beans', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Canned' },
  { ingredientName: 'Cannellini Beans', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Canned' },
  { ingredientName: 'Lentils', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Dried' },
  { ingredientName: 'Red Lentils', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Dried' },
  { ingredientName: 'Canned Tuna', shelfLifeDays: 1095, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Canned Salmon', shelfLifeDays: 1095, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Canned Sardines', shelfLifeDays: 1095, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Pasta Sauce', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Opened jar - mold grows on lid rim' },
  { ingredientName: 'Peanut Butter', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Oils separate; stir' },
  { ingredientName: 'Almond Butter', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Natural variety' },
  { ingredientName: 'Jam', shelfLifeDays: 90, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Opened - high sugar acts as preservative' },
  { ingredientName: 'Marmalade', shelfLifeDays: 90, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Opened' },
  { ingredientName: 'Honey', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Never spoils if pure' },
  { ingredientName: 'Golden Syrup', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Maple Syrup', shelfLifeDays: 365, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Once opened' },
  { ingredientName: 'Ketchup', shelfLifeDays: 180, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Acidic; stable' },
  { ingredientName: 'Mayonnaise', shelfLifeDays: 60, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Egg-based; keep cold' },
  { ingredientName: 'Mustard', shelfLifeDays: 365, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Soy Sauce', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'High salt content preserves' },
  { ingredientName: 'Worcestershire Sauce', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Hot Sauce', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Vinegar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Indefinite' },
  { ingredientName: 'Balsamic Vinegar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Stock Cubes', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Chicken Stock', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Fresh/opened carton' },
  { ingredientName: 'Vegetable Stock', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Cupboard Staples', notes: 'Fresh/opened carton' },
  { ingredientName: 'Coconut Milk (Canned)', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Unopened' },
  { ingredientName: 'Noodles', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Dried' },
  { ingredientName: 'Egg Noodles', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: 'Dried' },
  { ingredientName: 'Rice Noodles', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Couscous', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Quinoa', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },
  { ingredientName: 'Bulgur Wheat', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples', notes: null },

  // ============================================
  // BAKING & COOKING INGREDIENTS
  // ============================================
  { ingredientName: 'Plain Flour', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Watch for weevils' },
  { ingredientName: 'Self-Raising Flour', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Strong Bread Flour', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Wholemeal Flour', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Oils go rancid faster' },
  { ingredientName: 'Cornflour', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Sugar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Indefinite if dry' },
  { ingredientName: 'Caster Sugar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Brown Sugar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'May harden' },
  { ingredientName: 'Icing Sugar', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Olive Oil', shelfLifeDays: 540, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Light oxidizes it; keep dark' },
  { ingredientName: 'Extra Virgin Olive Oil', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Best within 6 months of opening' },
  { ingredientName: 'Vegetable Oil', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Smell for rancidity' },
  { ingredientName: 'Sunflower Oil', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Coconut Oil', shelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Sesame Oil', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Once opened' },
  { ingredientName: 'Salt', shelfLifeDays: 1825, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Indefinite' },
  { ingredientName: 'Black Pepper', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Loses potency but safe' },
  { ingredientName: 'Dried Herbs', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Lose potency but safe' },
  { ingredientName: 'Dried Spices', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Lose potency but safe' },
  { ingredientName: 'Paprika', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Cumin', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Coriander (Ground)', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Turmeric', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Cinnamon', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Mixed Spice', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Nutmeg', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Chilli Flakes', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Curry Powder', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Garam Masala', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Baking Powder', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Loses chemical lift' },
  { ingredientName: 'Bicarbonate of Soda', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Yeast (Dried)', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Check expiry' },
  { ingredientName: 'Vanilla Extract', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Cocoa Powder', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Chocolate Chips', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Desiccated Coconut', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: null },
  { ingredientName: 'Ground Almonds', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Baking & Cooking Ingredients', notes: 'Can go rancid' },

  // ============================================
  // BREAKFAST
  // ============================================
  { ingredientName: 'Cereal', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Breakfast', notes: 'Absorbs moisture; stales' },
  { ingredientName: 'Cornflakes', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },
  { ingredientName: 'Muesli', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },
  { ingredientName: 'Granola', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },
  { ingredientName: 'Porridge Oats', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Breakfast', notes: 'Very stable' },
  { ingredientName: 'Oats', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },
  { ingredientName: 'Weetabix', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },
  { ingredientName: 'Pancake Mix', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Breakfast', notes: null },

  // ============================================
  // DRINKS
  // ============================================
  { ingredientName: 'Orange Juice', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Drinks', notes: 'Fresh - ferments (fizzing) if old' },
  { ingredientName: 'Apple Juice', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Drinks', notes: 'Fresh, once opened' },
  { ingredientName: 'UHT Milk', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Drinks', notes: 'Treat as fresh once opened' },
  { ingredientName: 'Long Life Milk', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Drinks', notes: 'Once opened' },
  { ingredientName: 'Wine (Opened)', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Drinks', notes: 'Oxidises to vinegar' },
  { ingredientName: 'Coffee (Ground)', shelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Drinks', notes: 'Once opened, loses flavor' },
  { ingredientName: 'Coffee Beans', shelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Drinks', notes: 'Once opened' },
  { ingredientName: 'Tea Bags', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Drinks', notes: 'Lose flavor over time' },
  { ingredientName: 'Fruit Squash', shelfLifeDays: 30, defaultLocation: 'fridge', category: 'Drinks', notes: 'Once opened' },
  { ingredientName: 'Sparkling Water', shelfLifeDays: 7, defaultLocation: 'fridge', category: 'Drinks', notes: 'Goes flat once opened' },

  // ============================================
  // SNACKS & TREATS
  // ============================================
  { ingredientName: 'Crisps', shelfLifeDays: 60, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: 'Go soft/stale' },
  { ingredientName: 'Potato Chips', shelfLifeDays: 60, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Biscuits', shelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: 'Go soft' },
  { ingredientName: 'Digestives', shelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Cookies', shelfLifeDays: 14, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Chocolate', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: 'White bloom is safe (fat separation)' },
  { ingredientName: 'Chocolate Bar', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Nuts (Mixed)', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: 'Can go rancid' },
  { ingredientName: 'Almonds', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Cashews', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Walnuts', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Peanuts', shelfLifeDays: 90, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Dried Fruit', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Raisins', shelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Dates', shelfLifeDays: 180, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Popcorn', shelfLifeDays: 60, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: 'Kernels last longer' },
  { ingredientName: 'Crackers', shelfLifeDays: 60, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },
  { ingredientName: 'Rice Cakes', shelfLifeDays: 60, defaultLocation: 'cupboard', category: 'Snacks & Treats', notes: null },

  // ============================================
  // OTHER / LEFTOVERS
  // ============================================
  { ingredientName: 'Leftover Pizza', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Other', notes: null },
  { ingredientName: 'Leftover Rice', shelfLifeDays: 1, defaultLocation: 'fridge', category: 'Other', notes: 'Bacillus cereus risk; cool quickly' },
  { ingredientName: 'Leftover Chicken', shelfLifeDays: 2, defaultLocation: 'fridge', category: 'Other', notes: 'Cooked' },
  { ingredientName: 'Leftover Pasta', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Other', notes: 'Cooked' },
  { ingredientName: 'Leftover Soup', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Other', notes: null },
  { ingredientName: 'Leftover Curry', shelfLifeDays: 3, defaultLocation: 'fridge', category: 'Other', notes: null },
  { ingredientName: 'Leftover Stew', shelfLifeDays: 4, defaultLocation: 'fridge', category: 'Other', notes: null },
]

/**
 * Get all unique categories from seed data
 */
export function getSeedDataCategories(): string[] {
  const categories = new Set(SHELF_LIFE_SEED_DATA.map(item => item.category))
  return Array.from(categories).sort()
}

/**
 * Get seed data filtered by category
 */
export function getSeedDataByCategory(category: string): ShelfLifeSeedItem[] {
  return SHELF_LIFE_SEED_DATA.filter(item => item.category === category)
}

/**
 * Get count of items per category
 */
export function getSeedDataCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of SHELF_LIFE_SEED_DATA) {
    counts[item.category] = (counts[item.category] || 0) + 1
  }
  return counts
}
