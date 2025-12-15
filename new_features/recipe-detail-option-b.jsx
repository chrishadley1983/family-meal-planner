import React, { useState } from 'react';
import { Clock, Users, ChefHat, Star, Edit, Copy, Share2, Utensils, Flame, AlertCircle, Timer } from 'lucide-react';

export default function RecipeDetailOptionB() {
  const [rating, setRating] = useState(3);
  
  const recipe = {
    name: 'Tonkatsu pork',
    description: 'Rustle up a Japanese feast and try this succulent pork loin, coated, fried and drizzled with our easiest ever Tonkatsu sauce. Save leftovers to make katsudon',
    servings: 4,
    prepTime: 20,
    cookTime: 6,
    totalTime: 26,
    cuisine: 'Japanese',
    difficulty: 'Medium',
    mealCategories: ['dinner', 'main course', 'supper'],
    mainIngredient: 'pork',
    accentColor: 'from-pink-500/80 to-rose-600/80',
    calories: 540,
    protein: 39,
    carbs: 45,
    fat: 21,
    fiber: 1,
    sugar: 7,
    sodium: 539,
    overallRating: 'amber',
    ratingText: 'This dish provides excellent protein (22% of daily target) but is calorie-dense at 540 kcal per serving with elevated fat content (31% of daily limit) due to breading and frying, making it acceptable but not optimal for caloric goals.',
    ingredients: [
      { quantity: '4', unit: 'whole', name: 'Thick boneless pork loin chops', rating: 'green' },
      { quantity: '100', unit: 'g', name: 'Plain flour', rating: 'amber' },
      { quantity: '2', unit: 'whole', name: 'Eggs, beaten', rating: 'green' },
      { quantity: '100', unit: 'g', name: 'Panko breadcrumbs', rating: 'amber' },
      { quantity: '1', unit: 'to taste', name: 'Vegetable oil', notes: 'for shallow frying', rating: 'red' },
      { quantity: '2', unit: 'tbsp', name: 'Ketchup', rating: 'amber' },
      { quantity: '2', unit: 'tbsp', name: 'Worcestershire sauce', rating: 'amber' },
      { quantity: '1', unit: 'tbsp', name: 'Oyster sauce', rating: 'amber' },
    ],
    instructions: [
      'Remove the large piece of fat on the edge of each pork loin, then bash each of the loins between two pieces of baking parchment until around 1cm in thickness – you can do this using a meat tenderiser or a rolling pin. Once bashed, use your hands to reshape the meat to its original shape and thickness – this step will ensure the meat is as succulent as possible.',
      'Put the flour, eggs and panko breadcrumbs into three separate wide-rimmed bowls. Season the meat, then dip first in the flour, followed by the eggs, then the breadcrumbs.',
      'In a large frying or sauté pan, add enough oil to come 2cm up the side of the pan. Heat the oil to 180°C – if you don\'t have a thermometer, drop a bit of panko into the oil and if it sinks a little then starts to fry, the oil is ready. Add two pork chops and cook for 1 min 30 secs on each side, then remove and leave to rest on a wire rack for 5 mins. Repeat with the remaining pork chops.',
      'While the pork is resting, make the sauce by whisking the ingredients together, adding a splash of water if it\'s particularly thick. Slice the tonkatsu and serve drizzled with the sauce.',
    ],
    emiliaTips: "Hi Chris! This is a fantastic choice for your dinner – tonkatsu is such a satisfying dish, and at 540 kcal per serving with nearly 39g of protein, it's going to fuel your moderately active lifestyle beautifully. I really love that you're getting good quality protein from the pork alongside those lovely carbs, which will help you stay energised. The only gentle thing I'd mention is that at 21g of fat per serving, it's on the richer side, so if you're eating this as your main meal, you might want to pair it with some steamed vegetables or a fresh green salad on the side to add nutrients and fibre without tipping you over your daily targets. Brilliant recipe choice overall!",
  };

  const getIngredientEmoji = (ingredient: string) => {
    const emojis: Record<string, string> = {
      pork: '🥓',
      chicken: '🍗',
      beef: '🥩',
      fish: '🐟',
      vegetables: '🥗',
    };
    return emojis[ingredient] || '🍽️';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'green': return 'bg-emerald-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOverallRatingColor = (rating: string) => {
    switch (rating) {
      case 'green': return 'bg-emerald-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        
        {/* Header with actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {recipe.mealCategories.map((cat, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                {cat}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Share">
              <Share2 className="w-5 h-5 text-gray-400" />
            </button>
            <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
          </div>
        </div>
        
        {/* Hero Section - Horizontal Layout */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-6">
          <div className="flex">
            {/* Image */}
            <div className={`w-64 bg-gradient-to-br ${recipe.accentColor} relative flex-shrink-0`}>
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}></div>
              </div>
              
              {/* Emoji */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl opacity-90">
                  {getIngredientEmoji(recipe.mainIngredient)}
                </span>
              </div>
              
              {/* Cuisine tag */}
              <span className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-sm font-medium">
                {recipe.cuisine}
              </span>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-6">
              <h1 className="text-2xl font-bold mb-2">{recipe.name}</h1>
              <p className="text-gray-400 mb-6">{recipe.description}</p>
              
              {/* Stats Cards - Grid Layout */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="font-bold">{recipe.servings}</div>
                  <div className="text-xs text-gray-500">Servings</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="font-bold">{recipe.prepTime} min</div>
                  <div className="text-xs text-gray-500">Prep</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <Flame className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="font-bold">{recipe.cookTime} min</div>
                  <div className="text-xs text-gray-500">Cook</div>
                </div>
                <div className="bg-purple-500/20 rounded-xl p-3 text-center border border-purple-500/30">
                  <Timer className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <div className="font-bold text-purple-300">{recipe.totalTime} min</div>
                  <div className="text-xs text-purple-400">Total</div>
                </div>
              </div>
              
              {/* Rating & Difficulty */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-0.5"
                    >
                      <Star 
                        className={`w-5 h-5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} 
                      />
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 ml-2">Your rating</span>
                </div>
                {recipe.difficulty && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">
                    {recipe.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nutritional Analysis */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Nutritional Analysis</h2>
            <button className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm transition-colors">
              Refresh
            </button>
          </div>
          
          {/* Overall Rating */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4 flex gap-3">
            <div className={`w-5 h-5 rounded-full ${getOverallRatingColor(recipe.overallRating)} flex-shrink-0 mt-0.5`}></div>
            <div>
              <h3 className="font-medium mb-1">Overall Rating</h3>
              <p className="text-sm text-gray-400">{recipe.ratingText}</p>
            </div>
          </div>
          
          {/* Macro Cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{recipe.calories}</div>
              <div className="text-xs text-gray-400">Calories</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{recipe.protein}g</div>
              <div className="text-xs text-gray-400">Protein</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{recipe.carbs}g</div>
              <div className="text-xs text-gray-400">Carbs</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{recipe.fat}g</div>
              <div className="text-xs text-gray-400">Fat</div>
            </div>
          </div>
          
          {/* Secondary Nutrition */}
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <span><strong className="text-gray-300">{recipe.fiber}g</strong> Fiber</span>
            <span><strong className="text-gray-300">{recipe.sugar}g</strong> Sugar</span>
            <span><strong className="text-gray-300">{recipe.sodium}mg</strong> Sodium</span>
          </div>
        </div>
        
        {/* Emilia's Tips */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-700/30 p-5 mb-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👩‍⚕️</span>
            </div>
            <div>
              <h3 className="font-semibold text-purple-200 mb-2">Emilia's Nutritionist Tips</h3>
              <p className="text-sm text-purple-100/80 leading-relaxed">
                {recipe.emiliaTips}
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Ingredients & Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ingredients */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 sticky top-6">
              <h2 className="font-semibold mb-4 flex items-center justify-between">
                Ingredients
                <span className="text-sm text-gray-500 font-normal">{recipe.ingredients.length} items</span>
              </h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${getRatingColor(ing.rating)} mt-1.5 flex-shrink-0`}></div>
                    <div>
                      <span className="font-medium">{ing.quantity} {ing.unit}</span>
                      {' '}
                      <span className="text-gray-300">{ing.name}</span>
                      {ing.notes && (
                        <span className="text-gray-500 text-sm"> ({ing.notes})</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="font-semibold mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-medium">
                      {idx + 1}
                    </div>
                    <p className="text-gray-300 leading-relaxed pt-1">
                      {instruction}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
            
            {/* Notes Section */}
            <div className="mt-6 bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="font-semibold mb-3">Notes</h2>
              <textarea 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 min-h-[100px]"
                placeholder="Add your personal notes about this recipe..."
              />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
