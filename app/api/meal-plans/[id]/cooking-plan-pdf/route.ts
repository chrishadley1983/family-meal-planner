import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import { format, parseISO, addDays } from 'date-fns'

// Brand colors - matching the design
const COLORS = {
  purple: [139, 92, 246] as [number, number, number],
  purpleLight: [245, 243, 255] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberDark: [217, 119, 6] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emeraldDark: [5, 150, 105] as [number, number, number],
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
    prepTimeMinutes: number | null
    cookTimeMinutes: number | null
  } | null
}

function getDayDate(weekStartDate: string | Date, dayIndex: number): Date {
  const startDate = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : new Date(weekStartDate)
  return addDays(startDate, dayIndex)
}

function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return '-'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function formatTotalTime(minutes: number): string {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours}h ${mins}m`
}

// Extract batch servings from notes like "Batch cook 8 servings total"
function extractBatchServings(notes: string | null, defaultServings: number | null): number | null {
  if (!notes) return defaultServings

  // Match patterns like "8 servings total", "batch cook 8 servings", "makes 8 servings"
  const match = notes.match(/(\d+)\s*servings?\s*(total)?/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return defaultServings
}

// Draw a nice badge with icon
function drawBadge(
  doc: jsPDF,
  x: number,
  y: number,
  type: 'batch' | 'reheat'
) {
  const colors = type === 'batch'
    ? { bg: COLORS.amber, border: COLORS.amberDark }
    : { bg: COLORS.emerald, border: COLORS.emeraldDark }

  const text = type === 'batch' ? 'BATCH' : 'REHEAT'
  const badgeWidth = 14
  const badgeHeight = 3.5

  // Draw badge background with slight border
  doc.setFillColor(...colors.bg)
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 1, 1, 'F')

  // Draw small icon circle
  doc.setFillColor(...COLORS.white)
  doc.circle(x + 2.5, y + badgeHeight / 2, 1, 'F')

  // Draw icon symbol inside circle
  doc.setFillColor(...colors.bg)
  if (type === 'batch') {
    // Lightning bolt shape (simplified as a small triangle)
    doc.triangle(x + 2.2, y + 0.8, x + 2.8, y + 1.5, x + 2.2, y + 2.7, 'F')
  } else {
    // Circular arrow (simplified as curved line)
    doc.setDrawColor(...colors.bg)
    doc.setLineWidth(0.3)
    doc.circle(x + 2.5, y + badgeHeight / 2, 0.6, 'S')
  }

  // Badge text
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text(text, x + 5, y + 2.6)
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
                prepTimeMinutes: true,
                cookTimeMinutes: true,
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

    console.log('Generating Cooking Plan PDF for week:', mealPlan.weekStartDate)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - 2 * margin

    let currentY = margin

    // Compact column widths
    const colWidths = {
      meal: 22,
      recipe: contentWidth - 22 - 16 - 16 - 14,
      prep: 16,
      cook: 16,
      servings: 14,
    }

    const tableRowHeight = 8
    const dayHeaderHeight = 9

    // === HEADER (compact) ===
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.textDark)
    doc.text('Cooking Plan', margin, currentY + 5)

    const startDate = new Date(mealPlan.weekStartDate)
    const endDate = new Date(mealPlan.weekEndDate)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMedium)
    doc.text(`Week of ${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`, margin, currentY + 10)

    // FamilyFuel branding (right side, compact)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.purple)
    doc.setFillColor(...COLORS.purple)
    doc.circle(pageWidth - margin - 28, currentY + 3, 2.5, 'F')
    doc.text('FamilyFuel', pageWidth - margin - 24, currentY + 5)

    currentY += 14

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

      // Calculate actual meals with recipes
      const mealsWithData = MEAL_TYPES.filter(mt => mealsByType[mt]?.recipeName)
      const numRows = Math.max(mealsWithData.length, 1)

      // Check for batch cooking
      const batchMeals = dayMeals.filter((m: MealWithRecipe) =>
        m.notes && m.notes.toLowerCase().includes('batch') && !m.isLeftover
      )
      const hasPrepAhead = batchMeals.length > 0

      // Calculate dynamic row heights based on content
      let estimatedRowHeights = 0
      for (const mealType of MEAL_TYPES) {
        const meal = mealsByType[mealType]
        if (meal?.recipeName) {
          const isBatch = meal.notes && meal.notes.toLowerCase().includes('batch') && !meal.isLeftover
          // Base row + extra for batch notes
          estimatedRowHeights += isBatch ? tableRowHeight + 4 : tableRowHeight
        }
      }
      if (estimatedRowHeights === 0) estimatedRowHeights = tableRowHeight

      // Section height calculation
      const prepAheadHeight = hasPrepAhead ? 12 : 0
      const sectionHeight = dayHeaderHeight + tableRowHeight + estimatedRowHeights + prepAheadHeight + 8

      // Check if we need a new page
      if (currentY + sectionHeight > pageHeight - 10) {
        doc.addPage()
        currentY = margin
      }

      const sectionX = margin
      const sectionWidth = contentWidth

      // Day header background
      doc.setFillColor(...COLORS.headerBg)
      doc.roundedRect(sectionX, currentY, sectionWidth, dayHeaderHeight, 1.5, 1.5, 'F')

      // Day title
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.white)
      doc.text(`${dayName}, ${format(dayDate, 'd MMM')}`, sectionX + 4, currentY + 6)

      currentY += dayHeaderHeight + 1

      // Table header
      doc.setFillColor(...COLORS.headerBg)
      doc.rect(sectionX, currentY, sectionWidth, tableRowHeight - 1, 'F')

      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.white)

      let colX = sectionX + 2
      doc.text('MEAL', colX, currentY + 5)
      colX += colWidths.meal
      doc.text('RECIPE', colX, currentY + 5)
      colX += colWidths.recipe
      doc.text('PREP', colX, currentY + 5)
      colX += colWidths.prep
      doc.text('COOK', colX, currentY + 5)
      colX += colWidths.cook
      doc.text('SERVES', colX, currentY + 5)

      currentY += tableRowHeight - 1

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
          totalPrepTime += meal.recipe.prepTimeMinutes || 0
          totalCookTime += meal.recipe.cookTimeMinutes || 0
        }

        // Determine row height based on whether we need extra space for notes
        const rowHeight = isBatch && meal.notes ? tableRowHeight + 4 : tableRowHeight

        // Row background
        doc.setFillColor(...(rowIndex % 2 === 0 ? COLORS.rowBg : COLORS.rowAltBg))
        doc.rect(sectionX, currentY, sectionWidth, rowHeight, 'F')

        // Row border
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.1)
        doc.rect(sectionX, currentY, sectionWidth, rowHeight, 'S')

        colX = sectionX + 2

        // Meal type label
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.textDark)
        doc.text(MEAL_TYPE_LABELS[mealType] || mealType.toUpperCase(), colX, currentY + 4)

        // BATCH or REHEAT badge
        if (isBatch) {
          drawBadge(doc, colX, currentY + 5, 'batch')
        } else if (isReheat) {
          drawBadge(doc, colX, currentY + 5, 'reheat')
        }

        colX += colWidths.meal

        // Recipe name (full, with wrapping if needed)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.textDark)
        const recipeName = meal.recipeName || ''
        const recipeColWidth = colWidths.recipe - 4
        const recipeLines = doc.splitTextToSize(recipeName, recipeColWidth)
        doc.text(recipeLines[0], colX, currentY + 4)
        if (recipeLines.length > 1) {
          doc.setFontSize(6)
          doc.text(recipeLines[1], colX, currentY + 7)
        }

        // Add batch note under recipe name if applicable (wrapped, not truncated)
        if (isBatch && meal.notes) {
          doc.setFontSize(5.5)
          doc.setTextColor(...COLORS.textMedium)
          const noteLines = doc.splitTextToSize(meal.notes, recipeColWidth)
          // Show up to 2 lines of notes
          doc.text(noteLines.slice(0, 2).join('\n'), colX, currentY + (recipeLines.length > 1 ? 10 : 8))
        }

        colX += colWidths.recipe

        // Prep time
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.textMedium)
        const prepTime = isReheat ? '-' : formatTime(meal.recipe?.prepTimeMinutes)
        doc.text(prepTime, colX, currentY + 4)
        colX += colWidths.prep

        // Cook time
        const cookTime = isReheat ? '10m' : formatTime(meal.recipe?.cookTimeMinutes)
        doc.text(cookTime, colX, currentY + 4)
        colX += colWidths.cook

        // Servings - for batch cooking, extract total from notes
        const displayServings = isBatch
          ? extractBatchServings(meal.notes, meal.servings)
          : meal.servings
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.textDark)
        doc.text(displayServings?.toString() || '-', colX + 2, currentY + 4)

        currentY += rowHeight
        rowIndex++
      }

      // If no meals, show empty row
      if (rowIndex === 0) {
        doc.setFillColor(...COLORS.rowBg)
        doc.rect(sectionX, currentY, sectionWidth, tableRowHeight, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COLORS.textLight)
        doc.text('No meals scheduled', sectionX + sectionWidth / 2, currentY + 5, { align: 'center' })
        currentY += tableRowHeight
      }

      // PREP AHEAD section (if applicable) - more compact
      if (hasPrepAhead) {
        currentY += 2

        // Prep ahead header
        doc.setFillColor(...COLORS.purpleLight)
        doc.rect(sectionX, currentY, sectionWidth, 4, 'F')

        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.purple)
        doc.text('PREP AHEAD', sectionX + 2, currentY + 2.8)
        currentY += 5

        // Prep tasks with full text wrapping
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.textMedium)

        batchMeals.forEach((m: MealWithRecipe) => {
          if (m.notes) {
            const prepText = `${m.recipeName}: ${m.notes}`
            const wrappedLines = doc.splitTextToSize(prepText, sectionWidth - 6)
            // Show up to 2 lines
            wrappedLines.slice(0, 2).forEach((line: string, i: number) => {
              doc.text(line, sectionX + 3, currentY + 2.5 + (i * 3))
            })
            currentY += Math.min(wrappedLines.length, 2) * 3
          }
        })
      }

      // Total cooking time (compact)
      const totalTime = totalPrepTime + totalCookTime
      currentY += 2
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.textDark)
      doc.text(`Total: ${formatTotalTime(totalTime)}`, sectionX + sectionWidth - 2, currentY, { align: 'right' })

      currentY += 6 // Reduced space before next day
    }

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `FamilyFuel-CookingPlan-${format(startDate, 'yyyy-MM-dd')}.pdf`

    console.log('Cooking Plan PDF generated successfully')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating cooking plan PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
