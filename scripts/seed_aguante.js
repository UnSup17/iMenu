/**
 * Script para re-sembrar y sincronizar el menú completo y hotspots de El Aguante.
 * Conexión automática usando la DATABASE_URL configurada en .env o .env.local
 *
 * Uso:
 *   node scripts/seed_aguante.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATALOG = [
  // ── 0. Entradas ──────────────────────────
  {
    cat: 'Entradas',
    name: 'Papas Molotov',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/01_papas_molotov.webp',
    price: 18900,
    desc: 'Papas rústicas, salsa de queso cheddar, guacamole y pico de gallo.',
    page: 0, x: 0.04, y: 0.35, w: 0.44, h: 0.33,
    ingredients: ['Salsa de queso cheddar', 'Guacamole artesanal', 'Pico de gallo', 'Papas rústicas'],
    modifiers: [
      { name: 'Extras', type: 'ADDON', req: false, min: 0, max: 3, options: [{ name: 'Extra Cheddar', price: 3000 }, { name: 'Extra Tocineta', price: 3500 }, { name: 'Extra Guacamole', price: 2500 }] }
    ]
  },
  {
    cat: 'Entradas',
    name: 'Empanadas de Pipián',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/02_empanadas_de_pipian.webp',
    price: 11900,
    desc: '10 empanaditas de pipián tradicionales acompañadas con ají de maní casero.',
    page: 0, x: 0.52, y: 0.35, w: 0.44, h: 0.33,
    ingredients: ['Ají de maní'],
    modifiers: []
  },
  {
    cat: 'Entradas',
    name: 'Papas Chicago',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/03_papas_chicago.webp',
    price: 17900,
    desc: 'Papas a la francesa con trocitos de tocineta y tomate con especias, bañadas con queso.',
    page: 1, x: 0.04, y: 0.02, w: 0.44, h: 0.32,
    ingredients: ['Tocineta picada', 'Tomate especiado', 'Salsa de queso'],
    modifiers: [
      { name: 'Extras', type: 'ADDON', req: false, min: 0, max: 2, options: [{ name: 'Extra Tocineta', price: 3500 }, { name: 'Queso Fundido', price: 3000 }] }
    ]
  },
  {
    cat: 'Entradas',
    name: 'Papas Pork',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/04_papas_pork.webp',
    price: 20900,
    desc: 'Papas a la francesa con queso americano, pulled pork en cocción lenta y cebollín.',
    page: 1, x: 0.52, y: 0.02, w: 0.44, h: 0.32,
    ingredients: ['Pulled pork', 'Queso americano', 'Cebollín fresco'],
    modifiers: [
      { name: 'Extras', type: 'ADDON', req: false, min: 0, max: 2, options: [{ name: 'Extra Pulled Pork', price: 5000 }, { name: 'Extra Queso', price: 3000 }] }
    ]
  },

  // ── 1. Para Comer ─────────────────────────
  {
    cat: 'Para Comer',
    name: 'Hamburguesa de 125 gr',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/05_hamburguesa_de_125_gr.webp',
    price: 18900,
    desc: 'Hamburguesa clásica americana con pan tipo brioche, queso mozzarella, tomate, lechuga y 125 gr de carne de la casa. Acompañada de papas.',
    page: 1, x: 0.04, y: 0.56, w: 0.92, h: 0.09,
    ingredients: ['Lechuga', 'Tomate', 'Queso mozzarella', 'Salsa de la casa'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] },
      { name: 'Adiciones', type: 'ADDON', req: false, min: 0, max: 4, options: [{ name: 'Tocineta crocante', price: 3000 }, { name: 'Queso cheddar', price: 2500 }, { name: 'Cebolla caramelizada', price: 2000 }, { name: 'Huevo frito', price: 2000 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa de 200 gr',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/06_hamburguesa_de_200_gr.webp',
    price: 25500,
    desc: 'Hamburguesa de 200 gr clásica americana con pan tipo brioche, queso mozzarella, tomate y lechuga. Acompañada con papas a la francesa.',
    page: 1, x: 0.04, y: 0.67, w: 0.92, h: 0.09,
    ingredients: ['Lechuga', 'Tomate', 'Queso mozzarella'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] },
      { name: 'Adiciones', type: 'ADDON', req: false, min: 0, max: 4, options: [{ name: 'Tocineta crocante', price: 3000 }, { name: 'Queso cheddar', price: 2500 }, { name: 'Huevo frito', price: 2000 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa El Aguante Grunge',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/07_hamburguesa_el_aguante_grunge.webp',
    price: 37900,
    desc: 'Hamburguesa doble de 250gr asada, con doble queso mozzarella, tocineta, crunch BBQ, chorizo asado, piña o cebolleta dulce, acompañada de papas.',
    page: 1, x: 0.04, y: 0.77, w: 0.92, h: 0.09,
    ingredients: ['Doble queso mozzarella', 'Tocineta', 'Crunch BBQ', 'Chorizo asado', 'Piña o cebolleta dulce'],
    modifiers: [
      { name: 'Dulce', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Con Piña dulce', price: 0 }, { name: 'Con Cebolleta dulce', price: 0 }] },
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa Argentina',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/08_hamburguesa_argentina.webp',
    price: 27900,
    desc: 'Hamburguesa de 150gr de carne al estilo argentino, queso mozzarella, acompañado con aros de cebolla con especias, y papas a la francesa.',
    page: 1, x: 0.04, y: 0.88, w: 0.92, h: 0.09,
    ingredients: ['Aros de cebolla', 'Queso mozzarella', 'Chimichurri argentino'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa Jack Fire',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/09_hamburguesa_jack_fire.webp',
    price: 27900,
    desc: 'Hamburguesa de 150 gr de carne de la casa con Jack Daniel\'s Fire, tocineta caramelizada y queso cheddar, acompañado de papas a la francesa.',
    page: 2, x: 0.04, y: 0.02, w: 0.92, h: 0.09,
    ingredients: ['Tocineta caramelizada Jack Fire', 'Queso cheddar fundido'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa Dark Honey',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/10_hamburguesa_dark_honey.webp',
    price: 32900,
    desc: 'Pan de papa con ajonjolí tostado, salsa Killer, carne de res 100% artesanal, queso Monterrey Jack, mermelada de chorizo premium con Jack Daniels Honey, queso philadelphia y tocineta crujiente.',
    page: 2, x: 0.04, y: 0.12, w: 0.92, h: 0.09,
    ingredients: ['Salsa Killer', 'Mermelada de chorizo con Jack Honey', 'Queso philadelphia', 'Tocineta crujiente'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Hamburguesa La Rock\'N Pork',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/11_hamburguesa_la_rock_n_pork.webp',
    price: 32900,
    desc: 'Hamburguesa de 125gr de carne, pan Mollete de Antequera con semillas de amapola, mayonesa del huerto, queso Monterrey Jack, pulled pork ahumado con BBQ y tocineta crujiente.',
    page: 2, x: 0.04, y: 0.23, w: 0.92, h: 0.09,
    ingredients: ['Pulled pork con salsa BBQ', 'Queso Monterrey Jack', 'Mayonesa del huerto', 'Tocineta crujiente'],
    modifiers: [
      { name: 'Término de Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Cocida', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas a la francesa', price: 0 }, { name: 'Cascos de papa', price: 0 }] }
    ]
  },
  {
    cat: 'Para Comer',
    name: 'Sándwich El Aguante Glam',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/12_sandwich_el_aguante_glam.webp',
    price: 26900,
    desc: 'Sándwich con pan brioche de papa, queso, tomate, lechuga, jamón de cerdo, maduritos, tocineta, champiñones y proteína (cerdo o pollo), acompañado con rústicas de la casa.',
    page: 2, x: 0.04, y: 0.33, w: 0.92, h: 0.09,
    ingredients: ['Lechuga', 'Tomate', 'Maduritos', 'Tocineta', 'Champiñones', 'Jamón de cerdo'],
    modifiers: [
      { name: 'Proteína', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Pechuga de Pollo', price: 0 }, { name: 'Lomo de Cerdo', price: 0 }] },
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas Rústicas', price: 0 }, { name: 'Papas Francesas', price: 0 }] }
    ]
  },

  // ── 2. Veggis del Aguante ──────────────────────────
  {
    cat: 'Veggis del Aguante',
    name: 'Hamburguesa Veggi',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/13_hamburguesa_veggi.webp',
    price: 22900,
    desc: 'Hamburguesa con pan brioche de papa, queso mozzarella, tomate, lechuga, medallón de arveja con trigo y rústicas de la casa.',
    page: 2, x: 0.04, y: 0.65, w: 0.92, h: 0.09,
    ingredients: ['Lechuga', 'Tomate', 'Queso mozzarella'],
    modifiers: [
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas Rústicas', price: 0 }, { name: 'Papas Francesas', price: 0 }] }
    ]
  },
  {
    cat: 'Veggis del Aguante',
    name: 'Sándwich Veggi',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/14_sandwich_veggi.webp',
    price: 22900,
    desc: 'Sándwich con pan brioche de papa, queso mozzarella, tomate, lechuga, maduritos, champiñones salteados y rústicas de la casa.',
    page: 2, x: 0.04, y: 0.76, w: 0.92, h: 0.09,
    ingredients: ['Lechuga', 'Tomate', 'Maduritos', 'Champiñones'],
    modifiers: [
      { name: 'Acompañamiento', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Papas Rústicas', price: 0 }, { name: 'Papas Francesas', price: 0 }] }
    ]
  },

  // ── 3. Fuertes del Aguante ────────────────
  {
    cat: 'Fuertes del Aguante',
    name: 'Lomo Fino de Res',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/15_lomo_fino_de_res.webp',
    price: 39900,
    desc: '250 gr de lomo fino de res a término, acompañado de papas rústicas con especias, chimichurri y ensalada de la casa.',
    page: 3, x: 0.04, y: 0.20, w: 0.92, h: 0.58,
    ingredients: ['Chimichurri de la casa', 'Ensalada fresca', 'Papas rústicas'],
    modifiers: [
      { name: 'Término de la Carne', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Término Medio', price: 0 }, { name: '3/4', price: 0 }, { name: 'Bien Asado', price: 0 }] }
    ]
  },
  {
    cat: 'Fuertes del Aguante',
    name: 'Ternera Argentina',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/16_ternera_argentina.webp',
    price: 31900,
    desc: '225 gr de ternera asada bañada con chimichurri acompañada de rústicas con especias y ensalada de la casa.',
    page: 4, x: 0.04, y: 0.15, w: 0.92, h: 0.45,
    ingredients: ['Chimichurri artesanal', 'Ensalada fresca', 'Papas rústicas'],
    modifiers: []
  },
  {
    cat: 'Fuertes del Aguante',
    name: 'Costilla a la BBQ',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/17_costilla_a_la_bbq.webp',
    price: 33900,
    desc: '300 gr de costilla St. Louis bañada en salsa BBQ, acompañados de papas rústicas y ensalada de la casa.',
    page: 4, x: 0.04, y: 0.85, w: 0.92, h: 0.14,
    ingredients: ['Salsa BBQ artesanal', 'Ensalada de la casa', 'Papas rústicas'],
    modifiers: []
  },
  {
    cat: 'Fuertes del Aguante',
    name: 'Parrillada',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/18_parrillada.webp',
    price: 40500,
    desc: '350 gr de cortes de pollo, cerdo y lomo caracho de res asados con chorizos mixtos; acompañados con rústicas y ensalada de la casa.',
    page: 5, x: 0.04, y: 0.15, w: 0.92, h: 0.50,
    ingredients: ['Cortes de pollo', 'Lomo de cerdo', 'Lomo de res', 'Chorizo mixto', 'Chimichurri'],
    modifiers: []
  },
  {
    cat: 'Fuertes del Aguante',
    name: 'Suprema de Pollo',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/19_suprema_de_pollo.webp',
    price: 30900,
    desc: '225 gr pechuga de pollo asado con chimichurri, papas rústicas y ensalada de la casa.',
    page: 6, x: 0.04, y: 0.05, w: 0.92, h: 0.30,
    ingredients: ['Pechuga de pollo asada', 'Chimichurri', 'Ensalada de la casa', 'Papas rústicas'],
    modifiers: []
  },

  // ── 4. Para Picar ──────────────────────────────────
  {
    cat: 'Para Picar',
    name: 'Rústicas de Pollo',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/20_rusticas_de_pollo.webp',
    price: 23900,
    desc: '300 gr de rústicas con tocineta, queso crema y filete de pollo de 120 gr asado en trocitos.',
    page: 6, x: 0.04, y: 0.38, w: 0.92, h: 0.09,
    ingredients: ['Tocineta', 'Queso crema', 'Trocitos de pollo'],
    modifiers: []
  },
  {
    cat: 'Para Picar',
    name: 'Rústicas Indie',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/21_rusticas_indie.webp',
    price: 26900,
    desc: '300 gr de papas rústicas con tocineta, 70g de pollo y res asados en trocitos, y queso fundido.',
    page: 6, x: 0.04, y: 0.49, w: 0.92, h: 0.09,
    ingredients: ['Tocineta', 'Trocitos de pollo', 'Trocitos de res', 'Queso fundido'],
    modifiers: []
  },
  {
    cat: 'Para Picar',
    name: 'Picada 400gr',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/22_picada_400gr.webp',
    price: 42900,
    desc: '400 gr asados de pollo, res y cerdo con alitas, chorizo, maduros, tomate, mazorca, limón y papas rústicas.',
    page: 6, x: 0.04, y: 0.59, w: 0.92, h: 0.09,
    ingredients: ['Pollo asado', 'Carne de res', 'Cerdo', 'Alitas', 'Chorizo', 'Maduros', 'Mazorca'],
    modifiers: []
  },

  // ── 5. Alitas ──────────────────────────────────────
  {
    cat: 'Alitas',
    name: 'Alitas BBQ',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/23_alitas_bbq.webp',
    price: 24900,
    desc: 'Alitas de pollo bañadas en salsa BBQ de la casa. Todas las alitas vienen acompañadas con papas, palitos de apio y zanahoria.',
    page: 7, x: 0.04, y: 0.02, w: 0.92, h: 0.09,
    ingredients: ['Apio', 'Zanahoria', 'Salsa BBQ'],
    modifiers: [
      { name: 'Porción', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'X8 Unidades', price: 0 }, { name: 'X16 Unidades', price: 21600 }] }
    ]
  },
  {
    cat: 'Alitas',
    name: 'Alitas Miel Mostaza',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/24_alitas_miel_mostaza.webp',
    price: 24900,
    desc: 'Alitas de pollo bañadas en salsa miel mostaza artesanal. Acompañadas con papas, palitos de apio y zanahoria.',
    page: 7, x: 0.04, y: 0.12, w: 0.92, h: 0.09,
    ingredients: ['Apio', 'Zanahoria', 'Salsa Miel Mostaza'],
    modifiers: [
      { name: 'Porción', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'X8 Unidades', price: 0 }, { name: 'X16 Unidades', price: 21600 }] }
    ]
  },
  {
    cat: 'Alitas',
    name: 'Alitas Picantes',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/25_alitas_picantes.webp',
    price: 24900,
    desc: 'Alitas de pollo bañadas en salsa picante búfalo. Acompañadas con papas, palitos de apio y zanahoria.',
    page: 7, x: 0.04, y: 0.24, w: 0.92, h: 0.09,
    ingredients: ['Apio', 'Zanahoria', 'Salsa Picante Búfalo'],
    modifiers: [
      { name: 'Porción', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'X8 Unidades', price: 0 }, { name: 'X16 Unidades', price: 21600 }] }
    ]
  },
  {
    cat: 'Alitas',
    name: 'Alitas Jack Daniel\'s',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/26_alitas_jack_daniel_s.webp',
    price: 24900,
    desc: 'Alitas de pollo bañadas en reducción BBQ Jack Daniel\'s. Acompañadas con papas, palitos de apio y zanahoria.',
    page: 7, x: 0.04, y: 0.36, w: 0.92, h: 0.09,
    ingredients: ['Apio', 'Zanahoria', 'Salsa BBQ Jack Daniel\'s'],
    modifiers: [
      { name: 'Porción', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'X8 Unidades', price: 0 }, { name: 'X16 Unidades', price: 21600 }] }
    ]
  },

  // ── 6. Bebidas ────────────────────────────
  {
    cat: 'Bebidas',
    name: 'Infusiones Frutales',
    price: 9000,
    desc: 'Infusión aromática de frutas deshidratadas.',
    page: 7, x: 0.04, y: 0.68, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Frutos Amarillos', price: 0 }, { name: 'Frutos Rojos', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Granizados',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/28_granizados.webp',
    price: 12900,
    desc: 'Delicioso granizado espeso y refrescante.',
    page: 7, x: 0.52, y: 0.68, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Café', price: 0 }, { name: 'Oreo', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Hatsu',
    price: 9000,
    desc: 'Té Hatsu en botella en sus presentaciones favoritas.',
    page: 7, x: 0.04, y: 0.79, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Variedad', type: 'SINGLE_SELECT', req: false, min: 0, max: 1, options: [{ name: 'Blanco', price: 0 }, { name: 'Negro', price: 0 }, { name: 'Rojo', price: 0 }, { name: 'Azul', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Mr. Té',
    price: 6500,
    desc: 'Refrescante té listo para tomar.',
    page: 7, x: 0.52, y: 0.79, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Limón', price: 0 }, { name: 'Durazno', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Hervidos',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/31_hervidos.webp',
    price: 12900,
    desc: 'Tradicional hervido caliente a base de frutas y licor.',
    page: 8, x: 0.04, y: 0.02, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Frutos Rojos', price: 0 }, { name: 'Frutos Amarillos', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Soda',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/34_soda_de_frutos_amarillos.webp',
    price: 6000,
    desc: 'Soda clásica bien fría con hielo y limón.',
    page: 8, x: 0.52, y: 0.02, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Soda de Frutos Verdes',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/33_soda_de_frutos_verdes.webp',
    price: 9500,
    desc: 'Refrescante soda saborizada con manzana verde y kiwi.',
    page: 8, x: 0.04, y: 0.12, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Soda de Frutos Amarillos',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/34_soda_de_frutos_amarillos.webp',
    price: 9500,
    desc: 'Refrescante soda con maracuyá y naranja.',
    page: 8, x: 0.52, y: 0.12, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Soda de Frutos Rojos',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/50_frutos_rojos.webp',
    price: 9500,
    desc: 'Refrescante soda con fresas, moras y arándanos.',
    page: 8, x: 0.04, y: 0.24, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Jugos Naturales',
    price: 8500,
    desc: 'Jugo de fruta 100% natural preparado al instante.',
    page: 8, x: 0.52, y: 0.24, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [
      { name: 'Fruta', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Mora', price: 0 }, { name: 'Mango', price: 0 }, { name: 'Lulo', price: 0 }, { name: 'Maracuyá', price: 0 }] },
      { name: 'Base', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'En Agua', price: 0 }, { name: 'En Leche', price: 1000 }] }
    ]
  },
  {
    cat: 'Bebidas',
    name: 'Jugo de Frutos Rojos',
    price: 8500,
    desc: 'Mezcla artesanal de frutos rojos naturales.',
    page: 8, x: 0.04, y: 0.35, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [
      { name: 'Base', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'En Agua', price: 0 }, { name: 'En Leche', price: 1000 }] }
    ]
  },
  {
    cat: 'Bebidas',
    name: 'Limonada Natural',
    price: 8500,
    desc: 'Limonada clásica fresca recién exprimida.',
    page: 8, x: 0.52, y: 0.35, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Limonada de Coco',
    price: 12500,
    desc: 'Cremosa y refrescante limonada con leche de coco.',
    page: 8, x: 0.04, y: 0.47, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Limonada Cereza',
    price: 11500,
    desc: 'Limonada dulce y fresca con reducción de cerezas.',
    page: 8, x: 0.52, y: 0.47, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Limonada Piña - Hierbabuena',
    price: 11500,
    desc: 'Limonada fresca con pulpa de piña y hojas de hierbabuena maceradas.',
    page: 8, x: 0.04, y: 0.58, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Coca Cola',
    price: 6500,
    desc: 'Coca Cola 400ml bien fría.',
    page: 8, x: 0.52, y: 0.58, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Tipo', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Original', price: 0 }, { name: 'Sin Azúcar / Light', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Botella de Agua',
    price: 6000,
    desc: 'Agua pura sin gas en botella.',
    page: 8, x: 0.04, y: 0.69, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Brownie con Helado',
    price: 12500,
    desc: 'Brownie de chocolate caliente con bola de helado de vainilla y salsa de chocolate.',
    page: 8, x: 0.52, y: 0.69, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: []
  },
  {
    cat: 'Bebidas',
    name: 'Malteada',
    price: 12900,
    desc: 'Cremosa malteada preparada con helado artesanal.',
    page: 8, x: 0.04, y: 0.79, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Chocolate', price: 0 }, { name: 'Vainilla', price: 0 }, { name: 'Fresa', price: 0 }, { name: 'Oreo', price: 0 }] }]
  },
  {
    cat: 'Bebidas',
    name: 'Gaseosa',
    price: 6500,
    desc: 'Gaseosa nacional 400ml.',
    page: 8, x: 0.52, y: 0.79, w: 0.44, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Sabor', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Manzana Postobón', price: 0 }, { name: 'Colombiana', price: 0 }] }]
  },

  // ── 7. Cocktails ───────────────────────────────────
  {
    cat: 'Cocktails',
    name: 'Orgasmo',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/47_orgasmo.webp',
    price: 25900,
    desc: 'Baileys, licor de café y crema de leche.',
    page: 9, x: 0.04, y: 0.19, w: 0.92, h: 0.09,
    ingredients: ['Baileys', 'Licor de café', 'Crema de leche'],
    modifiers: []
  },

  // ── 8. Mojitos ─────────────────────────────────────
  {
    cat: 'Mojitos',
    name: 'Mojito Clásico',
    price: 25900,
    desc: 'Ron Havana Club 3 años, hierbabuena, limón y soda.',
    page: 9, x: 0.04, y: 0.37, w: 0.92, h: 0.09,
    ingredients: ['Ron Havana Club 3 años', 'Hierbabuena fresca', 'Limón', 'Soda'],
    modifiers: []
  },
  {
    cat: 'Mojitos',
    name: 'Mojito Maracuyá',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/53_maracuya.webp',
    price: 26900,
    desc: 'Ron Havana Club 3 años, hierbabuena, limón, soda y maracuyá.',
    page: 9, x: 0.04, y: 0.48, w: 0.92, h: 0.09,
    ingredients: ['Ron Havana Club 3 años', 'Hierbabuena fresca', 'Limón', 'Maracuyá', 'Soda'],
    modifiers: []
  },
  {
    cat: 'Mojitos',
    name: 'Mojito Frutos Rojos',
    price: 26900,
    desc: 'Ron Havana Club 3 años, hierbabuena, limón, soda y frutos rojos macerados.',
    page: 9, x: 0.04, y: 0.58, w: 0.92, h: 0.09,
    ingredients: ['Ron Havana Club 3 años', 'Hierbabuena fresca', 'Limón', 'Frutos rojos', 'Soda'],
    modifiers: []
  },
  {
    cat: 'Mojitos',
    name: 'Mojito Beer',
    imageUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/products/51_beer.webp',
    price: 27900,
    desc: 'Ron Havana Club 3 años, hierbabuena, limón, soda y Coronita (cerveza).',
    page: 9, x: 0.04, y: 0.68, w: 0.92, h: 0.09,
    ingredients: ['Ron Havana Club 3 años', 'Cerveza Coronita', 'Hierbabuena', 'Limón'],
    modifiers: []
  },

  // ── 9. Margaritas ────────────────────────
  {
    cat: 'Margaritas',
    name: 'Margarita Clásica',
    price: 25900,
    desc: 'Tequila, limón y sal de la casa.',
    page: 9, x: 0.04, y: 0.86, w: 0.92, h: 0.09,
    ingredients: ['Tequila', 'Limón recién exprimido', 'Sal escarchada'],
    modifiers: []
  },
  {
    cat: 'Margaritas',
    name: 'Margarita Maracuyá',
    price: 26900,
    desc: 'Tequila, limón, sal de la casa y maracuyá.',
    page: 10, x: 0.04, y: 0.02, w: 0.92, h: 0.08,
    ingredients: ['Tequila', 'Pulpa de maracuyá', 'Limón', 'Sal'],
    modifiers: []
  },
  {
    cat: 'Margaritas',
    name: 'Margarita Blue',
    price: 26900,
    desc: 'Tequila, curacao azul, limón y sal de la casa.',
    page: 10, x: 0.04, y: 0.11, w: 0.92, h: 0.08,
    ingredients: ['Tequila', 'Curacao Azul', 'Limón', 'Sal'],
    modifiers: []
  },

  // ── 10. Gin Tonic ─────────────────────────────────
  {
    cat: 'Gin Tonic',
    name: 'Gin Tonic Clásico',
    price: 27900,
    desc: 'Gin, agua tónica premium y rodaja de naranja fresca.',
    page: 10, x: 0.04, y: 0.28, w: 0.92, h: 0.08,
    ingredients: ['Gin', 'Agua Tónica', 'Naranja fresca'],
    modifiers: []
  },
  {
    cat: 'Gin Tonic',
    name: 'Gin Tonic Frutos Rojos',
    price: 28900,
    desc: 'Gin, agua tónica premium y frutos rojos.',
    page: 10, x: 0.04, y: 0.38, w: 0.92, h: 0.08,
    ingredients: ['Gin', 'Agua Tónica', 'Frutos rojos macerados'],
    modifiers: []
  },

  // ── 11. Submarinos ────────────────────────────────
  {
    cat: 'Submarinos',
    name: 'Submarino de Tequila',
    price: 17500,
    desc: 'Cerveza nacional con shot invertido de tequila.',
    page: 10, x: 0.04, y: 0.57, w: 0.92, h: 0.08,
    ingredients: ['Cerveza Nacional', 'Shot de Tequila'],
    modifiers: []
  },
  {
    cat: 'Submarinos',
    name: 'Submarino de Vodka',
    price: 17500,
    desc: 'Cerveza nacional con shot invertido de vodka.',
    page: 10, x: 0.04, y: 0.66, w: 0.92, h: 0.08,
    ingredients: ['Cerveza Nacional', 'Shot de Vodka'],
    modifiers: []
  },

  // ── 12. Licores ───────────────────────────
  {
    cat: 'Licores',
    name: 'Jack Daniel\'s Old No. 7',
    price: 22000,
    desc: 'Whiskey americano Tennessee Jack Daniel\'s.',
    page: 11, x: 0.04, y: 0.04, w: 0.92, h: 0.09,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Botella (750ml)', price: 198000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Buchanan\'s 12 Años',
    price: 28000,
    desc: 'Whisky escocés añejado 12 años.',
    page: 11, x: 0.04, y: 0.17, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Media (375ml)', price: 127000 }, { name: 'Botella (750ml)', price: 262000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Olmeca Reposado',
    price: 18000,
    desc: 'Tequila mexicano reposado en barricas de roble.',
    page: 11, x: 0.04, y: 0.40, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Media (375ml)', price: 64000 }, { name: 'Botella (750ml)', price: 137000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Jägermeister',
    price: 20000,
    desc: 'Licor de 56 hierbas alemán bien frío.',
    page: 11, x: 0.04, y: 0.62, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Botella (700ml)', price: 175000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Ron Viejo de Caldas',
    price: 13000,
    desc: 'Ron tradicional colombiano carta de oro.',
    page: 11, x: 0.04, y: 0.82, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Media (375ml)', price: 39000 }, { name: 'Botella (750ml)', price: 77000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Havana Club 3 Años',
    price: 16000,
    desc: 'Ron blanco cubano añejo.',
    page: 12, x: 0.04, y: 0.02, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Botella (750ml)', price: 104000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Absolut Vodka',
    price: 18000,
    desc: 'Vodka sueco destilado de trigo.',
    page: 12, x: 0.04, y: 0.17, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Shot', price: 0 }, { name: 'Media (375ml)', price: 64000 }, { name: 'Botella (750ml)', price: 137000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Aguardiente Caucano Verde',
    price: 37000,
    desc: 'Aguardiente Caucano tradicional sin azúcar.',
    page: 12, x: 0.04, y: 0.39, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Media (375ml)', price: 0 }, { name: 'Botella (750ml)', price: 33000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Aguardiente Caucano Azul',
    price: 42000,
    desc: 'Aguardiente Caucano tradicional con azúcar.',
    page: 12, x: 0.04, y: 0.52, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Media (375ml)', price: 0 }, { name: 'Botella (750ml)', price: 33000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Vino Tinto',
    price: 11000,
    desc: 'Vino tinto de la casa.',
    page: 12, x: 0.04, y: 0.72, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Copa', price: 0 }, { name: 'Botella (750ml)', price: 37000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Gato Negro Cabernet',
    price: 16000,
    desc: 'Vino chileno Cabernet Sauvignon.',
    page: 12, x: 0.04, y: 0.82, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: [{ name: 'Presentación', type: 'SINGLE_SELECT', req: true, min: 1, max: 1, options: [{ name: 'Copa', price: 0 }, { name: 'Botella (750ml)', price: 64000 }] }]
  },
  {
    cat: 'Licores',
    name: 'Vino Caliente',
    price: 16000,
    desc: 'Copa de vino caliente especiado con canela y cítricos.',
    page: 13, x: 0.04, y: 0.02, w: 0.92, h: 0.10,
    ingredients: [],
    modifiers: []
  }
];

async function main() {
  console.log('🔄 Sincronizando catálogo y hotspots de El Aguante...');

  const rest = await prisma.restaurant.findUnique({ where: { slug: 'el-aguante' } });
  if (!rest) {
    console.error('❌ Restaurante El Aguante no encontrado.');
    process.exit(1);
  }

  const pageImages = Array.from({ length: 14 }, (_, i) => 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/menu/page-' + (i + 1) + '.webp');
  await prisma.restaurant.update({
    where: { id: rest.id },
    data: {
      pdfUrl: 'https://wc6gbkw73cstorlb.public.blob.vercel-storage.com/restaurants/e47db8bc-b22d-11f1-9c00-9a51728b478c/menu/menu.pdf',
      pdfPageImages: pageImages
    }
  });

  const categories = await prisma.category.findMany({ where: { restaurantId: rest.id } });
  const catMap = new Map(categories.map(c => [c.name.trim().toLowerCase(), c.id]));

  await prisma.pdfHotspot.deleteMany({ where: { restaurantId: rest.id } });

  let updated = 0;
  for (let idx = 0; idx < CATALOG.length; idx++) {
    const item = CATALOG[idx];
    const catId = catMap.get(item.cat.trim().toLowerCase());
    if (!catId) continue;

    let product = await prisma.product.findFirst({
      where: { restaurantId: rest.id, name: item.name }
    });

    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          categoryId: catId,
          description: item.desc,
          basePrice: item.price,
          orderIndex: idx,
          isAvailable: true,
          imageUrl: item.imageUrl || null
        }
      });
    } else {
      product = await prisma.product.create({
        data: {
          restaurantId: rest.id,
          categoryId: catId,
          name: item.name,
          description: item.desc,
          basePrice: item.price,
          orderIndex: idx,
          isAvailable: true,
          imageUrl: item.imageUrl || null
        }
      });
    }

    await prisma.pdfHotspot.create({
      data: {
        restaurantId: rest.id,
        productId: product.id,
        page: item.page,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h
      }
    });
    updated++;
  }

  const count = await prisma.product.count({ where: { restaurantId: rest.id } });
  const hsCount = await prisma.pdfHotspot.count({ where: { restaurantId: rest.id } });
  console.log(`✅ ¡Base de datos lista! Productos: ${count} | Hotspots: ${hsCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
