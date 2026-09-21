import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const columns = [
    { table: 'categories', column: 'translations', type: 'TEXT NULL' },
    { table: 'products', column: 'sizes', type: 'TEXT NULL' },
    { table: 'products', column: 'translations', type: 'TEXT NULL' },
    { table: 'brand_themes', column: 'pwaIcons', type: 'JSON NULL' },
    { table: 'brand_themes', column: 'extractedPalette', type: 'JSON NULL' },
  ]

  for (const c of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${c.table}\` ADD COLUMN \`${c.column}\` ${c.type}`)
      console.log(`✅ Added column ${c.table}.${c.column}`)
    } catch (err: any) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log(`ℹ️ Column ${c.table}.${c.column} already exists`)
      } else {
        console.error(`⚠️ Error on ${c.table}.${c.column}:`, err.message)
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
