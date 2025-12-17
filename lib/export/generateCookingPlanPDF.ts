import jsPDF from 'jspdf'
import { format, parseISO, addDays } from 'date-fns'
import { getWeekDaysWithDates } from '@/lib/date-utils'

// Types for meal plan data
interface Recipe {
  id: string
  recipeName: string
  prepTime?: number | null
  cookTime?: number | null
}

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
  recipe?: Recipe | null
}

interface MealPlan {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: string
  meals: Meal[]
}

// Brand colors - matching the design
const COLORS = {
  // Header/brand
  purple: [139, 92, 246] as [number, number, number],
  purpleLight: [167, 139, 250] as [number, number, number],

  // Status indicators
  amber: [245, 158, 11] as [number, number, number],
  amberBg: [254, 243, 199] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],

  // Table colors
  headerBg: [31, 41, 55] as [number, number, number], // Dark navy
  rowBg: [249, 250, 251] as [number, number, number], // Light gray
  rowAltBg: [255, 255, 255] as [number, number, number], // White
  border: [229, 231, 235] as [number, number, number], // Gray border

  // Text
  textDark: [31, 41, 55] as [number, number, number],
  textMedium: [107, 114, 128] as [number, number, number],
  textLight: [156, 163, 175] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
}

function getDayDate(weekStartDate: string, dayIndex: number): Date {
  const startDate = parseISO(weekStartDate)
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

/**
 * Generates a Cooking Plan PDF with day-by-day breakdown
 */
export async function generateCookingPlanPDF(mealPlan: MealPlan): Promise<jsPDF> {
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
  let currentPage = 1

  // Column widths for the table
  const colWidths = {
    meal: 25,
    recipe: contentWidth - 25 - 20 - 20 - 20, // remaining space
    prep: 20,
    cook: 20,
    servings: 20,
  }

  // === HEADER ===
  function drawHeader() {
    // Title
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.textDark)
    doc.text('Cooking Plan', margin, currentY + 7)

    // Date range
    const startDate = parseISO(mealPlan.weekStartDate)
    const endDate = parseISO(mealPlan.weekEndDate)
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
  }

  // === CHECK IF NEW PAGE NEEDED ===
  function checkNewPage(requiredHeight: number) {
    if (currentY + requiredHeight > pageHeight - 15) {
      doc.addPage()
      currentPage++
      currentY = margin
      return true
    }
    return false
  }

  // Get week days with actual dates from start date
  const weekDays = getWeekDaysWithDates(mealPlan.weekStartDate)

  // === DRAW DAY SECTION ===
  function drawDaySection(dayInfo: { day: string; date: Date }, dayIndex: number) {
    const dayName = dayInfo.day
    const dayDate = dayInfo.date
    const dayMeals = mealPlan.meals.filter((m: Meal) => m.dayOfWeek === dayName)

    // Get meals by type
    const mealsByType: Record<string, Meal | undefined> = {}
    for (const mealType of MEAL_TYPES) {
      mealsByType[mealType] = dayMeals.find(
        (m: Meal) => m.mealType.toLowerCase().replace(/\s+/g, '-') === mealType
      )
    }

    // Check for batch cooking meals
    const batchMeals = dayMeals.filter((m: Meal) =>
      m.notes && m.notes.toLowerCase().includes('batch') && !m.isLeftover
    )

    // Check for prep ahead tasks (from notes mentioning "prep ahead" or future prep)
    const prepAheadTasks: string[] = []
    dayMeals.forEach((m: Meal) => {
      if (m.notes && (m.notes.toLowerCase().includes('prep ahead') || m.notes.toLowerCase().includes('for '))) {
        // Extract prep ahead info from notes
        const match = m.notes.match(/for\s+(\w+)'s\s+(.+?):/i)
        if (match) {
          prepAheadTasks.push(m.notes)
        }
      }
    })

    // Calculate total cooking time for the day
    let totalPrepTime = 0
    let totalCookTime = 0
    dayMeals.forEach((m: Meal) => {
      if (m.recipe && !m.isLeftover) {
        totalPrepTime += m.recipe.prepTime || 0
        totalCookTime += m.recipe.cookTime || 0
      }
    })
    const totalTime = totalPrepTime + totalCookTime

    // Calculate section height
    const mealsWithData = MEAL_TYPES.filter(mt => mealsByType[mt]?.recipeName).length
    const tableRowHeight = 10
    const headerHeight = 12
    const tableHeight = headerHeight + (Math.max(mealsWithData, 1) * tableRowHeight) + 2
    const prepAheadHeight = prepAheadTasks.length > 0 ? 20 : 0
    const totalTimeHeight = 10
    const sectionHeight = 15 + tableHeight + prepAheadHeight + totalTimeHeight + 10

    // Check if we need a new page
    checkNewPage(sectionHeight)

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
    for (const mealType of MEAL_TYPES) {
      const meal = mealsByType[mealType]
      if (!meal?.recipeName) continue

      const isBatch = meal.notes && meal.notes.toLowerCase().includes('batch') && !meal.isLeftover
      const isReheat = meal.isLeftover
      const hasBadge = isBatch || isReheat

      // Calculate row height - taller if badge is present
      const rowHeight = hasBadge ? 14 : tableRowHeight

      // Row background
      doc.setFillColor(...(rowIndex % 2 === 0 ? COLORS.rowBg : COLORS.rowAltBg))
      doc.rect(sectionX, currentY, sectionWidth, rowHeight, 'F')

      // Row border
      doc.setDrawColor(...COLORS.border)
      doc.setLineWidth(0.2)
      doc.rect(sectionX, currentY, sectionWidth, rowHeight, 'S')

      colX = sectionX + 3

      // Meal type label
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.textDark)
      doc.text(MEAL_TYPE_LABELS[mealType] || mealType.toUpperCase(), colX, currentY + 4)

      // BATCH or REHEAT badge - using circle indicator + text instead of box with emoji
      if (isBatch) {
        // Amber circle indicator
        doc.setFillColor(...COLORS.amber)
        doc.circle(colX + 1.5, currentY + 8.5, 1.5, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.amber)
        doc.text('BATCH', colX + 4, currentY + 9.5)
      } else if (isReheat) {
        // Emerald circle indicator
        doc.setFillColor(...COLORS.emerald)
        doc.circle(colX + 1.5, currentY + 8.5, 1.5, 'F')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.emerald)
        doc.text('REHEAT', colX + 4, currentY + 9.5)
      }

      colX += colWidths.meal

      // Recipe name
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.textDark)
      const recipeName = meal.recipeName || ''
      const truncatedName = recipeName.length > 40 ? recipeName.substring(0, 37) + '...' : recipeName
      doc.text(truncatedName, colX, currentY + (hasBadge ? 5 : 6))

      // Add batch note under recipe name if applicable
      if (isBatch && meal.notes) {
        doc.setFontSize(6)
        doc.setTextColor(...COLORS.textMedium)
        const noteText = meal.notes.length > 60 ? meal.notes.substring(0, 57) + '...' : meal.notes
        doc.text(noteText, colX, currentY + 9)
      }

      colX += colWidths.recipe

      // Prep time
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.textMedium)
      const prepTime = isReheat ? '-' : formatTime(meal.recipe?.prepTime)
      doc.text(prepTime, colX, currentY + (hasBadge ? 5 : 6))
      colX += colWidths.prep

      // Cook time
      const cookTime = isReheat ? '10m' : formatTime(meal.recipe?.cookTime)
      doc.text(cookTime, colX, currentY + (hasBadge ? 5 : 6))
      colX += colWidths.cook

      // Servings
      doc.text(meal.servings?.toString() || '-', colX + 5, currentY + (hasBadge ? 5 : 6))

      currentY += rowHeight
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
    // Look for prep ahead tasks in ALL meals for future days
    const futurePrepTasks = mealPlan.meals.filter((m: Meal) => {
      if (!m.notes) return false
      const dayIdx = weekDays.findIndex(d => d.day === m.dayOfWeek)
      // Check if this meal's notes mention prep for a future day
      return dayIdx > dayIndex && m.notes.toLowerCase().includes('prep')
    })

    if (batchMeals.length > 0 || futurePrepTasks.length > 0) {
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

      // Sample prep ahead text based on batch meals
      batchMeals.forEach((m: Meal) => {
        if (m.notes) {
          const prepText = `For ${m.recipeName}: ${m.notes.substring(0, 80)}${m.notes.length > 80 ? '...' : ''}`
          doc.text(prepText, sectionX + 3, currentY + 3)
          currentY += 4
        }
      })

      currentY += 2
    }

    // Total cooking time
    currentY += 3
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.textDark)
    doc.text(`Total cooking time: ${formatTotalTime(totalTime)}`, sectionX + sectionWidth - 3, currentY, { align: 'right' })

    currentY += 12 // Space before next day
  }

  // === MAIN RENDERING ===
  drawHeader()

  // Draw each day using the actual week days from the start date
  weekDays.forEach((dayInfo, dayIndex) => {
    drawDaySection(dayInfo, dayIndex)
  })

  console.log('🟢 Cooking Plan PDF generated successfully')
  return doc
}

/**
 * Downloads the cooking plan PDF with a standardized filename
 */
export function downloadCookingPlanPDF(doc: jsPDF, weekStartDate: string): void {
  const dateStr = format(parseISO(weekStartDate), 'yyyy-MM-dd')
  const filename = `FamilyFuel-CookingPlan-${dateStr}.pdf`

  console.log('🔷 Downloading Cooking Plan PDF:', filename)
  doc.save(filename)
  console.log('🟢 Cooking Plan PDF download initiated')
}

/**
 * Converts PDF to Blob for sharing/uploading
 */
export function cookingPlanPDFToBlob(doc: jsPDF): Blob {
  return doc.output('blob')
}
