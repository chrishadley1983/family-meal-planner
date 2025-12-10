import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

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

function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a)
    const indexB = CATEGORY_ORDER.indexOf(b)
    if (indexA !== -1 && indexB !== -1) return indexA - indexB
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return a.localeCompare(b)
  })
}

function formatQuantity(quantity: number, unit: string): string {
  const formattedQty = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(/\.0$/, '')
  return `${formattedQty} ${unit}`
}

// GET - Generate and download PDF for shared shopping list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the share link and verify it's not expired
    const shareLink = await prisma.shoppingListShareLink.findUnique({
      where: { shareToken: token },
      include: {
        shoppingList: {
          include: {
            items: {
              where: { isPurchased: false },
              orderBy: [
                { category: 'asc' },
                { displayOrder: 'asc' },
              ],
            },
          },
        },
      },
    })

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 })
    }

    const shoppingList = shareLink.shoppingList

    // Group items by category
    const itemsByCategory: Record<string, typeof shoppingList.items> = {}
    for (const item of shoppingList.items) {
      const category = item.category || 'Other'
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = []
      }
      itemsByCategory[category].push(item)
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12
    let currentY = margin

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(BRAND_COLORS.purple)
    doc.text('FamilyFuel', margin, currentY + 6)

    const dateStr = format(new Date(), 'd MMM yyyy')
    doc.setFontSize(16)
    doc.setTextColor(BRAND_COLORS.black)
    doc.text('Shopping List', pageWidth - margin, currentY + 4, { align: 'right' })

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(BRAND_COLORS.gray)
    doc.text(dateStr, pageWidth - margin, currentY + 10, { align: 'right' })

    currentY += 16

    // Divider
    doc.setDrawColor(BRAND_COLORS.purpleLight)
    doc.setLineWidth(0.5)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 5

    // Build table data
    const categories = sortCategories(Object.keys(itemsByCategory))
    const tableData: (string | { content: string; styles: object })[][] = []

    for (const category of categories) {
      const items = itemsByCategory[category]
      if (!items || items.length === 0) continue

      const sortedItems = [...items].sort((a, b) =>
        a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase())
      )

      // Category header
      tableData.push([
        {
          content: category,
          styles: {
            fontStyle: 'bold',
            fillColor: [139, 92, 246],
            textColor: [255, 255, 255],
            fontSize: 8,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
          },
        },
        {
          content: '',
          styles: { fillColor: [139, 92, 246] },
        },
      ])

      // Items
      for (const item of sortedItems) {
        const checkbox = '[  ]'
        const quantityStr = formatQuantity(item.quantity, item.unit)

        tableData.push([
          {
            content: `${checkbox}  ${item.itemName}`,
            styles: {
              fontStyle: 'normal',
              textColor: [31, 41, 55],
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

      tableData.push([
        { content: '', styles: { cellPadding: 0.5, minCellHeight: 1 } },
        { content: '', styles: { cellPadding: 0.5, minCellHeight: 1 } },
      ])
    }

    // Generate table
    autoTable(doc, {
      startY: currentY,
      head: [],
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
      didDrawPage: () => {
        const footerY = pageHeight - 8
        doc.setFontSize(7)
        doc.setTextColor(BRAND_COLORS.grayLight)
        doc.text('Powered by FamilyFuel', pageWidth / 2, footerY, { align: 'center' })

        const pageNum = doc.getCurrentPageInfo().pageNumber
        const totalPages = doc.getNumberOfPages()
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
      },
    })

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `FamilyFuel-Shopping-List-${format(new Date(), 'yyyy-MM-dd')}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('❌ Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
