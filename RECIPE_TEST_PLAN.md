# Recipe Management Test Plan

## Test Environment Setup
- **Database**: Ensure migration is run for `isFavorite` field: `npx prisma migrate dev`
- **Environment Variables**: Ensure `ANTHROPIC_API_KEY` is set in `.env`
- **Dependencies**: All npm packages installed
- **Server**: Development server running on localhost:3000

## 1. Recipe List Page Tests (`/recipes`)

### 1.1 Page Load
- [ ] Page loads successfully
- [ ] Shows loading state while fetching recipes
- [ ] Displays recipes in grid layout
- [ ] Shows "No recipes yet" message when no recipes exist
- [ ] "Add Recipe" button visible in header

### 1.2 Search & Filter
- [ ] Search by recipe name works
- [ ] Search by description works
- [ ] Filter by meal category works
- [ ] Multiple filters work together (search + category)
- [ ] "Favorites Only" button toggles correctly
- [ ] "Favorites Only" filters to show only favorited recipes
- [ ] Clear filters returns all recipes

### 1.3 Recipe Cards
- [ ] Recipe name displays correctly
- [ ] Description truncates properly (2 lines)
- [ ] Servings and time display correctly
- [ ] Family rating displays as stars when rated
- [ ] Meal category badges display correctly
- [ ] Ingredients count is accurate
- [ ] Times used counter displays correctly
- [ ] Favorite toggle (★/☆) displays correctly

### 1.4 Recipe Actions
- [ ] Click "View/Edit" navigates to recipe detail page
- [ ] Click "Copy" duplicates the recipe
- [ ] Duplicated recipe appears at top of list
- [ ] Duplicated recipe has "(Copy)" appended to name
- [ ] Click "Delete" shows confirmation dialog
- [ ] Confirming delete removes recipe from list
- [ ] Canceling delete keeps recipe in list
- [ ] Favorite toggle updates recipe favorite status immediately

## 2. Recipe Creation Page Tests (`/recipes/new`)

### 2.1 Page Load
- [ ] Page loads successfully
- [ ] Shows three input method tabs (Manual, URL, Photo)
- [ ] "Manual Entry" tab selected by default
- [ ] "Back to Recipes" link works

### 2.2 Manual Entry Tab
- [ ] All required fields marked with asterisk
- [ ] Recipe name field validation works
- [ ] Servings field accepts only positive integers
- [ ] Prep/cook time fields accept positive integers
- [ ] Cuisine type is free text
- [ ] Difficulty dropdown shows Easy/Medium/Hard
- [ ] Meal category buttons toggle correctly
- [ ] Multiple meal categories can be selected
- [ ] "Add Ingredient" button adds new ingredient row
- [ ] Ingredient fields: name, quantity, unit, notes all work
- [ ] Remove ingredient (×) button works
- [ ] "Add Step" button adds new instruction
- [ ] Instruction step numbers auto-increment
- [ ] Remove instruction (×) button works and renumbers steps
- [ ] "Cancel" button returns to recipes list
- [ ] "Create Recipe" button disabled when form invalid
- [ ] Successful creation redirects to recipes list
- [ ] Error message displays on creation failure

### 2.3 URL Import Tab
- [ ] Tab switches correctly
- [ ] URL input field displays
- [ ] Help text explains the feature
- [ ] URL validation (must be valid URL format)
- [ ] "Import Recipe" button disabled when URL empty
- [ ] Clicking "Import Recipe" shows loading state
- [ ] Invalid URL shows error message
- [ ] Successful import populates manual entry form
- [ ] Source URL is preserved and displayed
- [ ] User can review and edit imported data
- [ ] Switching to manual tab shows populated form
- [ ] Can save imported recipe after review

**Test URLs to try:**
- Valid recipe URL from popular site (AllRecipes, Food Network)
- Invalid URL
- Non-recipe URL

### 2.4 Photo Import Tab
- [ ] Tab switches correctly
- [ ] File upload input displays
- [ ] Help text explains the feature
- [ ] Accepts image files (jpg, png)
- [ ] Shows preview of uploaded photo
- [ ] "Analyze Photo" button disabled when no file
- [ ] Clicking "Analyze Photo" shows loading state
- [ ] Successful analysis populates manual entry form
- [ ] Suggested ingredients and instructions appear
- [ ] User can review and edit AI suggestions
- [ ] Switching to manual tab shows populated form
- [ ] Can save analyzed recipe after review

**Test Images to try:**
- Photo of common dish (pasta, pizza)
- Photo of complex dish
- Non-food image

## 3. Recipe Detail Page Tests (`/recipes/[id]`)

### 3.1 View Mode
- [ ] Page loads successfully
- [ ] Recipe name displays in header
- [ ] Description displays correctly
- [ ] "Edit" button visible
- [ ] "Duplicate" button visible
- [ ] Rating stars (1-5) display correctly
- [ ] Current rating highlighted in gold
- [ ] Clicking rating star updates rating
- [ ] Servings display correctly
- [ ] Prep time displays (if set)
- [ ] Cook time displays (if set)
- [ ] Total time displays (if set)
- [ ] Cuisine type displays (if set)
- [ ] Difficulty displays (if set)
- [ ] Meal category badges display correctly
- [ ] Ingredients list formatted correctly
- [ ] Ingredient quantities, units, and names display
- [ ] Ingredient notes display in parentheses
- [ ] Instructions numbered correctly
- [ ] Instruction step numbers in blue circles
- [ ] Recipe notes display in yellow box (if set)
- [ ] "Used X times" displays at bottom
- [ ] "Last used" date displays (if set)
- [ ] "Back to Recipes" link works

### 3.2 Edit Mode
- [ ] Clicking "Edit" switches to edit mode
- [ ] "Save" and "Cancel" buttons appear
- [ ] "Edit" and "Duplicate" buttons hidden
- [ ] Rating stars hidden in edit mode
- [ ] Recipe name becomes editable input
- [ ] Description becomes editable textarea
- [ ] Servings becomes number input
- [ ] Prep time becomes number input
- [ ] Cook time becomes number input
- [ ] Cuisine type becomes text input
- [ ] Difficulty becomes dropdown
- [ ] Meal categories become toggle buttons
- [ ] "Add Ingredient" button appears
- [ ] Ingredients become editable grid
- [ ] Can edit ingredient name, quantity, unit, notes
- [ ] Can remove ingredients
- [ ] "Add Step" button appears
- [ ] Instructions become editable textareas
- [ ] Can edit instruction text
- [ ] Can remove instructions (renumbering works)
- [ ] Notes becomes editable textarea

### 3.3 Edit Save/Cancel
- [ ] Clicking "Save" shows loading state
- [ ] Successful save updates recipe
- [ ] Successful save switches back to view mode
- [ ] Successful save shows updated values
- [ ] Save failure shows error message
- [ ] Clicking "Cancel" reverts all changes
- [ ] Clicking "Cancel" switches back to view mode
- [ ] Changes not saved when canceling

### 3.4 Duplicate Function
- [ ] Clicking "Duplicate" shows loading state
- [ ] Successful duplicate navigates to new recipe
- [ ] New recipe has "(Copy)" appended to name
- [ ] New recipe has same ingredients
- [ ] New recipe has same instructions
- [ ] New recipe has same metadata (cuisine, difficulty, etc.)
- [ ] New recipe has timesUsed = 0
- [ ] New recipe is not favorited by default
- [ ] New recipe has no rating

## 4. API Endpoint Tests

### 4.1 GET /api/recipes
- [ ] Returns 401 when not authenticated
- [ ] Returns recipes for authenticated user
- [ ] Returns empty array when no recipes
- [ ] Includes ingredients and instructions
- [ ] Sorts by rating desc, timesUsed desc, createdAt desc

### 4.2 POST /api/recipes
- [ ] Returns 401 when not authenticated
- [ ] Returns 400 when required fields missing
- [ ] Returns 400 when validation fails
- [ ] Successfully creates recipe with all fields
- [ ] Successfully creates recipe with minimal fields
- [ ] Returns 201 status on success
- [ ] Returns created recipe with ID
- [ ] Calculates totalTimeMinutes correctly
- [ ] Preserves sourceUrl if provided

### 4.3 GET /api/recipes/[id]
- [ ] Returns 401 when not authenticated
- [ ] Returns 404 when recipe not found
- [ ] Returns 403 when recipe belongs to different user
- [ ] Returns recipe with ingredients and instructions
- [ ] Ingredients sorted by sortOrder
- [ ] Instructions sorted by sortOrder

### 4.4 PUT /api/recipes/[id]
- [ ] Returns 401 when not authenticated
- [ ] Returns 404 when recipe not found
- [ ] Returns 403 when recipe belongs to different user
- [ ] Successfully updates recipe name
- [ ] Successfully updates all fields
- [ ] Successfully updates ingredients
- [ ] Successfully updates instructions
- [ ] Recalculates totalTimeMinutes
- [ ] Returns updated recipe

### 4.5 DELETE /api/recipes/[id]
- [ ] Returns 401 when not authenticated
- [ ] Returns 404 when recipe not found
- [ ] Returns 403 when recipe belongs to different user
- [ ] Successfully deletes recipe
- [ ] Cascades delete to ingredients
- [ ] Cascades delete to instructions

### 4.6 PUT /api/recipes/[id]/favorite
- [ ] Returns 401 when not authenticated
- [ ] Returns 404 when recipe not found
- [ ] Returns 403 when recipe belongs to different user
- [ ] Successfully toggles favorite to true
- [ ] Successfully toggles favorite to false
- [ ] Returns updated recipe

### 4.7 POST /api/recipes/[id]/duplicate
- [ ] Returns 401 when not authenticated
- [ ] Returns 404 when recipe not found
- [ ] Returns 403 when recipe belongs to different user
- [ ] Successfully creates duplicate recipe
- [ ] Duplicates all ingredients
- [ ] Duplicates all instructions
- [ ] Duplicates all metadata
- [ ] Appends "(Copy)" to recipe name
- [ ] Sets timesUsed to 0
- [ ] Sets isFavorite to false
- [ ] Returns 201 status

### 4.8 POST /api/recipes/import-url
- [ ] Returns 401 when not authenticated
- [ ] Returns 400 when URL missing
- [ ] Returns 400 when URL invalid format
- [ ] Returns 400 when URL fetch fails
- [ ] Successfully fetches HTML content
- [ ] Successfully parses recipe with Claude API
- [ ] Returns recipe object with all fields
- [ ] Includes sourceUrl in response
- [ ] Handles Claude API errors gracefully

### 4.9 POST /api/recipes/import-photo
- [ ] Returns 401 when not authenticated
- [ ] Returns 400 when imageData missing
- [ ] Returns 400 when imageData invalid format
- [ ] Successfully analyzes photo with Claude Vision
- [ ] Returns recipe suggestions
- [ ] Includes suggested ingredients
- [ ] Includes suggested instructions
- [ ] Handles Claude API errors gracefully

## 5. Integration Tests

### 5.1 Complete Recipe Workflow
- [ ] Create recipe manually → View → Edit → Save
- [ ] Import recipe from URL → Edit → Save
- [ ] Import recipe from photo → Edit → Save
- [ ] Create recipe → Favorite → Filter favorites
- [ ] Create recipe → Duplicate → Edit duplicate
- [ ] Create recipe → Rate → View rating on list
- [ ] Create recipe → Add to favorites → Show in filter

### 5.2 Data Persistence
- [ ] Created recipe persists after page refresh
- [ ] Edited recipe changes persist
- [ ] Favorite status persists
- [ ] Rating persists
- [ ] Deleted recipe removed permanently

### 5.3 Multi-User Scenarios
- [ ] User A cannot see User B's recipes
- [ ] User A cannot edit User B's recipes
- [ ] User A cannot delete User B's recipes
- [ ] User A cannot favorite User B's recipes

## 6. UI/UX Tests

### 6.1 Responsive Design
- [ ] Recipe list responsive on mobile
- [ ] Recipe list responsive on tablet
- [ ] Recipe list responsive on desktop
- [ ] Recipe detail responsive on mobile
- [ ] Recipe detail responsive on tablet
- [ ] Recipe detail responsive on desktop
- [ ] Recipe form responsive on mobile
- [ ] Recipe form responsive on tablet
- [ ] Recipe form responsive on desktop

### 6.2 Loading States
- [ ] Recipe list shows loading indicator
- [ ] Recipe detail shows loading indicator
- [ ] Import URL shows loading indicator
- [ ] Import photo shows loading indicator
- [ ] Duplicate shows loading state
- [ ] Save shows loading state
- [ ] Delete shows confirmation

### 6.3 Error Handling
- [ ] Network errors display user-friendly message
- [ ] Validation errors display inline
- [ ] API errors display error message
- [ ] 404 errors redirect appropriately
- [ ] Unauthorized errors redirect to login

## 7. Database Migration Tests

### 7.1 isFavorite Field
- [ ] Migration creates isFavorite column
- [ ] Default value is false
- [ ] Existing recipes have isFavorite=false
- [ ] New recipes can set isFavorite
- [ ] Field is boolean type
- [ ] Field is indexed (if specified)

## 8. Performance Tests

### 8.1 Load Times
- [ ] Recipe list loads < 2 seconds
- [ ] Recipe detail loads < 1 second
- [ ] URL import completes < 10 seconds
- [ ] Photo import completes < 10 seconds

### 8.2 Large Data Sets
- [ ] List handles 100+ recipes
- [ ] Search filters 100+ recipes quickly
- [ ] Recipe with 50+ ingredients displays correctly
- [ ] Recipe with 20+ instruction steps displays correctly

## 9. Security Tests

### 9.1 Authentication
- [ ] Unauthenticated users redirected to login
- [ ] Session expires after timeout
- [ ] Protected routes require authentication

### 9.2 Authorization
- [ ] Users can only access their own recipes
- [ ] API enforces user isolation
- [ ] Direct URL access to other user recipes blocked

### 9.3 Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF tokens validated
- [ ] File upload validates image types
- [ ] URL input validates format

## 10. Known Issues & Limitations

### Issues to Document During Testing
1. Database connection required for migration
2. Anthropic API key required for URL/photo import
3. URL import depends on website structure
4. Photo recognition accuracy varies by image quality
5. Large images may take longer to process
6. Some recipe websites may block scraping

### Features Not Implemented (PRD Gaps)
- [ ] Bulk recipe import via CSV (PRD page 7)
- [ ] Recipe image upload (imageUrl field exists but no UI)
- [ ] Nutritional auto-calculation
- [ ] Recipe compatibility with family profiles
- [ ] Integration with meal planning (favorites priority)

## Test Execution Summary

**Tester Name:** _________________
**Date:** _________________
**Environment:** _________________

**Total Tests:** ___
**Passed:** ___
**Failed:** ___
**Blocked:** ___
**Skipped:** ___

**Critical Issues:**
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________
