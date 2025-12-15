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

// Brand colors (print-friendly versions)
const BRAND_COLORS = {
  purple: '#8B5CF6',
  purpleRGB: [139, 92, 246] as [number, number, number],
  purpleLight: '#A78BFA',
  gray: '#6B7280',
  grayRGB: [107, 114, 128] as [number, number, number],
  grayLight: '#9CA3AF',
  grayLightRGB: [156, 163, 175] as [number, number, number],
  black: '#1F2937',
  blackRGB: [31, 41, 55] as [number, number, number],
  white: '#FFFFFF',
  whiteRGB: [255, 255, 255] as [number, number, number],
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

    // If both are in the order list, sort by order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    // Otherwise sort alphabetically
    return a.localeCompare(b)
  })
}

/**
 * Formats quantity with unit for display - WITH SPACE
 */
function formatQuantity(quantity: number, unit: string): string {
  // Handle whole numbers vs decimals
  const formattedQty = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, '')

  // Combine quantity and unit WITH A SPACE
  return `${formattedQty} ${unit}`
}

// Row type for 2-column layout
interface PDFRow {
  type: 'category' | 'item'
  category?: string
  item?: ShoppingListItem
}

/**
 * Generates a printable PDF shopping list with 2-column newspaper layout
 */
export async function generateShoppingListPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: {
    includeQRCode?: boolean
    qrCodeDataUrl?: string
  } = {}
): Promise<jsPDF> {
  console.log('🔷 Generating PDF for shopping list:', shoppingList.name)

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
  const contentHeight = pageHeight - margin - footerHeight

  // Row heights
  const categoryRowHeight = 6
  const itemRowHeight = 5
  const categorySpacing = 2

  let currentY = margin
  let currentPage = 1

  // === HEADER ===
  function drawHeader() {
    // Text logo (left side) - styled "FamilyFuel"
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.purpleRGB)
    doc.text('FamilyFuel', margin, currentY + 6)

    // Title and date (right side)
    const dateStr = format(new Date(), 'd MMM yyyy')
    doc.setFontSize(16)
    doc.setTextColor(...BRAND_COLORS.blackRGB)
    doc.setFont('helvetica', 'bold')
    doc.text('Shopping List', pageWidth - margin, currentY + 4, { align: 'right' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND_COLORS.grayRGB)
    doc.text(dateStr, pageWidth - margin, currentY + 10, { align: 'right' })

    currentY += 16

    // Divider line
    doc.setDrawColor(...BRAND_COLORS.purpleRGB)
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)

    currentY += 5
  }

  // === FOOTER ===
  function drawFooter() {
    const footerY = pageHeight - 8
    doc.setFontSize(7)
    doc.setTextColor(...BRAND_COLORS.grayLightRGB)
    doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })
    doc.text(`Page ${currentPage}`, pageWidth - margin, footerY, { align: 'right' })
  }

  // === DRAW CATEGORY HEADER ===
  function drawCategoryHeader(x: number, y: number, width: number, category: string) {
    // Purple background
    doc.setFillColor(...BRAND_COLORS.purpleRGB)
    doc.rect(x, y, width, categoryRowHeight, 'F')

    // White text
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.whiteRGB)
    doc.text(category, x + 2, y + 4)
  }

  // === DRAW ITEM ROW ===
  function drawItemRow(x: number, y: number, width: number, item: ShoppingListItem) {
    // Checkbox
    const checkboxSize = 3
    const checkboxY = y + 1
    doc.setDrawColor(...BRAND_COLORS.grayRGB)
    doc.setLineWidth(0.3)
    doc.circle(x + checkboxSize / 2 + 1, checkboxY + checkboxSize / 2, checkboxSize / 2, 'S')

    if (item.isPurchased) {
      // Draw checkmark
      doc.setFillColor(...BRAND_COLORS.purpleRGB)
      doc.circle(x + checkboxSize / 2 + 1, checkboxY + checkboxSize / 2, checkboxSize / 2 - 0.5, 'F')
    }

    // Item name
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    if (item.isPurchased) {
      doc.setTextColor(...BRAND_COLORS.grayLightRGB)
    } else {
      doc.setTextColor(...BRAND_COLORS.blackRGB)
    }

    const nameX = x + checkboxSize + 3
    const maxNameWidth = width - checkboxSize - 30 // Leave space for quantity
    const itemName = doc.splitTextToSize(item.itemName, maxNameWidth)[0] // Take first line only
    doc.text(itemName, nameX, y + 3.5)

    // Quantity (right aligned)
    doc.setTextColor(...BRAND_COLORS.grayRGB)
    const quantityStr = formatQuantity(item.quantity, item.unit)
    doc.text(quantityStr, x + width - 2, y + 3.5, { align: 'right' })
  }

  // === BUILD ROW LIST ===
  // Build a flat list of rows (category headers + items)
  const rows: PDFRow[] = []
  const categories = sortCategories(Object.keys(itemsByCategory))

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Sort items alphabetically within category
    const sortedItems = [...items].sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )

    // Add category header row
    rows.push({ type: 'category', category })

    // Add item rows
    for (const item of sortedItems) {
      rows.push({ type: 'item', item })
    }
  }

  // === CALCULATE ROW HEIGHTS FOR LAYOUT ===
  function getRowHeight(row: PDFRow): number {
    if (row.type === 'category') {
      return categoryRowHeight + categorySpacing
    }
    return itemRowHeight
  }

  // === SPLIT INTO PAGES AND COLUMNS ===
  // Each page has 2 columns. We need to figure out how many rows fit per column.

  drawHeader()
  drawFooter()

  const startY = currentY
  const availableHeight = contentHeight - startY

  // Column positions
  const leftColumnX = margin
  const rightColumnX = margin + columnWidth + columnGap

  // Current drawing position
  let columnIndex = 0 // 0 = left, 1 = right
  let columnY = startY
  let rowIndex = 0

  while (rowIndex < rows.length) {
    const row = rows[rowIndex]
    const rowHeight = getRowHeight(row)

    // Check if row fits in current column
    if (columnY + rowHeight > contentHeight) {
      // Move to next column or page
      if (columnIndex === 0) {
        // Move to right column
        columnIndex = 1
        columnY = startY
      } else {
        // New page
        doc.addPage()
        currentPage++
        currentY = margin

        // Draw header and footer on new page
        drawHeader()
        drawFooter()

        columnIndex = 0
        columnY = currentY
      }
    }

    // Draw the row
    const x = columnIndex === 0 ? leftColumnX : rightColumnX

    if (row.type === 'category' && row.category) {
      drawCategoryHeader(x, columnY, columnWidth, row.category)
      columnY += categoryRowHeight + categorySpacing
    } else if (row.type === 'item' && row.item) {
      drawItemRow(x, columnY, columnWidth, row.item)
      columnY += itemRowHeight
    }

    rowIndex++
  }

  // === QR CODE (if provided) ===
  if (options.includeQRCode && options.qrCodeDataUrl) {
    try {
      const qrSize = 20
      const qrX = pageWidth - margin - qrSize
      const qrY = pageHeight - footerHeight - qrSize - 5

      doc.addImage(options.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      doc.setFontSize(6)
      doc.setTextColor(...BRAND_COLORS.grayLightRGB)
      doc.text('Scan to view', qrX + qrSize / 2, qrY + qrSize + 2, { align: 'center' })
    } catch (error) {
      console.warn('⚠️ Could not add QR code to PDF:', error)
    }
  }

  console.log('🟢 PDF generated successfully with 2-column layout')
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
