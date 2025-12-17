# AI Summary Component - Feature Specification

## Overview

Replace the current prose-based meal plan summary with a structured, expandable component that displays AI-generated insights in an organised, scannable format.

**Design Reference:** See `docs/features/familyfuel-ai-summary-design.html` for visual mockups.

---

## Current State

- Meal plan generation returns a single prose paragraph as `summary`
- Displayed as a purple-bordered text block
- Hard to scan, all information buried in one paragraph
- No visual hierarchy or progressive disclosure

## Target State

- AI returns structured JSON with categorised information
- Frontend displays expandable accordion sections
- Key metrics (macros) always visible
- Details available on demand without overwhelming the user

---

## TypeScript Types

Create `lib/types/meal-plan-summary.ts`:

```typescript
export interface MacroStatus {
  value: number;
  target: number;
  status: 'on_target' | 'under' | 'over';
}

export interface MealPlanMacros {
  calories: MacroStatus;
  protein: MacroStatus;
  carbs: MacroStatus;
  fat: MacroStatus;
}

export interface CuisineCount {
  name: string;
  emoji: string;
  count: number;
}

export interface BatchCookingItem {
  prepDay: string;
  recipe: string;
  coversDay: string;
  coversMeal: string;
}

export interface ShoppingEfficiency {
  efficiency: 'low' | 'moderate' | 'high';
  usesExpiring: string[];
  sharedIngredients: { name: string; count: number }[];
}

export interface ProTip {
  icon: string;
  title: string;
  description: string;
  when: string;
}

export interface DietaryCompliance {
  profile: string;
  initial: string;
  note: string;
  compliant: boolean;
}

export interface MealPlanSummary {
  success: boolean;
  headline: string;
  summary: string;
  macros: MealPlanMacros;
  cuisines: CuisineCount[];
  batchCooking: BatchCookingItem[];
  shopping: ShoppingEfficiency;
  tips: ProTip[];
  dietary: DietaryCompliance[];
}
```

---

## AI Prompt Instructions

Add to the meal plan generation prompt (append after meal plan generation instructions):

```
## Summary Response Format

After generating the meal plan, provide a structured summary as JSON. This summary will be displayed to the user in an expandable UI component.

Return the summary in this exact structure:

{
  "success": true,
  "headline": "Your meal plan is ready!",
  "summary": "Brief 1-2 sentence highlight of the plan's key achievement",
  
  "macros": {
    "calories": { "value": 2045, "target": 2100, "status": "on_target" },
    "protein": { "value": 176, "target": 180, "status": "on_target" },
    "carbs": { "value": 206, "target": 220, "status": "on_target" },
    "fat": { "value": 68, "target": 70, "status": "on_target" }
  },
  
  "cuisines": [
    { "name": "Italian", "emoji": "🍝", "count": 3 },
    { "name": "Mexican", "emoji": "🌮", "count": 3 },
    { "name": "Thai", "emoji": "🍜", "count": 2 }
  ],
  
  "batchCooking": [
    { 
      "prepDay": "Sunday", 
      "recipe": "Chicken Enchiladas", 
      "coversDay": "Wednesday", 
      "coversMeal": "Dinner" 
    }
  ],
  
  "shopping": {
    "efficiency": "moderate",
    "usesExpiring": ["4L milk", "Spinach"],
    "sharedIngredients": [
      { "name": "Chicken thighs", "count": 3 },
      { "name": "Garlic", "count": 5 },
      { "name": "Onions", "count": 4 }
    ]
  },
  
  "tips": [
    {
      "icon": "🍗",
      "title": "Marinate ahead",
      "description": "Marinate the chicken thighs for Sunday's souvlaki on Friday evening for maximum tenderness.",
      "when": "Friday evening"
    },
    {
      "icon": "🥘",
      "title": "Prep sauces in batch",
      "description": "Prep all curry pastes and sauces Thursday evening so Friday's quick turnaround is painless.",
      "when": "Thursday evening"
    }
  ],
  
  "dietary": [
    { 
      "profile": "Chris", 
      "initial": "C",
      "note": "Regular pasta portions, high protein targets met", 
      "compliant": true 
    },
    { 
      "profile": "Max", 
      "initial": "M",
      "note": "Kid-friendly portions, no spicy dishes assigned", 
      "compliant": true 
    }
  ]
}

### Field Guidelines

**macros.status calculation:**
- "on_target": value is within ±10% of target
- "under": value is more than 10% below target  
- "over": value is more than 10% above target

**cuisines:**
- Count distinct cuisine types across all meals
- Use appropriate food emoji for each cuisine
- Common mappings: Italian 🍝, Mexican 🌮, Thai 🍜, Asian 🥢, Greek 🥙, Indian 🍛, British 🥧, Japanese 🍱, Chinese 🥡, American 🍔, French 🥐, Mediterranean 🫒

**batchCooking:**
- Only include genuine cook-once-eat-twice opportunities
- If no batch cooking opportunities exist, return empty array []

**shopping.efficiency:**
- "high": >70% ingredient overlap across meals
- "moderate": 40-70% ingredient overlap
- "low": <40% ingredient overlap

**shopping.sharedIngredients:**
- List top 5 ingredients that appear in multiple meals
- Count is the number of meals using that ingredient

**tips:**
- Provide 2-4 actionable prep suggestions
- Each tip must have specific timing (day + time of day)
- Focus on time-saving and quality-improving actions

**dietary:**
- One entry per family member
- Confirm their specific dietary preferences/restrictions were respected
- Initial is first letter of name for avatar display
```

---

## Component Architecture

### File Structure

```
src/
├── components/
│   └── meal-plans/
│       ├── AISummary/
│       │   ├── index.tsx              # Main component & exports
│       │   ├── AISummaryHeader.tsx    # Avatar, headline, summary text
│       │   ├── MacroBarsGrid.tsx      # 4-column macro display
│       │   ├── MacroBar.tsx           # Individual macro bar
│       │   ├── ExpandableSection.tsx  # Accordion section wrapper
│       │   ├── CuisineGrid.tsx        # Cuisine tags
│       │   ├── BatchCookingCards.tsx  # Batch cooking items
│       │   ├── ShoppingEfficiency.tsx # Shopping section
│       │   ├── TipsList.tsx           # Pro tips
│       │   ├── DietaryCompliance.tsx  # Family compliance
│       │   └── AISummary.module.css   # Component styles (if using CSS modules)
│       │
│       └── (existing meal plan components)
│
└── lib/
    └── types/
        └── meal-plan-summary.ts       # TypeScript types
```

### Component Hierarchy

```
<AISummary summary={MealPlanSummary}>
  <AISummaryHeader>
    <AIAvatar />
    <HeadlineText />
    <SummaryText />
  </AISummaryHeader>
  
  <MacroBarsGrid>
    <MacroBar macro="calories" color="orange" />
    <MacroBar macro="protein" color="blue" />
    <MacroBar macro="carbs" color="amber" />
    <MacroBar macro="fat" color="purple" />
  </MacroBarsGrid>
  
  <ExpandableSections>
    <ExpandableSection icon="🍽️" title="Cuisine Variety">
      <CuisineGrid cuisines={[]} />
    </ExpandableSection>
    
    <ExpandableSection icon="🍳" title="Batch Cooking">
      <BatchCookingCards items={[]} />
    </ExpandableSection>
    
    <ExpandableSection icon="🛒" title="Shopping Efficiency">
      <ShoppingEfficiency data={} />
    </ExpandableSection>
    
    <ExpandableSection icon="💡" title="Pro Tips">
      <TipsList tips={[]} />
    </ExpandableSection>
    
    <ExpandableSection icon="👨‍👩‍👧" title="Dietary Compliance">
      <DietaryCompliance items={[]} />
    </ExpandableSection>
  </ExpandableSections>
</AISummary>
```

---

## Styling Specifications

### Color Palette (from existing theme)

```css
/* Backgrounds */
--bg-dark: #0f172a;      /* slate-900 */
--bg-card: #1e293b;      /* slate-800 */
--bg-elevated: #334155;  /* slate-700 */

/* Text */
--text-primary: #f8fafc;   /* slate-50 */
--text-secondary: #94a3b8; /* slate-400 */
--text-muted: #64748b;     /* slate-500 */

/* Accents */
--accent-orange: #f97316;  /* orange-500 */
--accent-amber: #f59e0b;   /* amber-500 */
--accent-blue: #3b82f6;    /* blue-500 */
--accent-purple: #a855f7;  /* purple-500 */
--accent-green: #22c55e;   /* green-500 */
--accent-pink: #ec4899;    /* pink-500 */

/* Borders */
--border-color: #475569;   /* slate-600 */
--border-light: #334155;   /* slate-700 */
```

### Component Styles

**Main Container:**
```css
.ai-summary {
  background: var(--bg-card);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
}
```

**Header Section:**
```css
.ai-summary-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.05));
}
```

**AI Avatar:**
```css
.ai-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
```

**Macro Bars Grid:**
```css
.macro-bars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

/* Responsive: 2 columns on mobile */
@media (max-width: 640px) {
  .macro-bars {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Macro Bar Colors:**
- Calories: `var(--accent-orange)` with gradient `linear-gradient(135deg, #f97316, #f59e0b)`
- Protein: `var(--accent-blue)` solid
- Carbs: `var(--accent-amber)` solid
- Fat: `var(--accent-purple)` solid

**Expandable Section Header:**
```css
.expandable-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.expandable-header:hover {
  background: rgba(51, 65, 85, 0.5);
}
```

**Section Icon Backgrounds:**
```css
.section-icon.cuisine  { background: rgba(249, 115, 22, 0.15); }  /* orange */
.section-icon.batch    { background: rgba(59, 130, 246, 0.15); }  /* blue */
.section-icon.shopping { background: rgba(34, 197, 94, 0.15); }   /* green */
.section-icon.tips     { background: rgba(168, 85, 247, 0.15); }  /* purple */
.section-icon.dietary  { background: rgba(236, 72, 153, 0.15); }  /* pink */
```

**Arrow Rotation:**
```css
.section-arrow {
  transition: transform 0.2s;
}

.expandable-section.open .section-arrow {
  transform: rotate(180deg);
}
```

---

## Interaction Behavior

### Accordion Behavior
- All sections start **collapsed** by default
- Click section header to toggle open/close
- **Allow multiple sections open** simultaneously (not strict single-open accordion)
- Arrow icon rotates 180° when section is open
- Smooth height transition for content reveal

### Conditional Rendering
- Hide sections with no data:
  - `batchCooking`: Hide if array is empty
  - `shopping.usesExpiring`: Don't show "uses expiring" line if empty
  - `shopping.sharedIngredients`: Don't show if empty
- Always show: Cuisines, Tips, Dietary (these should always have data)

### Error Handling
- If AI returns malformed JSON, fall back to displaying raw summary text
- Show a simple card with the prose paragraph (backward compatible)
- Log parsing errors for debugging

---

## Section Content Details

### 1. Cuisine Variety
**Preview text:** `"{count} cuisines across meals — no meal fatigue"`

**Content:** Grid of tags showing each cuisine with emoji and count
```
[🍝 Italian ×3] [🌮 Mexican ×3] [🍜 Thai ×2] [🥢 Asian ×2]
```

### 2. Batch Cooking
**Preview text:** `"{count} meals prep ahead for later in the week"`

**Content:** Cards showing the prep → covers relationship
```
┌─────────────────────────────────────────────────────┐
│ [SUN] Chicken Enchiladas    →    [WED] Dinner      │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ [TUE] Chicken & Chorizo Ragu →   [FRI] Dinner      │
└─────────────────────────────────────────────────────┘
```
- Prep day badge: Blue background
- Covers day badge: Green background

### 3. Shopping Efficiency
**Preview text:** `"{efficiency} ingredient overlap — {descriptor} shopping list"`

**Content:** 
- Efficiency statement with icon
- Expiring inventory used (if any)
- Shared ingredients tags
```
📦 Moderate shopping list — good ingredient overlap
🥛 Uses expiring: 4L milk, Spinach
🔄 Shared: [Chicken ×3] [Garlic ×5] [Onions ×4]
```

### 4. Pro Tips
**Preview text:** `"{count} prep suggestions for the week"`

**Content:** Tip cards with icon, title, description, timing
```
┌──────────────────────────────────────────────────────┐
│ 🍗  Marinate ahead                                   │
│     Marinate chicken thighs Friday evening for       │
│     maximum tenderness.                              │
│     [📅 Friday evening]                              │
└──────────────────────────────────────────────────────┘
```
- Purple left border on tip cards
- "When" shown as small amber badge

### 5. Dietary Compliance
**Preview text:** `"All family preferences respected"`

**Content:** Per-person compliance confirmation
```
┌──────────────────────────────────────────────────────┐
│ [C] Chris: Regular pasta portions, high protein ✓    │
│ [M] Max: Kid-friendly portions, no spicy dishes ✓    │
│ [E] Emmie: Kid-friendly portions, familiar foods ✓   │
│ ⚠️  No cooldown violations — proteins spaced 2+ days ✓│
└──────────────────────────────────────────────────────┘
```
- Avatar circle with initial
- Green checkmark for compliant items

---

## Integration Points

### 1. Meal Plan Generation Response

Update the response parsing in the meal plan generation flow:

```typescript
// After receiving AI response
const { mealPlan, summaryJson } = parseAIResponse(response);

// Validate summary structure
const summary = validateMealPlanSummary(summaryJson);

// Store in state
setMealPlanSummary(summary);
```

### 2. Meal Plan Page

Replace current summary display:

```tsx
// Before
<div className="summary-box">
  <p>{summary}</p>
</div>

// After
{mealPlanSummary && (
  <AISummary summary={mealPlanSummary} />
)}
```

### 3. Zod Validation Schema

Create validation to ensure type safety:

```typescript
import { z } from 'zod';

const MacroStatusSchema = z.object({
  value: z.number(),
  target: z.number(),
  status: z.enum(['on_target', 'under', 'over']),
});

const MealPlanSummarySchema = z.object({
  success: z.boolean(),
  headline: z.string(),
  summary: z.string(),
  macros: z.object({
    calories: MacroStatusSchema,
    protein: MacroStatusSchema,
    carbs: MacroStatusSchema,
    fat: MacroStatusSchema,
  }),
  cuisines: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    count: z.number(),
  })),
  batchCooking: z.array(z.object({
    prepDay: z.string(),
    recipe: z.string(),
    coversDay: z.string(),
    coversMeal: z.string(),
  })),
  shopping: z.object({
    efficiency: z.enum(['low', 'moderate', 'high']),
    usesExpiring: z.array(z.string()),
    sharedIngredients: z.array(z.object({
      name: z.string(),
      count: z.number(),
    })),
  }),
  tips: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
    when: z.string(),
  })),
  dietary: z.array(z.object({
    profile: z.string(),
    initial: z.string(),
    note: z.string(),
    compliant: z.boolean(),
  })),
});

export function validateMealPlanSummary(data: unknown): MealPlanSummary | null {
  try {
    return MealPlanSummarySchema.parse(data);
  } catch (error) {
    console.error('Failed to parse meal plan summary:', error);
    return null;
  }
}
```

---

## Testing Checklist

### AI Response
- [ ] Generate a meal plan and verify JSON structure is returned
- [ ] Verify macro values are calculated correctly
- [ ] Verify macro status (on_target/under/over) is accurate
- [ ] Verify cuisine count matches actual meal plan
- [ ] Verify batch cooking items are genuine (not fabricated)
- [ ] Verify tips have specific, actionable timing

### Component Rendering
- [ ] Header displays headline and summary correctly
- [ ] Macro bars show correct values and colors
- [ ] Macro bars show correct fill percentage
- [ ] Status indicators show correctly (✓ On target)
- [ ] All expandable sections render
- [ ] Sections with empty data are hidden

### Interactions
- [ ] Click to expand section works
- [ ] Click to collapse section works
- [ ] Multiple sections can be open simultaneously
- [ ] Arrow rotates on open/close
- [ ] Smooth transition animation

### Responsive
- [ ] Macro bars stack to 2 columns on mobile
- [ ] Content is readable on small screens
- [ ] Expandable sections work on touch devices

### Error Handling
- [ ] Malformed JSON falls back to prose display
- [ ] Missing fields don't crash the component
- [ ] Parsing errors are logged

---

## Implementation Order

1. **Create types** - `lib/types/meal-plan-summary.ts`
2. **Update AI prompt** - Add JSON structure instructions
3. **Update response parsing** - Extract and validate JSON
4. **Build components** - Start with MacroBar, then sections, then main component
5. **Integrate** - Replace current summary display
6. **Test** - Run through checklist
7. **Polish** - Animations, responsive tweaks

---

## Notes

- Use `claude-haiku-4-5` for AI generation
- Match existing app dark theme exactly
- Keep components modular for reuse
- Add loading skeleton while generating (optional enhancement)
