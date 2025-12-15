# Claude Code Prompt: Inventory Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Light-touch redesign of the Inventory page to align styling with the other recently redesigned pages (Dashboard, Recipes). This is primarily colour and styling alignment, not structural changes.

**Reference Design:** See `new_features/inventory-redesign.html` for the complete rendered design.

---

## Current State

- Inventory page with stats cards, search/filters, and data table
- Add Item modal with AI matching feature
- Import CSV modal with template download
- Bulk actions bar when items selected

---

## Required Changes

### 1. Stats Cards - Add Colour Coding

Replace plain stats cards with colour-coded versions:

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│     12      │ │      8      │ │      3      │ │      1      │
│ Total Items │ │   Active    │ │Expiring Soon│ │   Expired   │
│   (gray)    │ │   (green)   │ │   (amber)   │ │    (red)    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**Styling:**
- Total Items: `bg-gray-900 border-gray-700` (neutral)
- Active: `bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30` with `text-emerald-500` number
- Expiring Soon: `bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30` with `text-amber-500` number
- Expired: `bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30` with `text-red-500` number

---

### 2. Header Buttons

Update button styling:

```
[Import]  [+ Add Item]
```

- **Import:** `bg-gray-800 border border-gray-700` (secondary style)
- **Add Item:** `bg-gradient-to-r from-orange-500 to-purple-500` (primary gradient)

---

### 3. Search & Filters Row

Unify into single row with dividers (matching Recipes page):

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search items... │ All Categories ▼ │ All Locations ▼ │ ...  │
└─────────────────────────────────────────────────────────────────┘
```

- Background: `bg-gray-900/50`
- Dividers: `w-px h-6 bg-gray-700` between each filter
- Dropdowns: transparent background, no visible border
- Remove individual dropdown borders

---

### 4. Bulk Actions Bar

Add "Add to Staples" action:

```
┌─────────────────────────────────────────────────────────────────┐
│ 2 items selected     [Update Expiry] [Mark Inactive] [Add to Staples] [Delete] │
└─────────────────────────────────────────────────────────────────┘
```

- Bar styling: `bg-purple-500/10 border border-purple-500/30`
- "Add to Staples" button: `text-emerald-500` (green to indicate positive action)
- Delete button: `bg-red-500/20 text-red-500`

---

### 5. Table Status Badges

Ensure consistent pill styling:

| Status | Styling |
|--------|---------|
| Fresh | `bg-emerald-500/20 text-emerald-500` |
| Expiring | `bg-amber-500/20 text-amber-500` |
| Expired | `bg-red-500/20 text-red-500` |
| Active | `bg-emerald-500/20 text-emerald-500` |
| Inactive | `bg-gray-500/20 text-gray-500` |

---

### 6. Add Item Modal - Enhancements

#### Import Buttons - More Prominent

```
┌─────────────────────┐ ┌─────────────────────┐
│   🔗 Import URL     │ │   📷 Import Photo   │
└─────────────────────┘ └─────────────────────┘
```

- Full width buttons side by side
- Add icons (Link and Camera emojis or Lucide icons)
- `bg-gray-800 border border-gray-700`

#### Smart Expiry Callout - NEW

Add a callout box highlighting the auto-calculate feature:

```
┌─────────────────────────────────────────────────────────────────┐
│ ✨ Smart Expiry                                                 │
│    Leave expiry blank and we'll calculate based on typical      │
│    shelf life                                                   │
└─────────────────────────────────────────────────────────────────┘
```

- Position: Below the Expiry Date field
- Styling: `bg-purple-500/10 border border-purple-500/30`
- Icon: Sparkles emoji or Lucide `Sparkles` icon
- Title: `text-purple-400 font-medium`
- Description: `text-gray-400 text-sm`

#### AI Suggestions Box

Keep existing design - already good. Ensure styling matches:
- `bg-blue-500/10 border border-blue-500/30`
- Info icon in blue
- "Apply Suggestions" button: `bg-purple-500`

---

### 7. Import CSV Modal - Step Numbers

Update step numbers to purple circles (matching recipe instructions):

```
① Download Template
  Start with our template...
  [Download CSV Template]

② Upload Your File
  Upload your completed CSV...
  [Choose File]
```

- Step circles: `w-8 h-8 rounded-full bg-purple-500/20 text-purple-400`
- Font weight: `font-medium`

---

## Component Updates

Files likely to be modified:
```
components/
  inventory/
    InventoryPage.tsx         # Main page
    InventoryStats.tsx        # Stats cards (add colours)
    InventoryFilters.tsx      # Search/filter row
    InventoryTable.tsx        # Table with badges
    InventoryBulkActions.tsx  # Bulk action bar
    AddItemModal.tsx          # Add item form
    ImportCSVModal.tsx        # Import modal
```

---

## Implementation Steps

1. **Read existing code** - Review current inventory components
2. **Update stats cards** - Add colour coding
3. **Update header buttons** - Gradient for Add Item
4. **Update search/filters** - Unified row styling
5. **Add "Add to Staples"** - New bulk action button
6. **Update status badges** - Consistent pill styling
7. **Update Add Item modal** - Import buttons, Smart Expiry callout
8. **Update Import CSV modal** - Purple step numbers
9. **Run TypeScript check** - `npx tsc --noEmit`
10. **Manual test** - Verify all functionality works

---

## Acceptance Criteria

- [ ] Stats cards have colour coding (gray/green/amber/red)
- [ ] "Add Item" button has orange→purple gradient
- [ ] Search/filters in unified row with dividers
- [ ] "Add to Staples" button in bulk actions (green text)
- [ ] Delete button has red styling
- [ ] Status badges use consistent pill styling
- [ ] Add Item modal has prominent import buttons with icons
- [ ] Add Item modal has "Smart Expiry" callout box
- [ ] Import CSV modal has purple numbered circles
- [ ] All existing functionality still works
- [ ] TypeScript compiles without errors

---

## Add to Staples Implementation

When "Add to Staples" is clicked:
1. Get selected inventory items
2. For each item, create or update a staple entry with:
   - Item name
   - Default quantity
   - Category
   - Preferred location
3. Show success toast: "Added X items to Staples"

If Staples functionality doesn't exist yet, just add the button with a TODO comment.

---

## Reference

The complete rendered HTML design is available at:
`new_features/inventory-redesign.html`

Use this as the definitive reference for colours, spacing, and styling.
