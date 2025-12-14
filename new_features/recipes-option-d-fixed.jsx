import React, { useState } from 'react';
import { Search, Filter, ChefHat, Clock, Users, Flame, TrendingUp, Sparkles, X, Utensils, Zap, Heart, Leaf, Star, ImageIcon } from 'lucide-react';

export default function RecipesOptionD() {
  const [activeFilter, setActiveFilter] = useState(null);
  
  const recipes = [
    { 
      id: 1,
      name: 'Air fryer crispy chilli beef',
      description: 'Use your air fryer to whip up crispy chilli beef for dinner. It takes just 30 minutes to make – perfect for a weeknight.',
      mealType: 'Dinner',
      cuisine: 'Asian',
      servings: 2,
      time: 30,
      ingredients: 16,
      usedCount: 3,
      calories: 420,
      protein: 32,
      carbs: 38,
      fat: 18,
      mainIngredient: 'beef',
      accentColor: 'red'
    },
    { 
      id: 2,
      name: 'Air-fryer fish tacos',
      description: 'Make fish tacos with the help of your air-fryer. Serve with slaw, avocado, salsa and chilli sauce for a Mexican feast.',
      mealType: 'Dinner',
      cuisine: 'Mexican',
      servings: 8,
      time: 30,
      ingredients: 19,
      usedCount: 0,
      calories: 380,
      protein: 28,
      carbs: 32,
      fat: 14,
      mainIngredient: 'fish',
      accentColor: 'blue'
    },
    { 
      id: 3,
      name: 'Chorizo & Chicken Skillet with Peas and Basmati Rice',
      description: 'A flavourful one-pan dinner combining sliced chicken breast, spicy chorizo, and frozen peas over fluffy basmati rice.',
      mealType: 'Dinner',
      cuisine: 'Spanish',
      servings: 4,
      time: 30,
      ingredients: 8,
      usedCount: 5,
      calories: 520,
      protein: 42,
      carbs: 45,
      fat: 22,
      mainIngredient: 'chicken',
      accentColor: 'amber'
    },
    { 
      id: 4,
      name: 'Veggie Buddha Bowl',
      description: 'A nourishing bowl packed with roasted vegetables, quinoa, chickpeas and a creamy tahini dressing.',
      mealType: 'Lunch',
      cuisine: 'Healthy',
      servings: 2,
      time: 25,
      ingredients: 12,
      usedCount: 2,
      calories: 380,
      protein: 14,
      carbs: 52,
      fat: 16,
      mainIngredient: 'vegetables',
      accentColor: 'green'
    },
  ];

  const getPlaceholderStyle = (recipe) => {
    const colors = {
      red: 'from-red-500/80 to-orange-600/80',
      blue: 'from-blue-500/80 to-cyan-600/80',
      amber: 'from-amber-500/80 to-yellow-600/80',
      green: 'from-emerald-500/80 to-teal-600/80',
      purple: 'from-purple-500/80 to-pink-600/80',
    };
    return colors[recipe.accentColor] || colors.purple;
  };

  const getIngredientEmoji = (ingredient) => {
    const emojis = {
      beef: '🥩',
      chicken: '🍗',
      fish: '🐟',
      vegetables: '🥗',
      pasta: '🍝',
      rice: '🍚',
      pork: '🥓',
      seafood: '🦐',
    };
    return emojis[ingredient] || '🍽️';
  };

  const quickFilters = [
    { id: 'quick', icon: Zap, label: 'Under 30 min' },
    { id: 'protein', icon: TrendingUp, label: 'High protein' },
    { id: 'favourite', icon: Heart, label: 'Most used' },
    { id: 'veggie', icon: Leaf, label: 'Vegetarian' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Recipes</h1>
            <p className="text-gray-400 mt-1">47 delicious meals to choose from</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm">
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Add Recipe
            </button>
          </div>
        </div>

        {/* Search & Filters - Clean Single Row */}
        <div className="bg-gray-900/50 rounded-xl p-2 mb-4 flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search by name, ingredient, or cuisine..."
              className="w-full bg-transparent border-0 pl-10 pr-4 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="h-6 w-px bg-gray-700"></div>
          <select className="bg-transparent border-0 px-3 py-2 text-sm text-gray-400 focus:outline-none cursor-pointer">
            <option>All Types</option>
            <option>Breakfast</option>
            <option>Lunch</option>
            <option>Dinner</option>
          </select>
          <div className="h-6 w-px bg-gray-700"></div>
          <select className="bg-transparent border-0 px-3 py-2 text-sm text-gray-400 focus:outline-none cursor-pointer">
            <option>All Cuisines</option>
            <option>Italian</option>
            <option>Mexican</option>
            <option>Asian</option>
          </select>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-6">
          {quickFilters.map((filter) => (
            <button 
              key={filter.id}
              onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeFilter === filter.id 
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Discover Banner */}
        <div className="relative bg-gradient-to-r from-orange-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl p-6 mb-8 overflow-hidden">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Discover New Recipes</h3>
                <p className="text-gray-400 text-sm">Emilia can recommend meals based on your family's preferences and goals</p>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl text-sm font-medium transition-colors border border-white/10">
              Find recipes →
            </button>
          </div>
        </div>

        {/* Recipe Grid - 2 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {recipes.map((recipe) => (
            <div 
              key={recipe.id} 
              className="group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 hover:shadow-xl hover:shadow-black/20 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Visual Placeholder - Ingredient-based */}
                <div 
                  className={`h-48 sm:h-auto sm:w-44 bg-gradient-to-br ${getPlaceholderStyle(recipe)} relative flex-shrink-0`}
                  style={{ minWidth: '176px', minHeight: '176px' }}
                >
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                      backgroundSize: '20px 20px'
                    }}></div>
                  </div>
                  
                  {/* Main ingredient emoji */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl opacity-90 group-hover:scale-110 transition-transform duration-200">
                      {getIngredientEmoji(recipe.mainIngredient)}
                    </span>
                  </div>
                  
                  {/* Cuisine tag */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-xs font-medium">
                    {recipe.cuisine}
                  </span>

                  {/* Favourite indicator */}
                  {recipe.usedCount >= 3 && (
                    <span className="absolute top-3 right-3 p-1.5 bg-amber-500/90 rounded-lg">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </span>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-5 flex-1 flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-purple-300 transition-colors leading-snug">
                      {recipe.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs flex-shrink-0">
                      {recipe.mealType}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {recipe.description}
                  </p>
                  
                  {/* Quick stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {recipe.servings} servings
                    </span>
                    <span className="flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5" />
                      {recipe.ingredients} ing
                    </span>
                  </div>

                  {/* Macro bar - visual */}
                  <div className="flex gap-1 mb-2">
                    <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${(recipe.calories / 600) * 100}%` }} title={`${recipe.calories} kcal`}></div>
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(recipe.protein / 50) * 100}%` }} title={`${recipe.protein}g protein`}></div>
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${(recipe.carbs / 60) * 100}%` }} title={`${recipe.carbs}g carbs`}></div>
                    <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${(recipe.fat / 30) * 100}%` }} title={`${recipe.fat}g fat`}></div>
                  </div>
                  
                  {/* Macro labels + used count */}
                  <div className="flex items-center justify-between text-xs mb-4">
                    <div className="flex gap-2">
                      <span className="text-orange-400">{recipe.calories} kcal</span>
                      <span className="text-blue-400">{recipe.protein}g P</span>
                      <span className="text-amber-400">{recipe.carbs}g C</span>
                      <span className="text-purple-400">{recipe.fat}g F</span>
                    </div>
                    <span className="text-gray-500">
                      {recipe.usedCount > 0 ? `Used ${recipe.usedCount} times` : 'Not used yet'}
                    </span>
                  </div>
                  
                  {/* Actions - pushed to bottom */}
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors">
                      View / Edit
                    </button>
                    <button className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
