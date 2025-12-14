# Plan: Fix Dashboard Weekly Meals Not Displaying

## Problem Summary

The dashboard is not showing the weekly meal plan even though a finalized plan exists for the current week (13-19 Dec 2025).

## Root Causes Identified

### Issue 1: Day Name Mismatch
**Location:** `app/api/dashboard/route.ts` lines 209-213

**Current code:**
```typescript
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const meal = currentMealPlan?.meals.find(
  (m: MealWithRecipe) => m.dayOfWeek === day || m.dayOfWeek === dayNames[index]
)
```

**Problem:** Database stores `dayOfWeek` as full names ('Monday', 'Tuesday', etc.) but the code searches for abbreviated names ('Mon', 'Tue', etc.).

**Fix:** Use full day names that match the database format.

### Issue 2: Week Query Logic Wrong
**Location:** `app/api/dashboard/route.ts` lines 93-127

**Current code:**
```typescript
const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
const weekEnd = endOfWeek(today, { weekStartsOn: 1 }) // Sunday

prisma.mealPlan.findFirst({
  where: {
    userId: session.user.id,
    weekStartDate: {
      gte: weekStart,
      lte: weekEnd,
    },
  },
  ...
})
```

**Problem:** This finds meal plans where `weekStartDate` falls within a Monday-Sunday range. But:
- User's meal plan starts Saturday 13 Dec
- Meal plan runs Sat 13 to Fri 19 Dec
- We should find the meal plan that **COVERS today**, not one whose start date is within our calculated range

**Fix:** Query for meal plans where `weekStartDate <= today` AND `weekEndDate >= today`. This finds the plan that contains today's date.

### Issue 3: Week Days Not Aligned With Meal Plan
**Location:** `app/api/dashboard/route.ts` lines 209-224

**Current code:** Always shows Mon-Sun order regardless of meal plan's actual week structure.

**Problem:** User's meal plan is Sat-Fri, but dashboard shows Mon-Sun. We need to show the days in the order of the actual meal plan.

**Fix:** Get the days from the meal plan's `weekStartDate` and iterate 7 days from there.

### Issue 4: No Dates Displayed
**Location:** Dashboard components

**Problem:** User requested dates be shown (e.g., "Mon 15 Dec" instead of just "Mon") to make the week context clearer.

**Fix:** Update `WeeklyMealsCard` component to show the date alongside the day name.

## Implementation Steps

### Step 1: Fix Dashboard API (`app/api/dashboard/route.ts`)

1. **Change query logic** to find meal plan covering today:
   ```typescript
   prisma.mealPlan.findFirst({
     where: {
       userId: session.user.id,
       weekStartDate: { lte: today },
       weekEndDate: { gte: today },
     },
     ...
   })
   ```

2. **Fix day names** to use full names:
   ```typescript
   const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
   ```

3. **Build days from meal plan's actual start date**:
   ```typescript
   // If we have a meal plan, use its week start date
   // Otherwise fall back to calculated week
   const actualWeekStart = currentMealPlan?.weekStartDate
     ? new Date(currentMealPlan.weekStartDate)
     : weekStart

   // Build days starting from actual week start
   for (let i = 0; i < 7; i++) {
     const date = addDays(actualWeekStart, i)
     const dayName = format(date, 'EEEE') // 'Monday', 'Tuesday', etc.
     // ... rest of logic
   }
   ```

4. **Update week label** to show actual meal plan dates

### Step 2: Update WeeklyMeal Interface

Add date display info to the interface:
```typescript
interface WeeklyMeal {
  day: string          // 'Monday'
  dayShort: string     // 'Mon'
  date: string         // '2025-12-15' (ISO)
  dateDisplay: string  // '15 Dec' (for UI)
  isToday: boolean
  dinner: string | null
  recipeId: string | null
  planned: boolean
}
```

### Step 3: Update WeeklyMealsCard Component

Modify `components/dashboard/WeeklyMealsCard.tsx` to show dates:
```tsx
<div className="w-16 text-center ...">
  <div className="text-xs font-medium uppercase tracking-wide">{meal.dayShort}</div>
  <div className="text-[10px] text-zinc-500">{meal.dateDisplay}</div>
  {meal.isToday && <div className="text-[10px] text-purple-400 mt-0.5">Today</div>}
</div>
```

### Step 4: Update DashboardHeader

Show the actual week range from the meal plan:
```tsx
<p className="text-zinc-400 mt-1">
  {weekLabel} &bull; {familyName}
</p>
// Where weekLabel could be "13-19 December" instead of calculated range
```

## Files to Modify

1. `app/api/dashboard/route.ts` - Fix query logic and day mapping
2. `components/dashboard/WeeklyMealsCard.tsx` - Add date display
3. `components/dashboard/DashboardHeader.tsx` - Minor update if needed

## Testing Checklist

- [ ] Dashboard shows meals from the current meal plan
- [ ] Days are in correct order (matching meal plan's week structure)
- [ ] Each day shows its date (e.g., "Mon 15")
- [ ] "Today" indicator appears on correct day
- [ ] Week range in header matches meal plan dates
- [ ] Unplanned days show correctly
- [ ] TypeScript compiles without errors

## Risks

- Low: Changes are isolated to dashboard display logic
- No database schema changes required
- No breaking changes to other features
