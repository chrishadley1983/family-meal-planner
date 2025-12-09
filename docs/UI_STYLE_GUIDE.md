# familyFuel UI Style Guide

## Overview

This document defines the complete visual design system for familyFuel. The design is inspired by Hume AI's clean, minimal interface but adapted with a dark theme and the familyFuel brand colours (purple-to-orange gradient from the logo).

**Design Principles:**
- Dark, modern, and clean
- Generous whitespace and breathing room
- Subtle borders and shadows - never heavy
- Purple as primary accent, orange as secondary/highlight
- Gradient used sparingly for emphasis
- Typography-focused with clear hierarchy

---

## Brand Assets

### Logo
- **File location:** `/public/logo.png` (or `.svg` preferred)
- **Usage:** Display in header/navigation, login screen, and loading states
- **Minimum size:** 32px height for header, 120px for splash/login
- **Clear space:** Maintain padding equal to the height of the "f" in "familyFuel" on all sides

### App Name
- **Display name:** familyFuel (camelCase, no space)
- **Font:** Use the primary font family in bold/semibold weight
- **Colour:** White (`#FFFFFF`) on dark backgrounds

---

## Colour Palette

### Background Colours
```css
--bg-primary: #0D0D0F;        /* Main app background - near black */
--bg-secondary: #16161A;      /* Cards, panels, elevated surfaces */
--bg-tertiary: #1E1E24;       /* Inputs, nested elements */
--bg-hover: #252530;          /* Hover states on interactive elements */
--bg-active: #2D2D3A;         /* Active/pressed states */
```

### Border Colours
```css
--border-subtle: #2A2A35;     /* Default borders - very subtle */
--border-medium: #3A3A48;     /* More visible borders when needed */
--border-focus: #8B5CF6;      /* Focus rings - purple accent */
```

### Text Colours
```css
--text-primary: #FFFFFF;      /* Primary text - headings, important content */
--text-secondary: #A1A1AA;    /* Secondary text - descriptions, labels */
--text-tertiary: #71717A;     /* Muted text - placeholders, hints */
--text-disabled: #52525B;     /* Disabled states */
```

### Accent Colours (from logo)
```css
--accent-purple: #8B5CF6;     /* Primary accent - buttons, links, active states */
--accent-purple-hover: #7C3AED;  /* Purple hover state */
--accent-purple-light: #A78BFA;  /* Lighter purple for subtle highlights */

--accent-orange: #F97316;     /* Secondary accent - highlights, warnings, CTAs */
--accent-orange-hover: #EA580C;  /* Orange hover state */
--accent-coral: #FB923C;      /* Lighter orange for gradients */
```

### Gradient
```css
--gradient-brand: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 25%, #F97316 75%, #FB923C 100%);
--gradient-subtle: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%);
```

### Semantic Colours
```css
--success: #22C55E;           /* Success states, positive indicators */
--success-bg: rgba(34, 197, 94, 0.1);
--warning: #EAB308;           /* Warnings, caution */
--warning-bg: rgba(234, 179, 8, 0.1);
--error: #EF4444;             /* Errors, destructive actions */
--error-bg: rgba(239, 68, 68, 0.1);
--info: #3B82F6;              /* Information */
--info-bg: rgba(59, 130, 246, 0.1);
```

### Macro Colours (for nutrition tracking)
```css
--macro-calories: #8B5CF6;    /* Purple - matches brand */
--macro-protein: #22C55E;     /* Green */
--macro-carbs: #EAB308;       /* Yellow/Gold */
--macro-fat: #EF4444;         /* Red */
--macro-fiber: #06B6D4;       /* Cyan */
```

---

## Typography

### Font Family
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Note:** If Inter is not already installed, add to `app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

### Type Scale
```css
--text-xs: 0.75rem;      /* 12px - Small labels, badges */
--text-sm: 0.875rem;     /* 14px - Secondary text, descriptions */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Large body, card titles */
--text-xl: 1.25rem;      /* 20px - Section headers */
--text-2xl: 1.5rem;      /* 24px - Page titles */
--text-3xl: 1.875rem;    /* 30px - Hero text */
--text-4xl: 2.25rem;     /* 36px - Large hero */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Typography Classes (Tailwind)
```
Page title:     text-2xl font-semibold text-white
Section title:  text-xl font-semibold text-white
Card title:     text-lg font-medium text-white
Body:           text-base text-zinc-300
Secondary:      text-sm text-zinc-400
Caption:        text-xs text-zinc-500
```

---

## Spacing

Use Tailwind's default spacing scale. Key values:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Spacing Guidelines
- **Card padding:** `p-6` (24px)
- **Section gaps:** `gap-6` or `gap-8`
- **Form field gaps:** `gap-4`
- **Inline element gaps:** `gap-2` or `gap-3`
- **Page margins:** `px-6` mobile, `px-8` desktop
- **Page max-width:** `max-w-7xl mx-auto`

---

## Border Radius

```css
--radius-sm: 0.375rem;    /* 6px - Small elements, badges */
--radius-md: 0.5rem;      /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;     /* 12px - Cards, panels */
--radius-xl: 1rem;        /* 16px - Large cards, modals */
--radius-full: 9999px;    /* Pills, avatars */
```

### Tailwind Classes
```
Badges, tags:     rounded-md
Buttons:          rounded-lg
Inputs:           rounded-lg
Cards:            rounded-xl
Modals:           rounded-xl
Avatars:          rounded-full
```

---

## Shadows

Keep shadows subtle on dark backgrounds:

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
--shadow-glow-purple: 0 0 20px rgba(139, 92, 246, 0.3);
--shadow-glow-orange: 0 0 20px rgba(249, 115, 22, 0.3);
```

---

## Components

### Buttons

#### Primary Button (Purple)
```tsx
<button className="
  bg-purple-600 
  hover:bg-purple-700 
  text-white 
  font-medium 
  px-4 py-2 
  rounded-lg 
  transition-colors
  focus:outline-none 
  focus:ring-2 
  focus:ring-purple-500 
  focus:ring-offset-2 
  focus:ring-offset-zinc-900
">
  Button Text
</button>
```

#### Secondary Button (Outline)
```tsx
<button className="
  bg-transparent 
  border border-zinc-700 
  hover:bg-zinc-800 
  hover:border-zinc-600
  text-zinc-300 
  font-medium 
  px-4 py-2 
  rounded-lg 
  transition-colors
">
  Button Text
</button>
```

#### Ghost Button
```tsx
<button className="
  bg-transparent 
  hover:bg-zinc-800 
  text-zinc-400 
  hover:text-zinc-200
  font-medium 
  px-4 py-2 
  rounded-lg 
  transition-colors
">
  Button Text
</button>
```

#### Danger Button
```tsx
<button className="
  bg-red-600 
  hover:bg-red-700 
  text-white 
  font-medium 
  px-4 py-2 
  rounded-lg 
  transition-colors
">
  Delete
</button>
```

#### Button Sizes
```
Small:    px-3 py-1.5 text-sm
Default:  px-4 py-2 text-base
Large:    px-6 py-3 text-lg
```

---

### Cards

#### Standard Card
```tsx
<div className="
  bg-zinc-900 
  border border-zinc-800 
  rounded-xl 
  p-6
">
  {/* Card content */}
</div>
```

#### Interactive Card (clickable)
```tsx
<div className="
  bg-zinc-900 
  border border-zinc-800 
  rounded-xl 
  p-6
  hover:bg-zinc-800/50
  hover:border-zinc-700
  transition-colors
  cursor-pointer
">
  {/* Card content */}
</div>
```

#### Featured Card (with gradient border)
```tsx
<div className="
  relative 
  bg-zinc-900 
  rounded-xl 
  p-6
  before:absolute 
  before:inset-0 
  before:rounded-xl 
  before:p-[1px] 
  before:bg-gradient-to-r 
  before:from-purple-600 
  before:to-orange-500
  before:-z-10
">
  {/* Card content */}
</div>
```

---

### Inputs

#### Text Input
```tsx
<input 
  type="text"
  className="
    w-full 
    bg-zinc-800 
    border border-zinc-700 
    rounded-lg 
    px-4 py-2.5
    text-white 
    placeholder-zinc-500
    focus:outline-none 
    focus:border-purple-500 
    focus:ring-1 
    focus:ring-purple-500
    transition-colors
  "
  placeholder="Enter text..."
/>
```

#### Input with Label
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-zinc-300">
    Label
  </label>
  <input 
    type="text"
    className="
      w-full 
      bg-zinc-800 
      border border-zinc-700 
      rounded-lg 
      px-4 py-2.5
      text-white 
      placeholder-zinc-500
      focus:outline-none 
      focus:border-purple-500 
      focus:ring-1 
      focus:ring-purple-500
    "
  />
  <p className="text-xs text-zinc-500">Helper text goes here</p>
</div>
```

#### Select Dropdown
```tsx
<select className="
  w-full 
  bg-zinc-800 
  border border-zinc-700 
  rounded-lg 
  px-4 py-2.5
  text-white 
  focus:outline-none 
  focus:border-purple-500 
  focus:ring-1 
  focus:ring-purple-500
  appearance-none
  cursor-pointer
">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Checkbox
```tsx
<label className="flex items-center gap-3 cursor-pointer">
  <input 
    type="checkbox"
    className="
      w-5 h-5 
      rounded 
      border-zinc-600 
      bg-zinc-800 
      text-purple-600 
      focus:ring-purple-500 
      focus:ring-offset-zinc-900
    "
  />
  <span className="text-zinc-300">Checkbox label</span>
</label>
```

---

### Navigation

#### Sidebar Navigation
```tsx
<nav className="
  w-64 
  h-screen 
  bg-zinc-900 
  border-r border-zinc-800 
  flex flex-col
">
  {/* Logo */}
  <div className="p-6 border-b border-zinc-800">
    <img src="/logo.png" alt="familyFuel" className="h-8" />
  </div>
  
  {/* Nav Items */}
  <div className="flex-1 p-4 space-y-1">
    {/* Active item */}
    <a className="
      flex items-center gap-3 
      px-4 py-2.5 
      rounded-lg 
      bg-purple-600/10 
      text-purple-400 
      font-medium
    ">
      <Icon className="w-5 h-5" />
      Active Item
    </a>
    
    {/* Inactive item */}
    <a className="
      flex items-center gap-3 
      px-4 py-2.5 
      rounded-lg 
      text-zinc-400 
      hover:text-zinc-200 
      hover:bg-zinc-800
      transition-colors
    ">
      <Icon className="w-5 h-5" />
      Inactive Item
    </a>
  </div>
  
  {/* Footer */}
  <div className="p-4 border-t border-zinc-800">
    {/* User menu, settings, etc */}
  </div>
</nav>
```

#### Header (if using top navigation)
```tsx
<header className="
  h-16 
  bg-zinc-900 
  border-b border-zinc-800 
  px-6 
  flex items-center justify-between
">
  <div className="flex items-center gap-4">
    <img src="/logo.png" alt="familyFuel" className="h-8" />
  </div>
  
  <div className="flex items-center gap-4">
    <span className="text-sm text-zinc-400">{userEmail}</span>
    <button className="
      text-sm text-zinc-400 
      hover:text-white 
      transition-colors
    ">
      Sign out
    </button>
  </div>
</header>
```

---

### Modals

```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

{/* Modal */}
<div className="
  fixed 
  top-1/2 left-1/2 
  -translate-x-1/2 -translate-y-1/2 
  w-full max-w-md 
  bg-zinc-900 
  border border-zinc-800 
  rounded-xl 
  p-6
  z-50
">
  <h2 className="text-xl font-semibold text-white mb-4">Modal Title</h2>
  
  {/* Content */}
  <div className="space-y-4">
    {/* ... */}
  </div>
  
  {/* Actions */}
  <div className="flex justify-end gap-3 mt-6">
    <button className="px-4 py-2 text-zinc-400 hover:text-white">
      Cancel
    </button>
    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
      Confirm
    </button>
  </div>
</div>
```

---

### Tags / Badges

#### Meal Type Tags
```tsx
{/* Use consistent colours for meal types */}
<span className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-600/20 text-purple-400">
  Dinner
</span>
<span className="px-2.5 py-1 text-xs font-medium rounded-md bg-orange-600/20 text-orange-400">
  Lunch
</span>
<span className="px-2.5 py-1 text-xs font-medium rounded-md bg-cyan-600/20 text-cyan-400">
  Breakfast
</span>
<span className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-600/20 text-green-400">
  Snack
</span>
```

#### Status Badges
```tsx
<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400">
  Finalized
</span>
<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-600/20 text-yellow-400">
  Draft
</span>
<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-600/20 text-zinc-400">
  Archived
</span>
```

---

### Progress Bars (Macro Tracking)

```tsx
{/* Container */}
<div className="space-y-1">
  <div className="flex justify-between text-sm">
    <span className="text-zinc-400">Protein</span>
    <span className="text-zinc-300">142g / 150g</span>
  </div>
  
  {/* Track */}
  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
    {/* Fill - under target */}
    <div 
      className="h-full bg-green-500 rounded-full transition-all"
      style={{ width: '94%' }}
    />
  </div>
</div>

{/* Over target - use gradient or warning colour */}
<div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
  <div 
    className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full"
    style={{ width: '110%' }}
  />
</div>
```

---

### Tables / Data Grids

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b border-zinc-800">
      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
      <td className="py-3 px-4 text-zinc-300">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

---

### Empty States

```tsx
<div className="
  flex flex-col items-center justify-center 
  py-16 
  text-center
  border-2 border-dashed border-zinc-800 
  rounded-xl
">
  <div className="w-12 h-12 mb-4 text-zinc-600">
    {/* Icon */}
  </div>
  <h3 className="text-lg font-medium text-zinc-300 mb-2">
    No items yet
  </h3>
  <p className="text-sm text-zinc-500 mb-6 max-w-sm">
    Get started by creating your first item.
  </p>
  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
    Create Item
  </button>
</div>
```

---

### Sarah's Nutritionist Panel

```tsx
<div className="
  bg-gradient-to-r from-purple-900/20 to-orange-900/20
  border border-purple-800/30
  rounded-xl 
  p-6
">
  <div className="flex items-start gap-4">
    {/* Avatar */}
    <img 
      src="/sarah-avatar.png" 
      alt="Sarah" 
      className="w-12 h-12 rounded-full"
    />
    
    <div className="flex-1">
      <h3 className="font-semibold text-white mb-2">
        Sarah's Nutritionist Feedback
      </h3>
      <p className="text-zinc-300 leading-relaxed">
        Hi Chris! This is a really solid choice for you...
      </p>
    </div>
  </div>
</div>
```

---

### Recipe Cards

```tsx
<div className="
  bg-zinc-900 
  border border-zinc-800 
  rounded-xl 
  overflow-hidden
  hover:border-zinc-700
  transition-colors
  group
">
  {/* Image */}
  <div className="
    h-40 
    bg-gradient-to-br from-purple-900/40 to-zinc-800
    flex items-center justify-center
  ">
    {/* Placeholder or actual image */}
    <span className="text-4xl">🍽️</span>
  </div>
  
  {/* Content */}
  <div className="p-4 space-y-3">
    <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
      Recipe Name
    </h3>
    
    <p className="text-sm text-zinc-400 line-clamp-2">
      Recipe description goes here...
    </p>
    
    {/* Tags */}
    <div className="flex gap-2">
      <span className="px-2 py-0.5 text-xs rounded bg-purple-600/20 text-purple-400">
        Dinner
      </span>
    </div>
    
    {/* Meta */}
    <div className="flex items-center gap-4 text-xs text-zinc-500">
      <span>4 servings</span>
      <span>40 min</span>
      <span>14 ingredients</span>
    </div>
    
    {/* Actions */}
    <div className="flex gap-2 pt-2">
      <button className="
        flex-1 py-2 
        border border-zinc-700 
        rounded-lg 
        text-sm text-zinc-300
        hover:bg-zinc-800
        transition-colors
      ">
        View/Edit
      </button>
      <button className="
        px-4 py-2 
        text-sm text-red-400
        hover:bg-red-900/20
        rounded-lg
        transition-colors
      ">
        Delete
      </button>
    </div>
  </div>
</div>
```

---

### Meal Plan Weekly Grid

```tsx
<div className="grid grid-cols-7 gap-4">
  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
    <div key={day} className="space-y-3">
      {/* Day header */}
      <h3 className="font-semibold text-white text-center py-2">
        {day}
      </h3>
      
      {/* Meal slots */}
      <div className="space-y-2">
        {/* Meal card */}
        <div className="
          bg-zinc-800/50 
          border border-zinc-700/50 
          rounded-lg 
          p-3
          hover:bg-zinc-800
          transition-colors
        ">
          <span className="text-xs text-purple-400 font-medium">Breakfast</span>
          <p className="text-sm text-zinc-300 mt-1">Overnight Oats</p>
          <span className="text-xs text-zinc-500">4 servings</span>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## Gradient Usage Guidelines

### Where to use the brand gradient:
1. **Logo** - Always
2. **Progress bars** - When over 100% (exceeding target)
3. **Featured/premium elements** - Sparingly for emphasis
4. **Sarah's panel border** - Subtle gradient border
5. **Hover states on primary actions** - Optional, subtle

### Where NOT to use gradient:
1. Body text
2. Standard buttons (use solid purple)
3. Backgrounds (too busy)
4. Every card (loses impact)

---

## Tailwind Config Updates

Add to `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom zinc scale for darker backgrounds
        zinc: {
          850: '#1E1E24',
          950: '#0D0D0F',
        },
        // Brand colours
        brand: {
          purple: '#8B5CF6',
          'purple-hover': '#7C3AED',
          orange: '#F97316',
          'orange-hover': '#EA580C',
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 25%, #F97316 75%, #FB923C 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Global CSS Updates

Add to `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-zinc-950 text-zinc-100 antialiased;
  }
  
  /* Custom scrollbar for dark theme */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-zinc-900;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-zinc-700 rounded-full;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-600;
  }
}

@layer components {
  /* Reusable component classes */
  .card {
    @apply bg-zinc-900 border border-zinc-800 rounded-xl p-6;
  }
  
  .card-interactive {
    @apply card hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer;
  }
  
  .btn-primary {
    @apply bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors;
  }
  
  .btn-secondary {
    @apply bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors;
  }
  
  .btn-ghost {
    @apply bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors;
  }
  
  .btn-danger {
    @apply bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors;
  }
  
  .input {
    @apply w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors;
  }
  
  .label {
    @apply block text-sm font-medium text-zinc-300 mb-2;
  }
}
```

---

## Implementation Order

For Claude Code, implement in this order:

### Phase 1: Foundation (Do First)
1. Update `tailwind.config.ts` with new colours and config
2. Update `app/globals.css` with base styles
3. Update `app/layout.tsx` with Inter font and dark background
4. Add logo file to `/public/`

### Phase 2: Core Components
5. Create/update Button component with all variants
6. Create/update Card component
7. Create/update Input, Select, Checkbox components
8. Create/update Badge/Tag components

### Phase 3: Layout
9. Update main navigation (sidebar or header)
10. Update page layouts and spacing

### Phase 4: Screens (one at a time)
11. Dashboard
12. Recipes list
13. Recipe detail
14. Meal Plans
15. Family Profiles
16. Settings

---

## Quick Reference

| Element | Classes |
|---------|---------|
| Page background | `bg-zinc-950` |
| Card background | `bg-zinc-900 border border-zinc-800 rounded-xl` |
| Primary button | `bg-purple-600 hover:bg-purple-700 text-white rounded-lg` |
| Input | `bg-zinc-800 border border-zinc-700 rounded-lg text-white` |
| Primary text | `text-white` |
| Secondary text | `text-zinc-400` |
| Muted text | `text-zinc-500` |
| Border | `border-zinc-800` |
| Focus ring | `focus:ring-purple-500` |

---

## Files to Update

The following files will need updates (Claude Code should check each):

```
app/
├── layout.tsx              # Font, base styles
├── globals.css             # Global styles
├── page.tsx                # Dashboard
├── recipes/
│   └── page.tsx            # Recipes list
├── meal-plans/
│   └── page.tsx            # Meal plans
├── profiles/
│   └── page.tsx            # Family profiles
└── ...

components/
├── ui/                     # All UI primitives
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── ...
├── Header.tsx              # Or Sidebar.tsx
├── RecipeCard.tsx
├── MealPlanGrid.tsx
├── NutritionPanel.tsx      # Sarah's feedback
└── ...

tailwind.config.ts          # Colour/font config
```

---

End of UI Style Guide.
