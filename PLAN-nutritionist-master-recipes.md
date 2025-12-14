# Plan: Nutritionist + Master Recipes Integration

## Overview

Integrate the Nutritionist (Emilia) with the Master Recipes database so she can:
1. Suggest curated recipes from the master database before generating custom ones
2. Appear as a mini-popup on the Discover page for recipe advice

---

## Part 1: Master Recipes Integration in Main Nutritionist

### Current Behaviour
- Emilia can only CREATE recipes from scratch via Claude AI
- Each recipe goes through a validation/refinement loop (up to 3 iterations)
- No awareness of the 500+ curated master_recipes

### Proposed Behaviour
When user asks for recipe suggestions:
1. **First** - Search master_recipes for matching recipes
2. **If found** - Suggest top 3 matches with "Add to My Recipes" action
3. **If not found** - Fall back to creating a custom recipe (existing behaviour)

### New Action Type: `ADD_MASTER_RECIPE`

```typescript
interface AddMasterRecipeAction extends BaseAction {
  type: 'ADD_MASTER_RECIPE'
  data: {
    masterRecipeId: string
    name: string
    description: string
    sourceUrl: string
    sourceSite: string
    servings: number
    prepTimeMinutes: number | null
    cookTimeMinutes: number | null
    cuisineType: string | null
    mealCategory: string[]
    dietaryTags: string[]
    // Pre-calculated from master recipe
    caloriesPerServing: number | null
    proteinPerServing: number | null
    carbsPerServing: number | null
    fatPerServing: number | null
    fiberPerServing: number | null
  }
}
```

### Implementation Steps

#### Step 1.1: Add `searchMasterRecipes()` utility function
**File:** `lib/nutritionist/master-recipe-search.ts` (new)

```typescript
interface MasterRecipeSearchParams {
  cuisineType?: string
  mealCategory?: string[]  // 'breakfast', 'lunch', 'dinner', 'snack'
  dietaryTags?: string[]   // 'vegetarian', 'vegan', 'gluten-free'
  maxCalories?: number
  minProtein?: number
  maxCookTime?: number
  excludeAllergens?: string[]
  keywords?: string[]      // Search in name/ingredients
  limit?: number           // Default 5
}

async function searchMasterRecipes(params: MasterRecipeSearchParams): Promise<MasterRecipe[]>
```

#### Step 1.2: Update action types
**File:** `lib/nutritionist/types.ts`
- Add `ADD_MASTER_RECIPE` to `ActionType` union
- Add `AddMasterRecipeAction` interface
- Update `SuggestedAction` union type

#### Step 1.3: Update system prompt to include master recipe capability
**File:** `lib/nutritionist/prompts.ts`
- Add to Emilia's capabilities: "Search curated recipe database"
- Add instruction: "When suggesting recipes, prefer curated recipes from the database over creating new ones"
- Add `ADD_MASTER_RECIPE` action format to prompt

#### Step 1.4: Add master recipe context to chat
**File:** `app/api/nutritionist/chat/route.ts`
- Before calling Claude, search master_recipes based on conversation context
- Inject top 10 matching recipes into system prompt
- Claude can then suggest specific recipes by ID

#### Step 1.5: Handle `ADD_MASTER_RECIPE` action execution
**File:** `lib/nutritionist/actions.ts`
- Add handler using existing `addMasterRecipeToUserLibrary()` from `lib/scraping/import.ts`

#### Step 1.6: Update confirmation modal for master recipes
**File:** `app/nutritionist/page.tsx`
- Show recipe preview with source attribution
- "Add to My Recipes" button
- Link to original source

---

## Part 2: Mini Nutritionist on Discover Page

### Purpose
Allow users to ask Emilia for recipe advice while browsing the Discover page, limited to suggesting recipes from the master database only.

### UI Design

```
+------------------------------------------+
|  Discover Recipes                        |
|  [Filters] [Search...]                   |
|                                          |
|  +--------+ +--------+ +--------+        |
|  | Recipe | | Recipe | | Recipe |        |
|  | Card   | | Card   | | Card   |        |
|  +--------+ +--------+ +--------+        |
|                                          |
|                    +-------------------+ |
|                    | Ask Emilia    [x] | |
|                    |-------------------| |
|                    | "What high-protein| |
|                    | chicken recipes   | |
|                    | would you         | |
|                    | recommend?"       | |
|                    |                   | |
|                    | Emilia: "Based on | |
|                    | your goals, I'd   | |
|                    | suggest..."       | |
|                    |                   | |
|                    | [Recipe 1] [Add]  | |
|                    | [Recipe 2] [Add]  | |
|                    |                   | |
|                    | [Type message...] | |
|                    +-------------------+ |
+------------------------------------------+
```

### Behaviour
- Floating button in bottom-right corner: "Ask Emilia"
- Click opens a compact chat popup (not full page)
- **Limited scope**: Only searches master_recipes, no custom recipe creation
- Shows Emilia's profile pic and warm greeting
- User asks questions, Emilia suggests recipes from master DB
- Each suggestion has quick "Add to My Recipes" button
- Popup can be minimised/closed
- Does NOT persist conversation history (ephemeral)

### Implementation Steps

#### Step 2.1: Create new API endpoint for Discover-specific chat
**File:** `app/api/discover/assistant/route.ts` (new)

Different from main nutritionist:
- No conversation persistence
- System prompt focused ONLY on master recipe suggestions
- Cannot create custom recipes
- Cannot modify macros/preferences/inventory
- Only action: `ADD_MASTER_RECIPE`

```typescript
// POST /api/discover/assistant
{
  message: string
  profileId: string  // For dietary preferences/allergies
}

// Response
{
  response: string
  suggestedRecipes: Array<{
    masterRecipeId: string
    name: string
    description: string
    matchReason: string  // "Matches your high-protein goal"
    caloriesPerServing: number
    proteinPerServing: number
    // ... other fields
  }>
}
```

#### Step 2.2: Create mini chat component
**File:** `components/discover/DiscoverAssistant.tsx` (new)

Features:
- Floating action button (bottom-right)
- Expandable chat popup (400px wide, 500px tall)
- Emilia avatar + "Recipe Assistant" header
- Message list (simple, no persistence)
- Input field with send button
- Recipe suggestion cards with "Add" buttons
- Close/minimise controls

#### Step 2.3: Create Discover-specific system prompt
**File:** `lib/nutritionist/prompts.ts` (update)

Add `buildDiscoverAssistantPrompt()`:
```typescript
function buildDiscoverAssistantPrompt(profile: FamilyProfile): string {
  return `You are Emilia, a friendly nutrition guide helping ${profile.name} find recipes.

SCOPE: You can ONLY suggest recipes from the curated database. You cannot:
- Create custom recipes
- Modify user settings
- Discuss topics outside recipe selection

When suggesting recipes, consider:
- ${profile.name}'s dietary preferences: ${profile.dietaryPreferences}
- Allergies to avoid: ${profile.allergies}
- Macro goals: ${profile.dailyCalorieTarget} kcal, ${profile.dailyProteinTarget}g protein

Respond warmly and suggest 2-3 relevant recipes from the provided list.
`
}
```

#### Step 2.4: Integrate into Discover page
**File:** `app/discover/page.tsx` (update)
- Import and render `<DiscoverAssistant />` component
- Pass current profile context

#### Step 2.5: Add quick-add functionality
**File:** `components/discover/DiscoverAssistant.tsx`
- "Add to My Recipes" button on each suggestion
- Uses existing `/api/discover/recipes/add` endpoint
- Shows success toast notification
- Updates suggestion state to show "Added"

---

## Part 3: System Prompt Updates

### Main Nutritionist Prompt Changes

Add to capabilities section:
```
5. Recipe Database Search - Search our curated database of 500+ high-quality recipes
   - These recipes have validated nutrition data
   - Prefer suggesting these over creating new recipes when a good match exists
```

Add to action formats:
```
ADD_MASTER_RECIPE - Suggest a curated recipe from our database
{
  "type": "ADD_MASTER_RECIPE",
  "label": "Add [Recipe Name]",
  "data": {
    "masterRecipeId": "uuid",
    "name": "Recipe Name",
    "description": "...",
    ...nutrition fields...
  }
}
```

Add instruction:
```
When users ask for recipe suggestions:
1. FIRST check if any curated recipes match their requirements
2. If good matches exist, suggest those with ADD_MASTER_RECIPE actions
3. Only create custom recipes (CREATE_RECIPE) if no suitable matches found
4. You can suggest a mix of curated and custom recipes if appropriate
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `lib/nutritionist/master-recipe-search.ts` | Search utility for master_recipes |
| `app/api/discover/assistant/route.ts` | Discover-specific chat endpoint |
| `components/discover/DiscoverAssistant.tsx` | Mini chat popup component |

### Modified Files
| File | Changes |
|------|---------|
| `lib/nutritionist/types.ts` | Add `ADD_MASTER_RECIPE` action type |
| `lib/nutritionist/prompts.ts` | Update system prompt, add discover prompt |
| `lib/nutritionist/actions.ts` | Handle `ADD_MASTER_RECIPE` execution |
| `app/api/nutritionist/chat/route.ts` | Inject master recipe context |
| `app/nutritionist/page.tsx` | Update modal for master recipe preview |
| `app/discover/page.tsx` | Add `<DiscoverAssistant />` component |

---

## Data Flow

### Main Nutritionist with Master Recipes
```
User: "Suggest a high-protein chicken recipe"
        ↓
Server: Search master_recipes WHERE protein > 30 AND ingredients LIKE 'chicken'
        ↓
Server: Inject top 10 matches into Claude context
        ↓
Claude: "I found some great options! Here are my top picks..."
        ↓
Response includes ADD_MASTER_RECIPE actions for suggested recipes
        ↓
User clicks "Add Chicken Stir Fry"
        ↓
POST /api/nutritionist/apply-action {type: ADD_MASTER_RECIPE, masterRecipeId: '...'}
        ↓
Server: addMasterRecipeToUserLibrary(masterRecipeId, userId)
        ↓
Recipe copied to user's library
```

### Discover Assistant
```
User on /discover clicks "Ask Emilia"
        ↓
Popup opens with greeting
        ↓
User: "What's a quick weeknight dinner?"
        ↓
POST /api/discover/assistant {message, profileId}
        ↓
Server: Search master_recipes WHERE totalTime < 30 AND mealCategory = 'dinner'
        ↓
Server: Build discover-specific prompt with profile context
        ↓
Claude: Suggests 2-3 recipes with explanations
        ↓
Response includes recipe cards with "Add" buttons
        ↓
User clicks "Add" on a recipe
        ↓
POST /api/discover/recipes/add {masterRecipeId}
        ↓
Recipe added, button shows "Added ✓"
```

---

## Edge Cases & Constraints

1. **No matches found**: Fall back to helpful message, suggest broadening filters
2. **User has allergies**: Always exclude recipes with matching allergens
3. **Discover assistant scope**: Strictly limited - cannot create custom recipes
4. **Rate limiting**: Discover assistant is ephemeral, no conversation saved
5. **Recipe already in library**: Check before suggesting, show "Already in library"

---

## Testing Plan

### Unit Tests
- `searchMasterRecipes()` with various filter combinations
- `ADD_MASTER_RECIPE` action validation and execution
- Allergen exclusion logic

### Integration Tests
- Main nutritionist suggests master recipes when appropriate
- Falls back to custom recipes when no matches
- Discover assistant returns relevant suggestions
- Quick-add works from both interfaces

### Manual Testing
1. Ask Emilia for "high-protein recipes" - should suggest from master DB
2. Ask for obscure recipe - should fall back to custom creation
3. Use Discover assistant to find "vegetarian pasta" - should work
4. Try to ask Discover assistant to "create a recipe" - should decline
5. Add recipe from both interfaces - verify appears in My Recipes

---

## Questions for Approval

1. **Conversation persistence for Discover assistant?**
   - Proposed: No persistence (ephemeral)
   - Alternative: Light persistence per session only

2. **Maximum recipes to suggest at once?**
   - Proposed: 3 for main nutritionist, 2-3 for discover assistant
   - More could be overwhelming

3. **Should master recipe suggestions show source attribution?**
   - Proposed: Yes - "From BBC Good Food" with link
   - Helps users trust the source

4. **Fallback behaviour when no matches?**
   - Main nutritionist: Create custom recipe
   - Discover assistant: Suggest broadening search, link to full Discover page

---

## Implementation Order

1. **Phase 1**: Master recipe search utility + types (foundation)
2. **Phase 2**: Main nutritionist integration (highest value)
3. **Phase 3**: Discover assistant popup (nice-to-have)

Estimated scope: ~800-1000 lines of new/modified code
