/**
 * Seed de desarrollo: crea un restaurante de demo con mesas, categorías,
 * productos con modificadores e ingredientes removibles.
 *
 * Ejecutar con: npx prisma db seed
 */

import { PrismaClient, ModifierType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // --- Restaurante ---
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      slug: 'demo-restaurant',
      name: 'El Rincón Demo',
      currency: 'MXN',
    },
  })

  console.log(`✅ Restaurante: ${restaurant.name} (${restaurant.id})`)

  // --- Admin User ---
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'admin@demo.com',
      passwordHash: hashedPassword,
      name: 'Admin Demo',
      role: 'RESTAURANT_ADMIN',
    },
  })
  console.log(`✅ Admin: ${adminUser.email}`)

  // --- Waiter ---
  const waiter = await prisma.user.upsert({
    where: { email: 'mesero@demo.com' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'mesero@demo.com',
      passwordHash: hashedPassword,
      name: 'Carlos Mesero',
      role: 'WAITER',
    },
  })

  // --- Mesas ---
  const tableData = [
    { tableNumber: 1, zone: 'Salón Principal' },
    { tableNumber: 2, zone: 'Salón Principal' },
    { tableNumber: 3, zone: 'Terraza' },
    { tableNumber: 4, zone: 'Terraza' },
    { tableNumber: 5, zone: 'Bar' },
  ]

  for (const t of tableData) {
    await prisma.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: t.tableNumber,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        tableNumber: t.tableNumber,
        zone: t.zone,
        assignedWaiterId: waiter.id,
      },
    })
  }
  console.log('✅ 5 mesas creadas')

  // --- Categorías ---
  const categoriesData = [
    { name: 'Entradas', orderIndex: 0 },
    { name: 'Hamburguesas', orderIndex: 1 },
    { name: 'Bebidas', orderIndex: 2 },
    { name: 'Postres', orderIndex: 3 },
  ]

  const categories: Record<string, string> = {}
  for (const cat of categoriesData) {
    const existing = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: cat.name },
    })
    const created = existing ?? await prisma.category.create({
      data: { restaurantId: restaurant.id, ...cat },
    })
    categories[cat.name] = created.id
  }
  console.log('✅ 4 categorías creadas')

  // --- Productos ---

  // Hamburguesa Clásica con modificadores completos
  const burger = await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: categories['Hamburguesas'],
      name: 'Hamburguesa Clásica',
      description: 'Carne de res 180g, lechuga, jitomate, queso americano y aderezo de la casa.',
      basePrice: 145.00,
      isAvailable: true,
      modifierGroups: {
        create: [
          {
            name: 'Término de Carne',
            type: ModifierType.SINGLE_SELECT,
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            options: {
              create: [
                { name: 'Término 3/4', extraPrice: 0 },
                { name: 'Término Bien Cocido', extraPrice: 0 },
                { name: 'Término Medio', extraPrice: 0 },
              ],
            },
          },
          {
            name: 'Tipo de Pan',
            type: ModifierType.SINGLE_SELECT,
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            options: {
              create: [
                { name: 'Pan Brioche', extraPrice: 0 },
                { name: 'Pan Artesanal', extraPrice: 12.00 },
                { name: 'Pan Integral', extraPrice: 0 },
              ],
            },
          },
          {
            name: 'Extras',
            type: ModifierType.ADDON,
            isRequired: false,
            minSelect: 0,
            maxSelect: 5,
            options: {
              create: [
                { name: 'Extra Queso', extraPrice: 18.00 },
                { name: 'Extra Tocino', extraPrice: 22.00 },
                { name: 'Aguacate', extraPrice: 25.00 },
                { name: 'Huevo Estrellado', extraPrice: 20.00 },
                { name: 'Chile Jalapeño', extraPrice: 8.00 },
              ],
            },
          },
        ],
      },
      ingredients: {
        create: [
          { name: 'Lechuga', isRemovable: true },
          { name: 'Jitomate', isRemovable: true },
          { name: 'Cebolla', isRemovable: true },
          { name: 'Pepinillos', isRemovable: true },
          { name: 'Aderezo de la Casa', isRemovable: true },
        ],
      },
    },
  })

  // Hamburguesa BBQ
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: categories['Hamburguesas'],
      name: 'Hamburguesa BBQ',
      description: 'Carne de res 200g, salsa BBQ artesanal, aros de cebolla y queso gouda.',
      basePrice: 165.00,
      modifierGroups: {
        create: [
          {
            name: 'Término de Carne',
            type: ModifierType.SINGLE_SELECT,
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            options: {
              create: [
                { name: 'Término 3/4', extraPrice: 0 },
                { name: 'Término Bien Cocido', extraPrice: 0 },
              ],
            },
          },
        ],
      },
      ingredients: {
        create: [
          { name: 'Aros de Cebolla', isRemovable: true },
          { name: 'Salsa BBQ', isRemovable: true },
        ],
      },
    },
  })

  // Entrada - Alitas
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: categories['Entradas'],
      name: 'Alitas BBQ (6 piezas)',
      description: 'Alitas de pollo con salsa BBQ o Buffalo. Acompañadas de aderezo ranch.',
      basePrice: 99.00,
      modifierGroups: {
        create: [
          {
            name: 'Salsa',
            type: ModifierType.SINGLE_SELECT,
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            options: {
              create: [
                { name: 'BBQ', extraPrice: 0 },
                { name: 'Buffalo', extraPrice: 0 },
                { name: 'Mango Habanero', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  })

  // Bebidas
  const drinks = [
    { name: 'Agua Natural', basePrice: 25.00 },
    { name: 'Refresco', basePrice: 30.00 },
    { name: 'Limonada Natural', basePrice: 45.00 },
    { name: 'Cerveza Nacional', basePrice: 55.00 },
  ]

  for (const drink of drinks) {
    await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: categories['Bebidas'],
        name: drink.name,
        basePrice: drink.basePrice,
      },
    })
  }

  // Postre
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: categories['Postres'],
      name: 'Brownie con Helado',
      description: 'Brownie de chocolate caliente con bola de helado de vainilla.',
      basePrice: 75.00,
      modifierGroups: {
        create: [
          {
            name: 'Sabor de Helado',
            type: ModifierType.SINGLE_SELECT,
            isRequired: false,
            minSelect: 0,
            maxSelect: 1,
            options: {
              create: [
                { name: 'Vainilla', extraPrice: 0 },
                { name: 'Chocolate', extraPrice: 0 },
                { name: 'Fresa', extraPrice: 0 },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('✅ Productos creados con modificadores')

  const tables = await prisma.table.findMany({ where: { restaurantId: restaurant.id } })
  const table1 = tables[0]

  // Crear una sesión activa en la mesa 1 para facilitar pruebas
  await prisma.tableSession.create({
    data: {
      tableId: table1.id,
      sessionToken: 'demo-session-token-mesa-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 7200 * 1000), // 2 horas
    },
  })

  await prisma.table.update({
    where: { id: table1.id },
    data: { status: 'ACTIVE_QR_SESSION' },
  })

  console.log(`
✅ Seed completado con éxito.

  🍔 Restaurante: El Rincón Demo (slug: demo-restaurant)
  🔑 Admin: admin@demo.com / admin123
  🔑 Mesero: mesero@demo.com / admin123
  🪑 5 mesas creadas
  🎟  Sesión de prueba en Mesa 1:
      URL: /menu/demo-restaurant/${table1.id}?token=demo-session-token-mesa-1
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
