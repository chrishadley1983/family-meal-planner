# Claude Code Prompt: Shopping List Pages Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the Shopping List pages with styling updates and new features:
1. **Button bar reorganization** - Clean up busy action buttons
2. **Dismiss duplicate suggestions** - Allow users to ignore erroneous AI duplicate matches
3. **Mark All Purchased** - Bulk action to complete entire shopping list
4. **Branded PDF export** - Professional, B&W-printable shopping list PDF

**Reference Design:** See `new_features/shopping-redesign.html` and `new_features/shopping-list-buttons-and-pdf.html` for the complete rendered designs.

---

## Current State

- Shopping Lists index page with filter pills and list cards
- Shopping List detail page with items grouped by category
- Find Duplicates modal showing potential matches
- Export & Share functionality
- Add Item inline form

---

## Required Changes

### 1. Shopping Lists Page - Styling Updates

#### "New List" Button
```
[+ New List]
```
- Change to gradient: `bg-gradient-to-r from-orange-500 to-purple-500`

#### Filter Pills
```
Filter: [All] [Draft] [Finalized] [Archived]
```
- Active state: `bg-purple-500 text-white` (currently blue)
- Inactive state: `bg-gray-700 text-gray-400`

#### List Cards
Add left border accent based on status:
```css
/* Finalized */
border-left: 3px solid #10b981; /* emerald-500 */

/* Draft */
border-left: 3px solid #f59e0b; /* amber-500 */

/* Archived */
border-left: 3px solid #6b7280; /* gray-500 */
```

#### Status Badges
Ensure consistent pill styling:
- Finalized: `bg-emerald-500/20 text-emerald-500`
- Draft: `bg-amber-500/20 text-amber-500`
- Archived: `bg-gray-500/20 text-gray-500`

---

### 2. Empty State Enhancement

Replace plain empty state with engaging design:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                           🛒                                    │
│                      🥕 🥛 🍞 🧀                                │
│                                                                 │
│              Your shopping list is empty                        │
│                                                                 │
│   Add items manually or import from your meal plans and staples │
│                                                                 │
│         [+ Add First Item]  [Import from Meal Plan]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Shopping cart emoji as main icon
- Row of food emojis below (slightly smaller, 50% opacity)
- Friendly heading and subtext
- Two CTA buttons: Add Item (green), Import from Meal Plan (orange)

---

### 3. Button Bar Reorganization

**Current state:** 6 buttons in a row, inconsistent styling, visually busy

**New design:** Grouped into Primary (left) and Secondary (right) with divider

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [↗ Export & Share] [✓ Mark All Purchased] [📦 Add to Inventory]  │  [Undo Last] [Undo All (1)] [Archive] │
│      gradient            green                  purple           │      gray        amber text      gray   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Container styling:**
```css
background: #111827;
border: 1px solid #1f2937;
border-radius: 0.75rem;
padding: 1rem;
display: flex;
align-items: center;
justify-content: space-between;
```

**Button styles:**

| Button | Style | Icon |
|--------|-------|------|
| Export & Share | `bg-gradient-to-r from-red-500 to-orange-500` | ↗ |
| Mark All Purchased | `bg-emerald-500` | ✓ |
| Add to Inventory | `bg-purple-500` | 📦 |
| Undo Last | `bg-gray-700 text-white` | (none) |
| Undo All | `bg-gray-700 text-amber-500` | (none) |
| Archive | `bg-gray-700 text-gray-400` | (none) |

**Divider between groups:**
```css
width: 1px;
height: 2rem;
background: #374151;
```

**Undo All counter:**
- Shows count in parentheses: "Undo All (3)"
- Amber text to indicate pending undos
- Hidden or disabled when count is 0

---

### 4. Mark All Purchased - Behaviour

**Button location:** Primary actions group (left side)

**Behaviour:**
1. Click button → Show confirmation modal
2. Modal shows: "Mark all X remaining items as purchased?"
3. Confirm → Mark all unpurchased items as purchased
4. Show success toast: "Marked X items as purchased"

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────────────────────┐
│                          ✓                                      │
│                                                                 │
│              Mark All as Purchased?                             │
│                                                                 │
│   This will mark all 155 remaining items as purchased.         │
│                                                                 │
│                  [Cancel]  [Yes, Mark All]                     │
└─────────────────────────────────────────────────────────────────┘
```

- Checkmark in green circle at top
- Clear messaging with item count
- Cancel (gray) and Confirm (green) buttons

---

### 5. NEW FEATURE: Dismiss Duplicate Suggestions

Update the Find Duplicates modal to allow dismissing erroneous matches:

**Current:**
```
Olive Oil [HIGH]                                    [Combine]
```

**New:**
```
Olive Oil [HIGH]                           [Combine] [Dismiss]
```

**Per-group buttons:**
- **Combine:** `bg-emerald-500 text-white` - Merges the items (existing)
- **Dismiss:** `bg-gray-700 text-gray-400` - Removes from suggestions

**Dismiss Behaviour:**
1. Click "Dismiss" → Remove that group from the current suggestions list
2. Optionally: Store dismissal so it doesn't suggest again in future (nice-to-have)
3. Update "X duplicate groups found" count
4. If no groups left, show "No duplicates found" state

**Modal Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Find Duplicates                                              ✕ │
│ Combine similar items into one                                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Olive Oil  [HIGH]                      [Combine] [Dismiss] ││
│ │ Olive oil: 185 ml                                          ││
│ │ Olive Oil: 5 ml                                            ││
│ │ → Combined: 190 ml                                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Flour  [MEDIUM]                        [Combine] [Dismiss] ││
│ │ Plain flour: 100 g                                         ││
│ │ Strong bread flour: 250 g                                  ││
│ │ → Combined: 350 g                                          ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ 2 duplicate groups found           [Combine All]  [Close]      │
└─────────────────────────────────────────────────────────────────┘
```

**Confidence badges:**
- HIGH: `bg-red-500/20 text-red-500`
- MEDIUM: `bg-amber-500/20 text-amber-500`
- LOW: `bg-gray-500/20 text-gray-500`

---

### 6. No Duplicates Found State

Enhanced empty state for the modal:

```
┌─────────────────────────────────────────────────────────────────┐
│ Find Duplicates                                              ✕ │
│ Combine similar items into one                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                           ✨                                    │
│                                                                 │
│              No duplicates found!                               │
│         Your shopping list is already optimized                 │
│                                                                 │
│                                                [Close]          │
└─────────────────────────────────────────────────────────────────┘
```

- Sparkles emoji
- Green success text
- Friendly subtext

---

### 7. Branded PDF Export Design

Replace the current plain PDF with a branded, B&W-printable design.

**Current issues:**
- No branding
- Single column (wastes paper)
- Purple header doesn't print well in B&W
- Basic `[ ]` text checkboxes
- No visual hierarchy

**New design features:**

#### Header
```
┌─────────────────────────────────────────────────────────────────┐
│ Shopping List                              [logo] FamilyFuel   │
│ Week of 15 Dec 2025 · 156 items            Generated 15 Dec    │
├─────────────────────────────────────────────────────────────────┤
```
- FamilyFuel logo (gradient on screen, solid dark for print)
- Date range and item count
- 3px black bottom border

#### Two-Column Layout
```
┌──────────────────────────────┬──────────────────────────────┐
│ 🥬 FRESH PRODUCE             │ 🍞 BAKERY                    │
│ ☐ Carrots          4 piece   │ ☐ Flour tortillas   5 piece  │
│ ☐ Celery           3 piece   │ ☐ Panko crumbs      100 g    │
│ ☐ Cucumber         1 piece   │ ...                          │
│ + 28 more items              │                              │
├──────────────────────────────┼──────────────────────────────┤
│ 🥛 DAIRY & EGGS              │ 🥫 CUPBOARD STAPLES          │
│ ☐ Eggs, large      15 piece  │ ☐ Chicken stock     1.2 L    │
│ ☐ Greek yogurt     950 g     │ ☐ Coconut milk      800 ml   │
│ ...                          │ ...                          │
└──────────────────────────────┴──────────────────────────────┘
```

#### Category Headers
```css
background: #1a1a1a;
color: white;
padding: 8px 12px;
font-weight: 600;
font-size: 12px;
text-transform: uppercase;
letter-spacing: 0.5px;
```
- Include category emoji (🥬, 🥛, 🍞, etc.)
- Black background prints well in B&W

#### Item Rows
```
☐ Item name                           Quantity
```
- Styled checkbox: `16px × 16px`, `border: 1.5px solid #d1d5db`, `border-radius: 3px`
- Item name left-aligned, quantity right-aligned
- Font size: 11px
- Row spacing: 6px

#### Overflow Handling
When a category has many items:
- Show first 5-8 items
- Add "+ X more items" in gray at bottom
- Ensures PDF stays compact (1-2 pages)

#### Footer
```
─────────────────────────────────────────────────────────────────
Hadley Family · Linked to meal plan 15-21 Dec          familyfuel.app
```

#### Print Optimization
```css
@media print {
  .logo-icon {
    background: #333; /* Solid instead of gradient */
  }
  
  /* Ensure good contrast */
  .category-header {
    background: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

---

## Component Updates

Files likely to be modified:
```
components/
  shopping/
    ShoppingListsPage.tsx        # Index page
    ShoppingListCard.tsx         # List cards with border accent
    ShoppingListDetail.tsx       # Detail page header + button bar
    ShoppingListButtonBar.tsx    # New: Organized action buttons
    ShoppingListEmpty.tsx        # Enhanced empty state (new or update)
    FindDuplicatesModal.tsx      # Add dismiss button
    MarkAllPurchasedModal.tsx    # New confirmation modal
    
lib/
  pdf/
    shoppingListPdf.ts           # Updated PDF generation
```

---

## Implementation Steps

1. **Read existing code** - Review current shopping list components
2. **Update styling** - Gradient button, purple pills, card borders
3. **Reorganize button bar** - Create grouped layout with divider
4. **Create empty state** - New component with emojis and CTAs
5. **Add Mark All Purchased** - Button + confirmation modal + logic
6. **Update Find Duplicates** - Add Dismiss button per group
7. **Update no duplicates state** - Enhanced empty state
8. **Redesign PDF export** - Two-column, branded, B&W-friendly
9. **Test all flows** - Create list, add items, find duplicates, mark all, export PDF
10. **Run TypeScript check** - `npx tsc --noEmit`
11. **Manual test** - Verify all functionality works, print PDF

---

## Acceptance Criteria

### Styling
- [ ] "New List" button has orange→purple gradient
- [ ] Filter pills use purple when active
- [ ] List cards have left border accent based on status
- [ ] Status badges use consistent pill styling
- [ ] Empty state has emojis and friendly messaging

### Button Bar
- [ ] Buttons grouped into Primary (left) and Secondary (right)
- [ ] Visual divider between groups
- [ ] Export & Share: red→orange gradient
- [ ] Mark All Purchased: green
- [ ] Add to Inventory: purple
- [ ] Undo buttons: gray (Undo All shows count in amber)
- [ ] Archive: gray
- [ ] Contained in subtle card background

### Mark All Purchased
- [ ] Button appears in primary group (green)
- [ ] Clicking shows confirmation modal
- [ ] Modal shows count of remaining items
- [ ] Confirming marks all unpurchased items as purchased
- [ ] Success feedback shown (toast or UI update)
- [ ] Button hidden or disabled when all items already purchased

### Dismiss Duplicates
- [ ] Each duplicate group has "Dismiss" button
- [ ] Clicking Dismiss removes that group from list
- [ ] Group count updates after dismissal
- [ ] If all dismissed, shows "No duplicates found" state
- [ ] "Combine All" only combines non-dismissed groups

### PDF Export
- [ ] FamilyFuel branding in header
- [ ] Two-column layout
- [ ] Black category headers with emojis
- [ ] Styled checkboxes (not plain [ ])
- [ ] Quantities right-aligned
- [ ] "+ X more items" for long categories
- [ ] Footer with family name and website
- [ ] Prints well in black & white

### General
- [ ] All existing functionality still works
- [ ] TypeScript compiles without errors
- [ ] Mobile responsive

---

## Data Considerations

### Mark All Purchased
```typescript
// Batch update all unpurchased items
const markAllPurchased = async (listId: string) => {
  const unpurchasedItems = items.filter(item => !item.purchased);
  
  // Update all items in a batch
  await supabase
    .from('shopping_list_items')
    .update({ purchased: true, purchased_at: new Date() })
    .eq('list_id', listId)
    .eq('purchased', false);
    
  // Refresh the list
  refetchItems();
};
```

### Dismiss Duplicates
```typescript
// Track dismissed groups in component state (or persist if needed)
const [dismissedGroups, setDismissedGroups] = useState<string[]>([]);

const handleDismiss = (groupId: string) => {
  setDismissedGroups(prev => [...prev, groupId]);
};

// Filter out dismissed groups when rendering
const visibleGroups = duplicateGroups.filter(
  group => !dismissedGroups.includes(group.id)
);
```

---

## Reference

The complete rendered HTML designs are available at:
- `new_features/shopping-redesign.html` - Main UI components
- `new_features/shopping-list-buttons-and-pdf.html` - Button bar and PDF design

Use these as the definitive reference for layout, spacing, colours, and content.
