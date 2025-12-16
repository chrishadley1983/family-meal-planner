import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import { format, parseISO, addDays } from 'date-fns'

// Brand colors
const BRAND_COLORS = {
  purple: [139, 92, 246] as [number, number, number],
  purpleLight: [167, 139, 250] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  grayLight: [156, 163, 175] as [number, number, number],
  grayDark: [55, 65, 81] as [number, number, number],
  black: [31, 41, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
}

function getDayDate(weekStartDate: string | Date, dayIndex: number): Date {
  const startDate = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : new Date(weekStartDate)
  return addDays(startDate, dayIndex)
}

function formatShortDate(date: Date): string {
  return format(date, 'd MMM')
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

    // Fetch meal plan with meals
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: true
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

    console.log('🔷 Generating Meal Plan PDF for week:', mealPlan.weekStartDate)

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10
    const tableWidth = pageWidth - 2 * margin

    let currentY = margin

    // === HEADER ===
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.black)

    const startDate = new Date(mealPlan.weekStartDate)
    const endDate = new Date(mealPlan.weekEndDate)
    const dateRange = `Week of ${format(startDate, 'd/MM/yyyy')} - ${format(endDate, 'd/MM/yyyy')}`
    doc.text(dateRange, pageWidth / 2, currentY + 6, { align: 'center' })

    currentY += 14

    // === WEEK TABLE ===
    const dayColumnWidth = tableWidth / 7
    const mealTypeRowHeight = 28
    const headerHeight = 14

    // Day headers
    doc.setFillColor(...BRAND_COLORS.grayDark)
    doc.rect(margin, currentY, tableWidth, headerHeight, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.white)

    for (let i = 0; i < 7; i++) {
      const dayX = margin + i * dayColumnWidth
      const dayDate = getDayDate(mealPlan.weekStartDate, i)

      // Day name
      doc.text(DAYS_OF_WEEK[i], dayX + dayColumnWidth / 2, currentY + 5, { align: 'center' })

      // Date
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(formatShortDate(dayDate), dayX + dayColumnWidth / 2, currentY + 10, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)

      // Column dividers
      if (i > 0) {
        doc.setDrawColor(...BRAND_COLORS.grayLight)
        doc.setLineWidth(0.2)
        doc.line(dayX, currentY, dayX, currentY + headerHeight)
      }
    }

    currentY += headerHeight

    // Meal type rows
    for (const mealType of MEAL_TYPES) {
      // Meal type header row
      doc.setFillColor(...BRAND_COLORS.purple)
      doc.rect(margin, currentY, tableWidth, 6, 'F')

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_COLORS.white)
      doc.text(MEAL_TYPE_LABELS[mealType] || mealType.toUpperCase(), margin + 3, currentY + 4)

      currentY += 6

      // Meal cells for each day
      doc.setFillColor(...BRAND_COLORS.white)
      doc.rect(margin, currentY, tableWidth, mealTypeRowHeight, 'F')

      // Draw borders
      doc.setDrawColor(...BRAND_COLORS.grayLight)
      doc.setLineWidth(0.2)
      doc.rect(margin, currentY, tableWidth, mealTypeRowHeight, 'S')

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayX = margin + dayIndex * dayColumnWidth
        const dayName = DAYS_OF_WEEK[dayIndex]

        // Find meal for this day and meal type
        const meal = mealPlan.meals.find(
          (m: { dayOfWeek: string; mealType: string }) =>
            m.dayOfWeek === dayName &&
            m.mealType.toLowerCase().replace(/\s+/g, '-') === mealType
        )

        // Column dividers
        if (dayIndex > 0) {
          doc.line(dayX, currentY, dayX, currentY + mealTypeRowHeight)
        }

        if (meal && meal.recipeName) {
          const cellPadding = 2
          const cellWidth = dayColumnWidth - cellPadding * 2
          let textY = currentY + 4

          // Batch cook / Reheat indicator
          if (meal.isLeftover) {
            doc.setFontSize(5)
            doc.setFillColor(...BRAND_COLORS.emerald)
            doc.roundedRect(dayX + cellPadding, textY - 2.5, 8, 3, 0.5, 0.5, 'F')
            doc.setTextColor(...BRAND_COLORS.white)
            doc.text('[R]', dayX + cellPadding + 1, textY)
            textY += 4
          } else if (meal.notes && meal.notes.toLowerCase().includes('batch')) {
            doc.setFontSize(5)
            doc.setFillColor(...BRAND_COLORS.amber)
            doc.roundedRect(dayX + cellPadding, textY - 2.5, 8, 3, 0.5, 0.5, 'F')
            doc.setTextColor(...BRAND_COLORS.white)
            doc.text('[B]', dayX + cellPadding + 1, textY)
            textY += 4
          }

          // Recipe name (wrapped)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...BRAND_COLORS.black)

          const lines = doc.splitTextToSize(meal.recipeName, cellWidth)
          for (let lineIndex = 0; lineIndex < Math.min(lines.length, 3); lineIndex++) {
            doc.text(lines[lineIndex], dayX + cellPadding, textY)
            textY += 3
          }

          // Servings
          if (meal.servings) {
            doc.setFontSize(6)
            doc.setTextColor(...BRAND_COLORS.gray)
            doc.text(`${meal.servings} servings`, dayX + cellPadding, textY + 2)
          }
        } else {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(...BRAND_COLORS.grayLight)
          doc.text('-', dayX + dayColumnWidth / 2, currentY + mealTypeRowHeight / 2, { align: 'center' })
        }
      }

      currentY += mealTypeRowHeight
    }

    // === LEGEND ===
    currentY += 5
    doc.setFontSize(7)

    // Batch cook badge
    doc.setFillColor(...BRAND_COLORS.amber)
    doc.roundedRect(margin, currentY - 2, 8, 3, 0.5, 0.5, 'F')
    doc.setFontSize(5)
    doc.setTextColor(...BRAND_COLORS.white)
    doc.text('[B]', margin + 1, currentY)
    doc.setFontSize(7)
    doc.setTextColor(...BRAND_COLORS.gray)
    doc.text('Batch cook', margin + 10, currentY)

    // Reheat badge
    doc.setFillColor(...BRAND_COLORS.emerald)
    doc.roundedRect(margin + 35, currentY - 2, 8, 3, 0.5, 0.5, 'F')
    doc.setFontSize(5)
    doc.setTextColor(...BRAND_COLORS.white)
    doc.text('[R]', margin + 36, currentY)
    doc.setFontSize(7)
    doc.setTextColor(...BRAND_COLORS.gray)
    doc.text('Reheat (from batch)', margin + 45, currentY)

    // === BATCH COOKING / PREP AHEAD SUMMARY ===
    currentY += 10

    // Find all batch cooking meals
    const batchMeals = mealPlan.meals.filter(
      (m: { notes: string | null; isLeftover: boolean }) => m.notes && m.notes.toLowerCase().includes('batch') && !m.isLeftover
    )

    // Find all leftover meals
    const leftoverMeals = mealPlan.meals.filter((m: { isLeftover: boolean }) => m.isLeftover)

    if (batchMeals.length > 0 || leftoverMeals.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_COLORS.black)
      doc.text('Batch Cooking & Prep Ahead', margin, currentY)

      currentY += 6

      if (batchMeals.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_COLORS.amber)
        doc.text('[B] Batch Cook:', margin, currentY)
        currentY += 4

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BRAND_COLORS.black)

        for (const meal of batchMeals) {
          const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType.toLowerCase().replace(/\s+/g, '-')] || meal.mealType

          doc.setFontSize(7)
          const batchText = `• ${meal.dayOfWeek} ${mealTypeLabel}: ${meal.recipeName || 'Unknown'}`
          doc.text(batchText, margin + 2, currentY)
          currentY += 4

          if (meal.notes) {
            doc.setFontSize(6)
            doc.setTextColor(...BRAND_COLORS.gray)
            const noteLines = doc.splitTextToSize(meal.notes, tableWidth - 10)
            for (const line of noteLines.slice(0, 2)) {
              doc.text(`    ${line}`, margin + 2, currentY)
              currentY += 3
            }
            doc.setTextColor(...BRAND_COLORS.black)
          }
        }
      }

      if (leftoverMeals.length > 0) {
        currentY += 2
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_COLORS.emerald)
        doc.text('[R] Reheat Days:', margin, currentY)
        currentY += 4

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BRAND_COLORS.black)
        doc.setFontSize(7)

        for (const meal of leftoverMeals) {
          const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType.toLowerCase().replace(/\s+/g, '-')] || meal.mealType
          const reheatText = `• ${meal.dayOfWeek} ${mealTypeLabel}: ${meal.recipeName || 'Unknown'} (reheat)`
          doc.text(reheatText, margin + 2, currentY)
          currentY += 4
        }
      }
    }

    // === FOOTER ===
    const footerY = pageHeight - 6
    doc.setFontSize(7)
    doc.setTextColor(...BRAND_COLORS.grayLight)
    doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })
    doc.text(format(new Date(), 'd MMM yyyy'), pageWidth - margin, footerY, { align: 'right' })

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `FamilyFuel-MealPlan-${format(startDate, 'yyyy-MM-dd')}.pdf`

    console.log('🟢 Meal Plan PDF generated successfully')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('❌ Error generating meal plan PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
