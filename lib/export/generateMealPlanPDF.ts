import jsPDF from 'jspdf'
import { format, addDays, parseISO } from 'date-fns'

// Types for meal plan data
interface Meal {
  id: string
  dayOfWeek: string
  mealType: string
  recipeId?: string | null
  recipeName?: string | null
  servings?: number | null
  isLocked: boolean
  isLeftover?: boolean
  leftoverFromMealId?: string | null
  notes?: string | null
}

interface MealPlan {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: string
  meals: Meal[]
}

// Brand colors
const BRAND_COLORS = {
  purple: [139, 92, 246] as [number, number, number],
  purpleLight: [167, 139, 250] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberLight: [252, 211, 77] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emeraldLight: [52, 211, 153] as [number, number, number],
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

/**
 * Get the date for a specific day within the week
 */
function getDayDate(weekStartDate: string, dayIndex: number): Date {
  const startDate = parseISO(weekStartDate)
  return addDays(startDate, dayIndex)
}

/**
 * Format date as "15 Dec"
 */
function formatShortDate(date: Date): string {
  return format(date, 'd MMM')
}

/**
 * Generates a printable PDF meal plan with weekly overview
 */
export async function generateMealPlanPDF(mealPlan: MealPlan): Promise<jsPDF> {
  console.log('🔷 Generating Meal Plan PDF for week:', mealPlan.weekStartDate)

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
  // Title with date range
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND_COLORS.black)

  const startDate = parseISO(mealPlan.weekStartDate)
  const endDate = parseISO(mealPlan.weekEndDate)
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
        (m) =>
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
          // Reheat indicator
          doc.setFontSize(6)
          doc.setTextColor(...BRAND_COLORS.emerald)
          doc.text('🔄', dayX + cellPadding, textY)
          textY += 3
        } else if (meal.notes && meal.notes.toLowerCase().includes('batch')) {
          // Batch cook indicator
          doc.setFontSize(6)
          doc.setTextColor(...BRAND_COLORS.amber)
          doc.text('⚡', dayX + cellPadding, textY)
          textY += 3
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
        // No meal
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
  doc.setTextColor(...BRAND_COLORS.gray)

  doc.setTextColor(...BRAND_COLORS.amber)
  doc.text('⚡', margin, currentY)
  doc.setTextColor(...BRAND_COLORS.gray)
  doc.text('Batch cook', margin + 4, currentY)

  doc.setTextColor(...BRAND_COLORS.emerald)
  doc.text('🔄', margin + 30, currentY)
  doc.setTextColor(...BRAND_COLORS.gray)
  doc.text('Reheat (from batch)', margin + 34, currentY)

  // === BATCH COOKING / PREP AHEAD SUMMARY ===
  currentY += 10

  // Find all batch cooking meals
  const batchMeals = mealPlan.meals.filter(
    (m) => m.notes && m.notes.toLowerCase().includes('batch') && !m.isLeftover
  )

  // Find all leftover meals
  const leftoverMeals = mealPlan.meals.filter((m) => m.isLeftover)

  if (batchMeals.length > 0 || leftoverMeals.length > 0) {
    // Section title
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.black)
    doc.text('📋 Batch Cooking & Prep Ahead', margin, currentY)

    currentY += 6

    // Batch cooking summary
    if (batchMeals.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_COLORS.amber)
      doc.text('⚡ Batch Cook:', margin, currentY)
      currentY += 4

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BRAND_COLORS.black)

      for (const meal of batchMeals) {
        const dayIndex = DAYS_OF_WEEK.indexOf(meal.dayOfWeek)
        const dayDate = getDayDate(mealPlan.weekStartDate, dayIndex)
        const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType.toLowerCase().replace(/\s+/g, '-')] || meal.mealType

        doc.setFontSize(7)
        const batchText = `• ${meal.dayOfWeek} ${mealTypeLabel}: ${meal.recipeName || 'Unknown'}`
        doc.text(batchText, margin + 2, currentY)
        currentY += 4

        // Show batch note if available
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

    // Leftover/reheat summary
    if (leftoverMeals.length > 0) {
      currentY += 2
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_COLORS.emerald)
      doc.text('🔄 Reheat Days:', margin, currentY)
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

  console.log('🟢 Meal Plan PDF generated successfully')
  return doc
}

/**
 * Downloads the meal plan PDF with a standardized filename
 */
export function downloadMealPlanPDF(doc: jsPDF, weekStartDate: string): void {
  const dateStr = format(parseISO(weekStartDate), 'yyyy-MM-dd')
  const filename = `FamilyFuel-MealPlan-${dateStr}.pdf`

  console.log('🔷 Downloading Meal Plan PDF:', filename)
  doc.save(filename)
  console.log('🟢 Meal Plan PDF download initiated')
}

/**
 * Converts PDF to Blob for sharing/uploading
 */
export function mealPlanPDFToBlob(doc: jsPDF): Blob {
  return doc.output('blob')
}
