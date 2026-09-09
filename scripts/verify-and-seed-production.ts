import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking database state...')

  // 1. Check existing users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, foodCourtId: true, restaurantId: true },
  })
  console.log('📋 Existing users:', users)

  // 2. Check existing food courts
  const foodCourts = await prisma.foodCourt.findMany({
    include: { memberships: true },
  })
  console.log(`🏪 Existing food courts: ${foodCourts.length}`)

  // 3. Check existing restaurants
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, name: true, slug: true },
  })
  console.log(`🍽️ Existing restaurants: ${restaurants.length}`, restaurants)

  // 4. If no FoodCourt exists, create one and affiliate restaurants
  let targetFoodCourt = foodCourts[0]
  if (!targetFoodCourt) {
    console.log('Creating default Food Court: "Plaza Gastronómica Central"...')
    targetFoodCourt = await prisma.foodCourt.create({
      data: {
        name: 'Plaza Gastronómica Central',
        slug: 'plaza-central',
        description: 'Espacio gastronómico con las mejores marcas y servicio a la mesa.',
        currency: 'COP',
        isActive: true,
      },
      include: { memberships: true },
    })
    console.log('✅ Created food court:', targetFoodCourt.id)

    // Affiliate existing restaurants
    for (let i = 0; i < restaurants.length; i++) {
      const res = restaurants[i]
      await prisma.foodCourtMembership.upsert({
        where: {
          foodCourtId_restaurantId: {
            foodCourtId: targetFoodCourt.id,
            restaurantId: res.id,
          },
        },
        create: {
          foodCourtId: targetFoodCourt.id,
          restaurantId: res.id,
          orderIndex: i,
          isActive: true,
        },
        update: {},
      })
      console.log(`✅ Affiliated restaurant "${res.name}" to plaza`)
    }

    // Create a couple of sample tables for the food court if none exist
    const existingTables = await prisma.table.findMany({
      where: { foodCourtId: targetFoodCourt.id },
    })
    if (existingTables.length === 0) {
      for (let num = 1; num <= 6; num++) {
        await prisma.table.create({
          data: {
            foodCourtId: targetFoodCourt.id,
            tableNumber: num,
            zone: num <= 3 ? 'Terraza Principal' : 'Salón Central',
          },
        })
      }
      console.log('✅ Created 6 shared tables for plaza')
    }
  }

  // 5. Ensure plaza@demo.com exists
  const fcAdminEmail = 'plaza@demo.com'
  const existingUser = await prisma.user.findUnique({
    where: { email: fcAdminEmail },
  })

  const passwordHash = await bcrypt.hash('password123', 10)

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { email: fcAdminEmail },
      data: {
        role: Role.FOOD_COURT_ADMIN,
        foodCourtId: targetFoodCourt.id,
        passwordHash, // Reset password to ensure login works
        name: 'Admin Plaza Gastronómica',
      },
    })
    console.log('✅ Updated existing user plaza@demo.com to FOOD_COURT_ADMIN:', updated)
  } else {
    const created = await prisma.user.create({
      data: {
        email: fcAdminEmail,
        passwordHash,
        name: 'Admin Plaza Gastronómica',
        role: Role.FOOD_COURT_ADMIN,
        foodCourtId: targetFoodCourt.id,
      },
    })
    console.log('✅ Created user plaza@demo.com with FOOD_COURT_ADMIN:', created)
  }

  // 6. Verify brand_themes table exists and is operational
  const themeCount = await prisma.brandTheme.count()
  console.log(`🎨 Total brand themes in DB: ${themeCount}`)

  console.log('🎉 Production database sync & user seed completed!')
}

main()
  .catch((e) => {
    console.error('Error during verification & seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
