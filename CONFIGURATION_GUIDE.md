# 🚀 Configuration Guide - Family Meal Planner

## Current Configuration Status

✅ **Database**: Running on ports 51213-51215 (Prisma dev server)
✅ **NEXTAUTH_SECRET**: Configured with secure random value
⚠️ **ANTHROPIC_API_KEY**: You need to add this

---

## Step-by-Step Configuration

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in to your Anthropic account
3. Click "Create Key" or use an existing key
4. Copy your API key (starts with `sk-ant-api...`)

### Step 2: Add Your API Key to .env

Open the `.env` file and replace this line:
```env
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
```

With your actual key:
```env
ANTHROPIC_API_KEY="sk-ant-api03-your-actual-key-here"
```

### Step 3: Start the Application

Open a terminal in the project directory and run:

```bash
npm run dev
```

The application will start at: **http://localhost:3000**

---

## 🎯 Quick Start Guide

### First Time Setup

1. **Register an Account**
   - Go to http://localhost:3000
   - Click "Get Started"
   - Enter your email and password (min 8 characters)

2. **Create Family Profiles**
   - Navigate to "Family Profiles" from the dashboard
   - Add profiles for each family member
   - Set dietary preferences, allergies, and food likes/dislikes
   - Optional: Set nutritional goals (calories, macros)

3. **Add Recipes**
   - Go to "Recipes"
   - Click "Add Recipe"
   - Enter recipe details:
     - Name, description, servings
     - Prep and cook time
     - Meal categories (breakfast, lunch, dinner, etc.)
     - Ingredients with quantities and units
     - Step-by-step instructions
   - **Important**: You need at least 3-5 recipes for good AI meal planning

4. **Set Up Weekly Staples** (Optional)
   - Go to "Weekly Staples"
   - Add items you buy every week (milk, bread, eggs, etc.)
   - These will be included in future shopping lists

5. **Track Inventory** (Optional)
   - Go to "Inventory"
   - Add items currently in your fridge/pantry
   - Set expiry dates to get warnings
   - Helps prevent buying what you already have

6. **Generate Your First AI Meal Plan** 🎉
   - Navigate to "Meal Plans"
   - Select a week start date (Monday recommended)
   - Click "Generate with AI"
   - Wait 10-20 seconds for Claude to analyze your data
   - View your personalized weekly meal plan!

---

## 🔍 What the AI Considers

When generating meal plans, Claude AI analyzes:

- **Family Profiles**: Dietary preferences, allergies, nutritional goals
- **Available Recipes**: Your recipe library with ratings and categories
- **Recipe Usage**: Variety - avoids repeating recently used recipes
- **Nutritional Balance**: Ensures balanced meals across the week
- **Meal Categories**: Appropriate meals for each day

---

## 📊 Current Environment Variables

```env
# Database (Already Configured ✅)
DATABASE_URL="prisma+postgres://localhost:51213/..."

# Authentication (Already Configured ✅)
NEXTAUTH_SECRET="6RDBVxk5oA4Ar3WEZlF6XgkXSY6cyXelAd+UDPGka50="
NEXTAUTH_URL="http://localhost:3000"

# Anthropic API (Needs Your Key ⚠️)
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
```

---

## 🐛 Troubleshooting

### Issue: Can't start the dev server
**Solution**: Make sure the database is running:
```bash
# In a separate terminal
npx prisma dev
```

### Issue: Authentication not working
**Solution**:
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again
- Restart the dev server

### Issue: AI meal plan generation fails
**Solution**:
- Verify your ANTHROPIC_API_KEY is correct
- Make sure you have at least 3-5 recipes added
- Check you have at least one family profile

### Issue: Database connection errors
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Check database is running
npx prisma studio
```

---

## 🎨 Application Features Overview

### 1. Dashboard
Central hub with quick links to all features

### 2. Family Profiles
- Create profiles for each family member
- Track dietary restrictions and preferences
- Set nutritional goals
- Enable macro tracking

### 3. Recipes
- Add, edit, delete recipes
- Rate recipes (1-5 stars)
- Search and filter by category
- Track usage count
- Full ingredient and instruction management

### 4. Meal Plans
- AI-generated weekly meal plans
- Calendar view of meals
- Draft and finalized status
- View recipe details for each meal

### 5. Inventory
- Track food items
- Expiry date warnings (3 days before)
- Organize by location (fridge, freezer, pantry)
- Category-based organization

### 6. Weekly Staples
- Manage recurring grocery items
- Auto-add to shopping lists option
- Category organization

### 7. Shopping Lists
- UI prepared for future implementation
- Will auto-generate from meal plans
- Will cross-reference with inventory

---

## 📝 Tips for Best Results

1. **Add Diverse Recipes**: Include breakfast, lunch, dinner, and snacks
2. **Complete Profiles**: More details = better AI recommendations
3. **Rate Recipes**: Helps AI prioritize family favorites
4. **Update Inventory**: Keep track of what you have
5. **Set Realistic Goals**: Nutritional targets should be achievable

---

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure
- The NEXTAUTH_SECRET is unique to your installation
- In production, use proper environment variable management

---

## 📞 Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Verify all environment variables are set
3. Check the browser console for errors (F12)
4. Review the terminal output for server errors

---

## 🎉 You're Ready!

Once you've added your Anthropic API key, you can start using the application!

Run: `npm run dev`
Visit: http://localhost:3000

Enjoy your AI-powered meal planning! 🍽️
