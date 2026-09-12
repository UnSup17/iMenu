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

async function main() {
  console.log('--- Migrating products table for Menu Catalog enhancements ---')

  const productCols = [
    { name: 'orderIndex', def: 'INT NOT NULL DEFAULT 0' },
    { name: 'allergens', def: 'TEXT NULL' },
    { name: 'scheduledPrice', def: 'DECIMAL(10, 2) NULL' },
    { name: 'scheduledPriceDays', def: 'VARCHAR(100) NULL' },
    { name: 'scheduledPriceStart', def: 'VARCHAR(10) NULL' },
    { name: 'scheduledPriceEnd', def: 'VARCHAR(10) NULL' },
    { name: 'scheduledPriceLabel', def: 'VARCHAR(100) NULL' },
  ]

  for (const col of productCols) {
    const exists = await columnExists('products', col.name)
    if (exists) {
      console.log(`  ✓ Column products.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`products\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column products.${col.name}`)
    }
  }

  console.log('--- Menu Catalog DB migration completed successfully ---')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
