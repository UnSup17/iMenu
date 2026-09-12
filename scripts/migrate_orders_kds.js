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
  console.log('--- Migrating orders & order_items for KDS ---')

  // 1. Columnas en orders
  const orderCols = [
    { name: 'priority', def: "VARCHAR(20) NOT NULL DEFAULT 'NORMAL'" },
    { name: 'preparedAt', def: 'DATETIME(3) NULL' },
    { name: 'deliveredAt', def: 'DATETIME(3) NULL' },
  ]

  for (const col of orderCols) {
    const exists = await columnExists('orders', col.name)
    if (exists) {
      console.log(`  ✓ Column orders.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`orders\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column orders.${col.name}`)
    }
  }

  // 2. Columnas en order_items
  const itemCols = [
    { name: 'isPrepared', def: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  ]

  for (const col of itemCols) {
    const exists = await columnExists('order_items', col.name)
    if (exists) {
      console.log(`  ✓ Column order_items.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`order_items\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column order_items.${col.name}`)
    }
  }

  console.log('--- Migration completed successfully ---')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
