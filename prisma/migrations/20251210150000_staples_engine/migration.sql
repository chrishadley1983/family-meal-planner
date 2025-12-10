-- CreateEnum
CREATE TYPE "StapleFrequency" AS ENUM ('weekly', 'every_2_weeks', 'every_4_weeks', 'every_3_months');

-- CreateTable: staples (replacing weekly_staples)
CREATE TABLE "staples" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "frequency" "StapleFrequency" NOT NULL DEFAULT 'weekly',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAddedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staples_pkey" PRIMARY KEY ("id")
);

-- CreateTable: staple_imports
CREATE TABLE "staple_imports" (
    "id" TEXT NOT NULL,
    "stapleId" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasForceAdd" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "staple_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staples_userId_idx" ON "staples"("userId");

-- CreateIndex
CREATE INDEX "staples_userId_isActive_idx" ON "staples"("userId", "isActive");

-- CreateIndex
CREATE INDEX "staple_imports_stapleId_idx" ON "staple_imports"("stapleId");

-- CreateIndex
CREATE INDEX "staple_imports_shoppingListId_idx" ON "staple_imports"("shoppingListId");

-- CreateIndex
CREATE INDEX "staple_imports_shoppingListId_finalizedAt_idx" ON "staple_imports"("shoppingListId", "finalizedAt");

-- Migrate data from weekly_staples to staples
INSERT INTO "staples" ("id", "userId", "itemName", "quantity", "unit", "category", "frequency", "isActive", "notes", "createdAt", "updatedAt")
SELECT
    "id",
    "userId",
    "itemName",
    "quantity",
    "unit",
    "category",
    'weekly'::"StapleFrequency",
    "autoAddToList",
    "notes",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "weekly_staples";

-- DropTable
DROP TABLE "weekly_staples";

-- AddForeignKey
ALTER TABLE "staples" ADD CONSTRAINT "staples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staple_imports" ADD CONSTRAINT "staple_imports_stapleId_fkey" FOREIGN KEY ("stapleId") REFERENCES "staples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staple_imports" ADD CONSTRAINT "staple_imports_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
