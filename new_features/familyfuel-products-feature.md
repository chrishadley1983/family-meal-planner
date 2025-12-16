# Claude Code Prompt: Products Management Feature

## Role

You are an Expert Full-Stack Developer specialising in Next.js 14, React, TypeScript, and Supabase. You write clean, maintainable, well-documented code following best practices. You implement features incrementally, testing at each phase before proceeding.

## Context

I'm building FamilyFuel, a family meal planning app with Next.js 14 and Supabase. I need to implement a **Products Management** feature - a system for managing ready-made branded products (snacks, ready meals, convenience items) that can be:
- Used as standalone snacks in meal plans
- Added as ingredients to recipes
- Tracked in inventory
- Added to staples for recurring purchase

**Review my development guidelines in `Claude.md` at the project root before starting.**

## Current State

The app already has:
- **Staples Engine** - recurring items management with add methods (Manual, URL, Photo, CTRL+V)
- **Inventory System** - item tracking with expiry dates
- **Recipe Management** - with ingredients, ratings, macros
- **Meal Planning** - with slots for Breakfast, Lunch, Dinner, Morning Snack, Afternoon Snack, Evening Snack
- **Ingredient Database** - 1200+ UK grocery items with shelf life data
- **AI Integration** - Claude API for macro analysis, de-duplication, photo recognition

Products are distinct from raw ingredients - they are branded, ready-to-consume items like:
- Nairn's Oat Cakes
- Tesco Lasagne Ready Meal
- Birds Eye Chicken Nuggets
- Nakd Bars
- Graze Protein Bites

---

## Feature Requirements

### 1. Data Model: Products

#### Core Fields (align with existing naming conventions)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Auto-generated primary key |
| `family_id` | UUID | Yes | FK to families table |
| `name` | String(255) | Yes | Product name (e.g., "Protein Oat Bites") |
| `brand` | String(255) | No | Brand name (e.g., "Graze") |
| `notes` | Text | No | User notes, storage tips, etc. |
| `quantity` | Decimal | Yes | Amount per unit/serving |
| `unit_of_measure` | String(50) | Yes | From existing UOM config (g, ml, pieces, etc.) |
| `category` | String(100) | Yes | From existing categories (Snacks, Ready Meals, Frozen, etc.) |
| `barcode` | String(50) | No | EAN/UPC barcode for future scanning |
| `image_url` | String | No | Product image (Supabase Storage) |
| `source_url` | String | No | Original URL if imported from web |
| `calories_per_serving` | Integer | No | kcal per serving |
| `protein_per_serving` | Decimal | No | grams |
| `carbs_per_serving` | Decimal | No | grams |
| `fat_per_serving` | Decimal | No | grams |
| `fiber_per_serving` | Decimal | No | grams |
| `sugar_per_serving` | Decimal | No | grams |
| `saturated_fat_per_serving` | Decimal | No | grams |
| `sodium_per_serving` | Decimal | No | milligrams |
| `serving_size` | String(100) | No | Human-readable serving (e.g., "1 bar (35g)") |
| `is_snack` | Boolean | Yes | Default: false. If true, available for snack slots in meal plan |
| `is_active` | Boolean | Yes | Default: true. Soft delete/archive |
| `family_rating` | Integer | No | 1-10 scale (matches recipe rating) |
| `times_used` | Integer | Yes | Default: 0. Counter for usage in meal plans |
| `created_at` | Timestamp | Yes | Auto-generated |
| `updated_at` | Timestamp | Yes | Auto-updated |
| `created_by` | UUID | No | FK to user who created |

#### Product Categories (extend existing or new)

Add new category options specifically for products:
- Ready Meals
- Snack Bars
- Crisps & Savoury Snacks
- Yoghurts & Dairy Snacks
- Biscuits & Sweet Snacks
- Nuts & Seeds
- Fruit Snacks
- Frozen Snacks
- Drinks & Smoothies

#### Indexes Required

```sql
CREATE INDEX idx_products_family_id ON products(family_id);
CREATE INDEX idx_products_is_snack ON products(family_id, is_snack) WHERE is_active = true;
CREATE INDEX idx_products_category ON products(family_id, category);
CREATE INDEX idx_products_brand ON products(family_id, brand);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
```

---

### 2. Input Methods (Mirror Staples Pattern)

Copy the add flow from Staples Engine with the following input methods:

#### 2.1 Manual Entry
- Form with all fields
- Category dropdown from config
- UOM dropdown from config
- Macro fields grouped in collapsible section
- Toggle switches for `is_snack`
- Optional rating slider (1-10)

#### 2.2 URL Import
- Paste product URL (Tesco, Sainsbury's, ASDA, Ocado, etc.)
- AI extracts: name, brand, macros, serving size, image
- User reviews and confirms before saving
- Store source_url for reference

#### 2.3 Photo Capture/Upload
- Camera or file picker
- AI analyses image to extract:
  - Product name from packaging
  - Brand
  - Nutritional info from label (if visible)
- Pre-populate form for user review
- Store image in Supabase Storage

#### 2.4 Clipboard Paste (CTRL+V)
- Paste text from product page/nutrition label
- AI parses text to extract fields
- Pre-populate form for user review

#### Input Method UI
- Tab bar or segmented control: Manual | URL | Photo | Paste
- Consistent form layout across all methods
- "Add & Create Another" option for bulk entry

---

### 3. Product CRUD Operations

#### 3.1 Products Dashboard (`/products`)

**List View:**
- Table layout matching Staples/Inventory pattern
- Columns: Image (thumbnail), Name, Brand, Category, Macros (compact), Rating, Snack badge, Actions
- Inline editing for quick updates
- Bulk select for delete/archive

**Filtering:**
- By category (dropdown)
- By brand (dropdown, populated from existing products)
- Snacks only toggle
- Search by name/brand

**Sorting:**
- Name (A-Z, Z-A)
- Brand (A-Z, Z-A)
- Rating (High-Low, Low-High)
- Most used
- Recently added

**Actions:**
- Add Product (opens modal with input method tabs)
- Edit (inline or modal)
- Delete (soft delete with confirmation)
- Duplicate (copy product with "Copy of" prefix)
- Add to Inventory (with expiry prompt)
- Add to Staples (with frequency selection)

#### 3.2 Add/Edit Product Modal

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Add Product                              [X Close]  │
├─────────────────────────────────────────────────────┤
│ [Manual] [URL] [Photo] [Paste]                      │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Product Image]        Name: ____________       │ │
│ │                        Brand: ____________      │ │
│ │                        Category: [Dropdown]     │ │
│ │                        Quantity: ____ [UOM ▼]   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Notes: ________________________________________     │
│                                                     │
│ ▼ Nutritional Information                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Serving Size: ____________                      │ │
│ │ Calories: ____  Protein: ____g  Carbs: ____g   │ │
│ │ Fat: ____g  Fiber: ____g  Sugar: ____g         │ │
│ │ Sat Fat: ____g  Sodium: ____mg                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [✓] This is a snack (available in meal plan)   │ │
│ │ Rating: ○○○○○○○○○○ (1-10)                      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ▼ Quick Actions                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [✓] Add to Inventory    Expiry: [Date Picker]  │ │
│ │ [ ] Add to Staples      Frequency: [Dropdown]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│          [Cancel]              [Save Product]       │
└─────────────────────────────────────────────────────┘
```

#### 3.3 Quick Actions on Save

**Add to Inventory:**
- When toggled, show date picker for expiry
- AI suggests expiry based on category (use existing shelf_life logic)
- Creates inventory record linked to product

**Add to Staples:**
- When toggled, show frequency dropdown (Weekly, Every 2 Weeks, Every 4 Weeks, Every 3 Months)
- Creates staple record linked to product

---

### 4. Integration: Products in Recipes

#### 4.1 Recipe Add/Edit Enhancement

On the Recipe Add/Edit screen, add ability to include products as "ingredients":

**Current Flow:**
- Ingredients section with inline add for raw ingredients

**New Flow:**
- Above ingredient list, add: `[+ Add Ingredient] [+ Add Product]`
- "Add Product" opens a product search popup

#### 4.2 Product Search Popup

```
┌─────────────────────────────────────────────────────┐
│ Add Product to Recipe                    [X Close]  │
├─────────────────────────────────────────────────────┤
│ 🔍 Search products...                               │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Img] Nakd Blueberry Muffin Bar                 │ │
│ │       35g | 136 kcal | ★★★★★★★★☆☆               │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ [Img] Birds Eye Chicken Nuggets                 │ │
│ │       240g | 215 kcal | ★★★★★★★☆☆☆              │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ [Img] Tesco Cheese & Onion Crisps               │ │
│ │       25g | 132 kcal | ★★★★★★☆☆☆☆               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Filter: [All ▼] [Snacks Only]                       │
│                                                     │
│ Don't see it? [+ Create New Product]                │
└─────────────────────────────────────────────────────┘
```

**On Selection:**
- Product added to recipe's ingredient list
- Displayed differently (with product badge/icon)
- Quantity adjustable (e.g., "2 x Nakd Bars")
- Macros auto-calculated and added to recipe totals

#### 4.3 Recipe Ingredient Data Structure

Extend recipe_ingredients table or create junction table:

```sql
-- Option A: Add product_id to existing recipe_ingredients
ALTER TABLE recipe_ingredients 
ADD COLUMN product_id UUID REFERENCES products(id),
ADD COLUMN is_product BOOLEAN DEFAULT false;

-- Constraint: either ingredient_id OR product_id, not both
ALTER TABLE recipe_ingredients
ADD CONSTRAINT chk_ingredient_or_product 
CHECK (
  (ingredient_id IS NOT NULL AND product_id IS NULL AND is_product = false) OR
  (ingredient_id IS NULL AND product_id IS NOT NULL AND is_product = true)
);
```

---

### 5. Integration: Products in Meal Planning

#### 5.1 Snack Slot Assignment

Products flagged as `is_snack = true` can be assigned to snack slots:
- Morning Snack
- Afternoon Snack  
- Evening Snack

**Assignment Flow:**
- Click empty snack slot
- Opens selector showing: Recipes (meal category = snack) + Products (is_snack = true)
- Tab interface: `[Recipes] [Products]`
- Search and filter within each tab
- Select to assign

#### 5.2 AI Meal Plan Generation

When generating meal plans with AI:
- Include snack products in the generation prompt context
- AI can suggest products for snack slots based on:
  - Family preferences
  - Macro targets (choose products that help meet daily goals)
  - Ratings (prefer higher-rated products)
  - Variety (don't repeat same product too often)

#### 5.3 Snack Selection Weighting

For AI-assisted snack selection, consider:
- `family_rating` - higher rated products preferred
- `times_used` - balance between favorites and variety
- Macro fit - products that complement the day's other meals
- Category variety - don't suggest 3 x crisps in one day

---

### 6. Product Ratings

#### 6.1 Rating System
- 1-10 integer scale (matches recipe rating)
- Can be set on create/edit
- Can be updated inline from list view
- Visual: 10 dots/stars, filled to indicate rating

#### 6.2 Rating Prompt
- After a product is used in a meal plan for the first time, optionally prompt:
  "How was [Product Name]? Rate 1-10"
- Update `family_rating` and increment `times_used`

---

### 7. UI/UX Requirements

#### 7.1 Styling (align with recent updates)

**Dark theme** with brand colours:
- Background: Dark slate (#0f172a or similar)
- Cards: Slightly lighter (#1e293b)
- Accent: Orange/amber gradient (brand flame)
- Text: White/slate-300
- Borders: Subtle slate-700

**Component Patterns:**
- Cards with rounded corners (rounded-xl)
- Gradient buttons for primary actions
- Subtle hover states
- Consistent spacing (p-4, gap-4)
- Loading skeletons for async data

#### 7.2 Responsive Design
- Desktop: Full table view with all columns
- Tablet: Condensed table, hide less important columns
- Mobile: Card-based list view

#### 7.3 Navigation
- Add "Products" to main navigation (after Inventory or Staples)
- Icon suggestion: Box/Package icon or Shopping Bag

---

### 8. Snack Products → Recipe Database Sync

When a product is flagged as `is_snack = true`, it must be automatically added to the Recipe Database as a snack recipe. This ensures the AI meal plan generator can include it when generating meal plans.

#### 8.1 Sync Logic

**On Product Create/Update:**
- If `is_snack` is set to `true`:
  - Check if a linked recipe already exists for this product
  - If not, create a new recipe with:
    - `recipe_name`: Product name (+ brand if present)
    - `meal_category`: ['Snack']
    - `servings`: 1
    - `prep_time_minutes`: 0
    - `cook_time_minutes`: 0
    - `difficulty_level`: 'Easy'
    - `is_product_recipe`: true (new flag)
    - `source_product_id`: product.id (new FK)
    - Macros copied from product
    - Single ingredient: the product itself
  - Store the recipe_id on the product record

- If `is_snack` is changed from `true` to `false`:
  - Soft-delete the linked recipe (set `is_active = false`)
  - Or optionally prompt user: "Remove from recipe library?"

**Recipe Display:**
- Product-based recipes shown with a "Product" badge in recipe library
- Not directly editable (changes flow from product)
- Can be included in meal plans like any other recipe

#### 8.2 Database Changes for Sync

```sql
-- Add to products table
ALTER TABLE products 
ADD COLUMN linked_recipe_id UUID REFERENCES recipes(id);

-- Add to recipes table
ALTER TABLE recipes
ADD COLUMN is_product_recipe BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN source_product_id UUID REFERENCES products(id);

-- Index for lookups
CREATE INDEX idx_recipes_source_product ON recipes(source_product_id) 
WHERE source_product_id IS NOT NULL;
```

#### 8.3 TypeScript Types for Sync

```typescript
// Extend Product type
export interface Product {
  // ... existing fields ...
  linked_recipe_id: string | null;
}

// Extend Recipe type
export interface Recipe {
  // ... existing fields ...
  is_product_recipe: boolean;
  source_product_id: string | null;
}
```

---

### 9. CSV Import for Bulk Product Loading

Allow users to import multiple products at once via CSV file upload.

#### 9.1 CSV Import Flow

1. User clicks "Import CSV" button on Products dashboard
2. File picker opens (accepts .csv files)
3. System parses CSV and validates:
   - Required columns present
   - Data types correct
   - Values within constraints
4. Preview screen shows:
   - Valid rows (green) - ready to import
   - Invalid rows (red) - with error messages
   - Duplicate detection (amber) - matches existing products
5. User can:
   - Edit individual rows inline
   - Remove rows from import
   - Proceed with valid rows only
6. On confirm:
   - Products created in batch
   - Snack products trigger recipe sync
   - Summary shown: "X products imported, Y skipped"

#### 9.2 CSV Template

Provide downloadable template with headers:

```csv
name,brand,category,quantity,unit_of_measure,serving_size,calories_per_serving,protein_per_serving,carbs_per_serving,fat_per_serving,fiber_per_serving,sugar_per_serving,is_snack,notes
"Protein Oat Bites","Graze","Snack Bars",29,g,"1 pack (29g)",131,3,17,5,2,6,true,"Good for afternoon snack"
"Chicken Nuggets","Birds Eye","Frozen Snacks",240,g,"6 pieces (80g)",215,12,18,10,1,1,false,""
```

**Required columns:**
- name
- category
- quantity
- unit_of_measure

**Optional columns (all others):**
- brand, notes, serving_size
- All macro fields
- is_snack (defaults to false)

#### 9.3 CSV Import UI

```
┌─────────────────────────────────────────────────────────────┐
│ Import Products from CSV                         [X Close]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     📄 Drag & drop CSV file here                   │   │
│  │        or click to browse                          │   │
│  │                                                     │   │
│  │     [Download Template]                            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Preview (after file selected):                              │
│                                                             │
│  ✓ 47 valid rows ready to import                           │
│  ⚠ 3 rows with warnings (possible duplicates)              │
│  ✗ 2 rows with errors                                      │
│                                                             │
│  [Show All] [Show Errors Only] [Show Warnings Only]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Row │ Status │ Name           │ Brand    │ Issue    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 3   │ ✗      │ Oat Bars       │ Graze    │ Missing  │   │
│  │     │        │                │          │ category │   │
│  │ 7   │ ⚠      │ Nakd Bar       │ Nakd     │ Possible │   │
│  │     │        │                │          │ duplicate│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ ] Import snack products to Recipe Library               │
│                                                             │
│        [Cancel]              [Import 47 Products]           │
└─────────────────────────────────────────────────────────────┘
```

#### 9.4 CSV Import API

```typescript
// app/api/products/import-csv/route.ts

// POST /api/products/import-csv
// Body: FormData with CSV file
// Returns: {
//   valid: ProductCreate[],
//   warnings: { row: number, product: ProductCreate, message: string }[],
//   errors: { row: number, data: any, message: string }[]
// }

// POST /api/products/import-csv/confirm
// Body: { products: ProductCreate[], sync_snacks_to_recipes: boolean }
// Returns: { imported: number, skipped: number, recipes_created: number }
```

#### 9.5 Validation Rules

```typescript
const CSV_VALIDATION_RULES = {
  name: { required: true, maxLength: 255 },
  brand: { required: false, maxLength: 255 },
  category: { required: true, enum: PRODUCT_CATEGORIES },
  quantity: { required: true, type: 'number', min: 0.01 },
  unit_of_measure: { required: true, enum: UNITS_OF_MEASURE },
  calories_per_serving: { required: false, type: 'integer', min: 0 },
  protein_per_serving: { required: false, type: 'number', min: 0 },
  carbs_per_serving: { required: false, type: 'number', min: 0 },
  fat_per_serving: { required: false, type: 'number', min: 0 },
  is_snack: { required: false, type: 'boolean', default: false },
  // ... etc
};
```

#### 9.6 Duplicate Detection

When importing, check for potential duplicates:
- Exact name match (case-insensitive)
- Name + brand match
- Fuzzy name match (Levenshtein distance < 3)

Show as warnings, let user decide whether to:
- Skip the duplicate
- Import anyway (creates new record)
- Update existing record

### Products Table

```sql
-- Migration: YYYYMMDDHHMMSS_create_products_table.sql

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  notes TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'pieces',
  category VARCHAR(100) NOT NULL DEFAULT 'Snacks',
  barcode VARCHAR(50),
  image_url TEXT,
  source_url TEXT,
  
  -- Nutritional info
  calories_per_serving INTEGER,
  protein_per_serving DECIMAL(6,2),
  carbs_per_serving DECIMAL(6,2),
  fat_per_serving DECIMAL(6,2),
  fiber_per_serving DECIMAL(6,2),
  sugar_per_serving DECIMAL(6,2),
  saturated_fat_per_serving DECIMAL(6,2),
  sodium_per_serving DECIMAL(8,2),
  serving_size VARCHAR(100),
  
  -- Flags and metrics
  is_snack BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  family_rating INTEGER CHECK (family_rating >= 1 AND family_rating <= 10),
  times_used INTEGER NOT NULL DEFAULT 0,
  
  -- Recipe sync (for snack products)
  linked_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_products_family_id ON products(family_id);
CREATE INDEX idx_products_is_snack ON products(family_id, is_snack) WHERE is_active = true;
CREATE INDEX idx_products_category ON products(family_id, category);
CREATE INDEX idx_products_brand ON products(family_id, brand);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(brand, '')));
CREATE INDEX idx_products_linked_recipe ON products(linked_recipe_id) WHERE linked_recipe_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products for their family"
  ON products FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert products for their family"
  ON products FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update products for their family"
  ON products FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete products for their family"
  ON products FOR DELETE
  USING (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));
```

### Recipes Table Extension (for Product-Recipe Sync)

```sql
-- Migration: YYYYMMDDHHMMSS_add_product_recipe_fields.sql

ALTER TABLE recipes
ADD COLUMN is_product_recipe BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN source_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Index for product recipe lookups
CREATE INDEX idx_recipes_source_product ON recipes(source_product_id) 
WHERE source_product_id IS NOT NULL;

-- Index for filtering product recipes
CREATE INDEX idx_recipes_is_product_recipe ON recipes(family_id, is_product_recipe) 
WHERE is_product_recipe = true;
```

### Recipe Ingredients Extension

```sql
-- Migration: YYYYMMDDHHMMSS_add_product_to_recipe_ingredients.sql

ALTER TABLE recipe_ingredients 
ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN is_product BOOLEAN NOT NULL DEFAULT false;

-- Constraint: either ingredient or product, not both
ALTER TABLE recipe_ingredients
ADD CONSTRAINT chk_ingredient_or_product 
CHECK (
  (is_product = false AND product_id IS NULL) OR
  (is_product = true AND product_id IS NOT NULL)
);

-- Index for product lookups
CREATE INDEX idx_recipe_ingredients_product_id ON recipe_ingredients(product_id) WHERE product_id IS NOT NULL;
```

### Meal Plan Products Junction (for snack slots)

```sql
-- Migration: YYYYMMDDHHMMSS_create_meal_plan_products.sql

CREATE TABLE meal_plan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_slot VARCHAR(50) NOT NULL CHECK (meal_slot IN ('morning_snack', 'afternoon_snack', 'evening_snack')),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(meal_plan_id, day_of_week, meal_slot)
);

CREATE INDEX idx_meal_plan_products_meal_plan ON meal_plan_products(meal_plan_id);
CREATE INDEX idx_meal_plan_products_product ON meal_plan_products(product_id);

-- RLS
ALTER TABLE meal_plan_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage meal plan products for their family"
  ON meal_plan_products FOR ALL
  USING (meal_plan_id IN (
    SELECT mp.id FROM meal_plans mp
    JOIN families f ON mp.family_id = f.id
    JOIN family_members fm ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
  ));
```

---

## TypeScript Types

```typescript
// types/product.ts

export interface Product {
  id: string;
  family_id: string;
  name: string;
  brand: string | null;
  notes: string | null;
  quantity: number;
  unit_of_measure: string;
  category: string;
  barcode: string | null;
  image_url: string | null;
  source_url: string | null;
  
  // Nutritional info
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  fiber_per_serving: number | null;
  sugar_per_serving: number | null;
  saturated_fat_per_serving: number | null;
  sodium_per_serving: number | null;
  serving_size: string | null;
  
  // Flags and metrics
  is_snack: boolean;
  is_active: boolean;
  family_rating: number | null;
  times_used: number;
  
  // Recipe sync (for snack products)
  linked_recipe_id: string | null;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProductCreate {
  name: string;
  brand?: string;
  notes?: string;
  quantity: number;
  unit_of_measure: string;
  category: string;
  barcode?: string;
  image_url?: string;
  source_url?: string;
  calories_per_serving?: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  fiber_per_serving?: number;
  sugar_per_serving?: number;
  saturated_fat_per_serving?: number;
  sodium_per_serving?: number;
  serving_size?: string;
  is_snack?: boolean;
  family_rating?: number;
}

export interface ProductUpdate extends Partial<ProductCreate> {
  is_active?: boolean;
  times_used?: number;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  is_snack?: boolean;
  search?: string;
}

export interface ProductSortOptions {
  field: 'name' | 'brand' | 'family_rating' | 'times_used' | 'created_at';
  direction: 'asc' | 'desc';
}

// For recipe integration
export interface RecipeIngredientWithProduct {
  id: string;
  recipe_id: string;
  ingredient_id: string | null;
  product_id: string | null;
  is_product: boolean;
  quantity: number;
  unit_of_measure: string;
  notes: string | null;
  
  // Joined data
  ingredient?: Ingredient;
  product?: Product;
}

// For meal plan integration
export interface MealPlanProduct {
  id: string;
  meal_plan_id: string;
  product_id: string;
  day_of_week: number;
  meal_slot: 'morning_snack' | 'afternoon_snack' | 'evening_snack';
  quantity: number;
  created_at: string;
  
  // Joined
  product?: Product;
}

// Product categories (extend existing)
export const PRODUCT_CATEGORIES = [
  'Ready Meals',
  'Snack Bars',
  'Crisps & Savoury Snacks',
  'Yoghurts & Dairy Snacks',
  'Biscuits & Sweet Snacks',
  'Nuts & Seeds',
  'Fruit Snacks',
  'Frozen Snacks',
  'Drinks & Smoothies',
  'Other'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
```

---

## API Endpoints

### Products CRUD

```typescript
// app/api/products/route.ts

// GET /api/products - List products with filters
// Query params: category, brand, is_snack, search, sort, direction, page, limit

// POST /api/products - Create product
// Body: ProductCreate

// app/api/products/[id]/route.ts

// GET /api/products/[id] - Get single product
// PATCH /api/products/[id] - Update product
// DELETE /api/products/[id] - Soft delete (set is_active = false)
```

### AI Endpoints

```typescript
// app/api/products/parse-url/route.ts
// POST - Parse product URL and extract details
// Body: { url: string }
// Returns: Partial<ProductCreate>

// app/api/products/parse-image/route.ts
// POST - Analyse product image
// Body: FormData with image
// Returns: Partial<ProductCreate>

// app/api/products/parse-text/route.ts
// POST - Parse pasted text
// Body: { text: string }
// Returns: Partial<ProductCreate>
```

### Integration Endpoints

```typescript
// app/api/products/[id]/add-to-inventory/route.ts
// POST - Add product to inventory
// Body: { expiry_date?: string }

// app/api/products/[id]/add-to-staples/route.ts
// POST - Add product to staples
// Body: { frequency: string }
```

### CSV Import Endpoints

```typescript
// app/api/products/import-csv/route.ts
// POST - Parse and validate CSV file
// Body: FormData with CSV file
// Returns: {
//   valid: ProductCreate[],
//   warnings: { row: number, product: ProductCreate, message: string }[],
//   errors: { row: number, data: any, message: string }[]
// }

// app/api/products/import-csv/confirm/route.ts
// POST - Confirm and execute CSV import
// Body: { products: ProductCreate[], sync_snacks_to_recipes: boolean }
// Returns: { imported: number, skipped: number, recipes_created: number }

// app/api/products/import-csv/template/route.ts
// GET - Download CSV template file
// Returns: CSV file with headers and example row
```

### Snack-Recipe Sync Endpoint

```typescript
// app/api/products/[id]/sync-recipe/route.ts
// POST - Manually trigger recipe sync for a snack product
// Called automatically when is_snack is toggled to true
// Returns: { recipe_id: string, created: boolean }
```

---

## AI Prompts

### URL Parser Prompt

```typescript
// prompts/product-url-parser.ts

export const PRODUCT_URL_PARSER_PROMPT = `
You are a product data extraction assistant. Extract product information from the provided URL content.

Extract the following fields if available:
- name: Product name (without brand prefix if brand is separate)
- brand: Brand/manufacturer name
- quantity: Numeric amount per unit
- unit_of_measure: g, ml, pieces, etc.
- category: Best fit from [Ready Meals, Snack Bars, Crisps & Savoury Snacks, Yoghurts & Dairy Snacks, Biscuits & Sweet Snacks, Nuts & Seeds, Fruit Snacks, Frozen Snacks, Drinks & Smoothies, Other]
- serving_size: Human-readable serving description
- calories_per_serving: kcal per serving
- protein_per_serving: grams
- carbs_per_serving: grams
- fat_per_serving: grams
- fiber_per_serving: grams
- sugar_per_serving: grams
- saturated_fat_per_serving: grams
- sodium_per_serving: milligrams (convert from g if needed)
- is_snack: true if this is a snack item, false for ready meals

Respond with valid JSON only. Use null for missing values.
`;
```

### Image Parser Prompt

```typescript
// prompts/product-image-parser.ts

export const PRODUCT_IMAGE_PARSER_PROMPT = `
You are analysing a product image. Extract any visible information from the packaging.

Look for:
1. Product name (front of pack)
2. Brand/logo
3. Nutritional information panel (per serving or per 100g)
4. Weight/volume
5. Serving suggestions

Extract and return as JSON with these fields:
- name, brand, quantity, unit_of_measure
- Nutritional values if visible
- is_snack: determine from product type

If nutritional info shows "per 100g", note this in serving_size.
Use null for anything not clearly visible.
`;
```

---

## File Structure

```
src/
├── app/
│   ├── products/
│   │   └── page.tsx                    # Products dashboard
│   └── api/
│       └── products/
│           ├── route.ts                # List/Create
│           ├── [id]/
│           │   ├── route.ts            # Get/Update/Delete
│           │   ├── add-to-inventory/
│           │   │   └── route.ts
│           │   ├── add-to-staples/
│           │   │   └── route.ts
│           │   └── sync-recipe/
│           │       └── route.ts        # Snack-recipe sync
│           ├── parse-url/
│           │   └── route.ts
│           ├── parse-image/
│           │   └── route.ts
│           ├── parse-text/
│           │   └── route.ts
│           └── import-csv/
│               ├── route.ts            # Parse/validate CSV
│               ├── confirm/
│               │   └── route.ts        # Execute import
│               └── template/
│                   └── route.ts        # Download template
├── components/
│   └── products/
│       ├── ProductsTable.tsx           # Main list view
│       ├── ProductCard.tsx             # Card for mobile/grid view
│       ├── ProductModal.tsx            # Add/Edit modal
│       ├── ProductForm.tsx             # Form fields
│       ├── ProductInputTabs.tsx        # Manual/URL/Photo/Paste tabs
│       ├── ProductFilters.tsx          # Filter controls
│       ├── ProductSearchPopup.tsx      # For recipe integration
│       ├── ProductRating.tsx           # Rating display/input
│       ├── MacroDisplay.tsx            # Compact macro badges
│       ├── CSVImportModal.tsx          # CSV import modal
│       ├── CSVPreviewTable.tsx         # Preview imported rows
│       └── ProductBadge.tsx            # "Product" badge for recipes
├── lib/
│   ├── types/
│   │   └── product.ts                  # TypeScript types
│   ├── api/
│   │   └── products.ts                 # API client functions
│   ├── utils/
│   │   ├── csv-parser.ts               # CSV parsing utilities
│   │   └── product-recipe-sync.ts      # Snack-to-recipe sync logic
│   └── prompts/
│       ├── product-url-parser.ts
│       ├── product-image-parser.ts
│       └── product-text-parser.ts
└── hooks/
    └── useProducts.ts                  # Data fetching hook
```

---

## Implementation Phases

### Phase 1: Database & Types
- [ ] Create products migration (including linked_recipe_id)
- [ ] Create recipes table extension migration (is_product_recipe, source_product_id)
- [ ] Create meal_plan_products migration
- [ ] Extend recipe_ingredients migration
- [ ] Create TypeScript types
- [ ] Run migrations, verify schema

**Checkpoint:** Can query empty products table, recipes table has new columns

### Phase 2: Products Dashboard (List View)
- [ ] Create `/products` page
- [ ] Implement ProductsTable component
- [ ] Add navigation item
- [ ] Implement GET /api/products endpoint
- [ ] Add filtering and sorting

**Checkpoint:** Can view products list (empty state)

### Phase 3: Manual Add/Edit
- [ ] Create ProductModal component
- [ ] Create ProductForm component
- [ ] Implement POST /api/products endpoint
- [ ] Implement PATCH /api/products/[id] endpoint
- [ ] Implement DELETE /api/products/[id] endpoint
- [ ] Add inline editing to table

**Checkpoint:** Can CRUD products manually

### Phase 4: Snack-Recipe Sync
- [ ] Create product-recipe-sync.ts utility
- [ ] Implement sync-recipe endpoint
- [ ] Hook sync into product create/update flow
- [ ] When is_snack = true, auto-create linked recipe
- [ ] When is_snack changed to false, soft-delete linked recipe
- [ ] Add "Product" badge to recipe library for product recipes
- [ ] Product recipes not directly editable (read-only with link to product)

**Checkpoint:** Creating a snack product auto-creates a recipe; AI meal planner can select product-recipes

### Phase 5: Input Methods (URL, Photo, Paste)
- [ ] Create ProductInputTabs component
- [ ] Implement URL parser endpoint + AI prompt (claude-haiku-4-5)
- [ ] Implement Image parser endpoint + AI prompt (claude-haiku-4-5)
- [ ] Implement Text parser endpoint + AI prompt (claude-haiku-4-5)
- [ ] Integrate all input methods into modal

**Checkpoint:** Can add products via all 4 methods

### Phase 6: CSV Import
- [ ] Create CSVImportModal component
- [ ] Create CSVPreviewTable component
- [ ] Implement csv-parser.ts utility
- [ ] Implement /import-csv endpoint (parse & validate)
- [ ] Implement /import-csv/confirm endpoint (execute import)
- [ ] Implement /import-csv/template endpoint (download template)
- [ ] Add duplicate detection (exact match, fuzzy match)
- [ ] Batch trigger snack-recipe sync for imported snacks
- [ ] Add "Import CSV" button to Products dashboard

**Checkpoint:** Can import 50+ products via CSV with validation and preview

### Phase 7: Quick Actions (Inventory & Staples)
- [ ] Add checkbox toggles to form
- [ ] Implement add-to-inventory endpoint
- [ ] Implement add-to-staples endpoint
- [ ] Add AI expiry calculation

**Checkpoint:** Can add product and simultaneously create inventory/staple entries

### Phase 8: Recipe Integration
- [ ] Create ProductSearchPopup component
- [ ] Add "Add Product" button to recipe form
- [ ] Extend recipe ingredient display for products
- [ ] Update macro calculation to include products

**Checkpoint:** Can add products to recipes as ingredients

### Phase 9: Meal Plan Integration
- [ ] Update snack slot UI to show Products tab
- [ ] Implement meal_plan_products CRUD
- [ ] Update meal plan display to show products
- [ ] Update AI meal plan generation prompt to include product-recipes

**Checkpoint:** Can assign snack products to meal plan slots; AI includes product-snacks in generation

### Phase 10: Ratings & Polish
- [ ] Implement ProductRating component
- [ ] Add rating prompt after first use
- [ ] Responsive design (mobile cards)
- [ ] Loading states and error handling
- [ ] Empty states

**Checkpoint:** Full feature complete

---

## Testing Checklist

- [ ] Can create product manually with all fields
- [ ] Can create product via URL import (test Tesco, Sainsbury's)
- [ ] Can create product via photo upload
- [ ] Can create product via clipboard paste
- [ ] Can edit product inline and via modal
- [ ] Can delete (soft delete) product
- [ ] Can filter by category, brand, snack status
- [ ] Can sort by all available fields
- [ ] Can search by name and brand
- [ ] **Snack-Recipe Sync:** Setting is_snack=true auto-creates linked recipe
- [ ] **Snack-Recipe Sync:** Linked recipe appears in Recipe Library with "Product" badge
- [ ] **Snack-Recipe Sync:** Linked recipe is not directly editable
- [ ] **Snack-Recipe Sync:** Setting is_snack=false soft-deletes linked recipe
- [ ] **Snack-Recipe Sync:** AI meal planner can select product-recipes for snack slots
- [ ] **CSV Import:** Can download CSV template
- [ ] **CSV Import:** Can upload and parse CSV file
- [ ] **CSV Import:** Validation errors shown correctly
- [ ] **CSV Import:** Duplicate warnings shown correctly
- [ ] **CSV Import:** Can import valid rows (50+ products)
- [ ] **CSV Import:** Snack products trigger recipe sync on import
- [ ] Can add product to inventory with expiry
- [ ] Can add product to staples with frequency
- [ ] Can add product to recipe as ingredient
- [ ] Product macros calculate correctly in recipe
- [ ] Can assign snack product to meal plan slot
- [ ] Can rate product (1-10)
- [ ] times_used increments correctly
- [ ] RLS policies work correctly
- [ ] Mobile view displays card layout
- [ ] All loading and error states work

---

## Dependencies on Existing Code

Before starting, locate and review:
1. **Staples feature components** - reference for UI patterns (table, filters, modal tabs)
2. **Inventory feature** - for add-to-inventory integration
3. **Recipe form** - understand current ingredient add flow
4. **Meal plan UI** - understand snack slot assignment flow
5. **AI integration** - existing Claude API patterns in `lib/claude.ts`
6. **Category and unit configuration** - reuse existing config
7. **Existing modal/drawer patterns** - for consistency

---

## Critical Notes

- **UI Consistency:** Products should look and feel like Staples/Inventory - same table layout, same inline editing, same modal patterns
- **Metric Units:** All measurements in grams/millilitres per project standards
- **Ratings:** 1-10 integer scale per project standards
- **Image Storage:** Use Supabase Storage, same bucket pattern as recipe images
- **AI Model:** Use `claude-haiku-4-5` for parsing, temperature 0.3
- **Dark Theme:** Match existing app styling with brand colours

---

Start by reviewing `Claude.md`, then implement Phase 1 (Database schema). Show me the migration SQL and TypeScript types first for approval before proceeding.
