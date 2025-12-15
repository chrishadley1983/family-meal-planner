# Claude Code Prompt: Recipe Detail Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the Recipe Detail page to align with the recent recipe card redesign. Key changes: smaller emoji-based hero image, card-based stats layout, Share button, and two-column ingredients/instructions layout.

**Reference Design:** See `new_features/recipe-detail-option-b.jsx` for the complete React component with all styling and layout.

---

## Current State

- Recipe detail page showing: large yellow SVG placeholder, stats in spreadsheet-style grid, ingredients with traffic light dots, Emilia's tips, instructions
- Actions: Edit, Duplicate, Star rating

---

## Required Changes

### 1. Header Actions Bar

Move actions above the hero card:

```
[dinner] [main course] [supper]                    [Share] [Edit] [Duplicate]
```

- Meal category tags on the left (purple pills)
- Action buttons on the right
- **Add Share button** (Share2 icon) - reuse existing share/export functionality from Shopping List

---

### 2. Hero Card - Horizontal Layout

Replace the large yellow placeholder with a card containing image + content:

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                                │
│ │              │  Tonkatsu pork                                 │
│ │     🥓       │  Rustle up a Japanese feast and try this...   │
│ │              │                                                │
│ │  [Japanese]  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│ │              │  │  👥 4  │ │ ⏱ 20m │ │ 🔥 6m  │ │ 26 min │  │
│ │              │  │Servings│ │  Prep  │ │  Cook  │ │ Total  │  │
│ └──────────────┘  └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                                 │
│                   ⭐⭐⭐☆☆ Your rating              [Medium]    │
└─────────────────────────────────────────────────────────────────┘
```

**Image section (left, 256px wide):**
- Gradient background based on main ingredient (same as recipe cards)
- Large emoji based on main ingredient
- Cuisine tag (top-left corner)
- Use same `getMainIngredient()`, colour mapping, and emoji mapping from recipe cards

**Content section (right):**
- Recipe name (h1)
- Description
- Stats grid: 4 cards with icons (Servings, Prep, Cook, Total)
  - Total card highlighted with purple styling
- Star rating (clickable) + Difficulty badge

---

### 3. Nutritional Analysis

Keep existing design but ensure consistent styling:

```
┌─────────────────────────────────────────────────────────────────┐
│ Nutritional Analysis                                  [Refresh] │
├─────────────────────────────────────────────────────────────────┤
│ 🟠 Overall Rating                                               │
│    This dish provides excellent protein (22% of daily target)...│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │   540   │ │   39g   │ │   45g   │ │   21g   │                │
│ │Calories │ │ Protein │ │  Carbs  │ │   Fat   │                │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│                                                                 │
│            1g Fiber    7g Sugar    539mg Sodium                 │
└─────────────────────────────────────────────────────────────────┘
```

- Macro cards with gradient backgrounds (orange/blue/amber/purple)
- Secondary nutrition in center-aligned text below

---

### 4. Emilia's Tips

Keep existing design:

```
┌─────────────────────────────────────────────────────────────────┐
│ 👩‍⚕️  Emilia's Nutritionist Tips                                 │
│                                                                 │
│ Hi Chris! This is a fantastic choice for your dinner...        │
└─────────────────────────────────────────────────────────────────┘
```

- Purple gradient background
- Avatar + title left-aligned
- Keep existing AI-generated content

---

### 5. Two-Column Layout: Ingredients & Instructions

```
┌─────────────────────┐  ┌───────────────────────────────────────┐
│ Ingredients         │  │ Instructions                          │
│ 8 items             │  │                                       │
├─────────────────────┤  │ ① Remove the large piece of fat...   │
│ 🟢 4 whole Thick... │  │                                       │
│ 🟠 100g Plain flour │  │ ② Put the flour, eggs and panko...   │
│ 🟢 2 whole Eggs     │  │                                       │
│ 🟠 100g Panko...    │  │ ③ In a large frying pan...           │
│ 🔴 1 to taste Veg...│  │                                       │
│ 🟠 2 tbsp Ketchup   │  │ ④ While the pork is resting...       │
│ ...                 │  │                                       │
└─────────────────────┘  ├───────────────────────────────────────┤
                         │ Notes                                  │
                         │ [Add your personal notes...]           │
                         └───────────────────────────────────────┘
```

**Ingredients (left column, 1/3 width):**
- Header with item count
- Traffic light dots (green/amber/red) - keep these, just remove the legend
- Sticky positioning on scroll
- **BUG FIX:** Remove duplicate text in brackets (e.g., don't show "(4 whole Thick boneless pork loin chops)" after the ingredient)

**Instructions (right column, 2/3 width):**
- Numbered steps with purple circle badges
- Notes section below instructions

---

### 6. Component Structure

```
components/
  recipes/
    RecipeDetailHeader.tsx      # Actions bar (categories + buttons)
    RecipeDetailHero.tsx        # Hero card with image + content
    RecipeDetailStats.tsx       # 4 stat cards
    RecipeNutrition.tsx         # Nutritional analysis (existing, restyle)
    RecipeEmiliaTips.tsx        # Emilia's tips (existing)
    RecipeIngredients.tsx       # Ingredients list with traffic lights
    RecipeInstructions.tsx      # Numbered instructions
    RecipeNotes.tsx             # Notes textarea
```

---

### 7. Data Requirements

```typescript
interface RecipeDetailData {
  id: string;
  name: string;
  description: string;
  
  // Timing
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  
  // Categorisation
  cuisine: string;
  difficulty: string;
  mealCategories: string[];
  
  // For emoji placeholder
  mainIngredient: string;  // Derived from ingredients
  
  // Nutrition
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  sugarPerServing: number;
  sodiumPerServing: number;
  
  // AI-generated
  overallNutritionRating: 'green' | 'amber' | 'red';
  overallNutritionText: string;
  emiliaTips: string;
  
  // Content
  ingredients: {
    quantity: string;
    unit: string;
    name: string;
    notes?: string;
    nutritionRating: 'green' | 'amber' | 'red';
  }[];
  
  instructions: string[];
  notes: string;
  
  // User data
  userRating: number;  // 0-5 stars
}
```

---

### 8. Styling Notes

- Container: `max-w-4xl mx-auto`
- Hero card: `bg-gray-900 rounded-2xl border border-gray-800`
- Hero image: `w-64` (256px), gradient based on ingredient
- Stats cards: `bg-gray-800/50 rounded-xl p-3`
- Total time card: `bg-purple-500/20 border border-purple-500/30`
- Macro cards: Gradient backgrounds with matching border colours
- Ingredients panel: `sticky top-6` for scroll behaviour
- Instructions: Purple numbered circles `bg-purple-500/20 text-purple-400`

---

### 9. Share Functionality

Add Share button that reuses existing share/export pattern from Shopping List:
- Export as PDF
- Share link
- Copy to clipboard

Implementation should follow existing patterns in the codebase.

---

### 10. Bug Fix: Duplicate Ingredient Text

Current bug: `4 whole Thick boneless pork loin chops (4 whole Thick boneless pork loin chops)`

Fix: Only display `{quantity} {unit} {name}` and optionally `({notes})` if notes exist and are different from the name.

```typescript
// Don't show this:
`${quantity} ${unit} ${name} (${quantity} ${unit} ${name})`

// Do show this:
`${quantity} ${unit} ${name}`
// Or if notes exist and are different:
`${quantity} ${unit} ${name} (${notes})`
```

---

## Implementation Steps

1. **Read existing code** - Review current recipe detail page
2. **Create/update components** - Hero, stats, ingredients, instructions
3. **Implement hero card** - Horizontal layout with emoji placeholder
4. **Update ingredients** - Remove legend, fix duplicate text bug
5. **Add two-column layout** - Sticky ingredients, instructions + notes
6. **Add Share button** - Reuse existing share functionality
7. **Test responsiveness** - Single column on mobile
8. **Run TypeScript check** - `npx tsc --noEmit`
9. **Manual test** - Verify all functionality works

---

## Acceptance Criteria

- [ ] Actions bar shows meal categories (left) and Share/Edit/Duplicate (right)
- [ ] Share button works (reuses existing share functionality)
- [ ] Hero card has horizontal layout (image left, content right)
- [ ] Hero image shows emoji + gradient based on main ingredient
- [ ] Cuisine tag shows on hero image
- [ ] Stats show in 4 card grid with icons
- [ ] Total time card has purple highlight
- [ ] Star rating is clickable
- [ ] Difficulty badge displays
- [ ] Nutritional analysis matches current styling
- [ ] Emilia's tips section unchanged
- [ ] Ingredients show in left column (1/3 width)
- [ ] Ingredients panel is sticky on scroll
- [ ] Traffic light dots show but NO legend
- [ ] Duplicate ingredient text bug is fixed
- [ ] Instructions show in right column (2/3 width) with numbered steps
- [ ] Notes section below instructions
- [ ] Mobile responsive (single column)
- [ ] TypeScript compiles without errors

---

## Reference

The complete React component with all styling is available at:
`new_features/recipe-detail-option-b.jsx`

Use this as the definitive reference for layout, spacing, colours, and content.
