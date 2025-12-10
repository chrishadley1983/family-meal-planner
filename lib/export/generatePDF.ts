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
 * Converts image to base64 data URL for PDF embedding
 */
async function loadLogoAsBase64(): Promise<string> {
  try {
    const response = await fetch('/logo-pdf.png')
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('⚠️ Could not load logo for PDF:', error)
    return ''
  }
}

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
 * Formats quantity with unit for display
 */
function formatQuantity(quantity: number, unit: string): string {
  // Handle whole numbers vs decimals
  const formattedQty = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, '')

  // Combine quantity and unit
  return `${formattedQty}${unit}`
}

/**
 * Generates a printable PDF shopping list
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
  const margin = 15
  let currentY = margin

  // Load logo
  const logoBase64 = await loadLogoAsBase64()

  // === HEADER ===

  // Logo (left side)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, currentY, 40, 14)
    } catch (error) {
      console.warn('⚠️ Could not add logo to PDF:', error)
    }
  }

  // Title and date (right side)
  const dateStr = format(new Date(), 'd MMM yyyy')
  doc.setFontSize(18)
  doc.setTextColor(BRAND_COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text('Shopping List', pageWidth - margin, currentY + 5, { align: 'right' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(BRAND_COLORS.gray)
  doc.text(dateStr, pageWidth - margin, currentY + 12, { align: 'right' })

  currentY += 25

  // Divider line
  doc.setDrawColor(BRAND_COLORS.purpleLight)
  doc.setLineWidth(0.5)
  doc.line(margin, currentY, pageWidth - margin, currentY)

  currentY += 8

  // === ITEMS BY CATEGORY ===

  // Get sorted categories
  const categories = sortCategories(Object.keys(itemsByCategory))

  // Prepare table data for all categories
  const tableData: (string | { content: string; styles: object })[][] = []

  for (const category of categories) {
    const items = itemsByCategory[category]
    if (!items || items.length === 0) continue

    // Category header row
    tableData.push([
      {
        content: category,
        styles: {
          fontStyle: 'bold',
          fillColor: [139, 92, 246], // Purple
          textColor: [255, 255, 255],
          fontSize: 10,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        },
      },
      {
        content: '',
        styles: {
          fillColor: [139, 92, 246],
        },
      },
    ])

    // Item rows
    for (const item of items) {
      const checkbox = item.isPurchased ? '☑' : '☐'
      const quantityStr = formatQuantity(item.quantity, item.unit)

      tableData.push([
        {
          content: `${checkbox}  ${item.itemName}`,
          styles: {
            fontStyle: 'normal',
            textColor: item.isPurchased ? [156, 163, 175] : [31, 41, 55],
            fontSize: 10,
            cellPadding: { top: 2, bottom: 2, left: 8, right: 5 },
          },
        },
        {
          content: quantityStr,
          styles: {
            fontStyle: 'normal',
            textColor: [107, 114, 128],
            fontSize: 10,
            halign: 'right',
            cellPadding: { top: 2, bottom: 2, left: 5, right: 5 },
          },
        },
      ])
    }

    // Add spacing between categories
    tableData.push([
      { content: '', styles: { cellPadding: 1, minCellHeight: 2 } },
      { content: '', styles: { cellPadding: 1, minCellHeight: 2 } },
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
      1: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Add footer on each page
      const footerY = pageHeight - 10

      doc.setFontSize(8)
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

  console.log('🟢 PDF generated successfully')
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
