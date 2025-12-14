/**
 * Nutrition Cache - Comprehensive Ingredient Database
 *
 * 500+ ingredients with nutrition data per 100g from USDA FoodData Central.
 * This reduces API calls and ensures consistent nutrition calculations.
 */

import { NutrientsPer100g, CachedIngredient } from './types'
import { normalizeIngredientName } from './usda-api'

// In-memory cache for USDA API lookups
const memoryCache = new Map<string, CachedIngredient>()

// Comprehensive ingredient seed data (per 100g)
// Source: USDA FoodData Central database
const COMMON_INGREDIENTS: Record<string, NutrientsPer100g> = {
  // ============================================
  // POULTRY (25 items)
  // ============================================
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
  'chicken thigh': { calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0, sugar: 0, sodium: 84 },
  'chicken drumstick': { calories: 172, protein: 28, carbs: 0, fat: 5.7, fiber: 0, sugar: 0, sodium: 90 },
  'chicken wing': { calories: 203, protein: 30, carbs: 0, fat: 8.1, fiber: 0, sugar: 0, sodium: 82 },
  'chicken leg': { calories: 184, protein: 27, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 88 },
  'chicken mince': { calories: 143, protein: 17, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 77 },
  'ground chicken': { calories: 143, protein: 17, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 77 },
  'chicken liver': { calories: 119, protein: 17, carbs: 1, fat: 5, fiber: 0, sugar: 0, sodium: 71 },
  'chicken skin': { calories: 349, protein: 13, carbs: 0, fat: 32, fiber: 0, sugar: 0, sodium: 65 },
  'whole chicken': { calories: 215, protein: 18, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 70 },
  'rotisserie chicken': { calories: 190, protein: 25, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 350 },
  'turkey breast': { calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 50 },
  'turkey mince': { calories: 148, protein: 20, carbs: 0, fat: 7, fiber: 0, sugar: 0, sodium: 72 },
  'ground turkey': { calories: 148, protein: 20, carbs: 0, fat: 7, fiber: 0, sugar: 0, sodium: 72 },
  'turkey thigh': { calories: 140, protein: 28, carbs: 0, fat: 2.5, fiber: 0, sugar: 0, sodium: 65 },
  'turkey leg': { calories: 144, protein: 28, carbs: 0, fat: 3, fiber: 0, sugar: 0, sodium: 68 },
  'duck breast': { calories: 201, protein: 23, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 65 },
  'duck leg': { calories: 217, protein: 27, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 70 },
  'whole duck': { calories: 337, protein: 19, carbs: 0, fat: 28, fiber: 0, sugar: 0, sodium: 63 },
  'goose': { calories: 238, protein: 29, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 73 },
  'pheasant': { calories: 133, protein: 24, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 40 },
  'quail': { calories: 134, protein: 22, carbs: 0, fat: 4.5, fiber: 0, sugar: 0, sodium: 52 },
  'cornish hen': { calories: 220, protein: 19, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 67 },
  'chicken stock': { calories: 4, protein: 0.5, carbs: 0.3, fat: 0.1, fiber: 0, sugar: 0.2, sodium: 300 },
  'chicken broth': { calories: 4, protein: 0.5, carbs: 0.3, fat: 0.1, fiber: 0, sugar: 0.2, sodium: 300 },

  // ============================================
  // BEEF (30 items)
  // ============================================
  'beef mince': { calories: 254, protein: 17, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 66 },
  'ground beef': { calories: 254, protein: 17, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 66 },
  'lean beef mince': { calories: 176, protein: 20, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 66 },
  'lean ground beef': { calories: 176, protein: 20, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 66 },
  'beef steak': { calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, sugar: 0, sodium: 54 },
  'sirloin steak': { calories: 244, protein: 27, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 56 },
  'ribeye steak': { calories: 291, protein: 24, carbs: 0, fat: 22, fiber: 0, sugar: 0, sodium: 58 },
  'fillet steak': { calories: 218, protein: 28, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 52 },
  'filet mignon': { calories: 218, protein: 28, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 52 },
  'rump steak': { calories: 234, protein: 28, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 55 },
  't-bone steak': { calories: 247, protein: 24, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 58 },
  'flank steak': { calories: 194, protein: 27, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 60 },
  'skirt steak': { calories: 221, protein: 26, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 65 },
  'beef brisket': { calories: 331, protein: 21, carbs: 0, fat: 27, fiber: 0, sugar: 0, sodium: 63 },
  'beef roast': { calories: 250, protein: 26, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 55 },
  'beef ribs': { calories: 291, protein: 24, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 58 },
  'short ribs': { calories: 295, protein: 22, carbs: 0, fat: 23, fiber: 0, sugar: 0, sodium: 60 },
  'beef chuck': { calories: 259, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 62 },
  'beef shin': { calories: 201, protein: 29, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 58 },
  'beef shank': { calories: 201, protein: 29, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 58 },
  'stewing beef': { calories: 250, protein: 26, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 55 },
  'braising steak': { calories: 250, protein: 26, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 55 },
  'beef liver': { calories: 135, protein: 20, carbs: 4, fat: 4, fiber: 0, sugar: 0, sodium: 69 },
  'beef kidney': { calories: 99, protein: 17, carbs: 0.3, fat: 3, fiber: 0, sugar: 0, sodium: 182 },
  'beef tongue': { calories: 224, protein: 15, carbs: 3, fat: 17, fiber: 0, sugar: 0, sodium: 69 },
  'oxtail': { calories: 262, protein: 30, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 50 },
  'corned beef': { calories: 251, protein: 27, carbs: 0.5, fat: 15, fiber: 0, sugar: 0, sodium: 973 },
  'beef jerky': { calories: 410, protein: 33, carbs: 11, fat: 26, fiber: 0, sugar: 9, sodium: 2081 },
  'beef stock': { calories: 7, protein: 0.7, carbs: 0.4, fat: 0.2, fiber: 0, sugar: 0.2, sodium: 300 },
  'beef broth': { calories: 7, protein: 0.7, carbs: 0.4, fat: 0.2, fiber: 0, sugar: 0.2, sodium: 300 },

  // ============================================
  // PORK (25 items)
  // ============================================
  'pork': { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62 },
  'pork chop': { calories: 231, protein: 25, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 58 },
  'pork loin': { calories: 196, protein: 27, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 52 },
  'pork tenderloin': { calories: 143, protein: 26, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 48 },
  'pork fillet': { calories: 143, protein: 26, carbs: 0, fat: 4, fiber: 0, sugar: 0, sodium: 48 },
  'pork belly': { calories: 518, protein: 9, carbs: 0, fat: 53, fiber: 0, sugar: 0, sodium: 32 },
  'pork shoulder': { calories: 269, protein: 24, carbs: 0, fat: 19, fiber: 0, sugar: 0, sodium: 67 },
  'pork ribs': { calories: 277, protein: 23, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 75 },
  'spare ribs': { calories: 277, protein: 23, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 75 },
  'pork mince': { calories: 263, protein: 17, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 66 },
  'ground pork': { calories: 263, protein: 17, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 66 },
  'pork leg': { calories: 233, protein: 26, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 58 },
  'pork roast': { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62 },
  'bacon': { calories: 417, protein: 13, carbs: 1, fat: 40, fiber: 0, sugar: 0, sodium: 1717 },
  'streaky bacon': { calories: 417, protein: 13, carbs: 1, fat: 40, fiber: 0, sugar: 0, sodium: 1717 },
  'back bacon': { calories: 215, protein: 25, carbs: 0.5, fat: 12, fiber: 0, sugar: 0, sodium: 1329 },
  'pancetta': { calories: 460, protein: 12, carbs: 0, fat: 46, fiber: 0, sugar: 0, sodium: 1684 },
  'ham': { calories: 145, protein: 21, carbs: 1.5, fat: 6, fiber: 0, sugar: 1, sodium: 1203 },
  'gammon': { calories: 167, protein: 23, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 1100 },
  'prosciutto': { calories: 250, protein: 26, carbs: 0.3, fat: 16, fiber: 0, sugar: 0, sodium: 1520 },
  'serrano ham': { calories: 241, protein: 31, carbs: 0.5, fat: 12, fiber: 0, sugar: 0, sodium: 2100 },
  'chorizo': { calories: 455, protein: 24, carbs: 2, fat: 38, fiber: 0, sugar: 1, sodium: 1235 },
  'sausage': { calories: 301, protein: 12, carbs: 2, fat: 27, fiber: 0, sugar: 1, sodium: 749 },
  'pork sausage': { calories: 301, protein: 12, carbs: 2, fat: 27, fiber: 0, sugar: 1, sodium: 749 },
  'pork liver': { calories: 134, protein: 21, carbs: 3, fat: 4, fiber: 0, sugar: 0, sodium: 87 },

  // ============================================
  // LAMB (15 items)
  // ============================================
  'lamb': { calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 66 },
  'lamb chop': { calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 66 },
  'lamb leg': { calories: 243, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 60 },
  'lamb shoulder': { calories: 292, protein: 24, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 65 },
  'lamb rack': { calories: 310, protein: 24, carbs: 0, fat: 23, fiber: 0, sugar: 0, sodium: 68 },
  'lamb loin': { calories: 263, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 62 },
  'lamb shank': { calories: 201, protein: 29, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 58 },
  'lamb mince': { calories: 283, protein: 17, carbs: 0, fat: 23, fiber: 0, sugar: 0, sodium: 70 },
  'ground lamb': { calories: 283, protein: 17, carbs: 0, fat: 23, fiber: 0, sugar: 0, sodium: 70 },
  'lamb liver': { calories: 139, protein: 21, carbs: 2, fat: 5, fiber: 0, sugar: 0, sodium: 76 },
  'lamb kidney': { calories: 97, protein: 16, carbs: 1, fat: 3, fiber: 0, sugar: 0, sodium: 156 },
  'mutton': { calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 72 },
  'hogget': { calories: 280, protein: 25, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 68 },
  'lamb neck': { calories: 276, protein: 22, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 64 },
  'lamb breast': { calories: 359, protein: 19, carbs: 0, fat: 31, fiber: 0, sugar: 0, sodium: 70 },

  // ============================================
  // FISH (40 items)
  // ============================================
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59 },
  'salmon fillet': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59 },
  'smoked salmon': { calories: 117, protein: 18, carbs: 0, fat: 4.3, fiber: 0, sugar: 0, sodium: 784 },
  'cod': { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 54 },
  'cod fillet': { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 54 },
  'haddock': { calories: 90, protein: 20, carbs: 0, fat: 0.6, fiber: 0, sugar: 0, sodium: 213 },
  'pollock': { calories: 92, protein: 19, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 86 },
  'tuna': { calories: 144, protein: 23, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 47 },
  'tuna steak': { calories: 144, protein: 23, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 47 },
  'canned tuna': { calories: 116, protein: 26, carbs: 0, fat: 0.8, fiber: 0, sugar: 0, sodium: 338 },
  'tinned tuna': { calories: 116, protein: 26, carbs: 0, fat: 0.8, fiber: 0, sugar: 0, sodium: 338 },
  'sea bass': { calories: 97, protein: 18, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 68 },
  'sea bream': { calories: 100, protein: 19, carbs: 0, fat: 2.5, fiber: 0, sugar: 0, sodium: 70 },
  'trout': { calories: 148, protein: 21, carbs: 0, fat: 6.6, fiber: 0, sugar: 0, sodium: 52 },
  'rainbow trout': { calories: 148, protein: 21, carbs: 0, fat: 6.6, fiber: 0, sugar: 0, sodium: 52 },
  'mackerel': { calories: 262, protein: 24, carbs: 0, fat: 18, fiber: 0, sugar: 0, sodium: 90 },
  'smoked mackerel': { calories: 305, protein: 19, carbs: 0, fat: 25, fiber: 0, sugar: 0, sodium: 610 },
  'sardines': { calories: 208, protein: 25, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 505 },
  'anchovies': { calories: 210, protein: 29, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 3668 },
  'herring': { calories: 203, protein: 23, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 90 },
  'kipper': { calories: 217, protein: 25, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 990 },
  'halibut': { calories: 111, protein: 21, carbs: 0, fat: 2.3, fiber: 0, sugar: 0, sodium: 69 },
  'sole': { calories: 91, protein: 19, carbs: 0, fat: 1.2, fiber: 0, sugar: 0, sodium: 81 },
  'plaice': { calories: 91, protein: 19, carbs: 0, fat: 1.2, fiber: 0, sugar: 0, sodium: 78 },
  'tilapia': { calories: 96, protein: 20, carbs: 0, fat: 1.7, fiber: 0, sugar: 0, sodium: 52 },
  'catfish': { calories: 119, protein: 18, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 50 },
  'swordfish': { calories: 144, protein: 24, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 102 },
  'monkfish': { calories: 76, protein: 15, carbs: 0, fat: 1.5, fiber: 0, sugar: 0, sodium: 20 },
  'red snapper': { calories: 100, protein: 21, carbs: 0, fat: 1.3, fiber: 0, sugar: 0, sodium: 64 },
  'grouper': { calories: 92, protein: 20, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 53 },
  'mahi mahi': { calories: 85, protein: 19, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 88 },
  'perch': { calories: 91, protein: 19, carbs: 0, fat: 0.9, fiber: 0, sugar: 0, sodium: 62 },
  'pike': { calories: 88, protein: 19, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 39 },
  'carp': { calories: 127, protein: 18, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 49 },
  'eel': { calories: 184, protein: 18, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 51 },
  'white fish': { calories: 90, protein: 19, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 70 },
  'fish fingers': { calories: 220, protein: 12, carbs: 18, fat: 11, fiber: 1, sugar: 1, sodium: 450 },
  'fish cakes': { calories: 188, protein: 9, carbs: 17, fat: 9, fiber: 1, sugar: 1, sodium: 420 },
  'fish stock': { calories: 8, protein: 1, carbs: 0.5, fat: 0.2, fiber: 0, sugar: 0, sodium: 280 },
  'fish sauce': { calories: 35, protein: 5, carbs: 4, fat: 0, fiber: 0, sugar: 3, sodium: 7851 },

  // ============================================
  // SEAFOOD/SHELLFISH (25 items)
  // ============================================
  'prawns': { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111 },
  'shrimp': { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111 },
  'king prawns': { calories: 105, protein: 24, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 148 },
  'tiger prawns': { calories: 105, protein: 24, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 148 },
  'crab': { calories: 97, protein: 19, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 395 },
  'crab meat': { calories: 97, protein: 19, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 395 },
  'lobster': { calories: 89, protein: 19, carbs: 0, fat: 0.9, fiber: 0, sugar: 0, sodium: 486 },
  'scallops': { calories: 88, protein: 17, carbs: 3, fat: 0.8, fiber: 0, sugar: 0, sodium: 392 },
  'mussels': { calories: 86, protein: 12, carbs: 4, fat: 2.2, fiber: 0, sugar: 0, sodium: 286 },
  'clams': { calories: 74, protein: 13, carbs: 3, fat: 1, fiber: 0, sugar: 0, sodium: 601 },
  'oysters': { calories: 68, protein: 7, carbs: 4, fat: 2.5, fiber: 0, sugar: 0, sodium: 211 },
  'squid': { calories: 92, protein: 16, carbs: 3, fat: 1.4, fiber: 0, sugar: 0, sodium: 44 },
  'calamari': { calories: 92, protein: 16, carbs: 3, fat: 1.4, fiber: 0, sugar: 0, sodium: 44 },
  'octopus': { calories: 82, protein: 15, carbs: 2, fat: 1, fiber: 0, sugar: 0, sodium: 230 },
  'cockles': { calories: 53, protein: 12, carbs: 0, fat: 0.6, fiber: 0, sugar: 0, sodium: 314 },
  'whelks': { calories: 137, protein: 24, carbs: 8, fat: 1, fiber: 0, sugar: 0, sodium: 206 },
  'crayfish': { calories: 77, protein: 16, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 97 },
  'langoustine': { calories: 90, protein: 19, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 200 },
  'surimi': { calories: 99, protein: 6, carbs: 15, fat: 1, fiber: 0, sugar: 6, sodium: 841 },
  'crab sticks': { calories: 99, protein: 6, carbs: 15, fat: 1, fiber: 0, sugar: 6, sodium: 841 },
  'caviar': { calories: 264, protein: 25, carbs: 4, fat: 18, fiber: 0, sugar: 0, sodium: 1500 },
  'fish roe': { calories: 143, protein: 22, carbs: 2, fat: 5, fiber: 0, sugar: 0, sodium: 91 },
  'smoked haddock': { calories: 101, protein: 23, carbs: 0, fat: 0.9, fiber: 0, sugar: 0, sodium: 763 },
  'kippers': { calories: 217, protein: 25, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 990 },
  'seafood mix': { calories: 85, protein: 16, carbs: 2, fat: 1.2, fiber: 0, sugar: 0, sodium: 280 },

  // ============================================
  // DAIRY (40 items)
  // ============================================
  'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44 },
  'whole milk': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 5, sodium: 43 },
  'semi-skimmed milk': { calories: 46, protein: 3.4, carbs: 4.8, fat: 1.7, fiber: 0, sugar: 5, sodium: 44 },
  'skimmed milk': { calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0, sugar: 5, sodium: 45 },
  'buttermilk': { calories: 40, protein: 3.3, carbs: 4.8, fat: 0.9, fiber: 0, sugar: 4.8, sodium: 105 },
  'condensed milk': { calories: 321, protein: 8, carbs: 54, fat: 9, fiber: 0, sugar: 54, sodium: 142 },
  'evaporated milk': { calories: 134, protein: 7, carbs: 10, fat: 8, fiber: 0, sugar: 10, sodium: 106 },
  'cream': { calories: 340, protein: 2.1, carbs: 2.8, fat: 37, fiber: 0, sugar: 2.8, sodium: 34 },
  'double cream': { calories: 449, protein: 1.7, carbs: 2.6, fat: 48, fiber: 0, sugar: 2.6, sodium: 26 },
  'single cream': { calories: 195, protein: 2.6, carbs: 3.7, fat: 19, fiber: 0, sugar: 3.7, sodium: 41 },
  'whipping cream': { calories: 340, protein: 2.1, carbs: 2.8, fat: 37, fiber: 0, sugar: 2.8, sodium: 34 },
  'clotted cream': { calories: 586, protein: 1.6, carbs: 2.3, fat: 63, fiber: 0, sugar: 2.3, sodium: 20 },
  'sour cream': { calories: 193, protein: 2.4, carbs: 4.6, fat: 20, fiber: 0, sugar: 3.4, sodium: 53 },
  'creme fraiche': { calories: 292, protein: 2.4, carbs: 2.6, fat: 30, fiber: 0, sugar: 2.6, sodium: 35 },
  'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 11 },
  'unsalted butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 11 },
  'salted butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 576 },
  'ghee': { calories: 876, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2 },
  'cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'cheddar': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'cheddar cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'mature cheddar': { calories: 410, protein: 25, carbs: 0.1, fat: 34, fiber: 0, sugar: 0.1, sodium: 700 },
  'mild cheddar': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'mozzarella': { calories: 280, protein: 28, carbs: 3, fat: 17, fiber: 0, sugar: 1, sodium: 627 },
  'parmesan': { calories: 431, protein: 38, carbs: 4, fat: 29, fiber: 0, sugar: 0.9, sodium: 1529 },
  'feta': { calories: 264, protein: 14, carbs: 4, fat: 21, fiber: 0, sugar: 4, sodium: 917 },
  'feta cheese': { calories: 264, protein: 14, carbs: 4, fat: 21, fiber: 0, sugar: 4, sodium: 917 },
  'goat cheese': { calories: 364, protein: 22, carbs: 0.1, fat: 30, fiber: 0, sugar: 0.1, sodium: 515 },
  'brie': { calories: 334, protein: 21, carbs: 0.5, fat: 28, fiber: 0, sugar: 0.5, sodium: 629 },
  'camembert': { calories: 299, protein: 20, carbs: 0.5, fat: 24, fiber: 0, sugar: 0.5, sodium: 842 },
  'stilton': { calories: 410, protein: 24, carbs: 0.1, fat: 35, fiber: 0, sugar: 0.1, sodium: 930 },
  'blue cheese': { calories: 353, protein: 21, carbs: 2, fat: 29, fiber: 0, sugar: 0.5, sodium: 1395 },
  'cream cheese': { calories: 342, protein: 6, carbs: 4, fat: 34, fiber: 0, sugar: 4, sodium: 321 },
  'cottage cheese': { calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, sugar: 2.7, sodium: 364 },
  'ricotta': { calories: 174, protein: 11, carbs: 3, fat: 13, fiber: 0, sugar: 0.3, sodium: 84 },
  'mascarpone': { calories: 429, protein: 4.8, carbs: 4.4, fat: 44, fiber: 0, sugar: 3.5, sodium: 41 },
  'halloumi': { calories: 321, protein: 21, carbs: 3, fat: 25, fiber: 0, sugar: 1, sodium: 1200 },
  'gruyere': { calories: 413, protein: 30, carbs: 0.4, fat: 32, fiber: 0, sugar: 0.4, sodium: 336 },
  'emmental': { calories: 379, protein: 29, carbs: 0, fat: 29, fiber: 0, sugar: 0, sodium: 196 },
  'edam': { calories: 357, protein: 25, carbs: 1.4, fat: 28, fiber: 0, sugar: 1.4, sodium: 812 },

  // ============================================
  // EGGS & EGG PRODUCTS (10 items)
  // ============================================
  'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124 },
  'egg white': { calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, sodium: 166 },
  'egg yolk': { calories: 322, protein: 16, carbs: 3.6, fat: 27, fiber: 0, sugar: 0.6, sodium: 48 },
  'quail egg': { calories: 158, protein: 13, carbs: 0.4, fat: 11, fiber: 0, sugar: 0.4, sodium: 141 },
  'duck egg': { calories: 185, protein: 13, carbs: 1.4, fat: 14, fiber: 0, sugar: 1, sodium: 146 },
  'goose egg': { calories: 185, protein: 14, carbs: 1.4, fat: 13, fiber: 0, sugar: 1, sodium: 138 },
  'liquid egg': { calories: 138, protein: 10, carbs: 1.6, fat: 10, fiber: 0, sugar: 1.6, sodium: 130 },
  'egg substitute': { calories: 44, protein: 9, carbs: 1.2, fat: 0, fiber: 0, sugar: 1, sodium: 200 },
  'mayonnaise': { calories: 680, protein: 1, carbs: 0.6, fat: 75, fiber: 0, sugar: 0.6, sodium: 635 },

  // ============================================
  // YOGURT & FERMENTED DAIRY (15 items)
  // ============================================
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, sugar: 3.2, sodium: 36 },
  'yoghurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, sugar: 3.2, sodium: 36 },
  'greek yogurt': { calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0, sugar: 3.6, sodium: 47 },
  'greek yoghurt': { calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0, sugar: 3.6, sodium: 47 },
  'greek yogurt 0%': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  'greek yoghurt 0%': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  '0% greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  '0% greek yoghurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  'fat free greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  'fat free greek yoghurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  'nonfat greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.2, fiber: 0, sugar: 3.2, sodium: 36 },  // Fat-free Greek yogurt
  'natural yogurt': { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, sugar: 4.7, sodium: 46 },
  'low fat yogurt': { calories: 56, protein: 5, carbs: 7.7, fat: 0.7, fiber: 0, sugar: 7.7, sodium: 76 },
  'fat free yogurt': { calories: 46, protein: 4.4, carbs: 6.5, fat: 0.2, fiber: 0, sugar: 4.5, sodium: 52 },
  'coconut yogurt': { calories: 180, protein: 2, carbs: 10, fat: 15, fiber: 0, sugar: 6, sodium: 10 },
  'kefir': { calories: 41, protein: 3.3, carbs: 4.5, fat: 1, fiber: 0, sugar: 4.5, sodium: 40 },
  'labneh': { calories: 230, protein: 10, carbs: 6, fat: 20, fiber: 0, sugar: 5, sodium: 350 },
  'skyr': { calories: 63, protein: 11, carbs: 4, fat: 0.2, fiber: 0, sugar: 3.5, sodium: 45 },
  'fromage frais': { calories: 113, protein: 6, carbs: 5, fat: 8, fiber: 0, sugar: 5, sodium: 40 },
  'quark': { calories: 67, protein: 12, carbs: 4, fat: 0.3, fiber: 0, sugar: 4, sodium: 40 },
  'ayran': { calories: 35, protein: 2, carbs: 3, fat: 2, fiber: 0, sugar: 3, sodium: 200 },
  'paneer': { calories: 321, protein: 25, carbs: 4, fat: 23, fiber: 0, sugar: 2, sodium: 18 },

  // ============================================
  // VEGETABLES (70 items)
  // ============================================
  'onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
  'onions': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
  'red onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
  'white onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
  'spring onion': { calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2, fiber: 2.6, sugar: 2.3, sodium: 16 },
  'spring onions': { calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2, fiber: 2.6, sugar: 2.3, sodium: 16 },
  'shallot': { calories: 72, protein: 2.5, carbs: 17, fat: 0.1, fiber: 3.2, sugar: 8, sodium: 12 },
  'shallots': { calories: 72, protein: 2.5, carbs: 17, fat: 0.1, fiber: 3.2, sugar: 8, sodium: 12 },
  'leek': { calories: 61, protein: 1.5, carbs: 14, fat: 0.3, fiber: 1.8, sugar: 3.9, sodium: 20 },
  'leeks': { calories: 61, protein: 1.5, carbs: 14, fat: 0.3, fiber: 1.8, sugar: 3.9, sodium: 20 },
  'garlic': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, sodium: 17 },
  'garlic clove': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, sodium: 17 },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'tomatoes': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'cherry tomatoes': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'plum tomatoes': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'sun-dried tomatoes': { calories: 258, protein: 14, carbs: 56, fat: 3, fiber: 12, sugar: 38, sodium: 2095 },
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6 },
  'potatoes': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6 },
  'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugar: 4.2, sodium: 55 },
  'sweet potatoes': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugar: 4.2, sodium: 55 },
  'new potatoes': { calories: 70, protein: 1.9, carbs: 16, fat: 0.1, fiber: 1.8, sugar: 1.3, sodium: 4 },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
  'carrots': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
  'parsnip': { calories: 75, protein: 1.2, carbs: 18, fat: 0.3, fiber: 4.9, sugar: 4.8, sodium: 10 },
  'parsnips': { calories: 75, protein: 1.2, carbs: 18, fat: 0.3, fiber: 4.9, sugar: 4.8, sodium: 10 },
  'turnip': { calories: 28, protein: 0.9, carbs: 6.4, fat: 0.1, fiber: 1.8, sugar: 3.8, sodium: 67 },
  'swede': { calories: 38, protein: 1.1, carbs: 8.6, fat: 0.2, fiber: 2.3, sugar: 4.5, sodium: 12 },
  'beetroot': { calories: 43, protein: 1.6, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 7, sodium: 78 },
  'radish': { calories: 16, protein: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6, sugar: 1.9, sodium: 39 },
  'celery': { calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sugar: 1.3, sodium: 80 },
  'celeriac': { calories: 42, protein: 1.5, carbs: 9.2, fat: 0.3, fiber: 1.8, sugar: 1.6, sodium: 100 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33 },
  'cauliflower': { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2, sugar: 1.9, sodium: 30 },
  'cabbage': { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5, sugar: 3.2, sodium: 18 },
  'red cabbage': { calories: 31, protein: 1.4, carbs: 7.4, fat: 0.2, fiber: 2.1, sugar: 3.8, sodium: 27 },
  'savoy cabbage': { calories: 27, protein: 2, carbs: 6.1, fat: 0.1, fiber: 3.1, sugar: 2.3, sodium: 28 },
  'brussels sprouts': { calories: 43, protein: 3.4, carbs: 9, fat: 0.3, fiber: 3.8, sugar: 2.2, sodium: 25 },
  'kale': { calories: 49, protein: 4.3, carbs: 9, fat: 0.9, fiber: 3.6, sugar: 2.3, sodium: 38 },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79 },
  'lettuce': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium: 28 },
  'iceberg lettuce': { calories: 14, protein: 0.9, carbs: 3, fat: 0.1, fiber: 1.2, sugar: 2, sodium: 10 },
  'romaine lettuce': { calories: 17, protein: 1.2, carbs: 3.3, fat: 0.3, fiber: 2.1, sugar: 1.2, sodium: 8 },
  'rocket': { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6, sugar: 2, sodium: 27 },
  'arugula': { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6, sugar: 2, sodium: 27 },
  'watercress': { calories: 11, protein: 2.3, carbs: 1.3, fat: 0.1, fiber: 0.5, sugar: 0.2, sodium: 41 },
  'swiss chard': { calories: 19, protein: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6, sugar: 1.1, sodium: 213 },
  'chard': { calories: 19, protein: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6, sugar: 1.1, sodium: 213 },
  'pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'peppers': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'bell pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'red pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'green pepper': { calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7, sugar: 2.4, sodium: 3 },
  'yellow pepper': { calories: 27, protein: 1, carbs: 6.3, fat: 0.2, fiber: 0.9, sugar: 4.2, sodium: 2 },
  'chilli': { calories: 40, protein: 2, carbs: 9, fat: 0.4, fiber: 1.5, sugar: 5.3, sodium: 9 },
  'chilli pepper': { calories: 40, protein: 2, carbs: 9, fat: 0.4, fiber: 1.5, sugar: 5.3, sodium: 9 },
  'jalapeno': { calories: 29, protein: 0.9, carbs: 6.5, fat: 0.4, fiber: 2.8, sugar: 4.1, sodium: 3 },
  'cucumber': { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2 },
  'courgette': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 2.5, sodium: 8 },
  'zucchini': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 2.5, sodium: 8 },
  'aubergine': { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3, sugar: 3.5, sodium: 2 },
  'eggplant': { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3, sugar: 3.5, sodium: 2 },
  'squash': { calories: 34, protein: 1.2, carbs: 9, fat: 0.1, fiber: 1.5, sugar: 2.2, sodium: 4 },
  'butternut squash': { calories: 45, protein: 1, carbs: 12, fat: 0.1, fiber: 2, sugar: 2.2, sodium: 4 },
  'pumpkin': { calories: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5, sugar: 2.8, sodium: 1 },
  'marrow': { calories: 12, protein: 0.5, carbs: 2.3, fat: 0.1, fiber: 0.6, sugar: 1.4, sodium: 3 },
  'mushroom': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'mushrooms': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'button mushrooms': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'chestnut mushrooms': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'portobello mushrooms': { calories: 22, protein: 2.1, carbs: 3.9, fat: 0.4, fiber: 1.3, sugar: 2.5, sodium: 9 },
  'shiitake mushrooms': { calories: 34, protein: 2.2, carbs: 6.8, fat: 0.5, fiber: 2.5, sugar: 2.4, sodium: 9 },
  'oyster mushrooms': { calories: 33, protein: 3.3, carbs: 6.1, fat: 0.4, fiber: 2.3, sugar: 1.1, sodium: 18 },
  'enoki mushrooms': { calories: 37, protein: 2.7, carbs: 7.8, fat: 0.3, fiber: 2.7, sugar: 0.2, sodium: 3 },
  'peas': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5.1, sugar: 5.7, sodium: 5 },
  'garden peas': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5.1, sugar: 5.7, sodium: 5 },
  'frozen peas': { calories: 77, protein: 5.2, carbs: 14, fat: 0.4, fiber: 4.5, sugar: 4.8, sodium: 3 },
  'mange tout': { calories: 42, protein: 2.8, carbs: 7.5, fat: 0.2, fiber: 2.6, sugar: 4, sodium: 4 },
  'sugar snap peas': { calories: 42, protein: 2.8, carbs: 7.5, fat: 0.2, fiber: 2.6, sugar: 4, sodium: 4 },
  'green beans': { calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4, sugar: 3.3, sodium: 6 },
  'french beans': { calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4, sugar: 3.3, sodium: 6 },
  'runner beans': { calories: 22, protein: 1.6, carbs: 4, fat: 0.2, fiber: 2.5, sugar: 1.6, sodium: 3 },
  'broad beans': { calories: 88, protein: 7.9, carbs: 11, fat: 0.7, fiber: 5.4, sugar: 1.8, sodium: 25 },
  'sweetcorn': { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7, sugar: 6.3, sodium: 15 },
  'corn': { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7, sugar: 6.3, sodium: 15 },
  'corn on the cob': { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7, sugar: 6.3, sodium: 15 },
  'asparagus': { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1, sugar: 1.9, sodium: 2 },
  'artichoke': { calories: 47, protein: 3.3, carbs: 11, fat: 0.2, fiber: 5.4, sugar: 1, sodium: 94 },
  'globe artichoke': { calories: 47, protein: 3.3, carbs: 11, fat: 0.2, fiber: 5.4, sugar: 1, sodium: 94 },
  'fennel': { calories: 31, protein: 1.2, carbs: 7.3, fat: 0.2, fiber: 3.1, sugar: 3.9, sodium: 52 },
  'pak choi': { calories: 13, protein: 1.5, carbs: 2.2, fat: 0.2, fiber: 1, sugar: 1.2, sodium: 65 },
  'bok choy': { calories: 13, protein: 1.5, carbs: 2.2, fat: 0.2, fiber: 1, sugar: 1.2, sodium: 65 },
  'chinese cabbage': { calories: 13, protein: 1.5, carbs: 2.2, fat: 0.2, fiber: 1, sugar: 1.2, sodium: 65 },
  'bean sprouts': { calories: 31, protein: 3, carbs: 6, fat: 0.2, fiber: 1.8, sugar: 4.1, sodium: 6 },
  'beansprouts': { calories: 31, protein: 3, carbs: 6, fat: 0.2, fiber: 1.8, sugar: 4.1, sodium: 6 },
  'bamboo shoots': { calories: 27, protein: 2.6, carbs: 5.2, fat: 0.3, fiber: 2.2, sugar: 3, sodium: 4 },
  'water chestnuts': { calories: 97, protein: 1.4, carbs: 24, fat: 0.1, fiber: 3, sugar: 4.8, sodium: 14 },
  'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7, sodium: 7 },
  'olives': { calories: 115, protein: 0.8, carbs: 6, fat: 11, fiber: 3.2, sugar: 0, sodium: 735 },
  'black olives': { calories: 115, protein: 0.8, carbs: 6, fat: 11, fiber: 3.2, sugar: 0, sodium: 735 },
  'green olives': { calories: 145, protein: 1, carbs: 3.8, fat: 15, fiber: 3.3, sugar: 0, sodium: 1556 },
  'capers': { calories: 23, protein: 2.4, carbs: 5, fat: 0.9, fiber: 3.2, sugar: 0.4, sodium: 2769 },
  'gherkins': { calories: 14, protein: 0.3, carbs: 2.3, fat: 0.2, fiber: 1.2, sugar: 1.1, sodium: 1208 },
  'pickles': { calories: 14, protein: 0.3, carbs: 2.3, fat: 0.2, fiber: 1.2, sugar: 1.1, sodium: 1208 },
  'sauerkraut': { calories: 19, protein: 0.9, carbs: 4.3, fat: 0.1, fiber: 2.9, sugar: 1.8, sodium: 661 },
  'kimchi': { calories: 15, protein: 1.1, carbs: 2.4, fat: 0.5, fiber: 1.6, sugar: 1.1, sodium: 498 },
  'seaweed': { calories: 35, protein: 1.7, carbs: 8, fat: 0.3, fiber: 0.5, sugar: 0.5, sodium: 233 },
  'nori': { calories: 35, protein: 5.8, carbs: 5.1, fat: 0.3, fiber: 0.3, sugar: 0.5, sodium: 48 },

  // ============================================
  // LEGUMES & PULSES (25 items)
  // ============================================
  'chickpeas': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, sugar: 4.8, sodium: 7 },
  'canned chickpeas': { calories: 139, protein: 7.5, carbs: 23, fat: 2.5, fiber: 6, sugar: 4, sodium: 210 },
  'lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2 },
  'red lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2 },
  'green lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2 },
  'puy lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2 },
  'black beans': { calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, sugar: 0.3, sodium: 1 },
  'kidney beans': { calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 6.4, sugar: 2.1, sodium: 2 },
  'red kidney beans': { calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 6.4, sugar: 2.1, sodium: 2 },
  'cannellini beans': { calories: 118, protein: 8.2, carbs: 21, fat: 0.5, fiber: 6.3, sugar: 0.3, sodium: 5 },
  'white beans': { calories: 118, protein: 8.2, carbs: 21, fat: 0.5, fiber: 6.3, sugar: 0.3, sodium: 5 },
  'butter beans': { calories: 115, protein: 7.8, carbs: 21, fat: 0.4, fiber: 5.8, sugar: 0.4, sodium: 4 },
  'lima beans': { calories: 115, protein: 7.8, carbs: 21, fat: 0.4, fiber: 5.8, sugar: 0.4, sodium: 4 },
  'haricot beans': { calories: 118, protein: 8.2, carbs: 21, fat: 0.5, fiber: 6.3, sugar: 0.3, sodium: 5 },
  'navy beans': { calories: 118, protein: 8.2, carbs: 21, fat: 0.5, fiber: 6.3, sugar: 0.3, sodium: 5 },
  'borlotti beans': { calories: 124, protein: 9, carbs: 22, fat: 0.5, fiber: 5.5, sugar: 1.7, sodium: 2 },
  'pinto beans': { calories: 143, protein: 9, carbs: 27, fat: 0.7, fiber: 9, sugar: 0.3, sodium: 1 },
  'black eyed peas': { calories: 116, protein: 7.7, carbs: 21, fat: 0.5, fiber: 6.5, sugar: 3.3, sodium: 4 },
  'edamame': { calories: 121, protein: 11, carbs: 9, fat: 5.2, fiber: 5.2, sugar: 2.2, sodium: 6 },
  'soybeans': { calories: 173, protein: 17, carbs: 10, fat: 9, fiber: 6, sugar: 3, sodium: 1 },
  'split peas': { calories: 118, protein: 8.3, carbs: 21, fat: 0.4, fiber: 8.3, sugar: 2.9, sodium: 15 },
  'baked beans': { calories: 105, protein: 5, carbs: 18, fat: 0.5, fiber: 5, sugar: 6, sodium: 530 },
  'refried beans': { calories: 89, protein: 5.4, carbs: 15, fat: 1.2, fiber: 5, sugar: 0.6, sodium: 471 },
  'hummus': { calories: 166, protein: 7.9, carbs: 14, fat: 9.6, fiber: 6, sugar: 0.3, sodium: 379 },
  'falafel': { calories: 333, protein: 13, carbs: 32, fat: 18, fiber: 5, sugar: 3, sodium: 294 },

  // ============================================
  // FRUITS (50 items)
  // ============================================
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1 },
  'apples': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1 },
  'bananas': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1 },
  'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9.4, sodium: 0 },
  'oranges': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9.4, sodium: 0 },
  'lemon': { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8, sugar: 2.5, sodium: 2 },
  'lemons': { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8, sugar: 2.5, sodium: 2 },
  'lemon juice': { calories: 22, protein: 0.4, carbs: 6.9, fat: 0.2, fiber: 0.3, sugar: 2.5, sodium: 1 },
  'lime': { calories: 30, protein: 0.7, carbs: 11, fat: 0.2, fiber: 2.8, sugar: 1.7, sodium: 2 },
  'lime juice': { calories: 25, protein: 0.4, carbs: 8.4, fat: 0.1, fiber: 0.4, sugar: 1.7, sodium: 2 },
  'grapefruit': { calories: 42, protein: 0.8, carbs: 11, fat: 0.1, fiber: 1.6, sugar: 7, sodium: 0 },
  'mandarin': { calories: 53, protein: 0.8, carbs: 13, fat: 0.3, fiber: 1.8, sugar: 11, sodium: 2 },
  'clementine': { calories: 47, protein: 0.9, carbs: 12, fat: 0.2, fiber: 1.7, sugar: 9.2, sodium: 1 },
  'satsuma': { calories: 44, protein: 0.6, carbs: 11, fat: 0.1, fiber: 1.5, sugar: 9, sodium: 2 },
  'grapes': { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, sugar: 16, sodium: 2 },
  'strawberry': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1 },
  'strawberries': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1 },
  'raspberry': { calories: 52, protein: 1.2, carbs: 12, fat: 0.7, fiber: 6.5, sugar: 4.4, sodium: 1 },
  'raspberries': { calories: 52, protein: 1.2, carbs: 12, fat: 0.7, fiber: 6.5, sugar: 4.4, sodium: 1 },
  'blueberry': { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, sugar: 10, sodium: 1 },
  'blueberries': { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, sugar: 10, sodium: 1 },
  'blackberry': { calories: 43, protein: 1.4, carbs: 10, fat: 0.5, fiber: 5.3, sugar: 4.9, sodium: 1 },
  'blackberries': { calories: 43, protein: 1.4, carbs: 10, fat: 0.5, fiber: 5.3, sugar: 4.9, sodium: 1 },
  'cherry': { calories: 63, protein: 1.1, carbs: 16, fat: 0.2, fiber: 2.1, sugar: 13, sodium: 0 },
  'cherries': { calories: 63, protein: 1.1, carbs: 16, fat: 0.2, fiber: 2.1, sugar: 13, sodium: 0 },
  'peach': { calories: 39, protein: 0.9, carbs: 10, fat: 0.3, fiber: 1.5, sugar: 8.4, sodium: 0 },
  'nectarine': { calories: 44, protein: 1.1, carbs: 11, fat: 0.3, fiber: 1.7, sugar: 7.9, sodium: 0 },
  'plum': { calories: 46, protein: 0.7, carbs: 11, fat: 0.3, fiber: 1.4, sugar: 10, sodium: 0 },
  'apricot': { calories: 48, protein: 1.4, carbs: 11, fat: 0.4, fiber: 2, sugar: 9.2, sodium: 1 },
  'pear': { calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1, sugar: 10, sodium: 1 },
  'mango': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 14, sodium: 1 },
  'pineapple': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, sugar: 10, sodium: 1 },
  'melon': { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2, fiber: 0.9, sugar: 7.9, sodium: 16 },
  'cantaloupe': { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2, fiber: 0.9, sugar: 7.9, sodium: 16 },
  'watermelon': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, sugar: 6.2, sodium: 1 },
  'honeydew': { calories: 36, protein: 0.5, carbs: 9, fat: 0.1, fiber: 0.8, sugar: 8, sodium: 18 },
  'kiwi': { calories: 61, protein: 1.1, carbs: 15, fat: 0.5, fiber: 3, sugar: 9, sodium: 3 },
  'papaya': { calories: 43, protein: 0.5, carbs: 11, fat: 0.3, fiber: 1.7, sugar: 8, sodium: 8 },
  'passion fruit': { calories: 97, protein: 2.2, carbs: 23, fat: 0.7, fiber: 10, sugar: 11, sodium: 28 },
  'pomegranate': { calories: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4, sugar: 14, sodium: 3 },
  'fig': { calories: 74, protein: 0.8, carbs: 19, fat: 0.3, fiber: 2.9, sugar: 16, sodium: 1 },
  'figs': { calories: 74, protein: 0.8, carbs: 19, fat: 0.3, fiber: 2.9, sugar: 16, sodium: 1 },
  'date': { calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 7, sugar: 66, sodium: 1 },
  'dates': { calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 7, sugar: 66, sodium: 1 },
  'raisins': { calories: 299, protein: 3.1, carbs: 79, fat: 0.5, fiber: 3.7, sugar: 59, sodium: 11 },
  'sultanas': { calories: 299, protein: 2.5, carbs: 79, fat: 0.4, fiber: 3.7, sugar: 59, sodium: 11 },
  'dried apricots': { calories: 241, protein: 3.4, carbs: 63, fat: 0.5, fiber: 7.3, sugar: 53, sodium: 10 },
  'prunes': { calories: 240, protein: 2.2, carbs: 64, fat: 0.4, fiber: 7.1, sugar: 38, sodium: 2 },
  'cranberries': { calories: 46, protein: 0.4, carbs: 12, fat: 0.1, fiber: 4.6, sugar: 4, sodium: 2 },
  'dried cranberries': { calories: 308, protein: 0.1, carbs: 83, fat: 1.4, fiber: 5.7, sugar: 65, sodium: 3 },
  'coconut': { calories: 354, protein: 3.3, carbs: 15, fat: 33, fiber: 9, sugar: 6.2, sodium: 20 },
  'desiccated coconut': { calories: 660, protein: 6, carbs: 24, fat: 65, fiber: 17, sugar: 7, sodium: 37 },

  // ============================================
  // GRAINS & PASTA (35 items)
  // ============================================
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1 },
  'white rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1 },
  'brown rice': { calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8, sugar: 0.4, sodium: 1 },
  'basmati rice': { calories: 121, protein: 3.5, carbs: 25, fat: 0.4, fiber: 0.4, sugar: 0, sodium: 1 },
  'jasmine rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.4, fiber: 0.6, sugar: 0, sodium: 0 },
  'wild rice': { calories: 101, protein: 4, carbs: 21, fat: 0.3, fiber: 1.8, sugar: 0.7, sodium: 3 },
  'risotto rice': { calories: 130, protein: 2.4, carbs: 29, fat: 0.2, fiber: 0.4, sugar: 0, sodium: 1 },
  'arborio rice': { calories: 130, protein: 2.4, carbs: 29, fat: 0.2, fiber: 0.4, sugar: 0, sodium: 1 },
  'sushi rice': { calories: 130, protein: 2.7, carbs: 29, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'spaghetti': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'penne': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'fusilli': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'tagliatelle': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'lasagne sheets': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'macaroni': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'rigatoni': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'orzo': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'egg noodles': { calories: 138, protein: 4.5, carbs: 25, fat: 2.1, fiber: 1.2, sugar: 0.5, sodium: 5 },
  'rice noodles': { calories: 109, protein: 0.9, carbs: 25, fat: 0.2, fiber: 0.9, sugar: 0, sodium: 10 },
  'udon noodles': { calories: 99, protein: 3, carbs: 21, fat: 0.1, fiber: 1, sugar: 0.5, sodium: 380 },
  'ramen noodles': { calories: 138, protein: 4.5, carbs: 26, fat: 2, fiber: 1, sugar: 0.5, sodium: 500 },
  'couscous': { calories: 112, protein: 3.8, carbs: 23, fat: 0.2, fiber: 1.4, sugar: 0.1, sodium: 5 },
  'bulgur wheat': { calories: 83, protein: 3.1, carbs: 19, fat: 0.2, fiber: 4.5, sugar: 0.1, sodium: 5 },
  'quinoa': { calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, sugar: 0.9, sodium: 7 },
  'barley': { calories: 123, protein: 2.3, carbs: 28, fat: 0.4, fiber: 3.8, sugar: 0.3, sodium: 3 },
  'pearl barley': { calories: 123, protein: 2.3, carbs: 28, fat: 0.4, fiber: 3.8, sugar: 0.3, sodium: 3 },
  'oats': { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, sugar: 0.9, sodium: 6 },  // Dry oats (USDA)
  'rolled oats': { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, sugar: 0.9, sodium: 6 },  // Dry oats (USDA)
  'porridge oats': { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, sugar: 0.9, sodium: 6 },  // Dry oats (USDA)
  'polenta': { calories: 70, protein: 1.6, carbs: 15, fat: 0.4, fiber: 1, sugar: 0.1, sodium: 1 },
  'cornmeal': { calories: 361, protein: 8.1, carbs: 77, fat: 3.6, fiber: 7.3, sugar: 0.6, sodium: 7 },
  'flour': { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7, sugar: 0.3, sodium: 2 },
  'plain flour': { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7, sugar: 0.3, sodium: 2 },
  'self-raising flour': { calories: 338, protein: 9, carbs: 72, fat: 1, fiber: 2.4, sugar: 0.3, sodium: 340 },
  'wholemeal flour': { calories: 340, protein: 13, carbs: 72, fat: 2.5, fiber: 11, sugar: 0.4, sodium: 5 },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491 },
  'white bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491 },
  'wholemeal bread': { calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, sugar: 4.4, sodium: 450 },
  'breadcrumbs': { calories: 395, protein: 13, carbs: 72, fat: 5.3, fiber: 4.5, sugar: 6.2, sodium: 732 },
  'panko breadcrumbs': { calories: 395, protein: 11, carbs: 75, fat: 4, fiber: 2.5, sugar: 4, sodium: 680 },
  'tortilla': { calories: 237, protein: 6.4, carbs: 40, fat: 5.6, fiber: 2.8, sugar: 1.8, sodium: 474 },
  'pitta bread': { calories: 275, protein: 9, carbs: 55, fat: 1.2, fiber: 2.2, sugar: 1.8, sodium: 536 },
  'naan bread': { calories: 290, protein: 9, carbs: 50, fat: 5.5, fiber: 2, sugar: 3, sodium: 520 },

  // ============================================
  // NUTS & SEEDS (25 items)
  // ============================================
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, sodium: 1 },
  'ground almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, sodium: 1 },
  'flaked almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, sodium: 1 },
  'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, sugar: 2.6, sodium: 2 },
  'cashews': { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3, sugar: 5.9, sodium: 12 },
  'peanuts': { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, sugar: 4, sodium: 18 },
  'hazelnuts': { calories: 628, protein: 15, carbs: 17, fat: 61, fiber: 9.7, sugar: 4.3, sodium: 0 },
  'pistachios': { calories: 560, protein: 20, carbs: 28, fat: 45, fiber: 10, sugar: 7.7, sodium: 1 },
  'pecans': { calories: 691, protein: 9.2, carbs: 14, fat: 72, fiber: 9.6, sugar: 4, sodium: 0 },
  'macadamia nuts': { calories: 718, protein: 7.9, carbs: 14, fat: 76, fiber: 8.6, sugar: 4.6, sodium: 5 },
  'brazil nuts': { calories: 656, protein: 14, carbs: 12, fat: 66, fiber: 7.5, sugar: 2.3, sodium: 3 },
  'pine nuts': { calories: 673, protein: 14, carbs: 13, fat: 68, fiber: 3.7, sugar: 3.6, sodium: 2 },
  'mixed nuts': { calories: 607, protein: 20, carbs: 21, fat: 54, fiber: 7, sugar: 4.7, sodium: 3 },
  'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugar: 9.2, sodium: 459 },
  'almond butter': { calories: 614, protein: 21, carbs: 19, fat: 56, fiber: 10, sugar: 4.4, sodium: 7 },
  'tahini': { calories: 595, protein: 17, carbs: 21, fat: 54, fiber: 9.3, sugar: 0.5, sodium: 115 },
  'sesame seeds': { calories: 573, protein: 18, carbs: 23, fat: 50, fiber: 12, sugar: 0.3, sodium: 11 },
  'sunflower seeds': { calories: 584, protein: 21, carbs: 20, fat: 51, fiber: 8.6, sugar: 2.6, sodium: 9 },
  'pumpkin seeds': { calories: 559, protein: 30, carbs: 11, fat: 49, fiber: 6, sugar: 1.4, sodium: 7 },
  'chia seeds': { calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, sugar: 0, sodium: 16 },
  'flaxseeds': { calories: 534, protein: 18, carbs: 29, fat: 42, fiber: 27, sugar: 1.6, sodium: 30 },
  'poppy seeds': { calories: 525, protein: 18, carbs: 28, fat: 42, fiber: 20, sugar: 3, sodium: 26 },
  'hemp seeds': { calories: 553, protein: 32, carbs: 9, fat: 49, fiber: 4, sugar: 1.5, sodium: 5 },
  'chestnuts': { calories: 131, protein: 2, carbs: 28, fat: 1.4, fiber: 3, sugar: 11, sodium: 2 },
  'coconut milk': { calories: 197, protein: 2.2, carbs: 6, fat: 20, fiber: 0, sugar: 3.3, sodium: 13 },

  // ============================================
  // OILS & FATS (18 items)
  // ============================================
  'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2 },
  'extra virgin olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2 },
  'vegetable oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'sunflower oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'rapeseed oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'canola oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'coconut oil': { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'sesame oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'groundnut oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'peanut oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'avocado oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'walnut oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'lard': { calories: 902, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'dripping': { calories: 891, protein: 0, carbs: 0, fat: 99, fiber: 0, sugar: 0, sodium: 0 },
  'suet': { calories: 854, protein: 0, carbs: 0, fat: 94, fiber: 0, sugar: 0, sodium: 7 },
  'margarine': { calories: 717, protein: 0.2, carbs: 0.7, fat: 80, fiber: 0, sugar: 0, sodium: 800 },
  'cooking spray': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'duck fat': { calories: 882, protein: 0, carbs: 0, fat: 99.8, fiber: 0, sugar: 0, sodium: 0 },

  // ============================================
  // HERBS & SPICES (35 items)
  // ============================================
  'salt': { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 38758 },
  'black pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20 },
  'ground pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20 },
  'white pepper': { calories: 296, protein: 10, carbs: 69, fat: 2.1, fiber: 26, sugar: 0, sodium: 5 },
  'paprika': { calories: 282, protein: 14, carbs: 54, fat: 13, fiber: 35, sugar: 10, sodium: 68 },
  'smoked paprika': { calories: 282, protein: 14, carbs: 54, fat: 13, fiber: 35, sugar: 10, sodium: 68 },
  'cumin': { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 11, sugar: 2.3, sodium: 168 },
  'ground cumin': { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 11, sugar: 2.3, sodium: 168 },
  'coriander': { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8, sugar: 0.9, sodium: 46 },
  'ground coriander': { calories: 298, protein: 12, carbs: 55, fat: 18, fiber: 42, sugar: 0, sodium: 35 },
  'coriander seeds': { calories: 298, protein: 12, carbs: 55, fat: 18, fiber: 42, sugar: 0, sodium: 35 },
  'turmeric': { calories: 312, protein: 9.7, carbs: 67, fat: 3.3, fiber: 23, sugar: 3.2, sodium: 27 },
  'ginger': { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2, sugar: 1.7, sodium: 13 },
  'ground ginger': { calories: 335, protein: 9, carbs: 72, fat: 4.2, fiber: 14, sugar: 3.4, sodium: 27 },
  'cinnamon': { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53, sugar: 2.2, sodium: 10 },
  'ground cinnamon': { calories: 247, protein: 4, carbs: 81, fat: 1.2, fiber: 53, sugar: 2.2, sodium: 10 },
  'nutmeg': { calories: 525, protein: 6, carbs: 49, fat: 36, fiber: 21, sugar: 2.9, sodium: 16 },
  'cloves': { calories: 274, protein: 6, carbs: 66, fat: 13, fiber: 34, sugar: 2.4, sodium: 277 },
  'cardamom': { calories: 311, protein: 11, carbs: 68, fat: 6.7, fiber: 28, sugar: 0, sodium: 18 },
  'star anise': { calories: 337, protein: 18, carbs: 50, fat: 16, fiber: 15, sugar: 0, sodium: 16 },
  'fennel seeds': { calories: 345, protein: 16, carbs: 52, fat: 15, fiber: 40, sugar: 0, sodium: 88 },
  'mustard powder': { calories: 469, protein: 24, carbs: 34, fat: 29, fiber: 13, sugar: 8, sodium: 12 },
  'mustard seeds': { calories: 508, protein: 26, carbs: 28, fat: 36, fiber: 12, sugar: 7, sodium: 13 },
  'cayenne pepper': { calories: 318, protein: 12, carbs: 57, fat: 17, fiber: 27, sugar: 10, sodium: 30 },
  'chilli powder': { calories: 282, protein: 14, carbs: 50, fat: 14, fiber: 35, sugar: 8, sodium: 1010 },
  'chilli flakes': { calories: 314, protein: 12, carbs: 50, fat: 17, fiber: 28, sugar: 10, sodium: 30 },
  'oregano': { calories: 265, protein: 9, carbs: 69, fat: 4.3, fiber: 43, sugar: 4.1, sodium: 25 },
  'dried oregano': { calories: 265, protein: 9, carbs: 69, fat: 4.3, fiber: 43, sugar: 4.1, sodium: 25 },
  'basil': { calories: 23, protein: 3.2, carbs: 2.7, fat: 0.6, fiber: 1.6, sugar: 0.3, sodium: 4 },
  'dried basil': { calories: 233, protein: 23, carbs: 48, fat: 4, fiber: 38, sugar: 1.7, sodium: 76 },
  'thyme': { calories: 101, protein: 5.6, carbs: 24, fat: 1.7, fiber: 14, sugar: 0, sodium: 9 },
  'dried thyme': { calories: 276, protein: 9.1, carbs: 64, fat: 7.4, fiber: 37, sugar: 1.7, sodium: 55 },
  'rosemary': { calories: 131, protein: 3.3, carbs: 21, fat: 5.9, fiber: 14, sugar: 0, sodium: 26 },
  'dried rosemary': { calories: 331, protein: 4.9, carbs: 64, fat: 15, fiber: 43, sugar: 0, sodium: 50 },
  'mint': { calories: 44, protein: 3.3, carbs: 8.4, fat: 0.7, fiber: 6.8, sugar: 0, sodium: 30 },
  'dried mint': { calories: 285, protein: 20, carbs: 53, fat: 6, fiber: 30, sugar: 0, sodium: 344 },
  'parsley': { calories: 36, protein: 3, carbs: 6.3, fat: 0.8, fiber: 3.3, sugar: 0.9, sodium: 56 },
  'dried parsley': { calories: 292, protein: 27, carbs: 51, fat: 5.5, fiber: 27, sugar: 7.3, sodium: 452 },
  'bay leaves': { calories: 313, protein: 8, carbs: 75, fat: 8, fiber: 26, sugar: 0, sodium: 23 },
  'sage': { calories: 315, protein: 11, carbs: 61, fat: 13, fiber: 40, sugar: 1.7, sodium: 11 },
  'dill': { calories: 43, protein: 3.5, carbs: 7, fat: 1.1, fiber: 2.1, sugar: 0, sodium: 61 },
  'chives': { calories: 30, protein: 3.3, carbs: 4.4, fat: 0.7, fiber: 2.5, sugar: 1.9, sodium: 3 },
  'tarragon': { calories: 295, protein: 23, carbs: 50, fat: 7.2, fiber: 7.4, sugar: 0, sodium: 62 },
  'curry powder': { calories: 325, protein: 13, carbs: 56, fat: 14, fiber: 35, sugar: 2.8, sodium: 52 },
  'garam masala': { calories: 379, protein: 15, carbs: 45, fat: 15, fiber: 25, sugar: 3, sodium: 56 },
  'mixed herbs': { calories: 250, protein: 10, carbs: 55, fat: 5, fiber: 30, sugar: 3, sodium: 40 },
  'italian seasoning': { calories: 250, protein: 10, carbs: 55, fat: 5, fiber: 30, sugar: 3, sodium: 40 },
  'chinese five spice': { calories: 340, protein: 12, carbs: 58, fat: 12, fiber: 20, sugar: 3, sodium: 20 },
  'vanilla extract': { calories: 288, protein: 0.1, carbs: 13, fat: 0.1, fiber: 0, sugar: 13, sodium: 9 },
  'vanilla pod': { calories: 288, protein: 0.1, carbs: 13, fat: 0.1, fiber: 0, sugar: 13, sodium: 9 },
  'saffron': { calories: 310, protein: 11, carbs: 65, fat: 6, fiber: 4, sugar: 0, sodium: 148 },

  // ============================================
  // SAUCES & CONDIMENTS (25 items)
  // ============================================
  'soy sauce': { calories: 53, protein: 8, carbs: 5, fat: 0, fiber: 0.8, sugar: 0.4, sodium: 5493 },
  'dark soy sauce': { calories: 60, protein: 6, carbs: 9, fat: 0, fiber: 0, sugar: 6, sodium: 5600 },
  'light soy sauce': { calories: 41, protein: 6, carbs: 4.1, fat: 0, fiber: 0, sugar: 0, sodium: 5500 },
  'worcestershire sauce': { calories: 78, protein: 0, carbs: 19, fat: 0, fiber: 0, sugar: 11, sodium: 980 },
  'tomato ketchup': { calories: 112, protein: 1.7, carbs: 28, fat: 0.1, fiber: 0.3, sugar: 22, sodium: 907 },
  'tomato puree': { calories: 82, protein: 4.3, carbs: 19, fat: 0.5, fiber: 4.1, sugar: 12, sodium: 77 },
  'tomato paste': { calories: 82, protein: 4.3, carbs: 19, fat: 0.5, fiber: 4.1, sugar: 12, sodium: 77 },
  'passata': { calories: 24, protein: 1.3, carbs: 4.6, fat: 0.1, fiber: 1.5, sugar: 3.6, sodium: 10 },
  'chopped tomatoes': { calories: 18, protein: 0.9, carbs: 3.5, fat: 0.1, fiber: 0.9, sugar: 2.6, sodium: 9 },
  'tinned tomatoes': { calories: 18, protein: 0.9, carbs: 3.5, fat: 0.1, fiber: 0.9, sugar: 2.6, sodium: 9 },
  'mustard': { calories: 66, protein: 4.4, carbs: 6, fat: 3.3, fiber: 3.3, sugar: 3, sodium: 1135 },
  'english mustard': { calories: 151, protein: 9, carbs: 7, fat: 10, fiber: 3, sugar: 3, sodium: 1000 },
  'dijon mustard': { calories: 66, protein: 4.1, carbs: 6, fat: 3.3, fiber: 2, sugar: 3, sodium: 1135 },
  'wholegrain mustard': { calories: 149, protein: 8, carbs: 10, fat: 10, fiber: 5, sugar: 4, sodium: 1160 },
  'horseradish': { calories: 48, protein: 1.2, carbs: 11, fat: 0.7, fiber: 3.3, sugar: 8, sodium: 420 },
  'vinegar': { calories: 21, protein: 0, carbs: 0.9, fat: 0, fiber: 0, sugar: 0.4, sodium: 8 },
  'balsamic vinegar': { calories: 88, protein: 0.5, carbs: 17, fat: 0, fiber: 0, sugar: 15, sodium: 23 },
  'red wine vinegar': { calories: 19, protein: 0, carbs: 0.3, fat: 0, fiber: 0, sugar: 0, sodium: 8 },
  'white wine vinegar': { calories: 21, protein: 0, carbs: 0.9, fat: 0, fiber: 0, sugar: 0.4, sodium: 8 },
  'apple cider vinegar': { calories: 21, protein: 0, carbs: 0.9, fat: 0, fiber: 0, sugar: 0.4, sodium: 5 },
  'mirin': { calories: 241, protein: 0.2, carbs: 43, fat: 0, fiber: 0, sugar: 32, sodium: 15 },
  'rice vinegar': { calories: 18, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  'hot sauce': { calories: 11, protein: 0.5, carbs: 2, fat: 0.4, fiber: 0.5, sugar: 1, sodium: 2643 },
  'sriracha': { calories: 93, protein: 2, carbs: 19, fat: 1, fiber: 2, sugar: 15, sodium: 2200 },
  'bbq sauce': { calories: 172, protein: 0.8, carbs: 41, fat: 0.6, fiber: 0.6, sugar: 33, sodium: 1027 },
  'teriyaki sauce': { calories: 89, protein: 6, carbs: 16, fat: 0, fiber: 0.1, sugar: 14, sodium: 3833 },
  'oyster sauce': { calories: 51, protein: 1, carbs: 11, fat: 0.3, fiber: 0, sugar: 4, sodium: 2733 },
  'hoisin sauce': { calories: 220, protein: 3.4, carbs: 44, fat: 3.4, fiber: 2, sugar: 31, sodium: 1396 },
  'pesto': { calories: 387, protein: 5.3, carbs: 6, fat: 37, fiber: 2.3, sugar: 2, sodium: 900 },
  'honey': { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, sugar: 82, sodium: 4 },
  'maple syrup': { calories: 260, protein: 0, carbs: 67, fat: 0.1, fiber: 0, sugar: 60, sodium: 12 },
  'golden syrup': { calories: 325, protein: 0, carbs: 79, fat: 0, fiber: 0, sugar: 73, sodium: 270 },
  'treacle': { calories: 290, protein: 1.6, carbs: 74, fat: 0, fiber: 0, sugar: 62, sodium: 96 },
  'stock cube': { calories: 229, protein: 14, carbs: 19, fat: 11, fiber: 0.5, sugar: 6, sodium: 16000 },
  'vegetable stock': { calories: 8, protein: 0.3, carbs: 1.5, fat: 0.1, fiber: 0, sugar: 0.5, sodium: 300 },
}

/**
 * Get nutrition from cache or fallback data
 */
export function getCachedNutrition(ingredientName: string): NutrientsPer100g | null {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase()

  // Check memory cache first
  const cached = memoryCache.get(normalized)
  if (cached) {
    return cached.nutrientsPer100g
  }

  // Check seed data fallbacks
  if (COMMON_INGREDIENTS[normalized]) {
    return COMMON_INGREDIENTS[normalized]
  }

  // Try partial matching for common ingredients
  for (const [key, nutrition] of Object.entries(COMMON_INGREDIENTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return nutrition
    }
  }

  return null
}

/**
 * Cache nutrition data for an ingredient
 */
export function cacheNutrition(
  ingredientName: string,
  fdcId: number,
  nutrientsPer100g: NutrientsPer100g
): void {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase()

  memoryCache.set(normalized, {
    ingredientName,
    normalizedName: normalized,
    fdcId,
    nutrientsPer100g,
    lastUpdated: new Date(),
    source: 'usda',
  })
}

/**
 * Get all seed data keys (for debugging/testing)
 */
export function getCommonIngredientNames(): string[] {
  return Object.keys(COMMON_INGREDIENTS)
}

/**
 * Check if we have data for an ingredient (cached or seed)
 */
export function hasNutritionData(ingredientName: string): boolean {
  return getCachedNutrition(ingredientName) !== null
}
