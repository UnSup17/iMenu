const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const cols = await prisma.$queryRaw`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
        AND COLUMN_NAME IN ('kitchenStation', 'prepTimeMinutes')
    `;
    const existingCols = cols.map(c => c.COLUMN_NAME);

    if (!existingCols.includes('kitchenStation')) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE products ADD COLUMN kitchenStation ENUM('HOT','COLD','GRILL','PASTRY','BAR','GENERAL') NOT NULL DEFAULT 'GENERAL'"
      );
      console.log('✅ kitchenStation column added');
    } else {
      console.log('ℹ️  kitchenStation already exists, skipping');
    }

    if (!existingCols.includes('prepTimeMinutes')) {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE products ADD COLUMN prepTimeMinutes INT NULL'
      );
      console.log('✅ prepTimeMinutes column added');
    } else {
      console.log('ℹ️  prepTimeMinutes already exists, skipping');
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
