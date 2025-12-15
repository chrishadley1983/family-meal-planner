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

// Category emojis for PDF headers
const CATEGORY_EMOJIS: Record<string, string> = {
  'Fresh Produce': '🥬',
  'Meat & Seafood': '🥩',
  'Meat & Fish': '🥩',
  'Dairy & Eggs': '🧀',
  'Bakery': '🥖',
  'Frozen': '🧊',
  'Pantry': '🥫',
  'Cupboard Staples': '🥫',
  'Baking & Cooking Ingredients': '🥄',
  'Baking Ingredients': '🥄',
  'Canned & Jarred': '🥫',
  'Condiments & Sauces': '🍯',
  'Beverages': '🥤',
  'Snacks': '🍿',
  'Household': '🧹',
  'Other': '📦',
}

// Maximum items to show per category before truncation
const MAX_ITEMS_PER_CATEGORY = 8

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
 * Two-column card-based layout matching the visual design
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
  const margin = 12
  const columnGap = 6
  const columnWidth = (pageWidth - margin * 2 - columnGap) / 2
  let currentY = margin

  // Count total items
  const totalItems = shoppingList.items.length
  const dateStr = format(new Date(), 'd MMM yyyy')
  const weekStr = `Week of ${dateStr}`

  // === HEADER ===
  // Shopping List title (left)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BW_COLORS.black)
  doc.text('Shopping List', margin, currentY + 7)

  // Subtitle: Week of X · Y items
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(BW_COLORS.gray)
  doc.text(`${weekStr} · ${totalItems} items`, margin, currentY + 13)

  // FamilyFuel logo (right side)
  // Draw a small gradient-like square (purple to pink)
  const logoX = pageWidth - margin - 8
  const logoY = currentY + 2
  doc.setFillColor(139, 92, 246) // Purple
  doc.roundedRect(logoX, logoY, 8, 8, 1.5, 1.5, 'F')
  // Add a pink gradient overlay effect
  doc.setFillColor(236, 72, 153) // Pink
  doc.roundedRect(logoX + 4, logoY, 4, 8, 0, 1.5, 'F')

  // FamilyFuel text
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BW_COLORS.black)
  doc.text('FamilyFuel', logoX - 2, currentY + 6, { align: 'right' })

  // Generated date
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(BW_COLORS.lightGray)
  doc.text(`Generated ${dateStr}`, pageWidth - margin, currentY + 12, { align: 'right' })

  currentY += 20

  // Divider line
  doc.setDrawColor(BW_COLORS.veryLightGray)
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, pageWidth - margin, currentY)

  currentY += 8

  // === PREPARE CATEGORY CARDS ===
  const categories = sortCategories(Object.keys(itemsByCategory))

  interface CategoryCard {
    name: string
    emoji: string
    items: ShoppingListItem[]
    truncatedCount: number
  }

  const categoryCards: CategoryCard[] = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Sort items alphabetically
    const sortedItems = [...items].sort((a, b) =>
      a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
    )

    const displayItems = sortedItems.slice(0, MAX_ITEMS_PER_CATEGORY)
    const truncatedCount = Math.max(0, sortedItems.length - MAX_ITEMS_PER_CATEGORY)

    categoryCards.push({
      name: category,
      emoji: CATEGORY_EMOJIS[category] || '📦',
      items: displayItems,
      truncatedCount,
    })
  }

  // === RENDER TWO COLUMNS OF CARDS ===
  const cardPadding = 3
  const headerHeight = 8
  const itemHeight = 5
  const cardGap = 6
  const startY = currentY
  const maxY = pageHeight - 15

  // Calculate card heights and split into columns
  function getCardHeight(card: CategoryCard): number {
    const itemsHeight = card.items.length * itemHeight
    const truncationHeight = card.truncatedCount > 0 ? 5 : 0
    return headerHeight + itemsHeight + truncationHeight + cardPadding * 2
  }

  // Split cards into two columns trying to balance heights
  const leftCards: CategoryCard[] = []
  const rightCards: CategoryCard[] = []
  let leftHeight = 0
  let rightHeight = 0

  for (const card of categoryCards) {
    const cardHeight = getCardHeight(card)
    if (leftHeight <= rightHeight) {
      leftCards.push(card)
      leftHeight += cardHeight + cardGap
    } else {
      rightCards.push(card)
      rightHeight += cardHeight + cardGap
    }
  }

  // Render left column
  let leftY = startY
  for (const card of leftCards) {
    leftY = renderCategoryCard(doc, card, margin, leftY, columnWidth, itemHeight, headerHeight, cardPadding)
    leftY += cardGap
    if (leftY > maxY) {
      doc.addPage()
      leftY = margin
    }
  }

  // Render right column
  let rightY = startY
  const rightX = margin + columnWidth + columnGap
  for (const card of rightCards) {
    rightY = renderCategoryCard(doc, card, rightX, rightY, columnWidth, itemHeight, headerHeight, cardPadding)
    rightY += cardGap
    if (rightY > maxY) {
      doc.addPage()
      rightY = margin
    }
  }

  console.log('🟢 Two-column card PDF generated successfully')
  return doc
}

/**
 * Renders a category card with dark header and white item area
 */
function renderCategoryCard(
  doc: jsPDF,
  card: { name: string; emoji: string; items: ShoppingListItem[]; truncatedCount: number },
  x: number,
  y: number,
  width: number,
  itemHeight: number,
  headerHeight: number,
  padding: number
): number {
  const itemsHeight = card.items.length * itemHeight
  const truncationHeight = card.truncatedCount > 0 ? 5 : 0
  const totalHeight = headerHeight + itemsHeight + truncationHeight + padding

  // Card background (white with border)
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, width, totalHeight, 2, 2, 'FD')

  // Dark header
  doc.setFillColor(38, 38, 38) // Dark gray almost black
  doc.roundedRect(x, y, width, headerHeight, 2, 0, 'F')
  // Fix bottom corners of header (they shouldn't be rounded)
  doc.setFillColor(38, 38, 38)
  doc.rect(x, y + headerHeight - 2, width, 2, 'F')

  // Category name with emoji in header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  // Note: jsPDF has limited emoji support, so we use text representation
  const headerText = `${card.emoji} ${card.name.toUpperCase()}`
  doc.text(headerText, x + 3, y + 5.5)

  // Items
  let itemY = y + headerHeight + 2
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  for (const item of card.items) {
    // Rounded checkbox
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.roundedRect(x + 3, itemY, 3, 3, 0.5, 0.5, 'S')

    if (item.isPurchased) {
      // Draw checkmark
      doc.setDrawColor(100, 100, 100)
      doc.line(x + 3.5, itemY + 1.5, x + 4.2, itemY + 2.3)
      doc.line(x + 4.2, itemY + 2.3, x + 5.5, itemY + 0.8)
    }

    // Item name
    doc.setTextColor(item.isPurchased ? 180 : 50, item.isPurchased ? 180 : 50, item.isPurchased ? 180 : 50)
    doc.text(item.itemName, x + 8, itemY + 2.3)

    // Quantity (right-aligned)
    const qtyStr = formatQuantity(item.quantity, item.unit)
    doc.setTextColor(120, 120, 120)
    doc.text(qtyStr, x + width - 3, itemY + 2.3, { align: 'right' })

    itemY += itemHeight
  }

  // Truncation text
  if (card.truncatedCount > 0) {
    doc.setFontSize(7)
    doc.setTextColor(BRAND_COLORS.purple)
    doc.text(`+ ${card.truncatedCount} more items`, x + width - 3, itemY + 2, { align: 'right' })
  }

  return y + totalHeight
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
