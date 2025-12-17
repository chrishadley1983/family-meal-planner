import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseAndValidateCSV, generateCSVTemplate, getValidCategories } from '@/lib/products/csv-parser'

/**
 * POST /api/products/import/validate
 *
 * Validates CSV data and returns a preview of what will be imported.
 * Does NOT actually import anything - that's done via /confirm endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const csvText = formData.get('csvText') as string | null

    let csvContent: string

    if (file) {
      // Handle file upload
      csvContent = await file.text()
      console.log('🔷 Validating CSV file:', file.name, 'Size:', file.size)
    } else if (csvText) {
      // Handle direct text input
      csvContent = csvText
      console.log('🔷 Validating CSV text input, length:', csvText.length)
    } else {
      return NextResponse.json(
        { error: 'No CSV file or text provided' },
        { status: 400 }
      )
    }

    // Get existing products for duplicate detection
    const existingProducts = await prisma.product.findMany({
      where: { userId: session.user.id },
      select: { name: true, brand: true },
    })

    const existingProductKeys = existingProducts.map(
      p => `${p.name.toLowerCase().trim()}|${(p.brand || '').toLowerCase().trim()}`
    )

    console.log('🔷 Found', existingProducts.length, 'existing products for duplicate check')

    // Parse and validate
    const summary = parseAndValidateCSV(csvContent, existingProductKeys)

    console.log('🟢 CSV validation complete:', {
      total: summary.totalRows,
      valid: summary.validCount,
      warnings: summary.warningCount,
      errors: summary.errorCount,
      duplicates: summary.duplicateCount,
    })

    return NextResponse.json({
      summary,
      categories: getValidCategories(),
    })
  } catch (error) {
    console.error('❌ Error validating CSV:', error)
    return NextResponse.json(
      { error: 'Failed to validate CSV' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/products/import/validate
 *
 * Returns the CSV template for download
 */
export async function GET() {
  try {
    const template = generateCSVTemplate()

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="products-import-template.csv"',
      },
    })
  } catch (error) {
    console.error('❌ Error generating CSV template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
