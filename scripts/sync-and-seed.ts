import { PrismaClient, Role, PlanTier, TaxCountry, ExpenseCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function run() {
  console.log('🔄 Checking and applying missing SQL columns / tables...')

  // 1. Create organizations table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`organizations\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`slug\` VARCHAR(191) NOT NULL,
      \`logoUrl\` VARCHAR(191) NULL,
      \`plan\` ENUM('BASIC', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'BASIC',
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`organizations_slug_key\`(\`slug\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 2. Add organizationId to restaurants if not exists
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`restaurants\` ADD COLUMN \`organizationId\` VARCHAR(191) NULL;
    `)
    console.log('Added organizationId to restaurants')
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) {
      console.log('Note on restaurants.organizationId:', e.message)
    }
  }

  // 3. Add organizationId to users if not exists and update role enum
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`users\` ADD COLUMN \`organizationId\` VARCHAR(191) NULL;
    `)
    console.log('Added organizationId to users')
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) {
      console.log('Note on users.organizationId:', e.message)
    }
  }

  // Update role enum definition in MySQL
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER', 'WAITER', 'KITCHEN') NOT NULL DEFAULT 'WAITER';
    `)
    console.log('Updated users.role enum in MySQL')
  } catch (e: any) {
    console.log('Note on users.role enum:', e.message)
  }


  // 4. Create subscriptions table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`subscriptions\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`organizationId\` VARCHAR(191) NOT NULL,
      \`tier\` ENUM('BASIC', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'BASIC',
      \`status\` VARCHAR(191) NOT NULL DEFAULT 'trialing',
      \`currentPeriodStart\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`currentPeriodEnd\` DATETIME(3) NOT NULL,
      \`trialEndsAt\` DATETIME(3) NULL,
      \`stripeCustomerId\` VARCHAR(191) NULL,
      \`stripeSubId\` VARCHAR(191) NULL,
      \`cancelAtPeriodEnd\` BOOLEAN NOT NULL DEFAULT false,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`subscriptions_organizationId_key\`(\`organizationId\`),
      UNIQUE INDEX \`subscriptions_stripeSubId_key\`(\`stripeSubId\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`subscriptions_organizationId_fkey\` FOREIGN KEY (\`organizationId\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 5. Create expenses table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`expenses\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`restaurantId\` VARCHAR(191) NOT NULL,
      \`category\` ENUM('FOOD_INGREDIENTS', 'BEVERAGES', 'LABOR', 'UTILITIES', 'RENT', 'EQUIPMENT', 'MARKETING', 'ADMIN', 'TAXES', 'OTHER') NOT NULL,
      \`description\` VARCHAR(191) NOT NULL,
      \`amount\` DECIMAL(12, 2) NOT NULL,
      \`taxAmount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      \`supplier\` VARCHAR(191) NULL,
      \`supplierTaxId\` VARCHAR(191) NULL,
      \`receiptUrl\` VARCHAR(191) NULL,
      \`date\` DATETIME(3) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`createdById\` VARCHAR(191) NOT NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`expenses_restaurantId_date_idx\`(\`restaurantId\`, \`date\`),
      INDEX \`expenses_restaurantId_category_idx\`(\`restaurantId\`, \`category\`),
      CONSTRAINT \`expenses_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`expenses_createdById_fkey\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 6. Create cash_register_closes table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`cash_register_closes\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`restaurantId\` VARCHAR(191) NOT NULL,
      \`date\` DATETIME(3) NOT NULL,
      \`openingBalance\` DECIMAL(12, 2) NOT NULL,
      \`cashSales\` DECIMAL(12, 2) NOT NULL,
      \`cardSales\` DECIMAL(12, 2) NOT NULL,
      \`transferSales\` DECIMAL(12, 2) NOT NULL,
      \`qrSales\` DECIMAL(12, 2) NOT NULL,
      \`otherSales\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      \`totalIncome\` DECIMAL(12, 2) NOT NULL,
      \`totalExpenses\` DECIMAL(12, 2) NOT NULL,
      \`expectedCash\` DECIMAL(12, 2) NOT NULL,
      \`actualCash\` DECIMAL(12, 2) NOT NULL,
      \`difference\` DECIMAL(12, 2) NOT NULL,
      \`closedById\` VARCHAR(191) NOT NULL,
      \`notes\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`cash_register_closes_restaurantId_date_idx\`(\`restaurantId\`, \`date\`),
      CONSTRAINT \`cash_register_closes_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`cash_register_closes_closedById_fkey\` FOREIGN KEY (\`closedById\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 7. Create accounting_periods table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`accounting_periods\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`restaurantId\` VARCHAR(191) NOT NULL,
      \`year\` INT NOT NULL,
      \`month\` INT NOT NULL,
      \`isClosed\` BOOLEAN NOT NULL DEFAULT false,
      \`closedAt\` DATETIME(3) NULL,
      \`closedById\` VARCHAR(191) NULL,
      \`totalRevenue\` DECIMAL(14, 2) NOT NULL,
      \`totalExpenses\` DECIMAL(14, 2) NOT NULL,
      \`grossProfit\` DECIMAL(14, 2) NOT NULL,
      \`vatCollected\` DECIMAL(14, 2) NOT NULL,
      \`vatPaid\` DECIMAL(14, 2) NOT NULL,
      \`vatOwed\` DECIMAL(14, 2) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`accounting_periods_restaurantId_year_month_key\`(\`restaurantId\`, \`year\`, \`month\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`accounting_periods_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`accounting_periods_closedById_fkey\` FOREIGN KEY (\`closedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 8. Create electronic_invoice_configs table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`electronic_invoice_configs\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`restaurantId\` VARCHAR(191) NOT NULL,
      \`country\` ENUM('CO', 'MX', 'CL', 'PE', 'OTHER') NOT NULL DEFAULT 'CO',
      \`testMode\` BOOLEAN NOT NULL DEFAULT true,
      \`softwareId\` VARCHAR(191) NULL,
      \`softwarePin\` VARCHAR(191) NULL,
      \`technicalKey\` VARCHAR(191) NULL,
      \`certificateUrl\` VARCHAR(191) NULL,
      \`certificatePassword\` VARCHAR(191) NULL,
      \`resolutionNumber\` VARCHAR(191) NULL,
      \`resolutionPrefix\` VARCHAR(191) NULL,
      \`resolutionFrom\` INT NULL,
      \`resolutionTo\` INT NULL,
      \`resolutionDate\` DATETIME(3) NULL,
      \`resolutionEnd\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`electronic_invoice_configs_restaurantId_key\`(\`restaurantId\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`electronic_invoice_configs_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  // 9. Add electronic invoice fields to invoices if missing
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`invoices\` ADD COLUMN \`electronicInvoiceId\` VARCHAR(191) NULL;`)
  } catch(e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`invoices\` ADD COLUMN \`electronicInvoiceStatus\` VARCHAR(191) NULL;`)
  } catch(e) {}

  // 10. Create electronic_invoice_logs table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`electronic_invoice_logs\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`invoiceId\` VARCHAR(191) NOT NULL,
      \`attempt\` INT NOT NULL DEFAULT 1,
      \`zipName\` VARCHAR(191) NULL,
      \`cufe\` VARCHAR(191) NULL,
      \`qrCode\` TEXT NULL,
      \`status\` VARCHAR(191) NOT NULL DEFAULT 'pending',
      \`dianResponse\` TEXT NULL,
      \`errorMessage\` TEXT NULL,
      \`sentAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`respondedAt\` DATETIME(3) NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`electronic_invoice_logs_invoiceId_idx\`(\`invoiceId\`),
      INDEX \`electronic_invoice_logs_cufe_idx\`(\`cufe\`),
      CONSTRAINT \`electronic_invoice_logs_invoiceId_fkey\` FOREIGN KEY (\`invoiceId\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)

  console.log('✅ Schema migration completed successfully!')

  // ==========================================
  // SEEDING TEST USERS & DEMO DATA
  // ==========================================
  console.log('🌱 Seeding test users and demo data...')

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'grupo-gastronomico-demo' },
    update: {},
    create: {
      name: 'Grupo Gastronómico Demo (Franquicia)',
      slug: 'grupo-gastronomico-demo',
      plan: PlanTier.PRO,
    }
  })

  // 2. Subscription for Org
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      tier: PlanTier.PRO,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  })

  // 3. Main Demo Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {
      organizationId: org.id,
    },
    create: {
      slug: 'demo-restaurant',
      name: 'El Rincón Demo - Sede Principal',
      currency: 'COP',
      organizationId: org.id,
    },
  })

  // 4. Secondary Branch Restaurant
  const branch2 = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant-norte' },
    update: {
      organizationId: org.id,
    },
    create: {
      slug: 'demo-restaurant-norte',
      name: 'El Rincón Demo - Sede Norte',
      currency: 'COP',
      organizationId: org.id,
    },
  })

  // 5. Default Tax Config for Demo Restaurant
  await prisma.taxConfig.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      country: TaxCountry.CO,
      currency: 'COP',
      currencySymbol: '$',
      vatRate: 0.19,
      vatEnabled: true,
      serviceChargeRate: 0.10,
      serviceChargeEnabled: true,
      legalName: 'El Rincón Demo S.A.S.',
      taxId: '900.123.456-7',
      address: 'Calle 93 # 12-45, Bogotá',
      phone: '+57 300 123 4567',
      email: 'facturacion@elrincondemo.com',
      invoicePrefix: 'FV',
      nextInvoiceNumber: 101,
    }
  })

  // 6. Users for every role with password "admin123"
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const testUsers = [
    {
      email: 'superadmin@imenu.co',
      name: 'Super Admin iMenu',
      role: Role.SUPERADMIN,
      restaurantId: null,
      organizationId: null,
    },
    {
      email: 'franquicia@demo.com',
      name: 'Laura Franquicia (Org Admin)',
      role: Role.ORG_ADMIN,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
    {
      email: 'admin@demo.com',
      name: 'Admin Demo (Gerente Sede)',
      role: Role.RESTAURANT_ADMIN,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
    {
      email: 'contador@demo.com',
      name: 'Camilo Contador (Finanzas)',
      role: Role.ACCOUNTANT,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
    {
      email: 'manager@demo.com',
      name: 'Mateo Manager (Operaciones)',
      role: Role.MANAGER,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
    {
      email: 'mesero@demo.com',
      name: 'Carlos Mesero (Servicio)',
      role: Role.WAITER,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
    {
      email: 'cocina@demo.com',
      name: 'Chef Cocina (KDS)',
      role: Role.KITCHEN,
      restaurantId: restaurant.id,
      organizationId: org.id,
    },
  ]

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hashedPassword,
        name: u.name,
        role: u.role,
        restaurantId: u.restaurantId,
        organizationId: u.organizationId,
      },
      create: {
        email: u.email,
        passwordHash: hashedPassword,
        name: u.name,
        role: u.role,
        restaurantId: u.restaurantId,
        organizationId: u.organizationId,
      }
    })
    console.log(`✅ User ready: ${u.email} [${u.role}]`)
  }

  // 7. Seed sample inventory items & expenses if needed
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } })
  if (adminUser) {
    const existingExpenses = await prisma.expense.count({ where: { restaurantId: restaurant.id } })
    if (existingExpenses === 0) {
      await prisma.expense.createMany({
        data: [
          {
            restaurantId: restaurant.id,
            category: ExpenseCategory.FOOD_INGREDIENTS,
            description: 'Compra de carne de res y verduras frescas',
            amount: 450000.00,
            taxAmount: 85500.00,
            supplier: 'Distribuidora Carnes del Campo',
            supplierTaxId: '900.888.777-1',
            date: new Date(),
            createdById: adminUser.id,
          },
          {
            restaurantId: restaurant.id,
            category: ExpenseCategory.UTILITIES,
            description: 'Pago servicio de energía eléctrica y gas',
            amount: 280000.00,
            taxAmount: 0.00,
            supplier: 'Enel Colombia / Vanti',
            date: new Date(),
            createdById: adminUser.id,
          }
        ]
      })
      console.log('✅ Sample expenses seeded')
    }
  }

  console.log('🎉 All users and data seeded successfully!')
}

run()
  .catch((e) => {
    console.error('Error during migration & seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
