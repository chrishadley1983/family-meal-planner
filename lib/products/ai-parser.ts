/**
 * AI-Powered Product Parsing
 *
 * Uses Claude Haiku to extract product information from:
 * - URLs (product pages from supermarkets, etc.)
 * - Images (nutrition labels, packaging photos)
 * - Text (clipboard paste from product pages)
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  ParsedProductFromUrl,
  ParsedProductFromImage,
  ParsedProductFromText,
  PRODUCT_CATEGORIES,
  ProductCategory,
} from '@/lib/types/product'
import { AI_LOCALE_INSTRUCTION } from '@/lib/config/locale'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Model configuration per spec: claude-haiku-4-5 with temperature 0.3
const AI_MODEL = 'claude-haiku-4-5'
const AI_TEMPERATURE = 0.3

/**
 * Common prompt instructions for all product parsing
 */
const PRODUCT_EXTRACTION_INSTRUCTIONS = `
PRODUCT CATEGORIES (choose the most appropriate):
${PRODUCT_CATEGORIES.map(c => `- ${c}`).join('\n')}

NUTRITIONAL DATA EXTRACTION:
- All weights in grams (g) or milligrams (mg) for sodium
- Calories as integer (kcal)
- Macros (protein, carbs, fat, fiber, sugar, saturated fat) as decimal numbers
- Sodium in milligrams (mg)
- If "per 100g" values are given but not per serving, note this in the servingSize

QUANTITY PARSING:
- Parse pack sizes: "6 x 30g bars" → quantity: 6, unitOfMeasure: "bars"
- Parse weight: "500g bag" → quantity: 500, unitOfMeasure: "g"
- Parse counts: "Pack of 12" → quantity: 12, unitOfMeasure: "pieces"

IS_SNACK DETERMINATION:
- Set isSnack=true for: snack bars, crisps, biscuits, yoghurts, nuts, chocolate, sweets, ice cream, smoothies, fruit snacks
- Set isSnack=false for: ready meals, cooking ingredients, beverages (non-smoothie), household items

Return ONLY a valid JSON object with these fields:
{
  "name": "string - product name without brand",
  "brand": "string or null - manufacturer/brand name",
  "quantity": number - pack quantity,
  "unitOfMeasure": "string - e.g., pieces, bars, g, ml",
  "category": "string - from category list above",
  "servingSize": "string or null - e.g., 30g, 1 bar",
  "caloriesPerServing": number or null,
  "proteinPerServing": number or null,
  "carbsPerServing": number or null,
  "fatPerServing": number or null,
  "fiberPerServing": number or null,
  "sugarPerServing": number or null,
  "saturatedFatPerServing": number or null,
  "sodiumPerServing": number or null,
  "isSnack": boolean,
  "imageUrl": "string or null - product image URL if found"
}
`

/**
 * Extract JSON-LD product schema from HTML
 */
function extractJsonLdProduct(html: string): any | null {
  try {
    const scriptMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    if (!scriptMatches) return null

    for (const script of scriptMatches) {
      const jsonContent = script.replace(/<script[^>]*>|<\/script>/gi, '').trim()
      try {
        const data = JSON.parse(jsonContent)

        // Check for Product schema
        if (data['@type'] === 'Product') return data
        if (Array.isArray(data)) {
          const product = data.find(item => item['@type'] === 'Product')
          if (product) return product
        }
        if (data['@graph']) {
          const product = data['@graph'].find((item: any) => item['@type'] === 'Product')
          if (product) return product
        }
      } catch {
        // Skip invalid JSON
      }
    }
  } catch (error) {
    console.error('Error extracting JSON-LD:', error)
  }
  return null
}

/**
 * Extract visible text from HTML
 */
function extractVisibleText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse product information from a URL
 */
export async function parseProductFromUrl(url: string, htmlContent: string): Promise<ParsedProductFromUrl> {
  console.log('🔷 AI parsing product from URL:', url)

  // Try to extract JSON-LD structured data
  const jsonLdProduct = extractJsonLdProduct(htmlContent)

  let structuredDataSection = ''
  if (jsonLdProduct) {
    console.log('🟢 Found JSON-LD Product schema data')
    structuredDataSection = `
**STRUCTURED DATA FOUND (JSON-LD Schema.org Product):**
This is the most reliable source - use this data primarily!
\`\`\`json
${JSON.stringify(jsonLdProduct, null, 2).substring(0, 10000)}
\`\`\`

`
  } else {
    console.log('⚠️ No JSON-LD Product schema found, relying on HTML parsing')
  }

  // Extract visible text as backup
  const visibleText = extractVisibleText(htmlContent).substring(0, 6000)

  const prompt = `You are an expert product data extraction assistant. Extract ALL product details with high accuracy from the provided data.
${AI_LOCALE_INSTRUCTION}

URL: ${url}

${structuredDataSection}**HTML CONTENT:**
${htmlContent.substring(0, jsonLdProduct ? 8000 : 15000)}

**VISIBLE TEXT CONTENT (for reference):**
${visibleText}

---

EXTRACTION PRIORITY:
1. **FIRST**: Use JSON-LD structured data if available (most accurate)
2. **SECOND**: Parse HTML content for nutritional info, pack size, etc.
3. **THIRD**: Use visible text as fallback

${PRODUCT_EXTRACTION_INSTRUCTIONS}

Extract all available information. If a field is not found, use null.`

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      temperature: AI_TEMPERATURE,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 AI response received for URL parsing')

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON from AI response')
      throw new Error('Failed to parse product from AI response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedProductFromUrl
    console.log('🟢 Product parsed from URL:', parsed.name, 'by', parsed.brand)
    return parsed
  } catch (error) {
    console.error('❌ Error parsing product from URL:', error)
    throw error
  }
}

/**
 * Parse product information from an image (base64)
 */
export async function parseProductFromImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<ParsedProductFromImage> {
  console.log('🔷 AI parsing product from image')

  const prompt = `You are an expert product data extraction assistant. Analyze this product image and extract all visible product information.
${AI_LOCALE_INSTRUCTION}

This image may show:
- A nutrition label
- Product packaging
- A barcode with product info
- A supermarket shelf label

Extract all visible information including:
- Product name and brand
- Pack size/quantity
- Nutritional information (per serving or per 100g)
- Any other relevant product details

${PRODUCT_EXTRACTION_INSTRUCTIONS}

If you cannot determine a value from the image, use null. Be as accurate as possible with nutritional data.`

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      temperature: AI_TEMPERATURE,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 AI response received for image parsing')

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON from AI response')
      throw new Error('Failed to parse product from AI response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedProductFromImage
    console.log('🟢 Product parsed from image:', parsed.name, 'by', parsed.brand)
    return parsed
  } catch (error) {
    console.error('❌ Error parsing product from image:', error)
    throw error
  }
}

/**
 * Parse product information from pasted text
 */
export async function parseProductFromText(text: string): Promise<ParsedProductFromText> {
  console.log('🔷 AI parsing product from text, length:', text.length)

  const prompt = `You are an expert product data extraction assistant. Extract product details from this pasted text content.
${AI_LOCALE_INSTRUCTION}

This text was copied from a product page or label and may contain:
- Product name and brand
- Nutritional information
- Pack size details
- Ingredients list
- Product description

**TEXT CONTENT:**
${text.substring(0, 8000)}

---

${PRODUCT_EXTRACTION_INSTRUCTIONS}

Extract all available information. If a field is not clearly stated, use null.`

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      temperature: AI_TEMPERATURE,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 AI response received for text parsing')

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON from AI response')
      throw new Error('Failed to parse product from AI response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedProductFromText
    console.log('🟢 Product parsed from text:', parsed.name, 'by', parsed.brand)
    return parsed
  } catch (error) {
    console.error('❌ Error parsing product from text:', error)
    throw error
  }
}

/**
 * Validate and normalize category to one of the allowed values
 */
export function normalizeCategory(category: string | undefined): ProductCategory {
  if (!category) return 'Other'

  const normalized = category.toLowerCase().trim()

  // Exact match (case-insensitive)
  const exactMatch = PRODUCT_CATEGORIES.find(c => c.toLowerCase() === normalized)
  if (exactMatch) return exactMatch

  // Partial match
  const partialMatch = PRODUCT_CATEGORIES.find(
    c => c.toLowerCase().includes(normalized) || normalized.includes(c.toLowerCase())
  )
  if (partialMatch) return partialMatch

  return 'Other'
}
