-- ============================================================
-- Migration: Phase 1 — Billing + Inventory
-- Only adds NEW tables and modifies Role enum
-- Safe to apply on top of existing schema (no data loss)
-- ============================================================

-- AlterEnum: Add ACCOUNTANT and MANAGER to Role
ALTER TABLE `users`
    MODIFY `role` ENUM('SUPERADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER', 'WAITER', 'KITCHEN') NOT NULL DEFAULT 'WAITER';

-- CreateTable: inventory_items
CREATE TABLE `inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `unit` ENUM('KG', 'GRAM', 'LITER', 'ML', 'UNIT', 'PORTION') NOT NULL,
    `currentStock` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `minStock` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `costPerUnit` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    `supplier` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: product_recipe_items
CREATE TABLE `product_recipe_items` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,

    UNIQUE INDEX `product_recipe_items_productId_inventoryItemId_key`(`productId`, `inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: inventory_movements
CREATE TABLE `inventory_movements` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `type` ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'WASTE', 'TRANSFER') NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `stockBefore` DECIMAL(10, 3) NOT NULL,
    `stockAfter` DECIMAL(10, 3) NOT NULL,
    `unitCost` DECIMAL(10, 4) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,

    INDEX `inventory_movements_restaurantId_inventoryItemId_idx`(`restaurantId`, `inventoryItemId`),
    INDEX `inventory_movements_reference_idx`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: product_stock_issues
CREATE TABLE `product_stock_issues` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `product_stock_issues_productId_inventoryItemId_key`(`productId`, `inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: tax_configs
CREATE TABLE `tax_configs` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `country` ENUM('CO', 'MX', 'CL', 'PE', 'OTHER') NOT NULL DEFAULT 'CO',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'COP',
    `currencySymbol` VARCHAR(191) NOT NULL DEFAULT '$',
    `vatRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.1900,
    `vatEnabled` BOOLEAN NOT NULL DEFAULT true,
    `serviceChargeRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    `serviceChargeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `legalName` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `invoiceFooter` TEXT NULL,
    `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'FV',
    `nextInvoiceNumber` INTEGER NOT NULL DEFAULT 1,
    `ticketEnabled` BOOLEAN NOT NULL DEFAULT true,
    `ticketWidth` INTEGER NOT NULL DEFAULT 80,
    `ticketLogoUrl` VARCHAR(191) NULL,
    `ticketHeader` VARCHAR(191) NULL,
    `ticketFooter` VARCHAR(191) NULL,
    `ticketShowLogo` BOOLEAN NOT NULL DEFAULT true,
    `ticketShowTax` BOOLEAN NOT NULL DEFAULT true,
    `ticketShowTable` BOOLEAN NOT NULL DEFAULT true,
    `ticketShowWaiter` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tax_configs_restaurantId_key`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: invoices
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `taxAmount` DECIMAL(12, 2) NOT NULL,
    `serviceCharge` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'QR_CODE', 'SPLIT', 'ROOM_CHARGE', 'OTHER') NULL,
    `paidAt` DATETIME(3) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `voidedAt` DATETIME(3) NULL,
    `voidReason` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `customerTaxId` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `waiterId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `pdfUrl` VARCHAR(512) NULL,
    `electronicInvoiceId` VARCHAR(191) NULL,
    `electronicInvoiceStatus` VARCHAR(191) NULL,

    INDEX `invoices_restaurantId_status_idx`(`restaurantId`, `status`),
    INDEX `invoices_restaurantId_issuedAt_idx`(`restaurantId`, `issuedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: invoice_items
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `taxRate` DECIMAL(5, 4) NOT NULL,
    `taxAmount` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: payments
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'QR_CODE', 'SPLIT', 'ROOM_CHARGE', 'OTHER') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedById` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_recipe_items` ADD CONSTRAINT `product_recipe_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_recipe_items` ADD CONSTRAINT `product_recipe_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_stock_issues` ADD CONSTRAINT `product_stock_issues_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_stock_issues` ADD CONSTRAINT `product_stock_issues_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_configs` ADD CONSTRAINT `tax_configs_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `tables`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `table_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_waiterId_fkey` FOREIGN KEY (`waiterId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
