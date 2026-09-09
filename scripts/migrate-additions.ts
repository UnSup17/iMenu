import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Running additions migration for MySQL...')

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`additions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`restaurantId\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`description\` TEXT NULL,
        \`price\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`isAvailable\` BOOLEAN NOT NULL DEFAULT true,
        \`imageUrl\` VARCHAR(512) NULL,
        \`inventoryItemId\` VARCHAR(191) NULL,
        \`inventoryQuantity\` DECIMAL(10, 3) NULL,
        \`recipeProductId\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`additions_restaurantId_idx\`(\`restaurantId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Created additions table')
  } catch (e: any) {
    console.error('Error on additions table:', e.message)
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`addition_categories\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`additionId\` VARCHAR(191) NOT NULL,
        \`categoryId\` VARCHAR(191) NOT NULL,
        UNIQUE INDEX \`addition_categories_additionId_categoryId_key\`(\`additionId\`, \`categoryId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Created addition_categories table')
  } catch (e: any) {
    console.error('Error on addition_categories table:', e.message)
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`addition_products\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`additionId\` VARCHAR(191) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        UNIQUE INDEX \`addition_products_additionId_productId_key\`(\`additionId\`, \`productId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Created addition_products table')
  } catch (e: any) {
    console.error('Error on addition_products table:', e.message)
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`order_item_additions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`orderItemId\` VARCHAR(191) NOT NULL,
        \`additionId\` VARCHAR(191) NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`priceCharged\` DECIMAL(10, 2) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Created order_item_additions table')
  } catch (e: any) {
    console.error('Error on order_item_additions table:', e.message)
  }

  console.log('🎉 Additions migration finished successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
