import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UNIT_SEED_DATA } from '@/lib/units/unit-seed-data'

/**
 * POST /api/units/seed
 * Seeds the units_of_measure table with initial data
 * Only accessible to authenticated users (admin check could be added)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🌱 Seeding units of measure...')

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const unit of UNIT_SEED_DATA) {
      try {
        // Use upsert to handle existing records gracefully
        await prisma.unitOfMeasure.upsert({
          where: { code: unit.code },
          update: {
            // Update existing records with latest data
            name: unit.name,
            pluralName: unit.pluralName,
            abbreviation: unit.abbreviation,
            category: unit.category,
            displayOrder: unit.displayOrder,
            isMetric: unit.isMetric,
            conversionFactor: unit.conversionFactor,
            baseUnitCode: unit.baseUnitCode,
            aliases: unit.aliases,
          },
          create: {
            code: unit.code,
            name: unit.name,
            pluralName: unit.pluralName,
            abbreviation: unit.abbreviation,
            category: unit.category,
            displayOrder: unit.displayOrder,
            isMetric: unit.isMetric,
            conversionFactor: unit.conversionFactor,
            baseUnitCode: unit.baseUnitCode,
            aliases: unit.aliases,
            isActive: true,
          },
        })

        created++
      } catch (error: any) {
        console.error(`❌ Error creating unit "${unit.code}":`, error)
        errors.push(`${unit.code}: ${error.message}`)
        skipped++
      }
    }

    console.log(`✅ Seeding complete: ${created} processed, ${skipped} errors`)

    return NextResponse.json({
      success: true,
      message: `Units seeded: ${created} processed, ${skipped} errors`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('❌ Error seeding units:', error)

    // Check if the table doesn't exist yet
    if (error.message?.includes('does not exist') || error.code === 'P2021') {
      return NextResponse.json(
        {
          error: 'Units table does not exist yet. Please run the database migration first: npx prisma db push',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to seed units' },
      { status: 500 }
    )
  }
}
