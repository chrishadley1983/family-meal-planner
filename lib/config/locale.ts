/**
 * UK Locale Configuration
 * Ensures consistent British English and metric units throughout the application
 */

export const LOCALE = {
  region: 'GB',
  language: 'en-GB',
  measurementSystem: 'metric',
  temperatureUnit: 'celsius',
  dateFormat: 'DD/MM/YYYY',
} as const

/**
 * Instruction to include in all AI prompts to ensure UK consistency
 */
export const AI_LOCALE_INSTRUCTION = `
IMPORTANT - Use British English and metric units:

SPELLING:
- Use UK spelling: colour, favour, flavour, metre, litre, centre, realise, organise, catalogue, programme

FOOD TERMINOLOGY (use UK terms):
- courgette (not zucchini)
- aubergine (not eggplant)
- coriander (not cilantro)
- rocket (not arugula)
- spring onion (not scallion)
- mince/minced beef (not ground beef)
- chips (not fries)
- crisps (not chips for snack)
- prawns (not shrimp)
- pak choi (not bok choy)
- swede (not rutabaga)
- mangetout (not snow peas)
- broad beans (not fava beans)
- tinned (not canned)
- biscuits (not cookies, unless American-style)

UNITS - Always use metric:
- Weight: grams (g), kilograms (kg) - never ounces, pounds
- Volume: millilitres (ml), litres (L) - never cups, fluid ounces
- Temperature: Celsius (°C) - never Fahrenheit
- Convert any imperial measurements to metric

EXCEPTIONS (keep these units as-is):
- Spoon measures: tsp, tbsp (universal)
- Count units: piece, slice, clove, bunch, can, jar, bottle, pack, egg, rasher
`

/**
 * Shorter version for prompts with limited space
 */
export const AI_LOCALE_INSTRUCTION_SHORT = `
Use British English spelling and UK food terms (courgette, aubergine, coriander, mince, etc.).
Always use metric units (g, ml, kg, L, °C). Convert any imperial measurements.
`
