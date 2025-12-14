/**
 * Discover Page Assistant API
 * Limited-scope nutritionist for recipe discovery only
 * Cannot create custom recipes, modify settings, or access inventory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import {
  searchMasterRecipes,
  parseSearchRequirements,
  MasterRecipeSearchResult,
} from '@/lib/nutritionist/master-recipe-search'
import {
  getDiscoverAssistantSystemPrompt,
  buildMasterRecipesContext,
} from '@/lib/nutritionist/prompts'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface DiscoverAssistantRequest {
  message: string
  profileId: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface DiscoverAssistantResponse {
  response: string
  suggestedRecipes: MasterRecipeSearchResult[]
}

/**
 * POST /api/discover/assistant
 * Chat with Emilia for recipe recommendations (limited scope)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DiscoverAssistantRequest = await request.json()
    const { message, profileId, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Discover assistant request:', { profileId, messagePreview: message.substring(0, 50) })

    // Get user profile for context
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
      select: {
        profileName: true,
        allergies: true,
        foodLikes: true,
        dailyCalorieTarget: true,
        dailyProteinTarget: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Search master recipes based on user message
    console.log('🔍 Searching master recipes for discover assistant...')
    const searchParams = parseSearchRequirements(message)

    // Add profile-based filters for allergens
    const allergies = Array.isArray(profile.allergies) ? profile.allergies as string[] : []
    if (allergies.length > 0) {
      const allergenMap: Record<string, string> = {
        dairy: 'dairy', milk: 'dairy', lactose: 'dairy',
        gluten: 'gluten', wheat: 'gluten',
        nuts: 'nuts', 'tree nuts': 'nuts', peanuts: 'peanuts',
        eggs: 'eggs', egg: 'eggs',
        fish: 'fish', shellfish: 'shellfish',
        soy: 'soy', soya: 'soy', sesame: 'sesame'
      }
      searchParams.excludeAllergens = allergies
        .map(a => allergenMap[a.toLowerCase()])
        .filter(Boolean) as string[]
    }

    // Search for relevant recipes
    let masterRecipes: MasterRecipeSearchResult[] = []
    try {
      masterRecipes = await searchMasterRecipes({
        ...searchParams,
        limit: 10
      })
      console.log(`🔍 Found ${masterRecipes.length} relevant master recipes`)
    } catch (err) {
      console.warn('⚠️ Master recipe search failed:', err)
    }

    // Build system prompt
    // Use foodLikes as dietary preferences (they indicate what they prefer)
    const systemPrompt = getDiscoverAssistantSystemPrompt(
      profile.profileName,
      allergies,
      profile.foodLikes || [],
      profile.dailyCalorieTarget,
      profile.dailyProteinTarget
    )

    // Build master recipes context
    const masterRecipesContext = buildMasterRecipesContext(masterRecipes)

    // Build conversation for Claude
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    console.log('🔷 Calling Claude API for discover assistant...')

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt + masterRecipesContext,
      messages,
    })

    // Extract response text
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    console.log('🟢 Received discover assistant response')

    // Parse recipe IDs from response (format: [RECIPES: id1, id2, id3])
    const recipeMatch = responseText.match(/\[RECIPES:\s*([^\]]+)\]/)
    let suggestedRecipeIds: string[] = []
    let cleanResponse = responseText

    if (recipeMatch) {
      suggestedRecipeIds = recipeMatch[1]
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
      cleanResponse = responseText.replace(/\[RECIPES:[^\]]+\]/g, '').trim()
    }

    // Get full recipe details for suggested IDs
    const suggestedRecipes = masterRecipes.filter(r =>
      suggestedRecipeIds.includes(r.id)
    )

    // If Claude didn't suggest specific recipes, use top search results
    if (suggestedRecipes.length === 0 && masterRecipes.length > 0) {
      // Return top 3 from search
      suggestedRecipes.push(...masterRecipes.slice(0, 3))
    }

    return NextResponse.json({
      response: cleanResponse,
      suggestedRecipes,
    } as DiscoverAssistantResponse)

  } catch (error) {
    console.error('❌ Discover assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/discover/assistant
 * Get initial greeting for discover assistant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    // Get profile name for personalized greeting
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
      select: {
        profileName: true,
      },
    })

    const greeting = profile
      ? `Hi ${profile.profileName}! I'm Emilia, your recipe assistant. I can help you find the perfect recipe from our curated collection. What are you in the mood for today?`
      : `Hi! I'm Emilia, your recipe assistant. I can help you find the perfect recipe from our curated collection. What are you in the mood for today?`

    return NextResponse.json({
      greeting,
      suggestedPrompts: [
        'Find me a quick weeknight dinner',
        'I want something high in protein',
        'Show me vegetarian pasta recipes',
        'What healthy breakfast options do you have?',
      ],
    })

  } catch (error) {
    console.error('❌ Discover assistant greeting error:', error)
    return NextResponse.json(
      { error: 'Failed to get greeting' },
      { status: 500 }
    )
  }
}
