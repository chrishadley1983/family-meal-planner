# Claude Code Prompt: Shopping List Pages Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Redesign the Shopping List pages with styling updates and two new features:
1. **Dismiss duplicate suggestions** - Allow users to ignore erroneous AI duplicate matches
2. **Mark All Purchased** - Bulk action to complete entire shopping list

**Reference Design:** See `new_features/shopping-redesign.html` for the complete rendered design.

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

### 3. NEW FEATURE: Mark All Purchased

Add a new button to the shopping list detail header:

```
[Export & Share] [Add to Inventory] [✓ Mark All Purchased] [Undo Last] [Archive]
```

**Button styling:**
- `bg-emerald-500 text-white`
- Icon: checkmark (✓)
- Text: "Mark All Purchased"

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

### 4. NEW FEATURE: Dismiss Duplicate Suggestions

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

### 5. No Duplicates Found State

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

## Component Updates

Files likely to be modified:
```
components/
  shopping/
    ShoppingListsPage.tsx        # Index page
    ShoppingListCard.tsx         # List cards with border accent
    ShoppingListDetail.tsx       # Detail page header
    ShoppingListEmpty.tsx        # Enhanced empty state (new or update)
    FindDuplicatesModal.tsx      # Add dismiss button
    MarkAllPurchasedModal.tsx    # New confirmation modal
```

---

## Implementation Steps

1. **Read existing code** - Review current shopping list components
2. **Update styling** - Gradient button, purple pills, card borders
3. **Create empty state** - New component with emojis and CTAs
4. **Add Mark All Purchased** - Button + confirmation modal + logic
5. **Update Find Duplicates** - Add Dismiss button per group
6. **Update no duplicates state** - Enhanced empty state
7. **Test all flows** - Create list, add items, find duplicates, mark all
8. **Run TypeScript check** - `npx tsc --noEmit`
9. **Manual test** - Verify all functionality works

---

## Acceptance Criteria

### Styling
- [ ] "New List" button has orange→purple gradient
- [ ] Filter pills use purple when active
- [ ] List cards have left border accent based on status
- [ ] Status badges use consistent pill styling
- [ ] Empty state has emojis and friendly messaging

### Mark All Purchased
- [ ] Button appears in list detail header (green)
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

The complete rendered HTML design is available at:
`new_features/shopping-redesign.html`

Use this as the definitive reference for layout, spacing, colours, and content.
