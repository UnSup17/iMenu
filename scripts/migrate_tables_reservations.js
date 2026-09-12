const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function columnExists(tableName, columnName) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    tableName,
    columnName
  )
  return Number(result[0].cnt) > 0
}

async function tableExists(tableName) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    tableName
  )
  return Number(result[0].cnt) > 0
}

async function main() {
  console.log('--- Migrating tables & reservations ---')

  // 1. Columnas en tables
  const cols = [
    { name: 'capacity', def: 'INT NOT NULL DEFAULT 4' },
    { name: 'posX', def: 'DOUBLE NOT NULL DEFAULT 0' },
    { name: 'posY', def: 'DOUBLE NOT NULL DEFAULT 0' },
    { name: 'width', def: 'DOUBLE NOT NULL DEFAULT 80' },
    { name: 'height', def: 'DOUBLE NOT NULL DEFAULT 80' },
    { name: 'shape', def: "VARCHAR(50) NOT NULL DEFAULT 'square'" },
  ]

  for (const col of cols) {
    const exists = await columnExists('tables', col.name)
    if (exists) {
      console.log(`  ✓ Column tables.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`tables\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column tables.${col.name}`)
    }
  }

  // 2. Tabla reservations
  const resExists = await tableExists('reservations')
  if (resExists) {
    console.log('  ✓ Table reservations already exists.')
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`reservations\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`restaurantId\` VARCHAR(191) NOT NULL,
        \`tableId\` VARCHAR(191) NULL,
        \`customerName\` VARCHAR(191) NOT NULL,
        \`customerEmail\` VARCHAR(191) NULL,
        \`customerPhone\` VARCHAR(191) NOT NULL,
        \`partySize\` INT NOT NULL DEFAULT 2,
        \`reservationDate\` DATETIME(3) NOT NULL,
        \`status\` ENUM('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
        \`notes\` TEXT NULL,
        \`seatedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`reservations_restaurantId_reservationDate_idx\` (\`restaurantId\`, \`reservationDate\`),
        INDEX \`reservations_restaurantId_status_idx\` (\`restaurantId\`, \`status\`),
        CONSTRAINT \`reservations_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`reservations_tableId_fkey\` FOREIGN KEY (\`tableId\`) REFERENCES \`tables\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('  + Created table reservations ✅')
  }

  console.log('--- Migration completed successfully ---')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Migration error:', e)
  process.exit(1)
})
