import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DEFAULT_CATEGORIES } from '@/lib/unit-conversion'

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  displayOrder: z.number().int().min(0).optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  displayOrder: z.number().int().min(0).optional(),
})

const reorderSchema = z.object({
  categoryIds: z.array(z.string()).min(1, 'At least one category ID required'),
})

// GET - List all categories for the authenticated user
// Creates default categories if user has none
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let categories = await prisma.shoppingListCategory.findMany({
      where: { userId: session.user.id },
      orderBy: { displayOrder: 'asc' },
    })

    // If user has no categories, create defaults
    if (categories.length === 0) {
      console.log('🔄 Creating default shopping list categories for user')

      const defaultCategories = await prisma.shoppingListCategory.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          userId: session.user.id,
          name: cat.name,
          displayOrder: cat.displayOrder,
          isDefault: true,
        })),
      })

      console.log(`🟢 Created ${defaultCategories.count} default categories`)

      categories = await prisma.shoppingListCategory.findMany({
        where: { userId: session.user.id },
        orderBy: { displayOrder: 'asc' },
      })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('❌ Error fetching shopping list categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = categorySchema.parse(body)

    // Check if category name already exists for this user
    const existing = await prisma.shoppingListCategory.findFirst({
      where: {
        userId: session.user.id,
        name: { equals: data.name, mode: 'insensitive' },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    // Get the highest display order if not provided
    let displayOrder = data.displayOrder
    if (displayOrder === undefined) {
      const maxOrder = await prisma.shoppingListCategory.findFirst({
        where: { userId: session.user.id },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })
      displayOrder = (maxOrder?.displayOrder ?? -1) + 1
    }

    const category = await prisma.shoppingListCategory.create({
      data: {
        userId: session.user.id,
        name: data.name,
        displayOrder,
        isDefault: false,
      },
    })

    console.log(`🟢 Created shopping list category: ${category.name}`)

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error creating shopping list category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update category or reorder categories
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    // Handle reorder action
    if (action === 'reorder') {
      const body = await req.json()
      const data = reorderSchema.parse(body)

      // Update display order for each category
      const updatePromises = data.categoryIds.map((categoryId, index) =>
        prisma.shoppingListCategory.updateMany({
          where: {
            id: categoryId,
            userId: session.user.id,
          },
          data: { displayOrder: index },
        })
      )

      await Promise.all(updatePromises)

      const categories = await prisma.shoppingListCategory.findMany({
        where: { userId: session.user.id },
        orderBy: { displayOrder: 'asc' },
      })

      console.log('🟢 Reordered shopping list categories')

      return NextResponse.json({ categories })
    }

    // Handle update single category
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID required for update' },
        { status: 400 }
      )
    }

    const existingCategory = await prisma.shoppingListCategory.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateCategorySchema.parse(body)

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
      const duplicate = await prisma.shoppingListCategory.findFirst({
        where: {
          userId: session.user.id,
          name: { equals: data.name, mode: 'insensitive' },
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.shoppingListCategory.update({
      where: { id },
      data: {
        name: data.name,
        displayOrder: data.displayOrder,
      },
    })

    console.log(`🟢 Updated shopping list category: ${category.name}`)

    return NextResponse.json({ category })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating shopping list category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a category
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')

    // Handle reset to defaults action
    if (action === 'reset') {
      // Delete all user categories
      await prisma.shoppingListCategory.deleteMany({
        where: { userId: session.user.id },
      })

      // Create defaults
      await prisma.shoppingListCategory.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          userId: session.user.id,
          name: cat.name,
          displayOrder: cat.displayOrder,
          isDefault: true,
        })),
      })

      const categories = await prisma.shoppingListCategory.findMany({
        where: { userId: session.user.id },
        orderBy: { displayOrder: 'asc' },
      })

      console.log('🟢 Reset shopping list categories to defaults')

      return NextResponse.json({ categories, message: 'Categories reset to defaults' })
    }

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    const existingCategory = await prisma.shoppingListCategory.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.shoppingListCategory.delete({
      where: { id },
    })

    console.log(`🟢 Deleted shopping list category: ${existingCategory.name}`)

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting shopping list category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
