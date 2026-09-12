const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function tableExists(tableName) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    tableName
  )
  return Number(result[0].cnt) > 0
}

async function main() {
  console.log('Checking & creating table_session_feedback...')

  const exists = await tableExists('table_session_feedback')
  if (exists) {
    console.log('  ✓ Table table_session_feedback already exists.')
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`table_session_feedback\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`restaurantId\` VARCHAR(191) NOT NULL,
        \`tableId\` VARCHAR(191) NULL,
        \`sessionId\` VARCHAR(191) NULL,
        \`rating\` INT NOT NULL,
        \`tags\` VARCHAR(191) NULL,
        \`comment\` TEXT NULL,
        \`customerName\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`table_session_feedback_restaurantId_rating_idx\` (\`restaurantId\`, \`rating\`),
        INDEX \`table_session_feedback_restaurantId_createdAt_idx\` (\`restaurantId\`, \`createdAt\`),
        CONSTRAINT \`table_session_feedback_restaurantId_fkey\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurants\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`table_session_feedback_tableId_fkey\` FOREIGN KEY (\`tableId\`) REFERENCES \`tables\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    console.log('  + Created table table_session_feedback ✅')
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
