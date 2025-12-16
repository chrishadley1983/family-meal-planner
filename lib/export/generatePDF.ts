import jsPDF from 'jspdf'
import { format } from 'date-fns'

// Types matching the shopping list page
interface ShoppingListItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  isPurchased: boolean
}

interface ShoppingListData {
  name: string
  items: ShoppingListItem[]
  weekStartDate?: string | Date
}

interface ItemsByCategory {
  [category: string]: ShoppingListItem[]
}

// B&W Print-friendly colors
const COLORS = {
  white: [255, 255, 255] as [number, number, number],
  black: [26, 26, 26] as [number, number, number],       // #1a1a1a
  gray: [102, 102, 102] as [number, number, number],     // #666
  lightGray: [209, 213, 219] as [number, number, number], // #d1d5db (checkbox border)
  borderGray: [229, 231, 235] as [number, number, number], // #e5e7eb
  mutedGray: [156, 163, 175] as [number, number, number], // #9ca3af
}

// Category emoji mapping
const CATEGORY_EMOJIS: { [key: string]: string } = {
  'Fresh Produce': '(P)',    // 🥬
  'Meat & Seafood': '(M)',   // 🥩
  'Meat & Fish': '(M)',      // 🥩
  'Dairy & Eggs': '(D)',     // 🥛
  'Bakery': '(B)',           // 🍞
  'Frozen': '(F)',           // ❄️
  'Pantry': '(Pa)',          // 🥫
  'Cupboard Staples': '(Pa)',// 🥫
  'Baking & Cooking Ingredients': '(Ba)', // 🧁
  'Baking Ingredients': '(Ba)',           // 🧁
  'Canned & Jarred': '(C)',  // 🥫
  'Condiments & Sauces': '(Co)', // 🍯
  'Beverages': '(Be)',       // 🥤
  'Snacks': '(S)',           // 🍿
  'Household': '(H)',        // 🧹
  'Chilled & Deli': '(Ch)',  // ❄️
  'Other': '(O)',            // 📦
}

// Category order for consistent display
const CATEGORY_ORDER = [
  'Fresh Produce',
  'Meat & Seafood',
  'Meat & Fish',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry',
  'Cupboard Staples',
  'Baking & Cooking Ingredients',
  'Baking Ingredients',
  'Canned & Jarred',
  'Condiments & Sauces',
  'Chilled & Deli',
  'Beverages',
  'Snacks',
  'Household',
  'Other',
]

/**
 * Sorts categories in a logical shopping order
 */
function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a)
    const indexB = CATEGORY_ORDER.indexOf(b)

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return a.localeCompare(b)
  })
}

/**
 * Formats quantity with unit for display
 */
function formatQuantity(quantity: number, unit: string): string {
  const formattedQty = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, '')
  return `${formattedQty} ${unit}`
}

/**
 * Generates a printable PDF shopping list with B&W print-friendly design
 */
export async function generateShoppingListPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: {
    includeQRCode?: boolean
    qrCodeDataUrl?: string
    familyName?: string
    linkedMealPlan?: string
  } = {}
): Promise<jsPDF> {
  console.log('🔷 Generating B&W printable PDF for shopping list:', shoppingList.name)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const columnGap = 8
  const columnWidth = (pageWidth - 2 * margin - columnGap) / 2
  const footerHeight = 12

  // Layout settings
  const categoryHeaderHeight = 7
  const itemRowHeight = 5
  const categoryMarginBottom = 6
  const maxItemsPerCategory = 8 // Show max items, then "+ X more"
  const checkboxSize = 4

  let currentY = margin
  let currentPage = 1

  // Count total items
  const totalItems = Object.values(itemsByCategory).reduce((sum, items) => sum + items.length, 0)

  // Get week date
  const weekDate = shoppingList.weekStartDate
    ? format(new Date(shoppingList.weekStartDate), 'd MMM yyyy')
    : format(new Date(), 'd MMM yyyy')

  // === HEADER ===
  function drawHeader() {
    // Left side - Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('Shopping List', margin, currentY + 5)

    // Subtitle
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    doc.text(`Week of ${weekDate} · ${totalItems} items`, margin, currentY + 10)

    // Right side - FamilyFuel branding
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('FamilyFuel', pageWidth - margin, currentY + 5, { align: 'right' })

    // Generated date
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.mutedGray)
    doc.text(`Generated ${format(new Date(), 'd MMM yyyy')}`, pageWidth - margin, currentY + 9, { align: 'right' })

    currentY += 14

    // Bold divider line
    doc.setDrawColor(...COLORS.black)
    doc.setLineWidth(0.8)
    doc.line(margin, currentY, pageWidth - margin, currentY)

    currentY += 6
  }

  // === FOOTER ===
  function drawFooter() {
    const footerY = pageHeight - 6

    // Left side - Family name & meal plan link
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.mutedGray)
    const footerLeft = options.familyName
      ? `${options.familyName}${options.linkedMealPlan ? ` · Linked to ${options.linkedMealPlan}` : ''}`
      : (options.linkedMealPlan ? `Linked to ${options.linkedMealPlan}` : '')
    if (footerLeft) {
      doc.text(footerLeft, margin, footerY)
    }

    // Right side - familyfuel.app
    doc.text('familyfuel.app', pageWidth - margin, footerY, { align: 'right' })
  }

  // === DRAW CATEGORY HEADER ===
  function drawCategoryHeader(x: number, y: number, width: number, category: string): number {
    // Black background
    doc.setFillColor(...COLORS.black)
    doc.rect(x, y, width, categoryHeaderHeight, 'F')

    // Category emoji prefix
    const emoji = CATEGORY_EMOJIS[category] || '(O)'

    // White text, uppercase, with letter-spacing effect
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    const categoryText = `${emoji} ${category.toUpperCase()}`
    doc.text(categoryText, x + 3, y + 4.5)

    return y + categoryHeaderHeight
  }

  // === DRAW CHECKBOX ===
  function drawCheckbox(x: number, y: number) {
    // Square checkbox with rounded corners
    doc.setDrawColor(...COLORS.lightGray)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, checkboxSize, checkboxSize, 0.8, 0.8, 'S')
  }

  // === DRAW ITEM ROW ===
  function drawItemRow(x: number, y: number, width: number, item: ShoppingListItem) {
    // Checkbox
    drawCheckbox(x, y)

    // Item name
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.black)

    const nameX = x + checkboxSize + 2
    const maxNameWidth = width - checkboxSize - 30 // Leave space for quantity
    const itemName = doc.splitTextToSize(item.itemName, maxNameWidth)[0]
    doc.text(itemName, nameX, y + 3)

    // Quantity (right-aligned, gray)
    doc.setTextColor(...COLORS.gray)
    const quantityStr = formatQuantity(item.quantity, item.unit)
    doc.text(quantityStr, x + width - 2, y + 3, { align: 'right' })
  }

  // === DRAW "+ X more items" ===
  function drawMoreItems(x: number, y: number, width: number, count: number) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.mutedGray)
    doc.text(`+ ${count} more items`, x + width - 2, y + 2, { align: 'right' })
  }

  // === BUILD CATEGORY GROUPS ===
  const categories = sortCategories(Object.keys(itemsByCategory))
  const categoryGroups: Array<{
    category: string
    items: ShoppingListItem[]
    totalCount: number
  }> = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Sort items alphabetically (unpurchased only for PDF)
    const sortedItems = items
      .filter(i => !i.isPurchased)
      .sort((a, b) => a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase()))

    if (sortedItems.length === 0) continue

    categoryGroups.push({
      category,
      items: sortedItems.slice(0, maxItemsPerCategory),
      totalCount: sortedItems.length
    })
  }

  // === CALCULATE GROUP HEIGHT ===
  function getGroupHeight(group: { items: ShoppingListItem[]; totalCount: number }): number {
    const itemsToShow = Math.min(group.items.length, maxItemsPerCategory)
    const hasMore = group.totalCount > maxItemsPerCategory
    return categoryHeaderHeight +
           2 + // gap after header
           itemsToShow * itemRowHeight +
           (hasMore ? 4 : 0) + // "+ X more items" row
           categoryMarginBottom
  }

  // === DRAW CATEGORY GROUP ===
  function drawCategoryGroup(x: number, y: number, width: number, group: { category: string; items: ShoppingListItem[]; totalCount: number }) {
    // Category header
    let cardY = drawCategoryHeader(x, y, width, group.category)

    // Items container with border
    const itemsToShow = Math.min(group.items.length, maxItemsPerCategory)
    const hasMore = group.totalCount > maxItemsPerCategory
    const containerHeight = 2 + itemsToShow * itemRowHeight + (hasMore ? 4 : 0) + 2

    doc.setDrawColor(...COLORS.borderGray)
    doc.setLineWidth(0.3)
    doc.rect(x, cardY, width, containerHeight, 'S')

    // Draw items
    let itemY = cardY + 2
    for (let i = 0; i < itemsToShow; i++) {
      drawItemRow(x + 2, itemY, width - 4, group.items[i])
      itemY += itemRowHeight
    }

    // "+ X more items" if needed
    if (hasMore) {
      const moreCount = group.totalCount - maxItemsPerCategory
      drawMoreItems(x + 2, itemY, width - 4, moreCount)
    }
  }

  // === RENDER PAGES ===
  drawHeader()
  drawFooter()

  const startY = currentY
  const contentHeight = pageHeight - margin - footerHeight

  // Column positions
  const leftColumnX = margin
  const rightColumnX = margin + columnWidth + columnGap

  // Track column positions
  let leftColumnY = startY
  let rightColumnY = startY
  let groupIndex = 0

  while (groupIndex < categoryGroups.length) {
    const group = categoryGroups[groupIndex]
    const groupHeight = getGroupHeight(group)

    // Decide which column to use (use the one with more space, or left if equal)
    const useLeftColumn = leftColumnY <= rightColumnY
    const columnX = useLeftColumn ? leftColumnX : rightColumnX
    const columnY = useLeftColumn ? leftColumnY : rightColumnY

    // Check if group fits in current column
    if (columnY + groupHeight > contentHeight) {
      // Try the other column
      const otherColumnY = useLeftColumn ? rightColumnY : leftColumnY
      const otherColumnX = useLeftColumn ? rightColumnX : leftColumnX

      if (otherColumnY + groupHeight <= contentHeight) {
        // Fits in other column
        drawCategoryGroup(otherColumnX, otherColumnY, columnWidth, group)
        if (useLeftColumn) {
          rightColumnY = otherColumnY + groupHeight
        } else {
          leftColumnY = otherColumnY + groupHeight
        }
        groupIndex++
        continue
      }

      // Neither column has space - new page
      doc.addPage()
      currentPage++
      currentY = margin

      drawHeader()
      drawFooter()

      leftColumnY = currentY
      rightColumnY = currentY
      continue
    }

    // Draw the group in chosen column
    drawCategoryGroup(columnX, columnY, columnWidth, group)

    if (useLeftColumn) {
      leftColumnY = columnY + groupHeight
    } else {
      rightColumnY = columnY + groupHeight
    }

    groupIndex++
  }

  // === QR CODE (if provided) ===
  if (options.includeQRCode && options.qrCodeDataUrl) {
    try {
      const qrSize = 18
      const qrX = pageWidth - margin - qrSize
      const qrY = pageHeight - footerHeight - qrSize - 4

      doc.addImage(options.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      doc.setFontSize(5)
      doc.setTextColor(...COLORS.mutedGray)
      doc.text('Scan to view', qrX + qrSize / 2, qrY + qrSize + 2, { align: 'center' })
    } catch (error) {
      console.warn('⚠️ Could not add QR code to PDF:', error)
    }
  }

  console.log('🟢 B&W printable PDF generated successfully')
  return doc
}

/**
 * Downloads the PDF with a standardized filename
 */
export function downloadPDF(doc: jsPDF, listName?: string): void {
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `FamilyFuel-Shopping-List-${dateStr}.pdf`

  console.log('🔷 Downloading PDF:', filename)
  doc.save(filename)
  console.log('🟢 PDF download initiated')
}

/**
 * Converts PDF to Blob for sharing/uploading
 */
export function pdfToBlob(doc: jsPDF): Blob {
  return doc.output('blob')
}

/**
 * Converts PDF to base64 data URL
 */
export function pdfToDataUrl(doc: jsPDF): string {
  return doc.output('dataurlstring')
}
