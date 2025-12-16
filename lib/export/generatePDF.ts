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
}

interface ItemsByCategory {
  [category: string]: ShoppingListItem[]
}

// Dark theme colors matching shopping-redesign.html
const COLORS = {
  // Backgrounds
  pageBg: [3, 7, 18] as [number, number, number],        // #030712
  cardBg: [17, 24, 39] as [number, number, number],      // #111827
  categoryBg: [31, 41, 55] as [number, number, number],  // #1f2937

  // Borders
  cardBorder: [31, 41, 55] as [number, number, number],  // #1f2937
  checkboxBorder: [55, 65, 81] as [number, number, number], // #374151

  // Text colors
  white: [255, 255, 255] as [number, number, number],
  textPrimary: [255, 255, 255] as [number, number, number],
  textSecondary: [156, 163, 175] as [number, number, number], // #9ca3af
  textMuted: [107, 114, 128] as [number, number, number],     // #6b7280

  // Accent colors
  purple: [139, 92, 246] as [number, number, number],    // #8b5cf6
  purpleLight: [167, 139, 250] as [number, number, number], // #a78bfa
  emerald: [16, 185, 129] as [number, number, number],   // #10b981
}

// Category order for consistent display
const CATEGORY_ORDER = [
  'Fresh Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry',
  'Baking & Cooking Ingredients',
  'Canned & Jarred',
  'Condiments & Sauces',
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
 * Generates a printable PDF shopping list with dark theme matching the web design
 */
export async function generateShoppingListPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: {
    includeQRCode?: boolean
    qrCodeDataUrl?: string
  } = {}
): Promise<jsPDF> {
  console.log('🔷 Generating dark theme PDF for shopping list:', shoppingList.name)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const columnGap = 6
  const columnWidth = (pageWidth - 2 * margin - columnGap) / 2
  const footerHeight = 10

  // Layout settings
  const categoryHeaderHeight = 8
  const itemRowHeight = 7
  const cardPadding = 2
  const cardMarginBottom = 3
  const checkboxSize = 3.5

  let currentY = margin
  let currentPage = 1

  // === DRAW PAGE BACKGROUND ===
  function drawPageBackground() {
    doc.setFillColor(...COLORS.pageBg)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
  }

  // === HEADER ===
  function drawHeader() {
    // FamilyFuel logo (purple)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.purple)
    doc.text('FamilyFuel', margin, currentY + 5)

    // Shopping List title (white)
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.text('Shopping List', pageWidth - margin, currentY + 4, { align: 'right' })

    // Date (gray)
    const dateStr = format(new Date(), 'd MMM yyyy')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textSecondary)
    doc.text(dateStr, pageWidth - margin, currentY + 9, { align: 'right' })

    currentY += 14

    // Purple divider line
    doc.setDrawColor(...COLORS.purple)
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)

    currentY += 4
  }

  // === FOOTER ===
  function drawFooter() {
    const footerY = pageHeight - 6
    doc.setFontSize(6)
    doc.setTextColor(...COLORS.textMuted)
    doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })
    doc.text(`Page ${currentPage}`, pageWidth - margin, footerY, { align: 'right' })
  }

  // === DRAW CATEGORY HEADER ===
  function drawCategoryHeader(x: number, y: number, width: number, category: string, itemCount: number) {
    // Dark gray background with rounded corners effect
    doc.setFillColor(...COLORS.categoryBg)
    doc.roundedRect(x, y, width, categoryHeaderHeight, 1.5, 1.5, 'F')

    // Category name (white, bold)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text(category, x + 3, y + 5)

    // Item count (emerald)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.emerald)
    doc.text(`${itemCount} items`, x + 3, y + categoryHeaderHeight - 1.5)
  }

  // === DRAW CHECKBOX ===
  function drawCheckbox(x: number, y: number, isChecked: boolean) {
    const centerX = x + checkboxSize / 2
    const centerY = y + checkboxSize / 2

    if (isChecked) {
      // Filled green circle for checked
      doc.setFillColor(...COLORS.emerald)
      doc.circle(centerX, centerY, checkboxSize / 2, 'F')

      // White checkmark (simple tick using lines)
      doc.setDrawColor(...COLORS.white)
      doc.setLineWidth(0.4)
      // Draw a simple V checkmark
      doc.line(centerX - 1, centerY, centerX - 0.3, centerY + 0.8)
      doc.line(centerX - 0.3, centerY + 0.8, centerX + 1, centerY - 0.8)
    } else {
      // Empty circle with gray border
      doc.setDrawColor(...COLORS.checkboxBorder)
      doc.setLineWidth(0.4)
      doc.circle(centerX, centerY, checkboxSize / 2, 'S')
    }
  }

  // === DRAW ITEM ROW ===
  function drawItemRow(x: number, y: number, width: number, item: ShoppingListItem, isLast: boolean) {
    const rowPadding = 2

    // Item name
    doc.setFontSize(8)
    doc.setFont('helvetica', item.isPurchased ? 'normal' : 'bold')

    if (item.isPurchased) {
      doc.setTextColor(...COLORS.textMuted)
    } else {
      doc.setTextColor(...COLORS.white)
    }

    const nameX = x + checkboxSize + 4
    const maxNameWidth = width - checkboxSize - 8
    const itemName = doc.splitTextToSize(item.itemName, maxNameWidth)[0]
    doc.text(itemName, nameX, y + 3)

    // Checkbox
    drawCheckbox(x + rowPadding, y + 0.5, item.isPurchased)

    // Quantity and unit (below item name, gray)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMuted)
    const quantityStr = formatQuantity(item.quantity, item.unit)
    doc.text(quantityStr, nameX, y + 6)

    // Draw separator line (except for last item)
    if (!isLast) {
      doc.setDrawColor(...COLORS.cardBorder)
      doc.setLineWidth(0.2)
      doc.line(x + rowPadding, y + itemRowHeight - 0.5, x + width - rowPadding, y + itemRowHeight - 0.5)
    }
  }

  // === BUILD CATEGORY GROUPS ===
  const categories = sortCategories(Object.keys(itemsByCategory))
  const categoryGroups: Array<{
    category: string
    items: ShoppingListItem[]
  }> = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Sort items: unpurchased first (alphabetical), then purchased (alphabetical)
    const unpurchased = items.filter(i => !i.isPurchased).sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )
    const purchased = items.filter(i => i.isPurchased).sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )

    categoryGroups.push({
      category,
      items: [...unpurchased, ...purchased]
    })
  }

  // === CALCULATE GROUP HEIGHT ===
  function getGroupHeight(group: { category: string; items: ShoppingListItem[] }): number {
    return categoryHeaderHeight + 1 + // header + gap
           cardPadding * 2 + // card padding
           group.items.length * itemRowHeight + // items
           cardMarginBottom // bottom margin
  }

  // === DRAW CATEGORY GROUP ===
  function drawCategoryGroup(x: number, y: number, width: number, group: { category: string; items: ShoppingListItem[] }) {
    // Category header
    drawCategoryHeader(x, y, width, group.category, group.items.length)

    let cardY = y + categoryHeaderHeight + 1

    // Card background
    const cardHeight = cardPadding * 2 + group.items.length * itemRowHeight
    doc.setFillColor(...COLORS.cardBg)
    doc.setDrawColor(...COLORS.cardBorder)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, cardY, width, cardHeight, 1.5, 1.5, 'FD')

    // Draw items inside card
    let itemY = cardY + cardPadding
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i]
      const isLast = i === group.items.length - 1
      drawItemRow(x, itemY, width, item, isLast)
      itemY += itemRowHeight
    }
  }

  // === RENDER PAGES ===
  drawPageBackground()
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

      drawPageBackground()
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

      // White background for QR code
      doc.setFillColor(...COLORS.white)
      doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'F')

      doc.addImage(options.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      doc.setFontSize(5)
      doc.setTextColor(...COLORS.textMuted)
      doc.text('Scan to view', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' })
    } catch (error) {
      console.warn('⚠️ Could not add QR code to PDF:', error)
    }
  }

  console.log('🟢 Dark theme PDF generated successfully')
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
