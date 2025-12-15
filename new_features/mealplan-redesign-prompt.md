# Claude Code Prompt: Meal Plan Pages Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Major redesign of the Meal Plan pages including:
1. UI/UX improvements across all meal plan screens
2. New **Cooking Plan** view showing daily cooking tasks
3. **Export & Share** functionality for PDF exports
4. Settings page updates

**Reference Design:** See `new_features/mealplan-redesign.html` for the complete rendered design.

---

## Required Changes

### 1. Generate New Meal Plan Page

#### Add Settings Button
```
┌─────────────────────────────────────────────────────────────────┐
│ Generate New Meal Plan                           [⚙️ Settings] │
└─────────────────────────────────────────────────────────────────┘
```
- Position: Top right of the "Generate New Meal Plan" card
- Style: `bg-gray-700 text-gray-400` secondary button
- Opens the existing Meal Plan Settings page

#### "Generate with AI" Button
- Change to gradient: `bg-gradient-to-r from-orange-500 to-purple-500`

#### Filter Pills
- Active state: `bg-purple-500 text-white` (currently blue)
- Inactive state: `bg-gray-700 text-gray-400`

---

### 2. Week Overview - Fixed Row Grid

**CRITICAL CHANGE:** Restructure the week grid so meals align horizontally.

**Current:** Each day is a column with meals flowing vertically (lunches don't align across days)

**New:** Table structure with meal type rows:

```
┌───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│  Monday   │  Tuesday  │ Wednesday │ Thursday  │  Friday   │ Saturday  │  Sunday   │
│  15 Dec   │  16 Dec   │  17 Dec   │  18 Dec   │  19 Dec   │  20 Dec   │  21 Dec   │
├───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┤
│ BREAKFAST                                                                         │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│ Easy      │ Budget    │ Breakfast │ Chocolate │ Spaghetti │ Chicken   │ Chicken   │
│ protein   │ porridge  │ muffins   │ Banana    │ Carbonara │ stroganoff│ alfredo   │
│ pancakes  │ 4 servings│ 4 servings│ Oat Bake  │ 4 servings│ 4 servings│ 4 servings│
├───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┤
│ LUNCH                                                                             │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│ Chicken   │ Turkey    │ Easy      │ Chicken & │ One-Pot   │ Chicken   │ Beef      │
│ satay     │ enchiladas│ chicken 🔄│ Spinach   │ Pasta     │ souvlaki  │ goulash   │
│ salad     │ 3 servings│ casserole │ Gnocchi   │ Ricotta   │ 4 servings│ 4 servings│
├───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┤
│ DINNER                                                                            │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│ Easy      │ Panang    │ Chinese   │ Air-fryer │ Tonkatsu  │ Creamy    │ Creamy    │
│ chicken ⚡│ chicken   │ chicken   │ fish      │ pork      │ Smoked    │ pork &    │
│ casserole │ curry     │ curry     │ tacos     │ 4 servings│ Paprika   │ pear      │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

**Key requirements:**
- Use HTML table (not CSS grid) for proper row alignment
- Each meal type (Breakfast, Lunch, Dinner, etc.) is a horizontal row
- Cells expand vertically to fit longest recipe name - **NO TRUNCATION**
- Show full recipe names (e.g., "Chicken and Spinach Gnocchi Bake" not "Chicken & Spin...")
- Dates shown under each day name
- Batch cook indicator: ⚡ (amber)
- Reheat indicator: 🔄 (green)

**Row header styling:**
```css
background: rgba(139, 92, 246, 0.05);
font-size: 0.625rem;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #6b7280;
```

**Legend below grid:**
```
⚡ Batch cook    🔄 Reheat (from batch)
```

**Optional List View toggle:**
- Add button in header: `[List View]` / `[Grid View]`
- Nice-to-have, not critical for initial implementation

---

### 3. Day Detail View

#### Mini Calendar for Quick Navigation
Add a row of day buttons below the Previous/Next navigation:

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Previous]        Monday, 15 Dec        [Next →]             │
│                      Day 1 of 7                                 │
│                                                                 │
│   [Mon]  [Tue]  [Wed]  [Thu]  [Fri]  [Sat]  [Sun]              │
│   [15]   [16]   [17]   [18]   [19]   [20]   [21]               │
└─────────────────────────────────────────────────────────────────┘
```

- Active day: `bg-purple-500 text-white`
- Other days: `bg-gray-700 text-gray-400`
- Click to jump directly to that day

#### Clickable "Not Scheduled" Slots
Change empty meal slots from plain text to clickable:

**Current:**
```
Afternoon Snack not scheduled
```

**New:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Afternoon Snack not scheduled                                   │
│ + Click to add                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- Border: `border-dashed border-gray-700`
- Hover: Highlight border
- Click: Opens recipe selector

#### Export & Share Button
Add to action buttons row:
```
[Reopen for Editing] [Archive Plan] [Edit Schedule] [↗ Export & Share] [Delete Plan]
```

- Style: `bg-gradient-to-r from-red-500 to-orange-500` (matches Shopping List)

#### Batch Cook Badge on Meal Cards
Show badge when meal is batch cooked:
```
┌─────────────────────────────────────────────────────────────────┐
│ ⋮⋮ Dinner                                    [⚡ BATCH]   🔍 📋 ✕│
│ Easy chicken casserole                                          │
└─────────────────────────────────────────────────────────────────┘
```

Badge styling: `bg-amber-500/20 text-amber-500`

---

### 4. Customize Week Schedule - Modal Popup

Move from inline expandable to **modal popup**.

**Trigger:** "Customize meals for this week" link or "Edit Schedule" button

**Modal structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Customize Week Schedules                                     ✕ │
│ Adjust individual schedules for this week                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ☑ Chris                                                        │
│ ✓ Included in meal plan                                        │
│ ┌───────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐           │
│ │ MEAL  │ MON │ TUE │ WED │ THU │ FRI │ SAT │ SUN │           │
│ ├───────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤           │
│ │Breakf.│ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │           │
│ │Lunch  │ ☑   │ ☑   │ ☑   │ ☑   │ ☐   │ ☐   │ ☑   │           │
│ │Dinner │ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │ ☑   │           │
│ └───────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘           │
│                                                                 │
│ ☑ Emmie                                                        │
│ [Similar grid...]                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Reset All to Defaults]                    [Cancel] [Save]     │
└─────────────────────────────────────────────────────────────────┘
```

- Max height with scroll for many family members
- Save button: `bg-purple-500`

---

### 5. NEW: Cooking Plan View

**New page/view** showing daily cooking tasks organized by type.

**Navigation:** Accessible from meal plan detail via button or tab

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Meal Plan                            [📄 Export PDF] │
│ Cooking Plan                                                    │
│ Week of 15/12/2025 - 21/12/2025                                │
├─────────────────────────────────────────────────────────────────┤
│ [Mon 15] [Tue 16] [Wed 17] [Thu 18] [Fri 19] [Sat 20] [Sun 21]│
├─────────────────────────────────────────────────────────────────┤
│ Monday, 15 December                                             │
├─────────────────────────────────────────────────────────────────┤
│ 🍳 TODAY'S COOKING                                              │
│                                                                 │
│ ┌─────────┬────────────────────────────┬──────────────────────┐│
│ │Breakfast│ Easy protein pancakes      │ 15 min prep          ││
│ │         │ 4 servings                 │ 10 min cook          ││
│ ├─────────┼────────────────────────────┼──────────────────────┤│
│ │Lunch    │ Chicken satay salad        │ 20 min prep          ││
│ │         │ 3 servings                 │ 0 min cook           ││
│ ├─────────┼────────────────────────────┼──────────────────────┤│
│ │Dinner   │ Easy chicken casserole     │ 10 min prep          ││
│ │⚡ BATCH │ 8 servings (covers Wed too)│ 45 min cook          ││
│ └─────────┴────────────────────────────┴──────────────────────┘│
│                                                                 │
│ 📋 PREP AHEAD (for later in the week)                          │
│                                                                 │
│ For Thursday's Air-fryer fish tacos:                           │
│ • Make chipotle mayo (5 min)                                   │
│ • Slice cabbage for slaw (10 min)                              │
│                                                                 │
│ ════════════════════════════════════════════════════════════════│
│ Total cooking time today: ~1hr 55min                           │
└─────────────────────────────────────────────────────────────────┘
```

**Sections (show only when applicable):**

1. **🍳 Today's Cooking** - Meals to cook fresh today
   - Show prep time + cook time
   - Highlight batch cooking with ⚡ BATCH badge
   - Show total servings and which future meal it covers

2. **📋 Prep Ahead** - Tasks to do today for meals later in the week
   - Only show if AI has identified prep-ahead tasks
   - Group by target meal
   - Show estimated time per task

3. **🔄 Reheat Only** - Meals using batch-cooked food
   - Only show section if there are reheat meals
   - Show original cook date
   - Show reheat time estimate

**Section styling:**
- Batch cook: `bg-amber-500/10 border-amber-500/30`
- Reheat: `bg-emerald-500/10 border-emerald-500/30`
- Total time: `bg-purple-500/10` footer

**Data source:** The AI already outputs batch cooking info and prep suggestions during meal plan generation. This view just presents that data in a daily actionable format.

---

### 6. NEW: Export & Share Modal

Similar to Shopping List export modal.

**Options:**

| Option | Description | Icon Color |
|--------|-------------|------------|
| Weekly Plan PDF | Landscape format, 1 page for printing | Red |
| Cooking Plan PDF | Daily cooking schedule with times | Orange |
| Share via WhatsApp | Send meal plan summary | Green |
| Share via Email | Compose email with plan details | Purple |

**Weekly Plan PDF format:**
- Landscape orientation
- Single page
- Table layout matching the week overview grid
- Include batch cook (⚡) and reheat (🔄) indicators

**Cooking Plan PDF format:**
- Portrait or landscape
- One section per day
- Include Today's Cooking, Prep Ahead, Reheat sections
- Total times per day

---

### 7. Recipe Popup (Smaller Overlay)

When clicking a recipe in the day detail view, show a **smaller popup** that keeps the schedule visible behind.

**Current:** Full-page modal that hides everything

**New:** Smaller centered popup with semi-transparent backdrop

```
┌─────────────────────────────────────────────────────────────────┐
│ [BBC Good Food]                                              ✕ │
│ Easy chicken casserole                                         │
│ One-pot comfort food perfect for batch cooking                 │
├─────────────────────────────────────────────────────────────────┤
│   4 Servings  │  10 Prep  │  45 Cook  │  55 Total             │
├─────────────────────────────────────────────────────────────────┤
│ Per serving:                                                    │
│ [285 kcal] [38g protein] [8g carbs] [11g fat]                  │
├─────────────────────────────────────────────────────────────────┤
│ Ingredients (8):                                                │
│ Chicken breast, onion, garlic, chicken stock...                │
├─────────────────────────────────────────────────────────────────┤
│          [View Full Recipe]  [Change Recipe]                   │
└─────────────────────────────────────────────────────────────────┘
```

- Max width: ~500px
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Actions: View full recipe (gray), Change recipe (purple)

---

### 8. Settings Page Updates

#### "Cooldown" → "Days until repeat"

**Current:**
```
Dinner Cooldown: 7 days
Lunch Cooldown: 3 days
Breakfast Cooldown: 1 days
```

**New:**
```
Dinner - Days until repeat: 7
Lunch - Days until repeat: 3
Breakfast - Days until repeat: 1
```

#### Shopping Efficiency → Slider without ratings

**Current:**
```
○ Mild - Slight preference for ingredient overlap (0.3 rating boost)
● Moderate - Moderate preference for efficiency (0.5 rating boost)
○ Aggressive - Strong preference for minimal shopping (0.8 rating boost)
```

**New:**
```
Shopping Efficiency
[Mild ●────────────○────────────○ Aggressive]
         Moderate

Minimize unique ingredients across the week
```

- Remove explicit rating numbers
- Use slider with three stops
- Show selected value below slider
- Keep description text but remove technical details

---

## Component Structure

```
components/
  meal-plan/
    MealPlanPage.tsx              # Main page with generate card
    MealPlanWeekOverview.tsx      # Week grid (table structure)
    MealPlanDayDetail.tsx         # Day view with mini calendar
    MealPlanMealCard.tsx          # Individual meal card
    CookingPlanView.tsx           # NEW: Daily cooking tasks
    CookingPlanDay.tsx            # NEW: Single day cooking plan
    RecipeQuickView.tsx           # Smaller recipe popup
    CustomizeScheduleModal.tsx    # Week schedule modal
    ExportShareModal.tsx          # Export options modal
    MealPlanSettings.tsx          # Settings page updates
```

---

## Implementation Steps

1. **Read existing code** - Review current meal plan components
2. **Update Generate page** - Settings button, gradient button, purple pills
3. **Rebuild Week Overview** - Table structure with fixed rows
4. **Update Day Detail** - Mini calendar, clickable empty slots, export button
5. **Create Schedule Modal** - Move inline to popup
6. **Create Cooking Plan** - New view with sections
7. **Create Export Modal** - PDF and share options
8. **Update Recipe Popup** - Smaller overlay
9. **Update Settings** - Slider and label changes
10. **Test all flows** - Generate, view, edit, export
11. **Run TypeScript check** - `npx tsc --noEmit`

---

## Acceptance Criteria

### Generate Page
- [ ] Settings button in Generate card header
- [ ] "Generate with AI" has orange→purple gradient
- [ ] Filter pills use purple when active

### Week Overview
- [ ] Table structure with meal type rows
- [ ] All meals of same type align horizontally
- [ ] Full recipe names shown (no truncation)
- [ ] Dates shown under day headers
- [ ] Batch cook (⚡) and reheat (🔄) indicators
- [ ] Legend shown below grid

### Day Detail
- [ ] Mini calendar for quick day navigation
- [ ] Active day highlighted in purple
- [ ] Empty slots are clickable with "+ Click to add"
- [ ] Export & Share button in action row
- [ ] Batch cook badge on relevant meal cards

### Customize Schedule
- [ ] Opens as modal popup (not inline)
- [ ] Checkbox grid per family member
- [ ] Save and Cancel buttons
- [ ] Reset to Defaults option

### Cooking Plan (NEW)
- [ ] Accessible from meal plan detail
- [ ] Day tabs for navigation
- [ ] "Today's Cooking" section with times
- [ ] "Prep Ahead" section (only when applicable)
- [ ] "Reheat Only" section (only when applicable)
- [ ] Total cooking time per day
- [ ] Batch cook and reheat badges
- [ ] Export to PDF button

### Export & Share
- [ ] Modal with export options
- [ ] Weekly Plan PDF (landscape, 1 page)
- [ ] Cooking Plan PDF
- [ ] WhatsApp and Email share options

### Recipe Popup
- [ ] Smaller overlay (not full page)
- [ ] Semi-transparent backdrop
- [ ] Quick stats and nutrition
- [ ] View Full Recipe and Change Recipe buttons

### Settings
- [ ] "Cooldown" changed to "Days until repeat"
- [ ] Shopping Efficiency uses slider (not radio buttons)
- [ ] Rating numbers removed from UI

---

## Data Considerations

### Cooking Plan Data
The AI meal plan generation already outputs:
- Batch cooking instructions (which meals, how many servings)
- Prep ahead suggestions (tasks that can be done early)
- Reheat instructions (which meals are from batch)

This data needs to be:
1. Stored in the meal plan record
2. Parsed and displayed in the Cooking Plan view
3. Exported to PDF format

### PDF Generation
Use existing PDF generation approach (likely `jspdf` or `react-pdf`):
- Weekly Plan: Landscape table
- Cooking Plan: Day-by-day sections

---

## Reference

The complete rendered HTML design is available at:
`new_features/mealplan-redesign.html`

Use this as the definitive reference for layout, spacing, colours, and content.
