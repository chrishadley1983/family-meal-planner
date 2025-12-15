# Claude Code Prompt: Discover Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Light-touch redesign of the Discover Recipes page to align with the My Recipes page styling. The main change is replacing the flask icon placeholders with the emoji/gradient placeholder system.

**Reference Design:** See `new_features/recipes-option-d-fixed.jsx` for the recipe card placeholder system to reuse.

---

## Current State

- Discover page with recipe cards showing flask icon placeholders
- Filter system (meal type, cuisine, source, dietary, allergens)
- Emilia chat assistant widget
- Preview modal with recipe details
- "In Library" badge for already-added recipes
- Pagination

---

## Required Changes

### 1. Recipe Card Placeholders - Use Emoji/Gradient System

Replace the gray flask icon with ingredient-based emoji placeholders:

**Current:**
```
┌─────────────────────────┐
│ ☐                       │
│        🧪               │  ← Gray flask icon
│      (flask)            │
│                         │
│ [BBC Good Food]         │
├─────────────────────────┤
│ Recipe Name             │
│ ...                     │
```

**New:**
```
┌─────────────────────────┐
│ ☐                       │
│        🥩               │  ← Emoji based on main ingredient
│   (gradient bg)         │  ← Colour based on ingredient type
│                         │
│ [BBC Good Food]         │
├─────────────────────────┤
│ Recipe Name             │
│ ...                     │
```

**Reuse the existing helper functions from My Recipes:**

```typescript
// Detect main ingredient from recipe data
function getMainIngredient(ingredients: string[] | null, title: string): string {
  const proteinKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'lamb', 'turkey', 'tuna'];
  const vegKeywords = ['tofu', 'tempeh', 'chickpea', 'lentil', 'bean', 'vegetable', 'veggie'];
  
  // Check ingredients first
  if (ingredients) {
    for (const ing of ingredients) {
      const lower = ing.toLowerCase();
      for (const keyword of proteinKeywords) {
        if (lower.includes(keyword)) return keyword;
      }
    }
    for (const ing of ingredients) {
      const lower = ing.toLowerCase();
      for (const keyword of vegKeywords) {
        if (lower.includes(keyword)) return 'vegetables';
      }
    }
  }
  
  // Fall back to title
  const titleLower = title.toLowerCase();
  for (const keyword of proteinKeywords) {
    if (titleLower.includes(keyword)) return keyword;
  }
  for (const keyword of vegKeywords) {
    if (titleLower.includes(keyword)) return 'vegetables';
  }
  
  return 'default';
}

// Get gradient colours
function getPlaceholderGradient(ingredient: string): string {
  const gradients: Record<string, string> = {
    beef: 'from-red-500/80 to-orange-600/80',
    chicken: 'from-amber-400/80 to-yellow-500/80',
    turkey: 'from-amber-400/80 to-yellow-500/80',
    pork: 'from-pink-500/80 to-rose-600/80',
    lamb: 'from-red-400/80 to-pink-600/80',
    fish: 'from-blue-400/80 to-cyan-500/80',
    salmon: 'from-orange-400/80 to-pink-500/80',
    tuna: 'from-blue-500/80 to-indigo-600/80',
    shrimp: 'from-orange-300/80 to-red-400/80',
    vegetables: 'from-emerald-500/80 to-teal-600/80',
    default: 'from-purple-500/80 to-pink-600/80',
  };
  return gradients[ingredient] || gradients.default;
}

// Get emoji
function getPlaceholderEmoji(ingredient: string): string {
  const emojis: Record<string, string> = {
    beef: '🥩',
    chicken: '🍗',
    turkey: '🦃',
    pork: '🥓',
    lamb: '🍖',
    fish: '🐟',
    salmon: '🐟',
    tuna: '🐟',
    shrimp: '🦐',
    vegetables: '🥗',
    default: '🍽️',
  };
  return emojis[ingredient] || emojis.default;
}
```

---

### 2. Preview Modal Placeholder

Also update the preview modal to use the same system:

**Current:** Large gray flask icon at top of modal

**New:** Emoji + gradient placeholder (same as cards but larger)

---

### 3. "Add Selected" Button

Update to use gradient styling:

**Current:** `bg-purple-500` or outline style

**New:** `bg-gradient-to-r from-orange-500 to-purple-500`

---

### 4. Dietary Tags - Consistent Styling

Ensure dietary/allergen tags use consistent pill styling:

| Tag Type | Styling |
|----------|---------|
| vegetarian | `bg-emerald-500/20 text-emerald-500` |
| vegan | `bg-emerald-500/20 text-emerald-500` |
| dairy-free | `bg-blue-500/20 text-blue-500` |
| gluten-free | `bg-amber-500/20 text-amber-500` |
| nut-free | `bg-orange-500/20 text-orange-500` |

---

## Component Updates

Files likely to be modified:
```
components/
  discover/
    DiscoverPage.tsx           # Main page
    DiscoverRecipeCard.tsx     # Recipe cards (add placeholder system)
    RecipePreviewModal.tsx     # Preview modal (update placeholder)
```

May need to import/share helper functions from:
```
components/
  recipes/
    RecipePlaceholder.tsx      # Or create shared utility
```

---

## Implementation Steps

1. **Read existing code** - Review current discover components
2. **Create/import placeholder helpers** - Share with My Recipes or duplicate
3. **Update recipe cards** - Replace flask with emoji/gradient
4. **Update preview modal** - Same placeholder system
5. **Update "Add Selected" button** - Gradient styling
6. **Verify tag styling** - Consistent pill colours
7. **Run TypeScript check** - `npx tsc --noEmit`
8. **Manual test** - Browse recipes, check placeholders, preview modal

---

## Acceptance Criteria

- [ ] Recipe cards show emoji + gradient placeholders (not flask icon)
- [ ] Placeholder emoji matches main ingredient in recipe
- [ ] Placeholder gradient colour matches ingredient type
- [ ] Preview modal shows emoji placeholder (not flask)
- [ ] "Add Selected" button has orange→purple gradient
- [ ] Dietary tags use consistent pill styling
- [ ] All existing functionality still works
- [ ] TypeScript compiles without errors

---

## Data Considerations

The Discover recipes come from an external source and may have different data structure. Ensure the `getMainIngredient` function handles:

- `ingredients` may be an array of strings or null
- Fall back to parsing the recipe `title` if no ingredients
- Default to generic placeholder if no match found

---

## Reference

For the placeholder system implementation, see:
- `new_features/recipes-option-d-fixed.jsx` - Recipe card with placeholder
- `new_features/recipes-redesign-prompt.md` - Detailed placeholder specs

The Discover cards should look visually consistent with My Recipes cards.
