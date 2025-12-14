# Claude Code Prompt: Recipes Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the Recipes page to improve visual appeal, add macro information, and implement smart placeholder images based on main ingredient. This is primarily a UI refactor with minor data additions.

**Reference Design:** See `new_features/recipes-option-d-fixed.jsx` for the complete React component with all styling and layout.

---

## Current State

- Recipes page at `/app/recipes/page.tsx` (or similar)
- Cards showing: name, description, meal type, servings, time, ingredients count, "Used X times"
- SVG placeholder images with gradient backgrounds
- 3-column grid layout
- Advanced filters panel (collapsible)

---

## Required Changes

### 1. Page Header

**Before:**
```
Recipes                                    [Download Template] [Import CSV] [Add Recipe]
Manage your family recipes
```

**After:**
```
My Recipes                                              [Import] [✨ Add Recipe]
47 delicious meals to choose from
```

- Change title to "My Recipes"
- Dynamic count in subtitle: "X delicious meals to choose from"
- Combine Download Template + Import CSV into single "Import" button
- "Add Recipe" button: gradient orange→purple with Sparkles icon

---

### 2. Search & Filters

**Simplified search bar:**
```
[🔍 Search by name, ingredient, or cuisine...  |  All Types ▼  |  All Cuisines ▼  |  🎛️]
```

- Single row with integrated dropdowns
- Cleaner appearance: `bg-gray-900/50` background, no visible borders on inputs
- Filter icon button opens advanced filters modal/panel

**Quick filter chips (always visible):**
```
[⚡ Under 30 min]  [📈 High protein]  [❤️ Most used]  [🌿 Vegetarian]
```

- Toggle on/off (purple highlight when active)
- These filter the recipe list instantly

**Advanced filters:** Keep existing (Calories, Protein, Prep Time, Difficulty, Contains Ingredient, Dietary Preferences) but move to a collapsible panel or modal triggered by the filter icon.

---

### 3. Discover Banner

Add a prominent banner linking to the Discover page:

```
[✨ icon]  Discover New Recipes                                    [Find recipes →]
          Emilia can recommend meals based on your family's preferences and goals
```

- Gradient background: `from-orange-600/20 via-purple-600/20 to-pink-600/20`
- Positioned between filters and recipe grid
- Links to `/discover`

---

### 4. Recipe Cards - New Layout

**Layout:** 2 cards per row (`md:grid-cols-2`), horizontal cards with image on left

**Card structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                │
│ │  🥩      │  Recipe Name                          [Dinner] │
│ │          │  Description text goes here and can wrap...    │
│ │ [Asian]  │                                                │
│ │          │  ⏱ 30 min  👥 4 servings  👨‍🍳 12 ing           │
│ │   ⭐     │                                                │
│ └──────────┘  ████ ███ ██ █  (macro bar)                   │
│               420 kcal  32g P  38g C  18g F    Used 3 times │
│                                                             │
│               [      View / Edit      ]  [ Delete ]         │
└─────────────────────────────────────────────────────────────┘
```

**Image/Placeholder Section (left, 176px wide):**
- Gradient background based on main ingredient colour
- Large emoji based on main ingredient (🥩 beef, 🍗 chicken, 🐟 fish, 🥗 vegetables, etc.)
- Cuisine tag (top-left): "Asian", "Mexican", "Italian", etc.
- Favourite star (top-right): Show if recipe used 3+ times
- Dot pattern overlay for texture

**Content Section (right):**
- Recipe name (line-clamp-2) with meal type badge
- Description (line-clamp-2)
- Stats row: time, servings, ingredient count
- Macro bar: visual coloured segments (orange=kcal, blue=protein, amber=carbs, purple=fat)
- Macro labels: "420 kcal  32g P  38g C  18g F"
- Used count: "Used X times" or "Not used yet"
- Action buttons: "View / Edit" (primary) + "Delete" (red, subtle)

---

### 5. Data Requirements

**New/derived fields needed per recipe:**

```typescript
interface RecipeCardData {
  // Existing
  id: string;
  name: string;
  description: string;
  mealType: string;
  cuisine: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  ingredientCount: number;
  usedCount: number;
  
  // Nutrition (may already exist)
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  
  // New - for smart placeholders
  mainIngredient: string;      // Derived from first protein/main ingredient
  accentColor: string;         // Derived from mainIngredient
}
```

**Main ingredient detection logic:**
```typescript
function getMainIngredient(ingredients: Ingredient[]): string {
  // Priority order: look for proteins first, then main components
  const proteinKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'lamb', 'turkey'];
  const vegKeywords = ['tofu', 'tempeh', 'chickpea', 'lentil', 'bean'];
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase();
    for (const protein of proteinKeywords) {
      if (name.includes(protein)) return protein;
    }
  }
  
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase();
    for (const veg of vegKeywords) {
      if (name.includes(veg)) return 'vegetables';
    }
  }
  
  return 'default';
}
```

**Colour mapping:**
```typescript
const ingredientColors = {
  beef: 'from-red-500/80 to-orange-600/80',
  chicken: 'from-amber-500/80 to-yellow-600/80',
  pork: 'from-pink-500/80 to-rose-600/80',
  fish: 'from-blue-500/80 to-cyan-600/80',
  salmon: 'from-orange-400/80 to-pink-500/80',
  shrimp: 'from-red-400/80 to-orange-500/80',
  prawn: 'from-red-400/80 to-orange-500/80',
  lamb: 'from-red-600/80 to-rose-700/80',
  turkey: 'from-amber-600/80 to-orange-600/80',
  vegetables: 'from-emerald-500/80 to-teal-600/80',
  default: 'from-purple-500/80 to-pink-600/80',
};
```

**Emoji mapping:**
```typescript
const ingredientEmojis = {
  beef: '🥩',
  chicken: '🍗',
  pork: '🥓',
  fish: '🐟',
  salmon: '🐟',
  shrimp: '🦐',
  prawn: '🦐',
  lamb: '🍖',
  turkey: '🦃',
  vegetables: '🥗',
  pasta: '🍝',
  rice: '🍚',
  default: '🍽️',
};
```

---

### 6. Component Structure

```
components/
  recipes/
    RecipesHeader.tsx           # Title, count, Import/Add buttons
    RecipeSearchBar.tsx         # Search + dropdowns + filter button
    RecipeQuickFilters.tsx      # Quick filter chips
    RecipeDiscoverBanner.tsx    # Discover CTA banner
    RecipeCard.tsx              # Individual recipe card (horizontal)
    RecipePlaceholder.tsx       # Emoji + gradient placeholder component
    RecipeMacroBar.tsx          # Visual macro bar component
    RecipeGrid.tsx              # Grid container
```

---

### 7. Styling Notes

- Container: `max-w-7xl mx-auto`
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-5`
- Cards: `bg-gray-900 rounded-2xl border border-gray-800`
- Image section: `min-width: 176px, min-height: 176px`
- Use existing dark theme colours
- Hover states: `hover:border-gray-700 hover:shadow-xl`
- Quick filter active state: `bg-purple-500 text-white shadow-lg shadow-purple-500/25`

---

### 8. Filter Logic

**Quick filters should filter recipes:**
- "Under 30 min": `prepTimeMinutes + cookTimeMinutes <= 30`
- "High protein": `proteinPerServing >= 30`
- "Most used": `usedCount >= 3`
- "Vegetarian": Check `dietaryTags` includes 'vegetarian' OR no meat ingredients

Quick filters are toggleable and can be combined (AND logic).

---

## Implementation Steps

1. **Read existing code** - Review current recipes page and components
2. **Update data fetching** - Ensure nutrition data is included in recipe queries
3. **Add helper functions** - Main ingredient detection, colour/emoji mapping
4. **Create new components** - RecipePlaceholder, RecipeMacroBar, etc.
5. **Update RecipeCard** - New horizontal layout with all elements
6. **Update page layout** - New header, search bar, quick filters, discover banner
7. **Implement filtering** - Quick filter logic
8. **Test responsiveness** - Verify 1 column on mobile, 2 on md+
9. **Run TypeScript check** - `npx tsc --noEmit`
10. **Manual test** - Verify all functionality works

---

## Acceptance Criteria

- [ ] Page title shows "My Recipes" with dynamic recipe count
- [ ] "Add Recipe" button has gradient + sparkles icon
- [ ] Search bar is single row with integrated dropdowns
- [ ] Quick filter chips are visible and toggleable
- [ ] Discover banner links to `/discover` and mentions Emilia
- [ ] Recipe cards show 2 per row on desktop (md+)
- [ ] Recipe cards are horizontal (image left, content right)
- [ ] Placeholder shows emoji based on main ingredient
- [ ] Placeholder gradient colour matches ingredient type
- [ ] Cuisine tag shows on placeholder
- [ ] Star badge shows on recipes used 3+ times
- [ ] Macro bar displays visually with colour segments
- [ ] Macro values shown below bar (kcal, P, C, F)
- [ ] "Used X times" or "Not used yet" displays
- [ ] View/Edit and Delete buttons work
- [ ] Quick filters actually filter the recipe list
- [ ] Mobile responsive (1 column, card stacks vertically)
- [ ] TypeScript compiles without errors

---

## Reference

The complete React component with all styling is available at:
`new_features/recipes-option-d-fixed.jsx`

Use this as the definitive reference for layout, spacing, colours, and content. Adapt to your existing component patterns and data fetching approach.
