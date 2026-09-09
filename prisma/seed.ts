/**
 * Seed de desarrollo: crea un restaurante de demo con mesas, categorías,
 * productos con modificadores e ingredientes removibles, y usuarios para todos los roles.
 *
 * Ejecutar con: npx prisma db seed
 */

import { PrismaClient, ModifierType, Role, PlanTier, TaxCountry } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // --- 1. Organización Demo (Franquicia) ---
  const org = await prisma.organization.upsert({
    where: { slug: 'grupo-gastronomico-demo' },
    update: {
      name: 'Grupo Gastronómico Demo (Franquicia)',
      plan: PlanTier.PRO,
    },
    create: {
      name: 'Grupo Gastronómico Demo (Franquicia)',
      slug: 'grupo-gastronomico-demo',
      plan: PlanTier.PRO,
    },
  })

  // --- 2. Suscripción SaaS ---
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {
      tier: PlanTier.PRO,
      status: 'active',
    },
    create: {
      organizationId: org.id,
      tier: PlanTier.PRO,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // --- 3. Restaurante Principal ---
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {
      organizationId: org.id,
      currency: 'COP',
    },
    create: {
      slug: 'demo-restaurant',
      name: 'El Rincón Demo - Sede Principal',
      currency: 'COP',
      organizationId: org.id,
    },
  })

  console.log(`✅ Restaurante: ${restaurant.name} (${restaurant.id})`)

  // --- 4. Restaurante Sucursal Secundaria ---
  await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant-norte' },
    update: {
      organizationId: org.id,
      currency: 'COP',
    },
    create: {
      slug: 'demo-restaurant-norte',
      name: 'El Rincón Demo - Sede Norte',
      currency: 'COP',
      organizationId: org.id,
    },
  })

  // --- 5. Configuración Fiscal ---
  await prisma.taxConfig.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      country: TaxCountry.CO,
      currency: 'COP',
      currencySymbol: '$',
      vatRate: 0.19,
      vatEnabled: true,
      serviceChargeRate: 0.10,
      serviceChargeEnabled: true,
      legalName: 'El Rincón Demo S.A.S.',
      taxId: '900.123.456-7',
      address: 'Calle 93 # 12-45, Bogotá',
      phone: '+57 300 123 4567',
      email: 'facturacion@elrincondemo.com',
      invoicePrefix: 'FV',
      nextInvoiceNumber: 101,
    },
  })

  // --- 5.1 Plaza Gastronómica Demo ---
  const foodCourt = await prisma.foodCourt.upsert({
    where: { slug: 'plaza-central' },
    update: {},
    create: {
      name: 'Plaza Gastronómica Central',
      slug: 'plaza-central',
      description: 'Espacio gastronómico con las mejores marcas y servicio a la mesa.',
      currency: 'COP',
      isActive: true,
      memberships: {
        create: [
          {
            restaurantId: restaurant.id,
            orderIndex: 0,
            isActive: true,
          },
        ],
      },
    },
  })

  // --- 6. Usuarios de Prueba para todos los Roles ---
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const demoUsers = [
    { email: 'superadmin@imenu.co', name: 'Super Admin iMenu', role: Role.SUPERADMIN, resId: null, orgId: null, fcId: null },
    { email: 'franquicia@demo.com', name: 'Laura Franquicia', role: Role.ORG_ADMIN, resId: restaurant.id, orgId: org.id, fcId: null },
    { email: 'plaza@demo.com', name: 'Admin Plaza Gastronómica', role: Role.FOOD_COURT_ADMIN, resId: null, orgId: null, fcId: foodCourt.id },
    { email: 'admin@demo.com', name: 'Admin Demo', role: Role.RESTAURANT_ADMIN, resId: restaurant.id, orgId: org.id, fcId: null },
    { email: 'contador@demo.com', name: 'Camilo Contador', role: Role.ACCOUNTANT, resId: restaurant.id, orgId: org.id, fcId: null },
    { email: 'manager@demo.com', name: 'Mateo Manager', role: Role.MANAGER, resId: restaurant.id, orgId: org.id, fcId: null },
    { email: 'mesero@demo.com', name: 'Carlos Mesero', role: Role.WAITER, resId: restaurant.id, orgId: org.id, fcId: null },
    { email: 'cocina@demo.com', name: 'Chef Cocina', role: Role.KITCHEN, resId: restaurant.id, orgId: org.id, fcId: null },
  ]

  let waiterUser = null
  for (const u of demoUsers) {
    const usr = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hashedPassword,
        name: u.name,
        role: u.role,
        restaurantId: u.resId,
        organizationId: u.orgId,
        foodCourtId: u.fcId,
      },
      create: {
        email: u.email,
        passwordHash: hashedPassword,
        name: u.name,
        role: u.role,
        restaurantId: u.resId,
        organizationId: u.orgId,
        foodCourtId: u.fcId,
      },
    })
    if (u.email === 'mesero@demo.com') waiterUser = usr
    console.log(`✅ Usuario: ${u.email} [${u.role}]`)
  }
  const waiter = waiterUser!

  // --- 7. Mesas ---
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
      update: {
        assignedWaiterId: waiter.id,
      },
      create: {
        restaurantId: restaurant.id,
        tableNumber: t.tableNumber,
        zone: t.zone,
        assignedWaiterId: waiter.id,
      },
    })
  }
  console.log('✅ 5 mesas verificadas')

  // --- 8. Categorías ---
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
  console.log('✅ Categorías verificadas')

  // --- 9. Productos (solo si no existen aún) ---
  const existingProducts = await prisma.product.count({
    where: { restaurantId: restaurant.id },
  })

  if (existingProducts === 0) {
    // Hamburguesa Clásica
    await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: categories['Hamburguesas'],
        name: 'Hamburguesa Clásica',
        description: 'Carne de res 180g, lechuga, jitomate, queso americano y aderezo de la casa.',
        basePrice: 28000.00,
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
                  { name: 'Pan Artesanal', extraPrice: 2000.00 },
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
                  { name: 'Extra Queso', extraPrice: 3500.00 },
                  { name: 'Extra Tocineta', extraPrice: 4500.00 },
                  { name: 'Aguacate', extraPrice: 3000.00 },
                  { name: 'Huevo Frito', extraPrice: 2500.00 },
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
            { name: 'Salsa de la Casa', isRemovable: true },
          ],
        },
      },
    })

    // Alitas BBQ
    await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: categories['Entradas'],
        name: 'Alitas BBQ (6 piezas)',
        description: 'Alitas de pollo con salsa BBQ o Buffalo. Acompañadas de aderezo ranch.',
        basePrice: 22000.00,
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
                ],
              },
            },
          ],
        },
      },
    })

    // Bebidas
    const drinks = [
      { name: 'Limonada Natural', basePrice: 8500.00 },
      { name: 'Cerveza Club Colombia', basePrice: 9500.00 },
      { name: 'Agua Mineral', basePrice: 5000.00 },
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

    console.log('✅ Productos creados')
  }

  const table1 = await prisma.table.findFirst({ where: { restaurantId: restaurant.id, tableNumber: 1 } })
  if (table1) {
    const existingSession = await prisma.tableSession.findFirst({
      where: { tableId: table1.id, status: 'ACTIVE' }
    })
    if (!existingSession) {
      await prisma.tableSession.create({
        data: {
          tableId: table1.id,
          sessionToken: 'demo-session-token-mesa-1',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 7200 * 1000),
        },
      })
      await prisma.table.update({
        where: { id: table1.id },
        data: { status: 'ACTIVE_QR_SESSION' },
      })
    }
  }

  console.log(`
🎉 Seed completado con éxito.
  🏢 Franquicia: Grupo Gastronómico Demo (slug: grupo-gastronomico-demo)
  🍔 Sede: El Rincón Demo (slug: demo-restaurant)
  🔑 Usuarios de prueba: Todos con contraseña "admin123"
     - superadmin@imenu.co [SUPERADMIN]
     - franquicia@demo.com [ORG_ADMIN]
     - admin@demo.com      [RESTAURANT_ADMIN]
     - contador@demo.com   [ACCOUNTANT]
     - manager@demo.com    [MANAGER]
     - mesero@demo.com     [WAITER]
     - cocina@demo.com     [KITCHEN]
  `)
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
