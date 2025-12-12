import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UNIT_SEED_DATA, getMetricUnits, getUnitsByCategory, type UnitSeedData } from '@/lib/units/unit-seed-data'

/**
 * GET /api/units
 * Returns all available units of measure
 *
 * Query params:
 * - metricOnly: if 'true', returns only metric units
 * - groupByCategory: if 'true', returns units grouped by category
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const metricOnly = searchParams.get('metricOnly') === 'true'
    const groupByCategory = searchParams.get('groupByCategory') === 'true'

    // Try to fetch from database first
    let units: typeof UNIT_SEED_DATA = []

    try {
      const dbUnits = await prisma.unitOfMeasure.findMany({
        where: {
          isActive: true,
          ...(metricOnly ? { isMetric: true } : {}),
        },
        orderBy: [
          { displayOrder: 'asc' },
        ],
      })

      if (dbUnits.length > 0) {
        // Map database records to the expected format
        units = dbUnits.map((u): UnitSeedData => ({
          code: u.code,
          name: u.name,
          pluralName: u.pluralName,
          abbreviation: u.abbreviation,
          category: u.category as 'weight' | 'volume' | 'count' | 'spoon',
          displayOrder: u.displayOrder,
          isMetric: u.isMetric,
          conversionFactor: u.conversionFactor,
          baseUnitCode: u.baseUnitCode,
          aliases: u.aliases,
        }))
      }
    } catch {
      // Table might not exist yet - fall back to seed data
      console.log('🔄 Units table not available, using seed data')
    }

    // Fall back to seed data if database is empty
    if (units.length === 0) {
      units = metricOnly ? getMetricUnits() : [...UNIT_SEED_DATA]
    }

    // Group by category if requested
    if (groupByCategory) {
      const grouped: Record<string, typeof units> = {}

      for (const unit of units) {
        if (!grouped[unit.category]) {
          grouped[unit.category] = []
        }
        grouped[unit.category].push(unit)
      }

      // Sort each category by displayOrder
      for (const category of Object.keys(grouped)) {
        grouped[category].sort((a, b) => a.displayOrder - b.displayOrder)
      }

      return NextResponse.json({ units: grouped, grouped: true })
    }

    // Sort by displayOrder
    units.sort((a, b) => a.displayOrder - b.displayOrder)

    return NextResponse.json({ units, grouped: false })
  } catch (error) {
    console.error('❌ Error fetching units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
