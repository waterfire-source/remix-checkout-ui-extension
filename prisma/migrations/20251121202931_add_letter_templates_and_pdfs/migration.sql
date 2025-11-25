-- CreateTable
CREATE TABLE "LetterTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "productHandle" TEXT,
    "htmlContent" TEXT NOT NULL,
    "cssContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "season" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shop" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedPdf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "pdfKey" TEXT,
    "personalizationData" JSONB NOT NULL,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "downloadToken" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProductConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "isDigitalTier" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "requiresImage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shop" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "LetterTemplate_shop_productId_idx" ON "LetterTemplate"("shop", "productId");

-- CreateIndex
CREATE INDEX "LetterTemplate_shop_isActive_idx" ON "LetterTemplate"("shop", "isActive");

-- CreateIndex
CREATE INDEX "GeneratedPdf_orderId_idx" ON "GeneratedPdf"("orderId");

-- CreateIndex
CREATE INDEX "GeneratedPdf_orderNumber_idx" ON "GeneratedPdf"("orderNumber");

-- CreateIndex
CREATE INDEX "GeneratedPdf_customerEmail_idx" ON "GeneratedPdf"("customerEmail");

-- CreateIndex
CREATE INDEX "GeneratedPdf_downloadToken_idx" ON "GeneratedPdf"("downloadToken");

-- CreateIndex
CREATE INDEX "GeneratedPdf_shop_idx" ON "GeneratedPdf"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfig_productId_key" ON "ProductConfig"("productId");

-- CreateIndex
CREATE INDEX "ProductConfig_shop_productId_idx" ON "ProductConfig"("shop", "productId");

-- CreateIndex
CREATE INDEX "ProductConfig_shop_isDigitalTier_idx" ON "ProductConfig"("shop", "isDigitalTier");
