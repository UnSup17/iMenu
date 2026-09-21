import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Ejecutando Migración SQL para Fase 9...\n')

  // 1. Columnas nuevas en tablas existentes
  const columns = [
    { table: 'organizations', column: 'referredByCode', type: 'VARCHAR(191) NULL' },
    { table: 'subscriptions', column: 'discountPercent', type: 'INT NOT NULL DEFAULT 0' },
  ]

  for (const c of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${c.table}\` ADD COLUMN \`${c.column}\` ${c.type}`)
      console.log(`✅ Columna agregada: ${c.table}.${c.column}`)
    } catch (err: any) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log(`ℹ️ Columna ${c.table}.${c.column} ya existe`)
      } else {
        console.error(`⚠️ Error en ${c.table}.${c.column}:`, err.message)
      }
    }
  }

  // 2. Tabla audit_logs
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NULL,
        \`userEmail\` VARCHAR(191) NULL,
        \`restaurantId\` VARCHAR(191) NULL,
        \`organizationId\` VARCHAR(191) NULL,
        \`event\` VARCHAR(191) NOT NULL,
        \`ip\` VARCHAR(191) NULL,
        \`userAgent\` VARCHAR(512) NULL,
        \`details\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`audit_logs_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
        INDEX \`audit_logs_organizationId_createdAt_idx\` (\`organizationId\`, \`createdAt\`),
        INDEX \`audit_logs_restaurantId_createdAt_idx\` (\`restaurantId\`, \`createdAt\`),
        INDEX \`audit_logs_event_createdAt_idx\` (\`event\`, \`createdAt\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Tabla audit_logs verificada/creada exitosamente')
  } catch (err: any) {
    console.error('⚠️ Error al crear tabla audit_logs:', err.message)
  }

  // 3. Tabla referral_codes
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`referral_codes\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`organizationId\` VARCHAR(191) NOT NULL,
        \`discountPercent\` INT NOT NULL DEFAULT 20,
        \`uses\` INT NOT NULL DEFAULT 0,
        \`maxUses\` INT NULL,
        \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`referral_codes_code_key\` (\`code\`),
        INDEX \`referral_codes_organizationId_idx\` (\`organizationId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('✅ Tabla referral_codes verificada/creada exitosamente')
  } catch (err: any) {
    console.error('⚠️ Error al crear tabla referral_codes:', err.message)
  }

  console.log('\n✨ Migración SQL de Fase 9 finalizada.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
