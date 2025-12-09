/**
 * Generate a colorful SVG illustration for recipes without user-provided photos
 * Style matches Sarah's friendly cartoon aesthetic
 */

// Color schemes based on meal category
const COLOR_SCHEMES = {
  Breakfast: {
    bg1: '#FFE5B4', // Peach
    bg2: '#FFB347', // Orange
    accent: '#FF6B35',
    emoji: '🍳'
  },
  Lunch: {
    bg1: '#90EE90', // Light green
    bg2: '#32CD32', // Lime green
    accent: '#228B22',
    emoji: '🥗'
  },
  Dinner: {
    bg1: '#87CEEB', // Sky blue
    bg2: '#4682B4', // Steel blue
    accent: '#1E3A8A',
    emoji: '🍽️'
  },
  Snack: {
    bg1: '#FFB6C1', // Light pink
    bg2: '#FF69B4', // Hot pink
    accent: '#C71585',
    emoji: '🍿'
  },
  Dessert: {
    bg1: '#DDA0DD', // Plum
    bg2: '#BA55D3', // Medium orchid
    accent: '#8B008B',
    emoji: '🍰'
  },
  default: {
    bg1: '#FFF0E6', // Floral white
    bg2: '#FFD700', // Gold
    accent: '#FF8C00',
    emoji: '🍴'
  }
}

/**
 * Generate SVG recipe illustration
 * @param recipeName - Name of the recipe
 * @param mealCategory - Array of meal categories (uses first one for color)
 * @returns Base64 data URL of SVG image
 */
export function generateRecipeSVG(
  recipeName: string,
  mealCategory?: string[]
): string {
  // Pick color scheme based on first meal category
  const category = mealCategory?.[0] || 'default'
  const colors = COLOR_SCHEMES[category as keyof typeof COLOR_SCHEMES] || COLOR_SCHEMES.default

  // Truncate recipe name if too long
  const displayName = recipeName.length > 30
    ? recipeName.substring(0, 27) + '...'
    : recipeName

  // Generate SVG
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <!-- Gradient background -->
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.bg2};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="400" height="400" fill="url(#grad)"/>

      <!-- Decorative circles -->
      <circle cx="50" cy="50" r="30" fill="${colors.accent}" opacity="0.1"/>
      <circle cx="350" cy="100" r="40" fill="${colors.accent}" opacity="0.1"/>
      <circle cx="80" cy="350" r="35" fill="${colors.accent}" opacity="0.15"/>
      <circle cx="320" cy="320" r="45" fill="${colors.accent}" opacity="0.1"/>

      <!-- Main plate circle -->
      <circle cx="200" cy="200" r="120" fill="white" filter="url(#shadow)"/>
      <circle cx="200" cy="200" r="120" fill="${colors.accent}" opacity="0.05"/>

      <!-- Food emoji -->
      <text x="200" y="180" font-size="80" text-anchor="middle" dominant-baseline="middle">
        ${colors.emoji}
      </text>

      <!-- Recipe name -->
      <text x="200" y="260" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
            fill="${colors.accent}" text-anchor="middle">
        ${displayName}
      </text>

      <!-- Category badge -->
      <rect x="150" y="280" width="100" height="24" rx="12" fill="${colors.accent}" opacity="0.9"/>
      <text x="200" y="296" font-family="Arial, sans-serif" font-size="12" font-weight="600"
            fill="white" text-anchor="middle">
        ${category}
      </text>
    </svg>
  `.trim()

  // Convert SVG to base64 data URL
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}
