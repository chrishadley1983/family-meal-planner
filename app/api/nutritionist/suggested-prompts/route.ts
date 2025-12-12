import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getContextAwareSuggestedPrompts,
  ProfileContext,
} from '@/lib/nutritionist'

/**
 * Helper to convert Decimal to number
 */
function decimalToNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  return Number(val)
}

/**
 * Helper to convert profile from DB to ProfileContext
 */
function toProfileContext(profile: any): ProfileContext {
  return {
    profileName: profile.profileName,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    currentWeightKg: decimalToNumber(profile.currentWeightKg),
    targetWeightKg: decimalToNumber(profile.targetWeightKg),
    goalType: profile.goalType,
    goalTimeframeWeeks: profile.goalTimeframeWeeks,
    activityLevel: profile.activityLevel,
    dailyCalorieTarget: profile.dailyCalorieTarget,
    dailyProteinTarget: profile.dailyProteinTarget,
    dailyCarbsTarget: profile.dailyCarbsTarget,
    dailyFatTarget: profile.dailyFatTarget,
    dailyFiberTarget: profile.dailyFiberTarget,
    macroTrackingEnabled: profile.macroTrackingEnabled,
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    foodLikes: profile.foodLikes || [],
    foodDislikes: profile.foodDislikes || [],
  }
}

/**
 * GET /api/nutritionist/suggested-prompts
 * Get context-aware suggested prompts for a profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const conversationId = searchParams.get('conversationId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Getting suggested prompts', { profileId, conversationId })

    // Get the profile
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Extract recent topics from conversation if provided
    let recentTopics: string[] = []
    if (conversationId) {
      const recentMessages = await prisma.nutritionistMessage.findMany({
        where: {
          conversationId,
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          content: true,
        },
      })

      // Extract keywords from recent messages
      const keywords = ['macros', 'protein', 'breakfast', 'lunch', 'dinner', 'recipes', 'analysis', 'inventory', 'staples', 'weight', 'calories']
      recentMessages.forEach((msg) => {
        const content = msg.content.toLowerCase()
        keywords.forEach((keyword) => {
          if (content.includes(keyword)) {
            recentTopics.push(keyword)
          }
        })
      })
    }

    const profileContext = toProfileContext(profile)
    const prompts = getContextAwareSuggestedPrompts(
      profileContext,
      undefined,
      recentTopics
    )

    console.log('🟢 Generated suggested prompts:', prompts.length)

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('❌ Error getting suggested prompts:', error)
    return NextResponse.json(
      { error: 'Failed to get suggested prompts' },
      { status: 500 }
    )
  }
}
