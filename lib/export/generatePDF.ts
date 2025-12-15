import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  purpleLight: '#A78BFA',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  black: '#1F2937',
}

// B&W print-friendly colors
const BW_COLORS = {
  black: '#000000',
  darkGray: '#333333',
  gray: '#666666',
  lightGray: '#999999',
  veryLightGray: '#CCCCCC',
  white: '#FFFFFF',
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

/**
 * Generates a printable PDF shopping list
 * @param options.twoColumn - Use two-column B&W layout for better printing (default: true)
 */
export async function generateShoppingListPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: {
    includeQRCode?: boolean
    qrCodeDataUrl?: string
    twoColumn?: boolean
  } = {}
): Promise<jsPDF> {
  console.log('🔷 Generating PDF for shopping list:', shoppingList.name)

  // Default to two-column B&W layout
  const useTwoColumn = options.twoColumn !== false

  if (useTwoColumn) {
    return generateTwoColumnPDF(shoppingList, itemsByCategory, options)
  }

  // Original single-column colored layout
  return generateSingleColumnPDF(shoppingList, itemsByCategory, options)
}

/**
 * Two-column B&W printable layout
 */
async function generateTwoColumnPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: { includeQRCode?: boolean; qrCodeDataUrl?: string }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  const columnGap = 8
  const columnWidth = (pageWidth - margin * 2 - columnGap) / 2
  let currentY = margin

  // === HEADER (B&W) ===
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BW_COLORS.black)
  doc.text('FamilyFuel', margin, currentY + 5)

  // Title and date
  const dateStr = format(new Date(), 'd MMM yyyy')
  doc.setFontSize(14)
  doc.text('Shopping List', pageWidth - margin, currentY + 3, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(BW_COLORS.gray)
  doc.text(dateStr, pageWidth - margin, currentY + 9, { align: 'right' })

  currentY += 14

  // Divider line (black)
  doc.setDrawColor(BW_COLORS.black)
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, pageWidth - margin, currentY)

  currentY += 4

  // === PREPARE ALL ITEMS ===
  const categories = sortCategories(Object.keys(itemsByCategory))

  // Build a flat list of items with category headers
  interface ItemEntry {
    type: 'category' | 'item'
    text: string
    quantity?: string
    isPurchased?: boolean
  }

  const allItems: ItemEntry[] = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Category header
    allItems.push({ type: 'category', text: category })

    // Sort items alphabetically
    const sortedItems = [...items].sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )

    for (const item of sortedItems) {
      allItems.push({
        type: 'item',
        text: item.itemName,
        quantity: formatQuantity(item.quantity, item.unit),
        isPurchased: item.isPurchased,
      })
    }
  }

  // === RENDER TWO COLUMNS ===
  const lineHeight = 4.5
  const categoryHeight = 6
  const startY = currentY
  const maxY = pageHeight - 15 // Leave space for footer

  // Calculate split point
  let totalHeight = 0
  for (const entry of allItems) {
    totalHeight += entry.type === 'category' ? categoryHeight : lineHeight
  }
  const targetHeight = totalHeight / 2

  let splitIndex = 0
  let accumulatedHeight = 0
  for (let i = 0; i < allItems.length; i++) {
    const h = allItems[i].type === 'category' ? categoryHeight : lineHeight
    if (accumulatedHeight + h > targetHeight) {
      // Find a good break point (preferably at category boundary)
      splitIndex = i
      // Try to avoid splitting in middle of a category
      for (let j = i; j >= 0 && j > i - 10; j--) {
        if (allItems[j].type === 'category') {
          splitIndex = j
          break
        }
      }
      break
    }
    accumulatedHeight += h
  }

  // Render left column
  const leftColumnX = margin
  let leftY = startY

  for (let i = 0; i < splitIndex; i++) {
    leftY = renderEntry(doc, allItems[i], leftColumnX, leftY, columnWidth, lineHeight, categoryHeight)
    if (leftY > maxY) break
  }

  // Render right column
  const rightColumnX = margin + columnWidth + columnGap
  let rightY = startY

  for (let i = splitIndex; i < allItems.length; i++) {
    rightY = renderEntry(doc, allItems[i], rightColumnX, rightY, columnWidth, lineHeight, categoryHeight)
    if (rightY > maxY) {
      // Need new page
      doc.addPage()
      rightY = margin
    }
  }

  // === FOOTER ===
  const footerY = pageHeight - 6
  doc.setFontSize(7)
  doc.setTextColor(BW_COLORS.lightGray)
  doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })

  // Page number
  const pageNum = doc.getCurrentPageInfo().pageNumber
  const totalPages = doc.getNumberOfPages()
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })

  console.log('🟢 Two-column B&W PDF generated successfully')
  return doc
}

/**
 * Renders a single entry (category or item) in the PDF
 */
function renderEntry(
  doc: jsPDF,
  entry: { type: 'category' | 'item'; text: string; quantity?: string; isPurchased?: boolean },
  x: number,
  y: number,
  columnWidth: number,
  lineHeight: number,
  categoryHeight: number
): number {
  if (entry.type === 'category') {
    // Category header - bold with underline
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(BW_COLORS.black)
    doc.text(entry.text.toUpperCase(), x, y + 4)

    // Underline
    doc.setDrawColor(BW_COLORS.darkGray)
    doc.setLineWidth(0.2)
    doc.line(x, y + 5.5, x + columnWidth, y + 5.5)

    return y + categoryHeight
  } else {
    // Item with checkbox
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    // Checkbox
    const checkboxSize = 2.5
    doc.setDrawColor(BW_COLORS.gray)
    doc.setLineWidth(0.2)
    doc.rect(x, y + 0.5, checkboxSize, checkboxSize)

    if (entry.isPurchased) {
      // Draw checkmark
      doc.setDrawColor(BW_COLORS.black)
      doc.line(x + 0.5, y + 1.5, x + 1, y + 2.5)
      doc.line(x + 1, y + 2.5, x + 2.2, y + 1)
    }

    // Item name
    const textX = x + checkboxSize + 2
    doc.setTextColor(entry.isPurchased ? BW_COLORS.lightGray : BW_COLORS.black)
    doc.text(entry.text, textX, y + 2.8)

    // Quantity (right-aligned)
    if (entry.quantity) {
      doc.setTextColor(BW_COLORS.gray)
      doc.text(entry.quantity, x + columnWidth, y + 2.8, { align: 'right' })
    }

    return y + lineHeight
  }
}

/**
 * Original single-column colored layout
 */
async function generateSingleColumnPDF(
  shoppingList: ShoppingListData,
  itemsByCategory: ItemsByCategory,
  options: { includeQRCode?: boolean; qrCodeDataUrl?: string }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  let currentY = margin

  // === HEADER ===

  // Text logo (left side) - styled "FamilyFuel"
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BRAND_COLORS.purple)
  doc.text('FamilyFuel', margin, currentY + 6)

  // Title and date (right side)
  const dateStr = format(new Date(), 'd MMM yyyy')
  doc.setFontSize(16)
  doc.setTextColor(BRAND_COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text('Shopping List', pageWidth - margin, currentY + 4, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(BRAND_COLORS.gray)
  doc.text(dateStr, pageWidth - margin, currentY + 10, { align: 'right' })

  currentY += 16

  // Divider line
  doc.setDrawColor(BRAND_COLORS.purpleLight)
  doc.setLineWidth(0.5)
  doc.line(margin, currentY, pageWidth - margin, currentY)

  currentY += 5

  // === ITEMS BY CATEGORY ===

  // Get sorted categories
  const categories = sortCategories(Object.keys(itemsByCategory))

  // Prepare table data for all categories
  const tableData: (string | { content: string; styles: object })[][] = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Sort items alphabetically within category
    const sortedItems = [...items].sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )

    // Category header row
    tableData.push([
      {
        content: category,
        styles: {
          fontStyle: 'bold',
          fillColor: [139, 92, 246], // Purple
          textColor: [255, 255, 255],
          fontSize: 8,
          cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
        },
      },
      {
        content: '',
        styles: {
          fillColor: [139, 92, 246],
        },
      },
    ])

    // Item rows - sorted alphabetically
    for (const item of sortedItems) {
      // Use simple ASCII checkbox that renders correctly
      const checkbox = item.isPurchased ? '[x]' : '[  ]'
      const quantityStr = formatQuantity(item.quantity, item.unit)

      tableData.push([
        {
          content: `${checkbox}  ${item.itemName}`,
          styles: {
            fontStyle: 'normal',
            textColor: item.isPurchased ? [156, 163, 175] : [31, 41, 55],
            fontSize: 8,
            cellPadding: { top: 1.5, bottom: 1.5, left: 6, right: 4 },
          },
        },
        {
          content: quantityStr,
          styles: {
            fontStyle: 'normal',
            textColor: [107, 114, 128],
            fontSize: 8,
            halign: 'right',
            cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 },
          },
        },
      ])
    }

    // Add small spacing between categories
    tableData.push([
      { content: '', styles: { cellPadding: 0.5, minCellHeight: 1 } },
      { content: '', styles: { cellPadding: 0.5, minCellHeight: 1 } },
    ])
  }

  // Generate table
  autoTable(doc, {
    startY: currentY,
    head: [], // No header row
    body: tableData,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Add footer on each page
      const footerY = pageHeight - 8

      doc.setFontSize(7)
      doc.setTextColor(BRAND_COLORS.grayLight)
      doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })

      // Page number
      const pageNum = doc.getCurrentPageInfo().pageNumber
      const totalPages = doc.getNumberOfPages()
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
    },
  })

  // === QR CODE (if provided) ===
  if (options.includeQRCode && options.qrCodeDataUrl) {
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || currentY + 50

    // Check if QR code fits on current page
    const qrSize = 25
    const qrY = finalY + 10

    if (qrY + qrSize > pageHeight - 20) {
      doc.addPage()
    }

    try {
      const qrX = pageWidth - margin - qrSize
      const qrYPos = qrY > pageHeight - 40 ? 20 : qrY
      doc.addImage(options.qrCodeDataUrl, 'PNG', qrX, qrYPos, qrSize, qrSize)

      doc.setFontSize(7)
      doc.setTextColor(BRAND_COLORS.grayLight)
      doc.text('Scan to view list', qrX + qrSize / 2, qrYPos + qrSize + 3, { align: 'center' })
    } catch (error) {
      console.warn('⚠️ Could not add QR code to PDF:', error)
    }
  }

  console.log('🟢 Single-column PDF generated successfully')
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
