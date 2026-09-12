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
  console.log('--- Migrating branding & white-label columns ---')

  // 1. Columnas en restaurants
  const restaurantCols = [
    { name: 'customDomain', def: 'VARCHAR(191) NULL UNIQUE' },
    { name: 'customDomainVerified', def: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'customDomainCname', def: 'VARCHAR(255) NULL' },
  ]

  for (const col of restaurantCols) {
    const exists = await columnExists('restaurants', col.name)
    if (exists) {
      console.log(`  ✓ Column restaurants.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`restaurants\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column restaurants.${col.name}`)
    }
  }

  // 2. Columnas en brand_themes
  const themeCols = [
    { name: 'whiteLabelEnabled', def: 'BOOLEAN NOT NULL DEFAULT FALSE' },
    { name: 'glassmorphismEnabled', def: 'BOOLEAN NOT NULL DEFAULT TRUE' },
    { name: 'buttonStyle', def: "VARCHAR(20) NOT NULL DEFAULT 'rounded'" },
  ]

  for (const col of themeCols) {
    const exists = await columnExists('brand_themes', col.name)
    if (exists) {
      console.log(`  ✓ Column brand_themes.${col.name} already exists.`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`brand_themes\` ADD COLUMN \`${col.name}\` ${col.def};`)
      console.log(`  + Added column brand_themes.${col.name}`)
    }
  }

  console.log('--- Branding & White-Label migration completed successfully ---')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
