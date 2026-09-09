import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Applying schema updates to MySQL (FOOD_COURT_ADMIN, BrandThemes, Special Offers)...')

  // 1. Update role enum to include FOOD_COURT_ADMIN
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER', 'WAITER', 'KITCHEN') NOT NULL DEFAULT 'WAITER';
    `)
    console.log('✅ Updated users.role ENUM with FOOD_COURT_ADMIN')
  } catch (e: any) {
    console.log('Note on users.role:', e.message)
  }

  // 2. Create brand_themes table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`brand_themes\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`organizationId\` VARCHAR(191) NULL,
        \`restaurantId\` VARCHAR(191) NULL,
        \`foodCourtId\` VARCHAR(191) NULL,
        \`primaryColor\` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
        \`secondaryColor\` VARCHAR(191) NOT NULL DEFAULT '#18181b',
        \`accentColor\` VARCHAR(191) NOT NULL DEFAULT '#fbbf24',
        \`backgroundColor\` VARCHAR(191) NOT NULL DEFAULT '#09090b',
        \`surfaceColor\` VARCHAR(191) NOT NULL DEFAULT '#18181b',
        \`textColor\` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
        \`textMutedColor\` VARCHAR(191) NOT NULL DEFAULT '#a1a1aa',
        \`fontHeading\` VARCHAR(191) NOT NULL DEFAULT 'Inter',
        \`fontBody\` VARCHAR(191) NOT NULL DEFAULT 'Inter',
        \`borderRadius\` VARCHAR(191) NOT NULL DEFAULT '1rem',
        \`coverBannerUrl\` VARCHAR(512) NULL,
        \`logoUrl\` VARCHAR(512) NULL,
        \`allowBranchOverrides\` BOOLEAN NOT NULL DEFAULT true,
        \`useCustomTheme\` BOOLEAN NOT NULL DEFAULT false,
        \`branchProposal\` JSON NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`brand_themes_organizationId_key\`(\`organizationId\`),
        UNIQUE INDEX \`brand_themes_restaurantId_key\`(\`restaurantId\`),
        UNIQUE INDEX \`brand_themes_foodCourtId_key\`(\`foodCourtId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Created brand_themes table')
  } catch (e: any) {
    console.log('Note on brand_themes:', e.message)
  }

  // 3. Add specialOffer columns to products
  const productCols = [
    { name: 'specialOfferStock', ddl: 'ADD COLUMN `specialOfferStock` INT NULL' },
    { name: 'specialOfferStockSold', ddl: 'ADD COLUMN `specialOfferStockSold` INT NOT NULL DEFAULT 0' },
    { name: 'specialOfferCost', ddl: 'ADD COLUMN `specialOfferCost` DECIMAL(10, 2) NULL' },
  ]
  for (const col of productCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`products\` ${col.ddl};`)
      console.log(`✅ Added products.${col.name}`)
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) {
        console.log(`Note on products.${col.name}:`, e.message)
      }
    }
  }

  // 4. Add specialOffer columns to invoice_items
  const invoiceCols = [
    { name: 'isSpecialOffer', ddl: 'ADD COLUMN `isSpecialOffer` BOOLEAN NOT NULL DEFAULT false' },
    { name: 'offerLabel', ddl: 'ADD COLUMN `offerLabel` VARCHAR(191) NULL' },
  ]
  for (const col of invoiceCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`invoice_items\` ${col.ddl};`)
      console.log(`✅ Added invoice_items.${col.name}`)
    } catch (e: any) {
      if (!e.message?.includes('Duplicate column')) {
        console.log(`Note on invoice_items.${col.name}:`, e.message)
      }
    }
  }

  // 5. Seed sample FOOD_COURT_ADMIN if a FoodCourt exists
  const firstFoodCourt = await prisma.foodCourt.findFirst()
  if (firstFoodCourt) {
    const fcAdminEmail = 'plaza@demo.com'
    const existing = await prisma.user.findUnique({ where: { email: fcAdminEmail } })
    if (!existing) {
      const passwordHash = await bcrypt.hash('password123', 10)
      await prisma.user.create({
        data: {
          email: fcAdminEmail,
          passwordHash,
          name: 'Admin Plaza Gastronómica',
          role: Role.FOOD_COURT_ADMIN,
          foodCourtId: firstFoodCourt.id,
        },
      })
      console.log(`✅ Seeded FOOD_COURT_ADMIN user: ${fcAdminEmail} (pass: password123) for plaza "${firstFoodCourt.name}"`)
    }
  }

  console.log('🎉 Migration finished successfully!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
