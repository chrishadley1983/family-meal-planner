# Claude Code Prompt: Staples Page Redesign

## Role

You are a **Senior Developer** working on the FamilyFuel project. You write clean, well-tested, production-ready code following established patterns and best practices.

**CRITICAL: Review and follow `CLAUDE.md` in the project root before starting. This contains project-specific conventions, patterns, and requirements that must be followed for all code changes.**

---

## Task Overview

Light-touch redesign of the Staples page to align styling with the recently redesigned Inventory page and other pages. This mirrors the Inventory redesign closely.

**Reference Design:** See `new_features/inventory-redesign.html` for styling reference - apply the same patterns to Staples.

---

## Current State

- Staples page with stats cards, filters, and data table
- Add Staple modal with form fields
- Import CSV modal with template download
- Due date badges showing urgency (Due today, Due in X days)

---

## Required Changes

### 1. Stats Cards - Add Colour Coding

Replace plain stats cards with colour-coded versions:

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│      4      │ │      3      │ │      3      │ │      0      │
│Total Staples│ │   Active    │ │  Due Soon   │ │   Overdue   │
│   (gray)    │ │   (green)   │ │   (amber)   │ │    (red)    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**Styling:**
- Total Staples: `bg-gray-900 border-gray-700` (neutral)
- Active: `bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30` with `text-emerald-500` number
- Due Soon: `bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30` with `text-amber-500` number
- Overdue: `bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30` with `text-red-500` number

---

### 2. Header Buttons

Update button styling:

```
[Import CSV]  [+ Add Staple]
```

- **Import CSV:** `bg-gray-800 border border-gray-700` (secondary style)
- **Add Staple:** `bg-gradient-to-r from-orange-500 to-purple-500` (primary gradient)

---

### 3. Filter Row

Unify into single row with dividers (matching Inventory page):

```
┌─────────────────────────────────────────────────────────────────┐
│ Category: All ▼ │ Frequency: All ▼ │ Status: All ▼ │ Due: All ▼ │
└─────────────────────────────────────────────────────────────────┘
```

- Background: `bg-gray-900/50 rounded-lg`
- Dividers: `w-px h-6 bg-gray-700` between each filter
- Dropdowns: transparent background, no visible border
- Padding: `p-2` on container

---

### 4. Due Date Badges

Ensure consistent styling for inline due badges:

| Badge | Styling |
|-------|---------|
| Due today | `bg-red-500/20 text-red-500` |
| Due in X days | `bg-amber-500/20 text-amber-500` |
| Overdue / Immediately | `text-red-500` (or `bg-red-500/20 text-red-500` pill) |

These badges appear inline next to the item name - keep this positioning.

---

### 5. Status Badges

Ensure consistent pill styling in the Status column:

| Status | Styling |
|--------|---------|
| Active | `bg-emerald-500/20 text-emerald-500` |
| Inactive | `bg-gray-500/20 text-gray-500` |

---

### 6. Add Staple Modal - Enhancements

#### Import Buttons - More Prominent

```
┌─────────────────────┐ ┌─────────────────────┐
│   🔗 Import URL     │ │   📷 Import Photo   │
└─────────────────────┘ └─────────────────────┘
```

- Full width buttons side by side
- Add icons (Link and Camera emojis or Lucide icons)
- `bg-gray-800 border border-gray-700`
- Slightly larger padding: `py-3`

---

### 7. Import CSV Modal - Step Numbers

Update step numbers to purple circles:

```
① Download Template
  Start with our template CSV for the correct format
  [Download Template]

② Upload Your CSV
  [Click to select a CSV file]
```

- Step circles: `w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center`
- Or use numbered text with purple styling: `text-purple-400 font-medium`

---

## Component Updates

Files likely to be modified:
```
components/
  staples/
    StaplesPage.tsx           # Main page
    StaplesStats.tsx          # Stats cards (add colours)
    StaplesFilters.tsx        # Filter row (unify styling)
    StaplesTable.tsx          # Table with badges
    AddStapleModal.tsx        # Add staple form
    ImportStaplesModal.tsx    # Import modal
```

---

## Implementation Steps

1. **Read existing code** - Review current staples components
2. **Update stats cards** - Add colour coding (match Inventory exactly)
3. **Update header buttons** - Gradient for Add Staple
4. **Update filter row** - Unified row with dividers
5. **Update due badges** - Consistent pill styling
6. **Update status badges** - Consistent pill styling
7. **Update Add Staple modal** - Import buttons with icons
8. **Update Import CSV modal** - Purple step numbers
9. **Run TypeScript check** - `npx tsc --noEmit`
10. **Manual test** - Verify all functionality works

---

## Acceptance Criteria

- [ ] Stats cards have colour coding (gray/green/amber/red)
- [ ] "Add Staple" button has orange→purple gradient
- [ ] Filter row unified with dividers between dropdowns
- [ ] Due date badges use consistent colours (red for today/overdue, amber for upcoming)
- [ ] Status badges use consistent pill styling
- [ ] Add Staple modal has import buttons with icons
- [ ] Import CSV modal has purple numbered steps
- [ ] All existing functionality still works
- [ ] TypeScript compiles without errors

---

## Reference

Use the Inventory page redesign as the primary reference:
- `new_features/inventory-redesign.html` - Visual reference
- `new_features/inventory-redesign-prompt.md` - Detailed specs

Apply the same styling patterns to Staples for consistency across the app.
