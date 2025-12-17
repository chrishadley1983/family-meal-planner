import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { PRODUCT_CATEGORIES } from '@/lib/types/product'
import { syncProductToRecipe } from '@/lib/products/product-recipe-sync'

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  brand: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  quantity: z.number().positive('Quantity must be positive'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  category: z.string().min(1, 'Category is required'),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  // Nutritional info
  caloriesPerServing: z.number().int().nonnegative().optional().nullable(),
  proteinPerServing: z.number().nonnegative().optional().nullable(),
  carbsPerServing: z.number().nonnegative().optional().nullable(),
  fatPerServing: z.number().nonnegative().optional().nullable(),
  fiberPerServing: z.number().nonnegative().optional().nullable(),
  sugarPerServing: z.number().nonnegative().optional().nullable(),
  saturatedFatPerServing: z.number().nonnegative().optional().nullable(),
  sodiumPerServing: z.number().nonnegative().optional().nullable(),
  servingSize: z.string().optional().nullable(),
  // Flags
  isSnack: z.boolean().default(false),
  familyRating: z.number().int().min(1).max(10).optional().nullable(),
})

const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
  timesUsed: z.number().int().nonnegative().optional(),
})

// GET - List all products for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    // Parse query parameters
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const isSnack = searchParams.get('isSnack')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const sortField = searchParams.get('sortField') || 'name'
    const sortDirection = searchParams.get('sortDirection') || 'asc'

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (category) {
      where.category = category
    }

    if (brand) {
      where.brand = brand
    }

    if (isSnack !== null && isSnack !== '') {
      where.isSnack = isSnack === 'true'
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build orderBy
    const orderBy: any = {}
    const validSortFields = ['name', 'brand', 'category', 'familyRating', 'timesUsed', 'createdAt']
    if (validSortFields.includes(sortField)) {
      orderBy[sortField] = sortDirection === 'desc' ? 'desc' : 'asc'
    } else {
      orderBy.name = 'asc'
    }

    console.log('🔷 Fetching products with filters:', { category, brand, isSnack, isActive, search })

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        linkedRecipe: {
          select: {
            id: true,
            recipeName: true,
            isArchived: true,
          }
        }
      }
    })

    console.log('🟢 Products fetched:', products.length)

    // Get unique brands for filter dropdown
    const brands = await prisma.product.findMany({
      where: { userId: session.user.id },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' }
    })

    const uniqueBrands = brands
      .map(b => b.brand)
      .filter((b): b is string => b !== null)

    return NextResponse.json({
      products,
      filters: {
        categories: PRODUCT_CATEGORIES,
        brands: uniqueBrands,
      }
    })
  } catch (error) {
    console.error('❌ Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createProductSchema.parse(body)

    console.log('🔷 Creating product:', data.name)

    const product = await prisma.product.create({
      data: {
        ...data,
        userId: session.user.id,
        createdBy: session.user.id,
      },
      include: {
        linkedRecipe: {
          select: {
            id: true,
            recipeName: true,
            isArchived: true,
          }
        }
      }
    })

    console.log('🟢 Product created:', product.name)

    // If isSnack is true, auto-create a linked recipe using the sync utility
    if (data.isSnack) {
      console.log('🔷 Syncing snack product to recipe database...')
      const syncResult = await syncProductToRecipe(product)
      if (syncResult.success) {
        // Re-fetch product with linked recipe
        const updatedProduct = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            linkedRecipe: {
              select: {
                id: true,
                recipeName: true,
                isArchived: true,
              }
            }
          }
        })
        return NextResponse.json({ product: updatedProduct }, { status: 201 })
      }
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error creating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a product
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (existingProduct.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateProductSchema.parse(body)

    console.log('🔷 Updating product:', existingProduct.name)

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        linkedRecipe: {
          select: {
            id: true,
            recipeName: true,
            isArchived: true,
          }
        }
      }
    })

    // Handle isSnack changes using the sync utility
    const isSnackChanged = data.isSnack !== undefined && data.isSnack !== existingProduct.isSnack

    if (isSnackChanged || (product.isSnack && !product.linkedRecipeId)) {
      console.log('🔷 Syncing product to recipe database (isSnack changed or missing linked recipe)...')
      const syncResult = await syncProductToRecipe(product)
      if (syncResult.success) {
        // Re-fetch product with linked recipe
        const updatedProduct = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            linkedRecipe: {
              select: {
                id: true,
                recipeName: true,
                isArchived: true,
              }
            }
          }
        })
        console.log('🟢 Product synced with recipe database')
        return NextResponse.json({ product: updatedProduct })
      }
    }

    console.log('🟢 Product updated:', product.name)
    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (existingProduct.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔷 Deleting product:', existingProduct.name)

    await prisma.product.delete({
      where: { id }
    })

    console.log('🟢 Product deleted')
    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

