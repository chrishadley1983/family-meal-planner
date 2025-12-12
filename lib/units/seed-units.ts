/**
 * Seeds the units_of_measure table with initial data
 * Run this after applying the Prisma schema migration
 */

import { prisma } from '@/lib/prisma'
import { UNIT_SEED_DATA } from './unit-seed-data'

export async function seedUnits(): Promise<{ created: number; skipped: number }> {
  console.log('🌱 Seeding units of measure...')

  let created = 0
  let skipped = 0

  for (const unit of UNIT_SEED_DATA) {
    try {
      // Check if unit already exists
      const existing = await prisma.unitOfMeasure.findUnique({
        where: { code: unit.code },
      })

      if (existing) {
        skipped++
        continue
      }

      // Create the unit
      await prisma.unitOfMeasure.create({
        data: {
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
    } catch (error) {
      console.error(`❌ Error creating unit "${unit.code}":`, error)
    }
  }

  console.log(`✅ Seeding complete: ${created} created, ${skipped} skipped (already exist)`)

  return { created, skipped }
}

/**
 * Runs the seed script directly
 */
async function main() {
  try {
    const result = await seedUnits()
    console.log('Seed result:', result)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
