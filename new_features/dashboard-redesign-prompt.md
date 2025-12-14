# Claude Code Prompt: Dashboard & Navigation Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the dashboard and navigation bar to improve UX and better reflect the weekly meal planning workflow. This is a UI refactor - no new backend functionality required.

**Reference Design:** See `/mnt/user-data/outputs/dashboard-redesign-v2.jsx` for the complete React component with all styling and layout.

---

## Current State

- Dashboard at `/app/dashboard/page.tsx` (or similar)
- Navigation bar component (likely in `/components/`)
- Dark theme with orange/purple brand colours
- 9 navigation items currently shown equally

---

## Required Changes

### 1. Navigation Bar Restructure

**Before (9 items, flat):**
```
Dashboard | Recipes | Discover | Meal Plans | Shopping | Staples | Inventory | Profiles | Nutritionist
```

**After (5 primary items + user menu):**
```
[Logo] Meal Plan | Recipes | Discover | Shopping | Inventory     [Bell] [User Avatar + Settings]
```

**Implementation:**
- Primary nav: Meal Plan, Recipes, Discover, Shopping, Inventory
- Move Profiles to user menu dropdown (top right, with avatar)
- Move Staples under Inventory (or as secondary nav within Inventory page)
- Nutritionist accessible from Discover card on dashboard + can remain in nav if space allows on desktop
- Add notification bell icon (can be non-functional placeholder for now)
- User menu shows: avatar with initials, name, family name, settings icon
- Shopping nav item should show badge with item count (e.g., "23")

**User Menu Structure:**
```
[Avatar: CH]
Chris
Hadley Family
[Settings icon]
```

Clicking settings or the menu area navigates to Profiles/Settings.

---

### 2. Dashboard Layout Redesign

**Header Section:**
```
This Week's Plan                              [Add Recipe] [Complete My Meal Plan]
Week of 16-22 December • Hadley Family
```

- Dynamic week range based on current date
- "Complete My Meal Plan" button: gradient orange→purple, Sparkles icon
- "Add Recipe" button: secondary style (gray)

**Alert Banner (Conditional):**
- Only show if there are items expiring within 3 days
- Amber/warning gradient styling
- Shows count + most urgent item + CTA to view recipes
- Example: "3 items expiring soon - Chicken breast expires tomorrow - 3 recipes available [View recipes →]"

**Main Grid: 2 columns on desktop (lg:grid-cols-3), single column mobile**

**Left Column (lg:col-span-2):**

1. **Weekly Dinners Card**
   - Header: Calendar icon, "Weekly Dinners", "X of 7 days planned", "Edit plan →" link
   - List all 7 days (Mon-Sun) with:
     - Day label (Mon, Tue, etc.)
     - "Today" indicator on current day (purple highlight + border)
     - Planned meals show: Utensils icon + meal name + chevron
     - Unplanned days show: dashed border + "No meal planned" + "Add meal" button
   - Footer (if unplanned days exist): "X days still need meals - let AI suggest based on your preferences [Auto-fill →]"

2. **Weekly Shopping Card**
   - Header: ShoppingCart icon, "Weekly Shopping", "X items for this week", "View list →" link
   - Category breakdown grid (4 columns): Fresh, Meat & Fish, Dairy, Cupboard - each showing count
   - Status bar:
     - If not started: Clock icon, "Shopping list ready - not yet started", [Start shopping] button
     - If in progress: Check icon, "X of Y items purchased", [Continue →] link

**Right Column:**

1. **Discover Recipes Card**
   - Gradient: orange-900/40 to rose-900/40, border orange-700/30
   - Sparkles icon in orange/rose gradient circle
   - Title: "Discover Recipes"
   - Subtitle: "Find your next family favourite"
   - Body: "Browse hundreds of recipes matched to your family's tastes and dietary needs. Emilia, your AI nutritionist, helps guide you towards meals that meet your goals."
   - CTA: "Explore recipes →" button

2. **Expiring Soon Card**
   - Header: Package icon, "Expiring Soon", "View all" link
   - List top 3 expiring items with:
     - Item name + quantity
     - Urgency badge: "Tomorrow" (red), "2 days" (amber), "3 days" (gray)

3. **Quick Actions Grid (2x2)**
   - Recipes: ChefHat icon, green, "X saved"
   - Staples: Package icon, amber, "X due"
   - Inventory: Package icon, blue, "X items"
   - Profiles: User icon, purple, "X members"

---

### 3. Data Requirements

The dashboard needs to fetch/display:

```typescript
interface DashboardData {
  // User context
  user: {
    firstName: string;
    familyName: string;
    initials: string;
  };
  
  // Week info
  weekRange: {
    start: Date;
    end: Date;
    label: string; // "Week of 16-22 December"
  };
  
  // Meal plan
  weeklyMeals: {
    day: string; // 'Mon', 'Tue', etc.
    date: Date;
    isToday: boolean;
    dinner: string | null;
    planned: boolean;
  }[];
  plannedCount: number;
  
  // Shopping
  shoppingList: {
    total: number;
    purchased: number;
    categories: { name: string; count: number }[];
  };
  
  // Inventory
  expiringItems: {
    name: string;
    quantity: string;
    daysUntilExpiry: number;
  }[];
  
  // Counts for quick actions
  counts: {
    recipes: number;
    staplesDue: number;
    inventoryItems: number;
    familyMembers: number;
  };
}
```

Create appropriate API route(s) or use existing endpoints to gather this data.

---

### 4. Component Structure

Suggested file structure:

```
components/
  layout/
    Navbar.tsx              # Updated navigation bar
    UserMenu.tsx            # User avatar + dropdown menu
  dashboard/
    DashboardHeader.tsx     # Welcome header with CTAs
    AlertBanner.tsx         # Expiring items warning (conditional)
    WeeklyMealsCard.tsx     # 7-day meal plan view
    WeeklyShoppingCard.tsx  # Shopping list summary
    DiscoverCard.tsx        # Discover promo card
    ExpiringSoonCard.tsx    # Expiring inventory items
    QuickActionsGrid.tsx    # 2x2 quick action buttons
```

---

### 5. Styling Notes

- Keep existing dark theme (bg-gray-950, bg-gray-900, bg-gray-800)
- Brand gradient: `from-orange-500 to-purple-600`
- Use existing Tailwind classes
- Card style: `bg-gray-900 rounded-xl border border-gray-800`
- Ensure responsive: single column on mobile, 3-column grid on desktop (lg:)
- Icon colours match their section (emerald for meals, blue for shopping, amber for expiring, etc.)

---

### 6. Navigation State

- Dashboard is the default/home route
- Active nav item should be highlighted (bg-gray-800)
- Clicking logo returns to dashboard

---

## Implementation Steps

1. **Read existing code** - Review current dashboard and navbar implementations
2. **Create new components** - Build the component structure above
3. **Update Navbar** - Implement the new 5-item nav + user menu
4. **Update Dashboard** - Implement new layout with all cards
5. **Wire up data** - Connect to existing APIs or create dashboard summary endpoint
6. **Test responsiveness** - Verify mobile and desktop layouts
7. **Run TypeScript check** - `npx tsc --noEmit`
8. **Manual test** - Verify all links work, data displays correctly

---

## Acceptance Criteria

- [ ] Nav shows: Meal Plan, Recipes, Discover, Shopping, Inventory (5 items)
- [ ] User menu shows avatar, name, family, settings access
- [ ] Shopping nav item shows badge with item count
- [ ] Dashboard header shows "This Week's Plan" with dynamic date range
- [ ] Weekly Dinners card shows all 7 days with today highlighted
- [ ] Unplanned days show "Add meal" action
- [ ] Weekly Shopping card shows category breakdown and status
- [ ] Discover card promotes recipe discovery with Emilia mention
- [ ] Expiring items show with urgency badges
- [ ] Quick actions grid shows live counts
- [ ] Alert banner only shows when items are expiring within 3 days
- [ ] Mobile responsive (single column)
- [ ] All navigation links work
- [ ] TypeScript compiles without errors
- [ ] Visual style matches existing dark theme

---

## Reference

The complete React component with all styling is available at:
`/mnt/user-data/outputs/dashboard-redesign-v2.jsx`

Use this as the definitive reference for layout, spacing, colours, and content. Adapt to your existing component patterns and data fetching approach.
