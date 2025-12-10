-- CreateTable
CREATE TABLE "shopping_list_share_links" (
    "id" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_share_links_shareToken_key" ON "shopping_list_share_links"("shareToken");

-- CreateIndex
CREATE INDEX "shopping_list_share_links_shareToken_idx" ON "shopping_list_share_links"("shareToken");

-- CreateIndex
CREATE INDEX "shopping_list_share_links_shoppingListId_idx" ON "shopping_list_share_links"("shoppingListId");

-- CreateIndex
CREATE INDEX "shopping_list_share_links_expiresAt_idx" ON "shopping_list_share_links"("expiresAt");

-- AddForeignKey
ALTER TABLE "shopping_list_share_links" ADD CONSTRAINT "shopping_list_share_links_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
