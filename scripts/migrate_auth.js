const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const columns = [
  { name: 'resetPasswordToken', ddl: 'VARCHAR(191) NULL' },
  { name: 'resetPasswordExpiry', ddl: 'DATETIME(3) NULL' },
  { name: 'twoFactorSecret', ddl: 'TEXT NULL' },
  { name: 'twoFactorEnabled', ddl: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'inviteToken', ddl: 'VARCHAR(191) NULL' },
  { name: 'inviteExpiry', ddl: 'DATETIME(3) NULL' },
  { name: 'inviteAccepted', ddl: 'BOOLEAN NOT NULL DEFAULT FALSE' },
]

const indexes = [
  { name: 'users_resetPasswordToken_key', column: 'resetPasswordToken' },
  { name: 'users_inviteToken_key', column: 'inviteToken' },
]

async function columnExists(colName) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
    colName
  )
  return Number(result[0].cnt) > 0
}

async function indexExists(idxName) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = ?`,
    idxName
  )
  return Number(result[0].cnt) > 0
}

async function main() {
  console.log('Checking & adding columns to users table...')

  for (const col of columns) {
    const exists = await columnExists(col.name)
    if (exists) {
      console.log(`  ✓ Column already exists: ${col.name}`)
    } else {
      await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN \`${col.name}\` ${col.ddl}`)
      console.log(`  + Added column: ${col.name}`)
    }
  }

  console.log('Checking & adding unique indexes...')
  for (const idx of indexes) {
    const exists = await indexExists(idx.name)
    if (exists) {
      console.log(`  ✓ Index already exists: ${idx.name}`)
    } else {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE users ADD UNIQUE INDEX \`${idx.name}\` (\`${idx.column}\`)`
      )
      console.log(`  + Added index: ${idx.name}`)
    }
  }

  console.log('\nMigration complete! ✅')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
