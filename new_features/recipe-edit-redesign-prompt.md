# Claude Code Prompt: Recipe Edit Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the Recipe Edit page to align with the recent recipe view/card redesigns. Key changes: emoji-based hero preview with prominent image upload, sticky save bar at bottom, and consistent styling throughout.

**Reference Design:** See `new_features/recipe-edit-option-a.html` for the complete rendered design.

---

## Current State

- Recipe edit page with form fields for all recipe data
- Large yellow SVG placeholder at top
- Save/Undo/Cancel buttons in top-right only
- Ingredients table with preview column showing formatted text
- Emilia's interactive nutritionist tips with chat
- Instructions with add/remove functionality

---

## Required Changes

### 1. Top Navigation Bar

Sticky header with:
```
[← Back to Recipes]                              [Undo] [Save] [Cancel]
```

- "Back to Recipes" link on left (purple text)
- Action buttons on right
- Sticky positioning (`position: sticky; top: 0`)
- Semi-transparent background with border-bottom

---

### 2. Hero Section - Live Preview with Image Upload

Horizontal card layout with emoji preview and prominent upload:

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐                                                │
│ │              │  [Recipe Name Input - large, bold]             │
│ │     🥚       │                                                │
│ │              │  [Description textarea]                        │
│ │  [Mexican]   │                                                │
│ │              │  [🖼️ Choose Image]  Recommended: 800x600px    │
│ └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Left side (192px):**
- Show emoji placeholder based on main ingredient (derived from ingredients list)
- Gradient background matching ingredient type
- Cuisine tag overlay (top-left)
- On hover: show upload overlay with Upload icon + "Upload Image" text
- Use same `getMainIngredient()` and colour/emoji mappings from recipe cards

**Right side:**
- Recipe name as large input (transparent background, bold)
- Description as textarea
- **Prominent "Choose Image" button** (purple, with image icon)
- Helper text: "Recommended: 800x600px"

**Image Upload Behaviour:**
- If user has uploaded an image, show it instead of emoji
- Keep "Choose Image" button visible for changing image
- Hover overlay still works on uploaded images

---

### 3. Recipe Details Card

Keep existing fields but with consistent styling:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Servings: 1]     [Prep Time: 5 min]     [Cook Time: 10 min]   │
│ ☐ Scale ingredients                                            │
│                                                                 │
│ [Cuisine: Mexican ▼]              [Difficulty: Select... ▼]    │
│                                                                 │
│ Meal Categories                                                 │
│ [Breakfast] [Lunch] [Dinner] [Snack] [Dessert]                 │
└─────────────────────────────────────────────────────────────────┘
```

- 3-column grid for Servings/Prep/Cook
- 2-column grid for Cuisine/Difficulty
- Toggleable meal category pills (purple when active)

---

### 4. Ingredients Section - Keep Preview Column

```
┌─────────────────────────────────────────────────────────────────┐
│ Ingredients                                    [+ Add Ingredient]│
├─────────────────────────────────────────────────────────────────┤
│ Ingredient          Qty    Unit           Preview / Notes     X │
├─────────────────────────────────────────────────────────────────┤
│ 🟠 [Chipotle paste] [1]   [tsp ▼]        [1 tsp Chipotle...]  ✕ │
│ 🟢 [Egg           ] [1]   [whole ▼]      [1 whole Egg      ]  ✕ │
│ 🟢 [Cherry tomato ] [7]   [whole ▼]      [halved            ]  ✕ │
└─────────────────────────────────────────────────────────────────┘
```

**Column layout (grid-cols-12):**
- Ingredient name: col-span-4 (with traffic light dot)
- Quantity: col-span-1
- Unit dropdown: col-span-2
- Preview/Notes: col-span-4
- Delete button: col-span-1

**Traffic light dots:**
- Keep existing nutritional rating colours (green/amber/red)
- Dot positioned before ingredient name input

**Preview column:**
- Shows formatted output OR custom notes
- Editable - user can override with custom text like "halved" or "finely chopped"

---

### 5. Nutritional Analysis

Keep existing design - no changes needed:
- Overall rating with traffic light dot
- 4 macro cards (Calories, Protein, Carbs, Fat) with gradient backgrounds
- Secondary nutrition row (Fiber, Sugar, Sodium)
- Refresh button

---

### 6. Emilia's Nutritionist Tips

Keep existing interactive design:
- Avatar + title with "Interactive" badge
- AI-generated tips paragraph
- Quick action buttons ("What can I improve?", "How can I add more protein?", etc.)
- Chat input with Send button

**BUG FIX:** Currently the same response text is being duplicated - showing once in the initial tips area and again in a chat response below. Fix this so responses only appear once in the chat area, not duplicated.

---

### 7. Instructions Section

```
┌─────────────────────────────────────────────────────────────────┐
│ Instructions                                       [+ Add Step] │
├─────────────────────────────────────────────────────────────────┤
│ ① [Textarea for step 1...]                                   ✕ │
│ ② [Textarea for step 2...]                                   ✕ │
└─────────────────────────────────────────────────────────────────┘
```

- Purple numbered circles
- Expandable textareas
- Delete button on each step
- Add Step button in header

---

### 8. Notes Section

Simple textarea:
```
┌─────────────────────────────────────────────────────────────────┐
│ Notes                                                           │
│ [Add any notes about this recipe...]                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9. Sticky Bottom Save Bar

**NEW:** Add sticky footer with save actions (in addition to top bar):

```
┌─────────────────────────────────────────────────────────────────┐
│ Unsaved changes                        [Undo] [Cancel] [Save Recipe] │
└─────────────────────────────────────────────────────────────────┘
```

- Fixed to bottom of viewport
- Semi-transparent background with blur
- Shows "Unsaved changes" indicator when form is dirty
- Undo, Cancel, Save Recipe buttons
- `z-index: 20` to stay above content

---

## Styling Notes

- Container: `max-w-7xl mx-auto` (matches view page)
- Cards: `bg-gray-900 rounded-xl border border-gray-800`
- Inputs: `bg-gray-800 border border-gray-700 rounded-lg`
- Focus state: `focus:border-purple-500`
- Primary buttons: `bg-purple-500 hover:bg-purple-600`
- Delete buttons: `text-red-400 hover:text-red-300`
- Bottom bar: `bg-gray-900/95 backdrop-blur border-t border-gray-800`

---

## Component Structure

```
components/
  recipes/
    RecipeEditPage.tsx           # Main edit page
    RecipeEditHeader.tsx         # Sticky top nav
    RecipeEditHero.tsx           # Image preview + upload + title
    RecipeEditDetails.tsx        # Servings, times, cuisine, categories
    RecipeEditIngredients.tsx    # Ingredients table
    RecipeEditInstructions.tsx   # Instructions list
    RecipeEditNotes.tsx          # Notes textarea
    RecipeEditSaveBar.tsx        # Sticky bottom save bar
```

---

## Implementation Steps

1. **Read existing code** - Review current recipe edit page
2. **Update layout** - Add sticky header and footer
3. **Create hero section** - Emoji preview with image upload
4. **Update ingredients** - Ensure preview column works correctly
5. **Fix Emilia bug** - Remove duplicate response text
6. **Add sticky save bar** - Bottom fixed bar with actions
7. **Test form state** - Ensure unsaved changes indicator works
8. **Test responsiveness** - Single column on mobile
9. **Run TypeScript check** - `npx tsc --noEmit`
10. **Manual test** - Verify all edit functionality works

---

## Acceptance Criteria

- [ ] Sticky top nav with Back/Undo/Save/Cancel
- [ ] Hero shows emoji placeholder based on main ingredient
- [ ] Hero updates live as ingredients change
- [ ] "Choose Image" button is prominent (purple)
- [ ] Uploaded images display instead of emoji
- [ ] Recipe details form works correctly
- [ ] Ingredients table has 5 columns with preview/notes
- [ ] Traffic light dots show on ingredients
- [ ] Nutritional analysis displays correctly
- [ ] Emilia's tips section works (no duplicate bug)
- [ ] Instructions can be added/removed/edited
- [ ] Notes section works
- [ ] Sticky bottom save bar is always visible
- [ ] "Unsaved changes" indicator shows when form is dirty
- [ ] Save/Cancel/Undo all work correctly
- [ ] Container width is `max-w-7xl`
- [ ] Mobile responsive
- [ ] TypeScript compiles without errors

---

## Bug Fix Required

**Emilia Duplicate Response Bug:**
The same AI response text is appearing twice - once in the initial tips paragraph and again in the chat response area below. 

**Expected behaviour:** 
- Initial tips show in the main paragraph
- Chat responses only appear in the chat area when user asks a question
- No duplication

**To fix:** Check the component that renders Emilia's section and ensure chat responses are only rendered in the chat history, not duplicated in the initial tips area.

---

## Reference

The complete rendered HTML design is available at:
`new_features/recipe-edit-option-a.html`

Use this as the definitive reference for layout, spacing, colours, and content.
