import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import { format, parseISO, addDays } from 'date-fns'

// Brand colors - matching the design
const COLORS = {
  purple: [139, 92, 246] as [number, number, number],
  purpleLight: [167, 139, 250] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  headerBg: [31, 41, 55] as [number, number, number],
  rowBg: [249, 250, 251] as [number, number, number],
  rowAltBg: [255, 255, 255] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  textDark: [31, 41, 55] as [number, number, number],
  textMedium: [107, 114, 128] as [number, number, number],
  textLight: [156, 163, 175] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
}

interface MealWithRecipe {
  id: string
  dayOfWeek: string
  mealType: string
  recipeName: string | null
  servings: number | null
  isLeftover: boolean
  notes: string | null
  recipe: {
    prepTime: number | null
    cookTime: number | null
  } | null
}

function getDayDate(weekStartDate: string | Date, dayIndex: number): Date {
  const startDate = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : new Date(weekStartDate)
  return addDays(startDate, dayIndex)
}

function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

function formatTotalTime(minutes: number): string {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch meal plan with meals and recipe details
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: {
              select: {
                prepTime: true,
                cookTime: true,
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      }
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    console.log('🔷 Generating Cooking Plan PDF for week:', mealPlan.weekStartDate)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - 2 * margin

    let currentY = margin

    // Column widths for the table
    const colWidths = {
      meal: 25,
      recipe: contentWidth - 25 - 20 - 20 - 20,
      prep: 20,
      cook: 20,
      servings: 20,
    }

    const tableRowHeight = 10

    // === HEADER ===
    // Title
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.textDark)
    doc.text('Cooking Plan', margin, currentY + 7)

    // Date range
    const startDate = new Date(mealPlan.weekStartDate)
    const endDate = new Date(mealPlan.weekEndDate)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMedium)
    doc.text(`Week of ${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`, margin, currentY + 13)

    // FamilyFuel logo (right side)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.purple)

    // Purple circle
    doc.setFillColor(...COLORS.purple)
    doc.circle(pageWidth - margin - 35, currentY + 5, 4, 'F')

    doc.text('FamilyFuel', pageWidth - margin - 28, currentY + 7)

    // Generated date
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textLight)
    doc.text(`Generated ${format(new Date(), 'd MMM yyyy')}`, pageWidth - margin, currentY + 13, { align: 'right' })

    currentY += 22

    // === DRAW EACH DAY ===
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = DAYS_OF_WEEK[dayIndex]
      const dayDate = getDayDate(mealPlan.weekStartDate, dayIndex)
      const dayMeals = mealPlan.meals.filter((m: MealWithRecipe) => m.dayOfWeek === dayName)

      // Get meals by type
      const mealsByType: Record<string, MealWithRecipe | undefined> = {}
      for (const mealType of MEAL_TYPES) {
        mealsByType[mealType] = dayMeals.find(
          (m: MealWithRecipe) => m.mealType.toLowerCase().replace(/\s+/g, '-') === mealType
        )
      }

      // Calculate section height
      const mealsWithData = MEAL_TYPES.filter(mt => mealsByType[mt]?.recipeName).length
      const numRows = Math.max(mealsWithData, 1)

      // Check for batch cooking and prep ahead
      const batchMeals = dayMeals.filter((m: MealWithRecipe) =>
        m.notes && m.notes.toLowerCase().includes('batch') && !m.isLeftover
      )
      const hasPrepAhead = batchMeals.length > 0

      const sectionHeight = 15 + tableRowHeight + (numRows * tableRowHeight) + (hasPrepAhead ? 15 : 0) + 12

      // Check if we need a new page
      if (currentY + sectionHeight > pageHeight - 15) {
        doc.addPage()
        currentY = margin
      }

      const sectionX = margin
      const sectionWidth = contentWidth

      // Day header background
      doc.setFillColor(...COLORS.headerBg)
      doc.roundedRect(sectionX, currentY, sectionWidth, 12, 2, 2, 'F')

      // Day title
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.white)
      doc.text(`${dayName}, ${format(dayDate, 'd MMMM')}`, sectionX + 5, currentY + 8)

      currentY += 15

      // Table header
      const tableY = currentY
      doc.setFillColor(...COLORS.headerBg)
      doc.rect(sectionX, tableY, sectionWidth, tableRowHeight, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.white)

      let colX = sectionX + 3
      doc.text('Meal', colX, tableY + 7)
      colX += colWidths.meal
      doc.text('Recipe', colX, tableY + 7)
      colX += colWidths.recipe
      doc.text('Prep', colX, tableY + 7)
      colX += colWidths.prep
      doc.text('Cook', colX, tableY + 7)
      colX += colWidths.cook
      doc.text('Servings', colX, tableY + 7)

      currentY += tableRowHeight

      // Table rows
      let rowIndex = 0
      let totalPrepTime = 0
      let totalCookTime = 0

      for (const mealType of MEAL_TYPES) {
        const meal = mealsByType[mealType]
        if (!meal?.recipeName) continue

        const isBatch = meal.notes && meal.notes.toLowerCase().includes('batch') && !meal.isLeftover
        const isReheat = meal.isLeftover

        // Calculate time
        if (!isReheat && meal.recipe) {
          totalPrepTime += meal.recipe.prepTime || 0
          totalCookTime += meal.recipe.cookTime || 0
        }

        // Row background
        doc.setFillColor(...(rowIndex % 2 === 0 ? COLORS.rowBg : COLORS.rowAltBg))
        doc.rect(sectionX, currentY, sectionWidth, tableRowHeight, 'F')

        // Row border
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.2)
        doc.rect(sectionX, currentY, sectionWidth, tableRowHeight, 'S')

        colX = sectionX + 3

        // Meal type
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.textDark)
        doc.text(MEAL_TYPE_LABELS[mealType] || mealType.toUpperCase(), colX, currentY + 4)

        // BATCH or REHEAT badge
        if (isBatch) {
          doc.setFillColor(...COLORS.amber)
          doc.roundedRect(colX, currentY + 5, 16, 4, 1, 1, 'F')
          doc.setFontSize(5)
          doc.setTextColor(...COLORS.white)
          doc.text('⚡ BATCH', colX + 1, currentY + 8)
        } else if (isReheat) {
          doc.setFillColor(...COLORS.emerald)
          doc.roundedRect(colX, currentY + 5, 16, 4, 1, 1, 'F')
          doc.setFontSize(5)
          doc.setTextColor(...COLORS.white)
          doc.text('🔄 REHEAT', colX + 0.5, currentY + 8)
        }

        colX += colWidths.meal

        // Recipe name
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.textDark)
        const recipeName = meal.recipeName || ''
        const truncatedName = recipeName.length > 45 ? recipeName.substring(0, 42) + '...' : recipeName
        doc.text(truncatedName, colX, currentY + 6)

        // Add batch note under recipe name if applicable
        if (isBatch && meal.notes) {
          doc.setFontSize(6)
          doc.setTextColor(...COLORS.textMedium)
          const noteText = meal.notes.length > 55 ? meal.notes.substring(0, 52) + '...' : meal.notes
          doc.text(noteText, colX, currentY + 9)
        }

        colX += colWidths.recipe

        // Prep time
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.textMedium)
        const prepTime = isReheat ? '—' : formatTime(meal.recipe?.prepTime)
        doc.text(prepTime, colX, currentY + 6)
        colX += colWidths.prep

        // Cook time
        const cookTime = isReheat ? '10 min' : formatTime(meal.recipe?.cookTime)
        doc.text(cookTime, colX, currentY + 6)
        colX += colWidths.cook

        // Servings
        doc.text(meal.servings?.toString() || '—', colX + 5, currentY + 6)

        currentY += tableRowHeight
        rowIndex++
      }

      // If no meals, show empty row
      if (rowIndex === 0) {
        doc.setFillColor(...COLORS.rowBg)
        doc.rect(sectionX, currentY, sectionWidth, tableRowHeight, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COLORS.textLight)
        doc.text('No meals scheduled', sectionX + sectionWidth / 2, currentY + 6, { align: 'center' })
        currentY += tableRowHeight
      }

      // PREP AHEAD section (if applicable)
      if (hasPrepAhead) {
        currentY += 3

        // Prep ahead header
        doc.setFillColor(245, 243, 255) // Light purple
        doc.rect(sectionX, currentY, sectionWidth, 5, 'F')

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.purple)
        doc.text('📋 PREP AHEAD (for later this week)', sectionX + 3, currentY + 3.5)
        currentY += 6

        // Prep tasks
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.textMedium)

        batchMeals.forEach((m: MealWithRecipe) => {
          if (m.notes) {
            const prepText = `For ${m.recipeName}: ${m.notes.substring(0, 80)}${m.notes.length > 80 ? '...' : ''}`
            doc.text(prepText, sectionX + 3, currentY + 3)
            currentY += 4
          }
        })

        currentY += 2
      }

      // Total cooking time
      const totalTime = totalPrepTime + totalCookTime
      currentY += 3
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.textDark)
      doc.text(`Total cooking time: ${formatTotalTime(totalTime)}`, sectionX + sectionWidth - 3, currentY, { align: 'right' })

      currentY += 12 // Space before next day
    }

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `FamilyFuel-CookingPlan-${format(startDate, 'yyyy-MM-dd')}.pdf`

    console.log('🟢 Cooking Plan PDF generated successfully')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('❌ Error generating cooking plan PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
