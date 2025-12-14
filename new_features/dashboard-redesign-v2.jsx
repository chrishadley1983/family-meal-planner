import React, { useState } from 'react';
import { Calendar, ChefHat, ShoppingCart, Package, AlertTriangle, Clock, TrendingUp, User, Settings, Bell, ChevronRight, Flame, Plus, Utensils, Check, X, Sparkles } from 'lucide-react';

export default function DashboardRedesign() {
  const [activeNav, setActiveNav] = useState('dashboard');
  
  // Sample data - Weekly focused
  const weeklyMeals = [
    { day: 'Mon', dinner: 'Chicken Tikka Masala', planned: true },
    { day: 'Tue', dinner: 'Spaghetti Bolognese', planned: true },
    { day: 'Wed', dinner: 'Teriyaki Salmon', planned: true, today: true },
    { day: 'Thu', dinner: 'Thai Green Curry', planned: true },
    { day: 'Fri', dinner: null, planned: false },
    { day: 'Sat', dinner: null, planned: false },
    { day: 'Sun', dinner: null, planned: false },
  ];
  
  const shoppingList = {
    total: 23,
    purchased: 0,
    categories: [
      { name: 'Fresh', count: 8 },
      { name: 'Meat & Fish', count: 4 },
      { name: 'Dairy', count: 5 },
      { name: 'Cupboard', count: 6 },
    ]
  };
  
  const expiringItems = [
    { name: 'Chicken Breast', days: 1, quantity: '500g' },
    { name: 'Spinach', days: 2, quantity: '1 bag' },
    { name: 'Greek Yogurt', days: 3, quantity: '500g' },
  ];

  const plannedDays = weeklyMeals.filter(d => d.planned).length;
  const unplannedDays = 7 - plannedDays;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Primary Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">FamilyFuel</span>
            </div>
            
            {/* Primary Navigation - Core user journeys */}
            <div className="hidden md:flex items-center gap-1">
              <NavItem icon={Calendar} label="Meal Plan" active={activeNav === 'meals'} onClick={() => setActiveNav('meals')} />
              <NavItem icon={ChefHat} label="Recipes" active={activeNav === 'recipes'} onClick={() => setActiveNav('recipes')} />
              <NavItem icon={Sparkles} label="Discover" active={activeNav === 'discover'} onClick={() => setActiveNav('discover')} />
              <NavItem icon={ShoppingCart} label="Shopping" active={activeNav === 'shopping'} onClick={() => setActiveNav('shopping')} badge="23" />
              <NavItem icon={Package} label="Inventory" active={activeNav === 'inventory'} onClick={() => setActiveNav('inventory')} />
            </div>
          </div>
          
          {/* Right Side - Secondary actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
            
            {/* User Menu */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium">
                CH
              </div>
              <div className="hidden lg:block">
                <div className="text-sm font-medium">Chris</div>
                <div className="text-xs text-gray-500">Hadley Family</div>
              </div>
              <Settings className="w-4 h-4 text-gray-500 ml-1 cursor-pointer hover:text-gray-300" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Header with Week Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">This Week's Plan</h1>
            <p className="text-gray-400 mt-1">Week of 16–22 December • Hadley Family</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Recipe
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Complete My Meal Plan
            </button>
          </div>
        </div>

        {/* Alert Banner - Contextual */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-200">3 items expiring soon</p>
            <p className="text-sm text-amber-300/70">Chicken breast expires tomorrow - 3 recipes available</p>
          </div>
          <button className="text-sm text-amber-300 hover:text-amber-200 font-medium whitespace-nowrap">
            View recipes →
          </button>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Weekly Plan */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Weekly Meal Plan Card */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Weekly Dinners</h2>
                    <p className="text-sm text-gray-500">{plannedDays} of 7 days planned</p>
                  </div>
                </div>
                <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                  Edit plan →
                </button>
              </div>
              
              <div className="divide-y divide-gray-800">
                {weeklyMeals.map((meal, idx) => (
                  <div 
                    key={idx} 
                    className={`px-5 py-3 flex items-center gap-4 ${
                      meal.today ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                    }`}
                  >
                    <div className={`w-12 text-center ${meal.today ? 'text-purple-300' : 'text-gray-500'}`}>
                      <div className="text-xs font-medium uppercase tracking-wide">{meal.day}</div>
                      {meal.today && <div className="text-[10px] text-purple-400 mt-0.5">Today</div>}
                    </div>
                    
                    {meal.planned ? (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Utensils className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{meal.dinner}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-gray-800 border border-dashed border-gray-600 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-500 italic">No meal planned</p>
                        </div>
                        <button className="text-sm text-purple-400 hover:text-purple-300">
                          Add meal
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Planning prompt */}
              {unplannedDays > 0 && (
                <div className="px-5 py-4 bg-gray-800/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-400 flex-1">
                    <span className="text-white font-medium">{unplannedDays} days</span> still need meals - let AI suggest based on your preferences
                  </p>
                  <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                    Auto-fill →
                  </button>
                </div>
              )}
            </div>

            {/* Shopping List Summary */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Weekly Shopping</h2>
                    <p className="text-sm text-gray-500">{shoppingList.total} items for this week</p>
                  </div>
                </div>
                <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                  View list →
                </button>
              </div>
              
              {/* Category breakdown */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {shoppingList.categories.map((cat, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{cat.count}</div>
                    <div className="text-xs text-gray-500">{cat.name}</div>
                  </div>
                ))}
              </div>
              
              {/* Shopping status */}
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                {shoppingList.purchased === 0 ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-400 flex-1">
                      Shopping list ready - <span className="text-white font-medium">not yet started</span>
                    </p>
                    <button className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">
                      Start shopping
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-sm text-gray-400 flex-1">
                      <span className="text-white font-medium">{shoppingList.purchased} of {shoppingList.total}</span> items purchased
                    </p>
                    <button className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                      Continue →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Access */}
          <div className="space-y-6">
            
            {/* Discover Recipes Card */}
            <div className="bg-gradient-to-br from-orange-900/40 to-rose-900/40 rounded-xl border border-orange-700/30 p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-200">Discover Recipes</h3>
                  <p className="text-xs text-orange-300/70">Find your next family favourite</p>
                </div>
              </div>
              <p className="text-sm text-orange-100/80 leading-relaxed mb-4">
                Browse hundreds of recipes matched to your family's tastes and dietary needs. Emilia, your AI nutritionist, helps guide you towards meals that meet your goals.
              </p>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-orange-200 transition-colors">
                Explore recipes →
              </button>
            </div>

            {/* Expiring Items */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="font-semibold">Expiring Soon</h2>
                </div>
                <button className="text-xs text-gray-400 hover:text-gray-300">View all</button>
              </div>
              
              <div className="divide-y divide-gray-800">
                {expiringItems.map((item, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.days === 1 
                        ? 'bg-red-500/20 text-red-400' 
                        : item.days === 2 
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-700 text-gray-400'
                    }`}>
                      {item.days === 1 ? 'Tomorrow' : `${item.days} days`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <QuickAction 
                icon={ChefHat} 
                label="Recipes" 
                sublabel="47 saved"
                color="green"
              />
              <QuickAction 
                icon={Package} 
                label="Staples" 
                sublabel="3 due"
                color="amber"
              />
              <QuickAction 
                icon={Package} 
                label="Inventory" 
                sublabel="28 items"
                color="blue"
              />
              <QuickAction 
                icon={User} 
                label="Profiles" 
                sublabel="4 members"
                color="purple"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Navigation Item Component
function NavItem({ icon: Icon, label, active, onClick, badge }: {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors relative ${
        active 
          ? 'bg-gray-800 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
      {badge && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

// Quick Action Card Component
function QuickAction({ icon: Icon, label, sublabel, color }: {
  icon: any;
  label: string;
  sublabel: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };
  
  return (
    <button className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:bg-gray-800/70 transition-colors group">
      <div className={`w-9 h-9 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-gray-500 group-hover:text-gray-400">{sublabel}</p>
    </button>
  );
}
