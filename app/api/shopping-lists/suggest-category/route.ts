import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_CATEGORIES } from '@/lib/unit-conversion'

const suggestCategorySchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(200),
})

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// POST - Suggest a category for a shopping item using AI
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = suggestCategorySchema.parse(body)

    console.log(`🔷 Suggesting category for: ${data.itemName}`)

    // Get the user's categories for context
    let userCategories = await prisma.shoppingListCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { displayOrder: 'asc' },
    })

    // If user has no categories, use defaults
    if (userCategories.length === 0) {
      userCategories = DEFAULT_CATEGORIES.map((cat, idx) => ({
        id: `default-${idx}`,
        userId: session.user.id,
        name: cat.name,
        displayOrder: cat.displayOrder,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    }

    const categoryNames = userCategories.map((c) => c.name)

    // Use Claude to suggest the best category
    const prompt = `You are a grocery store assistant. Given a shopping item, suggest which category it belongs to.

AVAILABLE CATEGORIES:
${categoryNames.join('\n')}

ITEM TO CATEGORIZE:
"${data.itemName}"

Respond with ONLY the exact category name from the list above that best matches this item. Do not add any explanation or punctuation.

If the item doesn't clearly fit any category, respond with "Other".`

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const suggestedCategory = responseText.trim()

    // Verify the suggested category exists in the user's categories
    const matchedCategory = categoryNames.find(
      (cat) => cat.toLowerCase() === suggestedCategory.toLowerCase()
    )

    const finalCategory = matchedCategory || 'Other'

    console.log(`🟢 Suggested category for "${data.itemName}": ${finalCategory}`)

    return NextResponse.json({
      itemName: data.itemName,
      suggestedCategory: finalCategory,
      confidence: matchedCategory ? 'high' : 'low',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error suggesting category:', error)

    // Fallback to "Other" if AI fails
    return NextResponse.json({
      itemName: 'unknown',
      suggestedCategory: 'Other',
      confidence: 'fallback',
    })
  }
}

// POST with batch support - suggest categories for multiple items
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const batchSchema = z.object({
      items: z.array(z.string().min(1).max(200)).min(1).max(50),
    })
    const data = batchSchema.parse(body)

    console.log(`🔷 Suggesting categories for ${data.items.length} items`)

    // Get the user's categories for context
    let userCategories = await prisma.shoppingListCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { displayOrder: 'asc' },
    })

    // If user has no categories, use defaults
    if (userCategories.length === 0) {
      userCategories = DEFAULT_CATEGORIES.map((cat, idx) => ({
        id: `default-${idx}`,
        userId: session.user.id,
        name: cat.name,
        displayOrder: cat.displayOrder,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    }

    const categoryNames = userCategories.map((c) => c.name)

    // Use Claude to suggest categories for all items at once
    const prompt = `You are a grocery store assistant. Categorize each shopping item into one of the available categories.

AVAILABLE CATEGORIES:
${categoryNames.join('\n')}

ITEMS TO CATEGORIZE:
${data.items.map((item, idx) => `${idx + 1}. "${item}"`).join('\n')}

Respond with ONLY a JSON array of category names in the same order as the items. Use exact category names from the list above.
Example response format: ["Produce", "Dairy & Eggs", "Pantry"]

If an item doesn't clearly fit any category, use "Other".`

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      // Fallback: return all as "Other"
      console.warn('⚠️ Could not parse batch category response, using fallback')
      return NextResponse.json({
        suggestions: data.items.map((item) => ({
          itemName: item,
          suggestedCategory: 'Other',
          confidence: 'fallback',
        })),
      })
    }

    const suggestedCategories = JSON.parse(jsonMatch[0]) as string[]

    // Map suggestions to items, validating each category
    const suggestions = data.items.map((item, idx) => {
      const suggested = suggestedCategories[idx] || 'Other'
      const matchedCategory = categoryNames.find(
        (cat) => cat.toLowerCase() === suggested.toLowerCase()
      )

      return {
        itemName: item,
        suggestedCategory: matchedCategory || 'Other',
        confidence: matchedCategory ? 'high' : 'low',
      }
    })

    console.log(`🟢 Suggested categories for ${data.items.length} items`)

    return NextResponse.json({ suggestions })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error suggesting categories in batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
