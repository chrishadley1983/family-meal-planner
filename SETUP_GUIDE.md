# Family Meal Planner - Setup Guide

## Features Implemented

### Core Functionality ✅
- **User Authentication** - Secure login and registration with NextAuth.js
- **Family Profile Management** - Create and manage family member profiles with dietary preferences and nutritional goals
- **Recipe Management** - Full CRUD operations for recipes with ingredients, instructions, and ratings
- **Weekly Staples** - Manage recurring grocery items
- **Inventory Management** - Track food items with expiry dates and locations
- **AI Meal Planning** - Generate personalized weekly meal plans using Claude AI
- **Meal Plan Calendar** - View and manage weekly meal plans

### Technology Stack
- Frontend: Next.js 16, React, TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- Database: PostgreSQL with Prisma ORM v5
- Authentication: NextAuth.js
- AI: Anthropic Claude API (Sonnet 3.5)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Update `.env` with your settings:
```env
# Database
DATABASE_URL="your-postgresql-connection-string"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Anthropic API
ANTHROPIC_API_KEY="your-api-key"
```

### 3. Initialize Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or if using Prisma dev database
npx prisma dev
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Usage Workflow

1. **Register/Login** - Create your account
2. **Add Family Profiles** - Set up profiles with dietary preferences
3. **Add Recipes** - Import your family recipes
4. **Generate Meal Plan** - Let Claude AI create a personalized weekly plan
5. **Track Inventory** - Monitor food items and expiry dates
6. **Manage Staples** - Set up recurring grocery items

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - Authentication
- `GET/POST /api/profiles` - Family profiles CRUD
- `GET/POST /api/recipes` - Recipes CRUD
- `POST /api/meal-plans/generate` - AI meal plan generation
- `GET/POST /api/inventory` - Inventory management
- `GET/POST /api/staples` - Weekly staples

## Project Structure
```
family-meal-planner/
├── app/
│   ├── api/              # API routes
│   ├── (pages)/          # App pages
│   └── layout.tsx        # Root layout
├── components/           # React components
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   └── claude.ts        # Claude AI integration
├── prisma/
│   └── schema.prisma    # Database schema
└── types/               # TypeScript types
```

## Notes

- Build succeeds with Prisma 5.22.0
- Claude API integration tested and working
- All core features implemented and functional
- Shopping list generation prepared in schema for future implementation

## Future Enhancements

- Full shopping list UI implementation
- Recipe URL import with Claude
- Photo recognition features
- Advanced nutritionist feedback
- Macro tracking visualizations
