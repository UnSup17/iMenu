import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentación técnica — iMenu',
  description: 'Documentación completa de iMenu: rutas, funcionalidades, estado de implementación, observaciones técnicas y oportunidades de mejora.',
}

/* ─── Data ───────────────────────────────────────────────────────────────── */

type Status = 'done' | 'partial' | 'missing'

interface RouteEntry {
  route: string
  view: string
  status: Status
  roles: string
  notes?: string
}

interface ModuleSection {
  id: string
  phase: string
  phaseColor: string
  icon: string
  title: string
  description: string
  routes: RouteEntry[]
  observations: string[]
  missing: string[]
  opportunities: string[]
}

const modules: ModuleSection[] = [
  {
    id: 'auth',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🔐',
    title: 'Autenticación, Seguridad & Auditoría',
    description: 'Sistema de autenticación NextAuth v5 multi-rol, verificación 2FA TOTP, lista blanca de IPs y registro exhaustivo de auditoría de seguridad para cumplimiento corporativo.',
    routes: [
      { route: '/login', view: 'Login con email/contraseña, verificación 2FA (TOTP) y Google OAuth', status: 'done', roles: 'Público' },
      { route: '/register', view: 'Registro público: creación de Organización, Restaurante, Admin y Trial SaaS 14 días', status: 'done', roles: 'Público' },
      { route: '/register/verify-email', view: 'Pantalla de espera y confirmación de email con token', status: 'done', roles: 'Público' },
      { route: '/api/auth/verify-email', view: 'Validación de token de email y redirección a onboarding', status: 'done', roles: 'Sistema' },
      { route: '/forgot-password', view: 'Recuperación de contraseña con envío de token seguro', status: 'done', roles: 'Público' },
      { route: '/reset-password', view: 'Establecimiento de nueva contraseña con token temporal', status: 'done', roles: 'Público' },
      { route: '/onboarding', view: 'Wizard interactivo de 4 pasos para bienvenida y configuración inicial', status: 'done', roles: 'ADMIN' },
      { route: '/dashboard/settings/team', view: 'Gestión de equipo, invitaciones por rol y revocación', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/accept-invite', view: 'Aceptación de invitación de staff y configuración de perfil', status: 'done', roles: 'Público (invitados)' },
      { route: '/dashboard/settings/security', view: 'Activación/desactivación de 2FA TOTP con código QR y Authenticator', status: 'done', roles: 'Todos los usuarios' },
      { route: '/dashboard/settings/security/audit', view: 'Visor de auditoría de seguridad y accesos con IP, User-Agent, eventos y filtros', status: 'done', roles: 'ADMIN, ORG_ADMIN, SUPERADMIN' },
      { route: '/api/settings/ip-restriction', view: 'GET/PUT configuración de lista blanca de IPs para terminales de caja y KDS', status: 'done', roles: 'ADMIN' },
      { route: '/api/audit-logs', view: 'GET registro de eventos de seguridad (login, 2FA, plan changes, ip checks)', status: 'done', roles: 'ADMIN, SUPERADMIN' },
      { route: '/api/superadmin/impersonate', view: 'Sesión de impersonación temporal para SUPERADMIN con barra fija de advertencia', status: 'done', roles: 'SUPERADMIN' },
      { route: '/api/auth/[...nextauth]', view: 'Handler central de NextAuth v5 con JWT y adapters', status: 'done', roles: 'Sistema' },
    ],
    observations: [
      'NextAuth v5 integrado con soporte para credenciales, Google OAuth condicional y verificación TOTP en 2 pasos.',
      'Flujo de registro transaccional que crea Organization, Restaurant, User (RESTAURANT_ADMIN), TaxConfig y Subscription (trial 14d).',
      'Infraestructura de email con nodemailer (lib/email.ts) con fallback en consola para desarrollo.',
      '2FA estándar TOTP compatible con Google Authenticator, Authy y 1Password.',
      'Invitaciones de staff con tokens temporales de 72 horas y roles granulares (WAITER, KITCHEN, MANAGER, ACCOUNTANT).',
      'Mecanismo de impersonación seguro para SUPERADMIN con banner de estado y salida instantánea.',
      'Auditoría de seguridad y accesos (Fase 9) persistida en AuditLog registrando IP, User-Agent, eventos de autenticación, cambios de plan y 2FA.',
      'Restricción de acceso por IP (Fase 9) configurable para proteger terminales operativas de caja y KDS en red local.',
    ],
    missing: [
      'Soporte para llaves de seguridad físicas (WebAuthn / Passkeys / FIDO2).',
      'Detección de anomalías en inicios de sesión por geolocalización o viajes imposibles.',
    ],
    opportunities: [
      'Login unificado con SSO empresarial (SAML 2.0 / Okta / Azure AD) para grandes cadenas hoteleras y franquicias.',
      'Políticas de contraseñas configurables por organización (longitud mínima, rotación forzada cada 90 días).',
    ],
  },
  {
    id: 'menu-public',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '📱',
    title: 'Menú QR (Vista del Cliente)',
    description: 'La interfaz que ven los clientes del restaurante al escanear el código QR de su mesa o navegar la carta pública. Incluye carrito colaborativo, pedidos en tiempo real, división de cuenta y portal de reservaciones con pre-orden.',
    routes: [
      { route: '/menu/[slug]/[tableSlug]', view: 'Menú digital del restaurante con carrito, pedidos en vivo, tracker y soporte dual (cuadrícula y PDF interactivo pre-renderizado en WebP <1.8s)', status: 'done', roles: 'Público (clientes)' },
      { route: '/menu/[slug]', view: 'Modo solo visualización web de la carta (sin sesión de mesa) con páginas WebP servidas desde Vercel Blob CDN', status: 'done', roles: 'Público' },
      { route: '/menu/[slug]/reservar', view: 'Portal público del comensal para reservar mesa con selección de fecha, hora, personas, pre-orden gastronómica opcional y ticket digital', status: 'done', roles: 'Público' },
      { route: '/api/menu/[slug]', view: 'GET productos, categorías, modificadores y páginas WebP pre-renderizadas del restaurante', status: 'done', roles: 'Público' },
      { route: '/api/orders', view: 'POST pedido a cocina y GET órdenes confirmadas de la mesa actual', status: 'done', roles: 'Público (sesión de mesa)' },
      { route: '/api/kitchen/load', view: 'GET cálculo de carga de cocina y tiempo estimado de preparación en minutos', status: 'done', roles: 'Público / Sistema' },
      { route: '/api/feedback', view: 'POST calificación de experiencia de servicio y GET métricas agregadas', status: 'done', roles: 'Público (POST) / ADMIN (GET)' },
      { route: '/api/payments/split', view: 'POST procesamiento y división de cuenta individual por comensal en pasarela de pago (Wompi, MercadoPago, Tarjeta)', status: 'done', roles: 'Público (clientes)' },
      { route: '/api/loyalty', view: 'POST acreditación de puntos de lealtad por consumo y calificación; GET consulta de puntos y nivel', status: 'done', roles: 'Público / Clientes' },
      { route: '/waiter/[tableId]', view: 'Llamada al mesero desde QR secundario o botón flotante', status: 'done', roles: 'Público (clientes)' },
      { route: '/sw.js', view: 'Service Worker de Web Push: recepción de notificaciones push en segundo plano y apertura de comanda', status: 'done', roles: 'Público / Sistema' },
    ],
    observations: [
      'Pre-renderizado WebP en Servidor & Vercel Blob CDN: las cartas en PDF se transforman a páginas WebP (~41 KB por página) servidas desde la red perimetral de Vercel Blob, reduciendo el tiempo de carga móvil de más de 30 segundos con PDF.js a menos de 1.8 segundos.',
      'Hotspots Táctiles & Modal de Platillo Interactiva: cada producto en el menú visual cuenta con coordenadas relativas (X, Y, W, H) que abren una modal interactiva estilo Menüpp con fotografía en alta resolución servida desde CDN, modificadores, ingredientes removibles y botón para compartir platillo.',
      'Portal de reservaciones públicas (/menu/[slug]/reservar) que permite al comensal reservar y armar un carrito de pre-orden de comida para despacho directo al llegar al restaurante.',
      'Persistencia 100% Serverless: las URLs de las páginas se almacenan como JSON en Restaurant.pdfPageImages, desacoplando completamente el frontend del sistema de archivos local y garantizando compatibilidad con el entorno de solo lectura de Vercel.',
      'Las sesiones de mesa son colaborativas y sincronizadas en tiempo real vía Socket.IO entre comensales.',
      'Historial de rondas de pedidos accesible desde el menú con stepper de estado (RECEIVED ➔ PREPARING ➔ READY ➔ DELIVERED).',
      'División de cuenta individual por comensal en pasarela de pago digital (Wompi, MercadoPago, Tarjeta) con 4 modalidades: Mi Consumo, Partes Iguales, Selección de Platos o Cuenta Completa, con propina voluntaria y comprobante digital.',
      'Programa de lealtad y puntos para clientes frecuentes integrado al registro de calificación (50 pts base + 1 pt por cada $1.000 COP consumidos), niveles (Bronce, Plata, Oro, Platino) y cupones de recompensa automáticos.',
      'Soporte completo de Web Push API con banner interactivo para que el comensal active avisos en su celular con 1 toque y reciba alerta cuando su pedido esté listo.',
      'Alertas en vivo con chime armónico (Web Audio API) y notificaciones de navegador (Web Notification API) al cambiar de estado el pedido.',
      'Internacionalización (i18n) completa con selector fluido para Español (es), English (en) y Português (pt).',
      'Indicador de tiempo estimado de espera en cocina según cantidad de pedidos activos y ritmo de preparación.',
      'Modo solo visualización web (/menu/[slug]) ideal para menús en entrada del local o consulta previa sin mesa.',
      'Módulo de calificación de servicio (1 a 5 estrellas, tags rápidos y comentarios) persistido en base de datos.',
      'Disponibilidad de ingredientes y stock actualizada en tiempo real vía Socket.IO.',
    ],
    missing: [
      'Sugerencias de maridaje o upselling inteligente impulsado por IA según los ítems del carrito.',
      'Recomendaciones hiper-personalizadas basadas en restricciones dietarias guardadas en perfil del cliente.',
    ],
    opportunities: [
      'Lector de cartas sonoro con síntesis de voz (Text-to-Speech) para accesibilidad universal y comensales con discapacidad visual.',
      'Calculador nutricional interactivo (calorías y macronutrientes) en tiempo real al agregar platos al carrito.',
    ],
  },
  {
    id: 'tables',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🪑',
    title: 'Mesas, Plano & Reservaciones',
    description: 'Gestión integral del salón: plano SVG interactivo, editor gráfico drag-and-drop, predictor inteligente de rotación/desocupación de mesas (7 etapas), mensajería WhatsApp/SMS y pre-orden con despacho automático a cocina (KDS).',
    routes: [
      { route: '/dashboard/tables', view: 'Tablero 4-en-1: Plano SVG interactivo, Editor Drag & Drop, Vista Cuadrícula y Agenda de Reservaciones con Pre-orden', status: 'done', roles: 'ADMIN, MANAGER, WAITER' },
      { route: '/api/tables', view: 'CRUD de mesas con capacidad, morfología (redonda/cuadrada/rectangular), coordenadas y generación de QR', status: 'done', roles: 'ADMIN' },
      { route: '/api/tables/layout', view: 'PUT guardado en batch de coordenadas (X, Y) y dimensiones del plano drag-and-drop', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/tables/[tableId]', view: 'PATCH/DELETE edición de zona, capacidad, morfología y eliminación de mesa', status: 'done', roles: 'ADMIN' },
      { route: '/api/tables/[id]/session', view: 'GET/DELETE sesión activa de una mesa y cálculo de tiempo transcurrido', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/reservations', view: 'GET/POST gestión y creación de reservaciones públicas y de staff con pre-orden serializada', status: 'done', roles: 'ADMIN, MANAGER, WAITER, Público' },
      { route: '/api/reservations/[id]', view: 'PATCH/DELETE transición de estados con inyección automática de orden en KDS al sentar al comensal (SEATED)', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/reservations/notify', view: 'POST envío de confirmación y recordatorios de reserva vía WhatsApp / SMS', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/reservations/reminders', view: 'GET/POST worker cron de escaneo y envío de recordatorios 2h antes con idempotencia', status: 'done', roles: 'Sistema' },
      { route: '/plaza/[slug]', view: 'Vista pública del plano de mesas del restaurante', status: 'done', roles: 'Público' },
    ],
    observations: [
      'Plano del salón interactivo renderizado en SVG vectorial con sillas posicionadas según capacidad y morfología (redonda, cuadrada, rectangular).',
      'Table Turnover Predictor (lib/tables/turnover-predictor.ts): motor heurístico que evalúa 7 etapas operativas (FREE, ORDERING, WAITING_FOOD, DINING, SOBREMESA, BILL_PENDING, OVERDUE) calculando minutos remanentes y hora proyectada de liberación de mesas.',
      'Mensajería WhatsApp & SMS integrada (lib/notifications/messaging.ts) para confirmación inmediata de reservas y recordatorio automático 2 horas antes.',
      'Despacho automático a cocina (KDS): al sentar al comensal (SEATED), si la reserva tiene pre-orden, se genera instantáneamente una comanda urgente en prisma.order.',
      'Editor gráfico Drag-and-Drop integrado con cuadrícula magnética (grid snap), panel de propiedades y guardado en batch vía API.',
      'Métricas de rotación y aforo en tiempo real: porcentaje de ocupación, comensales sentados, mesas libres y alertas de sobretiempo.',
      'Los QR se generan con un slug único por restaurante+mesa.',
    ],
    missing: [
      'Integración bidireccional externa con agregadores comerciales de reservas (OpenTable, Resy, TheFork).',
      'Lista de espera digital (Waitlist) en recepción para comensales que llegan sin reservación en horas pico.',
    ],
    opportunities: [
      'Asignación algorítmica óptima de mesas basada en patrones históricos de consumo y duración de grupo.',
      'Plano 3D interactivo con Three.js para recorridos virtuales del restaurante.',
    ],
  },
  {
    id: 'orders',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🛒',
    title: 'Pedidos & Panel de Cocina',
    description: 'Sistema integral de gestión de comandas en tiempo real: panel del mesero/administrador con filtros avanzados, historial del día, métricas de rendimiento, pantalla de cocina dedicada (KDS Tablet Fullscreen) e integración con datáfonos físicos.',
    routes: [
      { route: '/dashboard/orders', view: 'Panel de comandas: 3 tabs (En Vivo, Historial con búsqueda y Métricas de cocina)', status: 'done', roles: 'ADMIN, MANAGER, WAITER, KITCHEN' },
      { route: '/dashboard/kds', view: 'Pantalla de cocina dedicada (KDS) para tablets a pantalla completa con cronómetros y checklist táctil', status: 'done', roles: 'ADMIN, MANAGER, KITCHEN' },
      { route: '/kds', view: 'KDS Fullscreen Tablet: Vista independiente sin barra de administración ni sidebar para fijación en pared', status: 'done', roles: 'ADMIN, MANAGER, KITCHEN' },
      { route: '/dashboard/settings/printers', view: 'Gestor de impresoras térmicas ESC/POS por estación (cocina, barra, caja) y test print de red TCP', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/hardware/printers', view: 'GET/POST/PUT/DELETE configuración de impresoras de red por estación con IP y puerto 9100', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/hardware/print-escpos', view: 'POST envío de tickets y comandas en buffer binario ESC/POS por socket TCP directo', status: 'done', roles: 'ADMIN, WAITER, KITCHEN, Sistema' },
      { route: '/api/hardware/pos-terminal', view: 'POST procesamiento y simulación de cobro con datáfonos físicos (Ingenico, Verifone, Pax, Redeban, Credibanco)', status: 'done', roles: 'ADMIN, WAITER, CAJA' },
      { route: '/api/orders', view: 'GET (lista de órdenes activas) + POST (crear comanda y emitir WebSocket)', status: 'done', roles: 'ADMIN, WAITER, Público' },
      { route: '/api/orders/[id]', view: 'GET detalle + PATCH transición de estados (RECEIVED→PREPARING→READY→DELIVERED) y prioridad', status: 'done', roles: 'ADMIN, MANAGER, WAITER, KITCHEN' },
      { route: '/api/orders/[id]/items/[itemId]', view: 'PATCH toggle de ítem completado en checklist táctil de cocina', status: 'done', roles: 'ADMIN, MANAGER, KITCHEN' },
      { route: '/api/orders/history', view: 'GET historial diario con búsqueda libre y filtros por mesero, hora, producto y estado', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/kitchen/stats', view: 'GET estadísticas de tiempos promedio de preparación, tasa a tiempo y cuellos de botella', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/kitchen/load', view: 'GET cálculo de carga en cocina y tiempo estimado de entrega', status: 'done', roles: 'Público / Sistema' },
      { route: '/api/push/subscribe', view: 'GET llave pública VAPID y POST registro de suscripción Web Push vinculada a la mesa', status: 'done', roles: 'Público / Sistema' },
    ],
    observations: [
      'Pantalla de cocina KDS táctil dedicada (/dashboard/kds y ruta independiente /kds) con soporte para tablets y modo Fullscreen nativo.',
      'Ruta /kds dedicada para tablets montadas en cocina sin sidebar ni barras de administración, con botón rápido de toggle a pantalla completa.',
      'Notificaciones Web Push automáticas: al marcar una comanda como READY en cocina, el sistema envía push al comensal vía Service Worker.',
      'Cronómetros en vivo (MM:SS) en cada comanda con cambio dinámico de color según antigüedad (<12m verde, 12-20m ámbar, >20m rojo).',
      'Sistema de alarmas audibles estridentes con Web Audio API y vibración táctil para ambientes ruidosos de cocina.',
      'Checklists táctiles plato por plato en la tablet de cocina con sincronización instantánea vía WebSockets.',
      'Priorización de órdenes (URGENTE / NORMAL) con ordenamiento prioritario al inicio de la cola.',
      'Historial diario completo con buscador predictivo y métricas consolidadas de facturación y despacho.',
      'Al cancelar una orden, el stock de inventario se restaura automáticamente.',
      'Soporte completo para impresión térmica ESC/POS de red en /api/hardware/print-escpos y lib/hardware/esc-pos-printer.ts: buffer binario en TypeScript enviado por TCP socket al puerto 9100 (Epson TM-T20/T88, Bixolon SRP-350, RONGTA).',
      'Gestor visual de impresoras por estación (/dashboard/settings/printers) con prueba de conexión instantánea y test print de comprobación.',
      'Ruteo multi-estación de cocina (CALIENTE, FRIA, BAR, POSTRES, PARRILLA, EMPAQUE) con filtrado dinámico y badges en KDS.',
      'Filtro dinámico de comandas por zona de mesas (ej. Terraza, Salón Principal, Barra) integrado directamente en KdsViewClient.',
      'Integración con datáfonos y terminales POS físicas vía /api/hardware/pos-terminal con protocolos TCP/Serial y simulador.',
      'Algoritmo dinámico de predicción de tiempo (ETA) en /api/kitchen/load combinando historial real de 24h + prepTimeMinutes por producto + carga activa.',
    ],
    missing: [
      'Spooler de impresión local offline con almacenamiento en búfer para contingencias de corte de red.',
      'Integración con básculas comerciales RS-232 / USB para tarificación de platos por peso en vivo.',
    ],
    opportunities: [
      'Comandero por voz para estaciones calientes con manos ocupadas.',
      'Enrutamiento predictivo y balanceo dinámico de carga entre estaciones culinarias según tiempo de cocción.',
    ],
  },
  {
    id: 'menu-admin',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🍽️',
    title: 'Catálogo del Menú (Admin)',
    description: 'Gestión integral del catálogo del restaurante: categorías, productos, variantes de tamaño escalonadas, modificadores, ingredientes removibles, traducción automática con IA y menú PDF interactivo.',
    routes: [
      { route: '/dashboard/menu', view: 'Gestor integral: Drag & Drop, Carga masiva CSV, variantes de tamaño, alérgenos y precios dinámicos', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/menu-pdf', view: 'Configuración y previsualización del menú en PDF con hotspots interactivos', status: 'done', roles: 'ADMIN' },
      { route: '/dashboard/additions', view: 'Gestión de adicionales/extras reutilizables con costo y recetas', status: 'done', roles: 'ADMIN' },
      { route: '/dashboard/special-offers', view: 'Ofertas especiales con vigencia, calendario y descuento', status: 'done', roles: 'ADMIN' },
      { route: '/api/menu/upload', view: 'POST subida centralizada de fotografías de platos a Vercel Blob CDN (restaurants/{id}/products/...) con fallback local', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/pdf/upload', view: 'POST/DELETE subida del PDF canónico a Vercel Blob y limpieza sincronizada de páginas WebP en Restaurant.pdfPageImages', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/menu/import', view: 'POST importación masiva CSV con detección y creación automática de categorías', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/export', view: 'GET descarga de plantilla oficial y exportación completa de menú a CSV', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/reorder', view: 'PUT persistencia transaccional de reorden Drag & Drop de categorías y platos', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/translate', view: 'POST traducción multilingüe automatizada de platos y categorías a inglés y portugués con IA', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/purge-cache', view: 'POST purga inmediata de la caché del menú en memoria y CDN ante cambios de carta', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/generate-description', view: 'POST generador de redacciones culinarias atractivas con ChatGPT / IA Culinaria', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/menu/categories', view: 'CRUD de categorías regulares y ofertas especiales', status: 'done', roles: 'ADMIN' },
      { route: '/api/menu/products', view: 'CRUD de productos con alérgenos, variantes de tamaño, precios programados y orden', status: 'done', roles: 'ADMIN' },
      { route: '/api/additions', view: 'CRUD de adicionales y adiciones por producto/categoría', status: 'done', roles: 'ADMIN' },
      { route: '/api/special-offers', view: 'CRUD de ofertas especiales y menús temporales', status: 'done', roles: 'ADMIN' },
    ],
    observations: [
      'Servicio unificado de almacenamiento (lib/storage.ts): gestión centralizada de subidas a Vercel Blob Storage con CDN global y fallback en public/uploads/ para desarrollo local.',
      'Estructura canónica multitenant de almacenamiento: restaurants/{restaurantId}/menu/ para el PDF y páginas pre-renderizadas, restaurants/{restaurantId}/products/ para fotos de platillos y restaurants/{restaurantId}/branding/ para logotipos.',
      'Herramientas CLI de migración y pre-renderizado: scripts automatizados (scripts/migrate_assets_to_vercel_blob.js y scripts/prerender_menu_pdf.js) para transformar PDFs a WebP y sembrar catálogos masivos.',
      'Gestión de variantes de tamaño y porciones (pequeño/mediano/grande, media/entera) con precios escalonados directos en ProductForm (lib/menu/sizes.ts).',
      'Traducción automática multilingüe con IA integrada en /api/menu/translate para internacionalizar el menú a inglés y portugués en 1 clic.',
      'Purga instantánea de caché en /api/menu/purge-cache al actualizar platos o categorías.',
      'Carga masiva e importación/exportación de catálogo vía CSV con plantilla oficial descargable y auto-creación de categorías faltantes.',
      'Reordenamiento fluido con Drag-and-Drop nativo y botones de ajuste fino para categorías y platos persistidos en base de datos (orderIndex).',
      'Subida directa de imágenes de platos con editor de recorte integrado en Canvas (proporciones 1:1, 4:3 y 16:9) y compresión WebP.',
      'Programación de precios dinámicos (Happy Hour, promociones de fin de semana, franja horaria y etiqueta personalizada).',
      'Gestión de alérgenos sanitarios conforme a normativa europea y FDA (14 alérgenos estándar con badges visuales e iconografía).',
      'Asistente gastronómico con IA (OpenAI / Chef Engine heurístico) para redactar automáticamente descripciones sensoriales irresistibles.',
      'El campo isAvailable se sincroniza automáticamente cuando se agotan materias primas del inventario.',
    ],
    missing: [
      'Sincronización bidireccional de catálogo con sistemas POS legacy (Toast, Micros, Square).',
      'Control de disponibilidad horaria por turnos (desayuno, almuerzo, cena) en platos específicos.',
    ],
    opportunities: [
      'Análisis de rentabilidad y matriz Boston Consulting Group (BCG) de platos estrella vs. platos perro según ventas.',
      'Generación de fotos publicitarias de alta resolución asistida por IA a partir de ingredientes y descripción.',
    ],
  },
  {
    id: 'branding',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🎨',
    title: 'Branding & Configuración del Restaurante',
    description: 'Studio completo de identidad visual y marca: simulador interactivo multipantalla, 8 presets gastronómicos, generador de armonías HSL, Google Fonts pairings, White-Label, generador de Brand Kit, gestión de PWA icons y conexión de dominios personalizados con verificación DNS CNAME y Caddy On-Demand TLS.',
    routes: [
      { route: '/dashboard/brand', view: 'Studio de Marca v2.5 Live: 6 tabs (Presets, Armonía HSL, Tipografías, Estilos, Media y Dominio) con previsualización en vivo', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/preview/brand', view: 'Previsualizador interactivo móvil en vivo con código QR de prueba para escanear en smartphone antes de publicar', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/brand', view: 'GET/PUT gestión de BrandTheme con herencia corporativa, propuestas de sede y White-Label', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/brand/domain', view: 'GET/POST/DELETE configuración, verificación CNAME y desvinculación de dominio personalizado', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/brand/domain/check-tls', view: 'GET hook de validación Caddy On-Demand TLS para emisión y renovación automática de certificados SSL Let’s Encrypt', status: 'done', roles: 'Infraestructura / Caddy' },
      { route: '/api/brand/icons', view: 'GET/POST editor y generador automatizado de favicons y paquetes de iconos PWA (192x192, 512x512, apple-touch-icon)', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/brand/brand-kit', view: 'GET exportación y renderizado dinámico del Brand Kit oficial en HTML/PDF con paleta cromática HEX/RGB/HSL, tipografía y reglas de logo', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
    ],
    observations: [
      'Previsualizador interactivo en tiempo real con alternancia de dispositivos (📱 Smartphone 360px vs. 💻 Tablet 520px) y 3 pantallas simuladas: Menú general, Modal de plato con modificadores y Carrito de checkout.',
      'Ruta dedicada /preview/brand con código QR dinámico para escanear con la cámara del celular y probar la experiencia de marca en tiempo real antes de guardar.',
      'Colección de 8 plantillas gastronómicas de autor (Fine Dining, Burger Craft, Trattoria Napolitana, Sushi Nikkei, Specialty Coffee, Taquería, Organic Greens y Chocolatería).',
      'Generador algorítmico inteligente de armonía cromática HSL basado en el color primario con contrastes accesibles y fondos con tinte premium.',
      'Catálogo de maridajes tipográficos (Font Pairings) sugeridos e integración con Google Fonts (Inter, Playfair Display, Montserrat, Poppins, Outfit, Cinzel, Syne, etc.).',
      'Estilos de botón configurables (Píldora / Cápsula, Suave Redondeado, Sharp Minimalista) y control de desenfoque Glassmorphism.',
      'Modo White-Label Corporativo: elimina referencias a iMenu del menú comensal y de las tirillas impresas de facturación térmica.',
      'Gestor de dominios propios con verificación en vivo de registros DNS CNAME y guía paso a paso para Cloudflare, GoDaddy y Namecheap.',
      'Integración nativa con Caddy On-Demand TLS (/api/brand/domain/check-tls) para provisión automática e instantánea de certificados SSL sin intervención manual.',
      'Generador de Brand Kit (/api/brand/brand-kit) exportable con códigos de color, directrices tipográficas y especificaciones para imprenta.',
      'Gobernanza corporativa jerárquica con soporte para franquicias y plazas gastronómicas.',
    ],
    missing: [
      'Generador de paletas y estilos a partir del análisis por visión computacional de una fotografía del restaurante.',
      'Soporte para múltiples temas estacionales programados (Halloween, Navidad, San Valentín) con activación automática por calendario.',
    ],
    opportunities: [
      'Generación de material promocional impreso (afiches de mesa, banners de bienvenida, tent cards) listo para imprenta en CMYK.',
      'Integración con Figma API para sincronización bidireccional de tokens de diseño gastronómicos.',
    ],
  },
  {
    id: 'food-courts',
    phase: 'Fase 2',
    phaseColor: '#f59e0b',
    icon: '🏪',
    title: 'Food Courts / Plazas',
    description: 'Soporte completo para plazas gastronómicas donde múltiples restaurantes comparten el mismo espacio físico. El cliente puede ordenar de varios locales en una sola transacción unificada, y el operador de la plaza dispone de un dashboard consolidado con métricas, comisiones y liquidaciones exportables por restaurante.',
    routes: [
      { route: '/dashboard/food-courts', view: 'Lista de plazas de la organización con acceso rápido', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/dashboard/food-courts/[id]', view: 'Panel de gestión de plaza: 5 pestañas (Mesas en Vivo, Dashboard Consolidado, Comisiones & Liquidación, Locales, Configuración)', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/plaza/[slug]', view: 'Lobby público del food court: mosaico de restaurantes miembros con estado', status: 'done', roles: 'Público' },
      { route: '/plaza/[slug]/[tableId]', view: 'Vista de comensal en mesa: menús de todos los restaurantes + carrito unificado multi-restaurante', status: 'done', roles: 'Público' },
      { route: '/api/food-courts', view: 'GET (lista) + POST (crear plaza)', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/api/food-courts/[id]', view: 'GET (detalle) + PUT (actualizar) + DELETE', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/api/food-courts/[id]/memberships', view: 'POST (agregar restaurante) + PATCH (reordenar / actualizar comisiones) + DELETE', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/api/food-courts/[id]/reports', view: 'GET: métricas consolidadas de plaza, ranking de locales, comisiones y órdenes recientes', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/api/food-courts/[id]/payments', view: 'GET/POST pagos por restaurante dentro de una sesión de mesa', status: 'done', roles: 'ADMIN' },
      { route: '/api/food-courts/[id]/settlements/export', view: 'GET exportación de liquidaciones y comisiones a CSV con BOM UTF-8 y desglose de cuotas fijas y porcentuales', status: 'done', roles: 'ORG_ADMIN, FOOD_COURT_ADMIN' },
      { route: '/api/orders (POST multi-restaurante)', view: 'Detecta ítems de múltiples restaurantes y crea órdenes atómicas por cocina en una sola llamada', status: 'done', roles: 'Público' },
    ],
    observations: [
      'El carrito del comensal puede contener ítems de múltiples restaurantes simultáneamente. Al confirmar, el sistema agrupa por restaurantId y crea una Order separada por cocina de forma atómica.',
      'Cada restaurante recibe su comanda en KDS/cocina vía WebSocket de forma independiente (event: new:order). El comensal recibe confirmación unificada y seguimiento Web Push individual.',
      'Las comisiones se configuran en FoodCourtMembership: commissionPercentage (% sobre ventas brutas) y commissionFixedFee (cuota fija por orden). Ambas son aditivas.',
      'El cálculo de liquidación: Neto Restaurante = Ventas Brutas - (Ventas × %comisión) - (Órdenes × cuotaFija).',
      'Exportación directa de liquidaciones en CSV con BOM UTF-8 desde la pestaña de Comisiones y Liquidaciones (/api/food-courts/[id]/settlements/export).',
      'El Dashboard Consolidado soporta filtros de período: Hoy, 7 Días, 30 Días e Histórico.',
      'La vista del comensal muestra un banner informativo "Pedido Unificado Multi-Restaurante" y pills de restaurante en cada ítem del carrito.',
      'FoodCourtMembership tiene orderIndex para controlar el orden del mosaico de restaurantes en la vista pública.',
      'El editor de mapa de piso cuenta con soporte para coordenadas x/y, formas y rotación para diagramación física.',
    ],
    missing: [
      'Reservaciones de mesas unificadas en la plaza con integración a sistemas externos (OpenTable, Resy).',
      'Dispersión y liquidación bancaria automatizada (Split Payout / Escrow) hacia las cuentas de cada restaurante miembro.',
    ],
    opportunities: [
      'Pago unificado al final de la sesión: el comensal paga el total consolidado de todos los locales en una sola transacción agregada.',
      'Portal de autoservicio para restaurantes miembros con acceso restringido a sus propias liquidaciones y métricas.',
      'Analytics comparativos entre plazas de la misma organización (benchmarking cruzado de rendimiento).',
    ],
  },
  {
    id: 'billing',
    phase: 'Fase 1',
    phaseColor: '#10b981',
    icon: '🧾',
    title: 'Facturación & Pagos',
    description: 'Módulo completo de facturación y cobros: cierre de mesas, división de cuenta (split bill), propina configurable, datáfonos físicos POS, pasarelas digitales QR, emisión de tickets térmicos, cotizaciones proforma, exportación masiva ZIP y configuración fiscal por restaurante.',
    routes: [
      { route: '/dashboard/billing', view: 'Hub: KPIs del día, facturas recientes, estado de mesas activas', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/invoices', view: 'Listado de facturas con filtros por fecha, estado, método de pago y botón de reimpresión térmica en 1 clic', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/invoices/[id]', view: 'Detalle de factura: ítems, pagos, anulación, impresión, emisión DIAN', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/close-table/[tableId]', view: 'Wizard de cierre de mesa: división de cuenta (Split Bill), propina voluntaria, múltiples medios de pago y emisión', status: 'done', roles: 'ADMIN, MANAGER, WAITER' },
      { route: '/dashboard/billing/config', view: 'Configuración fiscal: país, IVA, cargo por servicio, datos legales, formato de tickets', status: 'done', roles: 'ADMIN' },
      { route: '/api/invoices', view: 'GET (lista) + POST (crear factura desde tabla)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/invoices/[id]', view: 'GET detalle + PATCH (registrar pago, anular)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/invoices/[id]/notify', view: 'POST envío del comprobante de factura por correo electrónico', status: 'done', roles: 'ADMIN, WAITER, Sistema' },
      { route: '/api/billing/proforma', view: 'GET/POST generación y descarga de factura proforma o cotización previa para eventos y grupos', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/billing/daily-summary', view: 'GET resumen consolidado de ventas, medios de pago y arqueo de caja del turno o día', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/payments/split', view: 'POST procesamiento y distribución de pagos divididos por comensal o partes iguales', status: 'done', roles: 'ADMIN, WAITER' },
      { route: '/api/hardware/pos-terminal', view: 'GET/POST integración y orquestación con datáfonos físicos POS (Ingenico, Verifone, Pax, Redeban, Credibanco)', status: 'done', roles: 'ADMIN, WAITER, Sistema' },
      { route: '/api/export/invoices', view: 'GET exportación de facturas a CSV/Excel con UTF-8 BOM y filtros de estado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/export/invoices/zip', view: 'GET descarga masiva en lote de facturas electrónicas y comprobantes en archivo comprimido ZIP', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/billing/tax-config', view: 'GET/PUT configuración fiscal del restaurante', status: 'done', roles: 'ADMIN' },
      { route: '/api/pdf', view: 'Generación de PDF de factura descargable', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El IVA (19% por defecto en Colombia) se calcula automáticamente al crear la factura.',
      'División de cuenta (Split Bill): comensales pueden pagar por partes iguales o por ítems consumidos con cálculo automático de saldos restantes.',
      'Propina voluntaria configurable (0%, 10%, 15%, 20% y monto personalizado) integrada directamente en el wizard de cierre.',
      'Reimpresión rápida de tickets térmicos directamente desde la tabla de facturas cerradas con el botón TicketPrintButton.',
      'Integración con datáfonos físicos POS (/api/hardware/pos-terminal): soporte para Ingenico, Verifone, Pax, Redeban y Credibanco vía TCP/Serial/Simulador.',
      'Pasarelas de pago digitales (Wompi, Bold, MercadoPago, Stripe) soportadas para cobro con QR en mesa en SplitBillPaymentModal.',
      'Emisión de facturas proforma y cotizaciones previas para eventos corporativos o reservas de grupos grandes.',
      'Descarga masiva de facturas electrónicas y comprobantes en ZIP comprimido (/api/export/invoices/zip).',
      'Exportación a Excel/CSV con BOM UTF-8 (\\uFEFF) desde el listado de facturas para contabilidad.',
      'Envío rápido de factura por WhatsApp (link wa.me con desglose estilizado) y por email desde el detalle.',
      'La impresión térmica ESC/POS funciona vía WebUSB en Chrome/Edge o por red TCP directa al puerto 9100.',
      'El consecutivo de facturas (FV-0001) es auto-incremental por restaurante y se maneja atómicamente para evitar duplicados.',
      'La anulación de facturas requiere motivo y cambia el estado a VOID sin eliminar el registro.',
    ],
    missing: [
      'Múltiples cajas registradoras por sucursal con control independiente de prefijos y consecutivo DIAN asignado por terminal.',
      'Retenciones fiscales aplicables a clientes corporativos (ReteFuente, ReteICA, ReteIVA) discriminadas en la factura.',
    ],
    opportunities: [
      'Autopago biométrico y Apple Pay / Google Pay directo mediante Web Payments SDK en el navegador del comensal.',
      'Emisión de billeteras de fidelización y gift cards recargables con saldo canjeable en el cierre de mesa.',
    ],
  },
  {
    id: 'inventory',
    phase: 'Fase 1',
    phaseColor: '#10b981',
    icon: '📦',
    title: 'Inventario',
    description: 'Control de insumos, recetas por producto, compras a proveedores, ajustes manuales, mermas, auditoría de conteo físico, transferencias entre sedes y alertas de stock bajo en tiempo real.',
    routes: [
      { route: '/dashboard/inventory', view: 'Hub: stock actual, alertas de bajo inventario, movimientos recientes', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/[id]', view: 'Detalle de ítem: stock, movimientos, edición', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/movements', view: 'Historial completo de movimientos de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/new', view: 'Formulario de creación de nuevo ítem de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/recipes', view: 'Editor de recetas: asignar ingredientes y cantidades a cada producto', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/suppliers', view: 'Gestión formal de proveedores, contactos comerciales y catálogos de insumos', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/purchase-orders', view: 'Órdenes de compra: ciclo DRAFT→ORDERED→RECEIVED con actualización automática de stock', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/physical-count', view: 'Auditoría de inventario físico: planilla de conteo ciego, registro de discrepancias y ajuste atómico', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/transfers', view: 'Transferencias entre sucursales de la organización con tracking de despacho y recepción', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/api/inventory', view: 'CRUD de ítems de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/[id]', view: 'GET/PATCH/DELETE ítem individual', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/movements', view: 'GET historial + POST ajuste/compra manual', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/suppliers', view: 'CRUD de proveedores con métricas de compras y catálogo asociado', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/purchase-orders', view: 'GET/POST/PATCH órdenes de compra a proveedores con recepción de insumos', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/physical-count', view: 'GET/POST conciliación de conteo físico vs stock teórico', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/transfers', view: 'GET/POST transferencias de insumos entre sedes con control de stock', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/api/export/inventory', view: 'GET exportación completa de existencias, umbrales y valorización total a CSV/Excel', status: 'done', roles: 'ADMIN, MANAGER' },
    ],
    observations: [
      'El descuento de stock se ejecuta atómicamente en la misma transacción de base de datos que el cambio de estado de la orden a RECEIVED.',
      'Módulo de Compras & Proveedores (Fase 7): ciclo formal de aprovisionamiento con órdenes de compra en estados DRAFT, ORDERED, RECEIVED y actualización automática de stock.',
      'Conteo físico de inventario (Fase 7): planilla de verificación ciega para auditoría en bodega con cálculo de mermas y ajuste transaccional automático.',
      'Transferencias multisede (Fase 7): traspaso controlado de materias primas entre sucursales de la misma organización con verificación de existencias.',
      'Exportación completa a Excel / CSV con BOM UTF-8 y cálculo automático de valorización total monetaria del stock.',
      'Alertas automáticas por correo electrónico a administradores y gerentes cuando el stock cae al mínimo de seguridad.',
      'Si el stock de un ingrediente llega a 0, el sistema calcula los productos afectados y emite product:unavailable por Socket.IO.',
      'El costo unitario de cada insumo permite calcular el costo de ventas (COGS) para el P&L.',
      'Las unidades soportadas: KG, GRAM, LITER, ML, UNIT, PORTION.',
    ],
    missing: [
      'Predicción algorítmica de reposición basada en velocidad de rotación histórica de recetas.',
      'Integración con lectores de código de barras / QR portátiles vía escáner Bluetooth o cámara de móvil.',
      'Gestión avanzada de lotes de insumos y fechas de caducidad con alertas de perecibilidad (FIFO/PEPS).',
    ],
    opportunities: [
      'Generación automática de sugerencias de compra cuando los insumos cruzan el umbral de reorden.',
      'Envío automático de órdenes de compra en PDF formateado vía WhatsApp / Email al proveedor.',
    ],
  },
  {
    id: 'accounting',
    phase: 'Fase 2',
    phaseColor: '#3b82f6',
    icon: '📊',
    title: 'Contabilidad & Finanzas',
    description: 'Módulo contable integral: gastos clasificados, cierre de caja diario, conciliación bancaria inteligente, planilla de nómina de personal, Estado de Resultados (P&L), reporte fiscal IVA Formulario 300 DIAN con exportación XML MUISCA, flujo de caja proyectado, control de activos fijos con depreciación y períodos protegidos.',
    routes: [
      { route: '/dashboard/accounting', view: 'Hub: P&L del mes, widget fiscal DIAN, arqueo del día, accesos rápidos', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/expenses', view: 'Libro de gastos: tabla, búsqueda, filtros por categoría, modal de registro', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/cash-register', view: 'Historial de arqueos y wizard de cierre de caja diario', status: 'done', roles: 'ADMIN, ACCOUNTANT, MANAGER' },
      { route: '/dashboard/accounting/bank-reconciliation', view: 'Conciliación bancaria visual: carga de extractos (Bancolombia, Davivienda, CSV universal), auto-matching y conciliación manual', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/payroll', view: 'Planilla de nómina simplificada: liquidación de sueldos, aportes parafiscales, horas extra y conexión automática a gastos (LABOR)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/periods', view: 'Períodos contables: ver, cerrar mes, historial', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports', view: 'Hub de reportes contables: accesos directos a P&L, IVA, Flujo de Caja y Activos Fijos', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports/pl', view: 'Estado de Resultados P&L: ventas netas, COGS, gastos OPEX, margen neto con exportación CSV', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports/vat', view: 'Reporte de IVA: formulario 300 DIAN, IVA generado vs descontable con exportador XML MUISCA', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports/cashflow', view: 'Estado de Flujo de Caja (Cashflow): entradas operativas, egresos, inversión y saldo neto con exportación CSV', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/fixed-assets', view: 'Control de activos fijos, maquinaria gastronómica y tabla de depreciación en línea recta', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/expenses', view: 'GET lista + POST nuevo gasto', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/cash-register', view: 'GET historial + POST cierre de caja', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/bank-reconciliation', view: 'GET/POST conciliación bancaria y auto-cruce transaccional de extractos bancarios vs facturación y gastos', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/payroll', view: 'GET/POST liquidación de nómina de personal y contabilización automática en gastos operativos', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/periods', view: 'GET lista + POST cerrar período', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/reports/pl', view: 'GET cálculo P&L para un período dado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/reports/vat', view: 'GET cálculo IVA para un mes dado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/reports/cashflow', view: 'GET cálculo estructurado de flujo de caja operativo y neto', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/fixed-assets', view: 'GET/POST/DELETE activos fijos y cálculo automático de depreciación mensual', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/export/accounting/form-300-xml', view: 'GET generación del archivo XML plano oficial del Formulario 300 DIAN para importación en el sistema MUISCA', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/export/accounting/pl', view: 'GET exportación estructurada del Estado de Resultados (P&L) en CSV con BOM UTF-8', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/export/accounting/vat', view: 'GET exportación del informe fiscal de IVA generado y descontable en CSV/Excel', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/export/accounting/cashflow', view: 'GET exportación del Estado de Flujo de Caja en CSV/Excel con BOM UTF-8', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El motor contable (lib/accounting/) tiene adaptadores por país: colombia.ts (predeterminado), generic.ts.',
      'Conciliación bancaria inteligente: parser de extractos bancarios para Bancolombia, Davivienda y CSV universal con algoritmo de matching automático por fecha e importe.',
      'Módulo de nómina simplificada: liquidación de sueldos de personal con cálculo de seguridad social y registro automático en el libro de gastos bajo categoría LABOR.',
      'Generador oficial de archivo plano XML para el Formulario 300 DIAN (/api/export/accounting/form-300-xml) compatible con la estructura de casillas requerida por MUISCA.',
      'Flujo de caja dinámico: proyección de liquidez consolidada cruzando facturación cobrada, egresos pagados e inversiones de capital.',
      'Gestión de activos fijos y depreciación: cálculo automatizado de depreciación mensual acumulada y valor residual según método de línea recta.',
      'Exportaciones directas en un clic de P&L, IVA y Flujo de Caja a formato CSV/Excel con BOM UTF-8.',
      'Los gastos con IVA discriminan el 19% acreditable automáticamente al registrar el monto total.',
      'El cierre de caja permite detectar diferencias entre ventas electrónicas y conteo físico de gaveta.',
      'Los períodos contables cerrados bloquean modificaciones retroactivas de facturas y gastos.',
    ],
    missing: [
      'Generación de certificados de retención en la fuente e ICA para proveedores y clientes corporativos.',
      'Generación de archivos planos para Medios Magnéticos e Información Exógena anual de la DIAN (Formatos 1001, 1003, 1007).',
    ],
    opportunities: [
      'Conexión bancaria en tiempo real vía Open Banking / APIs bancarias (FinAPI, Belvo, Prometeo) para descarga automática de extractos sin subir archivos.',
      'Integración con software contables ERP de mercado (Siigo, World Office, Alegra) vía API REST bidireccional.',
    ],
  },
  {
    id: 'saas',
    phase: 'Fase 3',
    phaseColor: '#8b5cf6',
    icon: '🏢',
    title: 'SaaS & Multi-sucursal',
    description: 'Infraestructura SaaS: organizaciones, suscripciones con Stripe, roles de franquicia, automatización de onboarding, alertas preventivas de trial, gobernanza de límites de sedes y panel de SUPERADMIN para gestión de la plataforma.',
    routes: [
      { route: '/pricing', view: 'Página pública de precios: Basic, Pro, Enterprise con comparativa', status: 'done', roles: 'Público' },
      { route: '/dashboard/org', view: 'Hub de franquicia: monitoreo en vivo de sucursales, mesas y facturación', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/org/branches', view: 'Gestión de sucursales: crear nueva sede con control de límites del plan', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/org/reports', view: 'Reportes consolidados: ventas totales de la cadena, comparativa por sede', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/settings/billing', view: 'Facturación SaaS: plan actual, trial, upgrade mensual/anual', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/dashboard/settings/billing/success', view: 'Página de bienvenida y confirmación de suscripción tras pasar por Stripe Checkout', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/dashboard/settings/billing/cancel', view: 'Página de abandono de checkout con opciones de retención y asistencia', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/dashboard/superadmin', view: 'Panel global: MRR, clientes activos, sedes, métricas de plataforma', status: 'done', roles: 'SUPERADMIN' },
      { route: '/dashboard/superadmin/organizations', view: 'Lista de organizaciones con modificación manual de plan', status: 'done', roles: 'SUPERADMIN' },
      { route: '/api/billing/subscription', view: 'GET estado suscripción + POST crear sesión de checkout Stripe', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/api/referrals', view: 'GET/POST validación de códigos de referido y aplicación de descuentos', status: 'done', roles: 'Público / Sistema' },
      { route: '/api/cron/trial-alerts', view: 'Cron job automatizado para notificaciones de expiración de trial (3 días y 1 día antes) vía email', status: 'done', roles: 'Sistema (Cron)' },
      { route: '/api/webhooks/stripe', view: 'Handler de eventos Stripe: payment_succeeded, subscription.deleted', status: 'done', roles: 'Sistema (Stripe)' },
      { route: '/api/org/branches', view: 'GET/POST sucursales de la organización', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/api/org/reports', view: 'GET métricas consolidadas de todas las sucursales', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/api/superadmin/organizations', view: 'GET/PATCH organizaciones de la plataforma', status: 'done', roles: 'SUPERADMIN' },
    ],
    observations: [
      'Los límites de sucursales por plan se validan al crear una nueva sede: BASIC=1, PRO=5, ENTERPRISE=ilimitado.',
      'El trial de 14 días se activa automáticamente al crear una organización. Al expirar, el acceso queda bloqueado hasta suscribirse.',
      'Alertas cron de expiración de trial (/api/cron/trial-alerts): notificaciones automáticas por correo 3 días y 24 horas antes del vencimiento.',
      'Email automatizado de bienvenida con diseño corporativo al registrarse el administrador (sendWelcomeEmail en lib/email.ts).',
      'Revocación y bloqueo automático de sedes excedentes al degradar de plan (enforceBranchLimitOnDowngrade en lib/subscription.ts).',
      'El middleware verifica el estado de la suscripción en cada request a /dashboard.',
      'El descuento del 20% en plan anual se aplica en el precio del Stripe Checkout.',
      'El portal de cliente de Stripe permite al usuario autogestionar su suscripción (cancelar, actualizar tarjeta).',
      'Páginas dedicadas de éxito y cancelación con feedback inmediato para el suscriptor tras pasar por Stripe Checkout.',
      'Módulo de referidos con validación de códigos promocionales para captación de nuevas organizaciones.',
    ],
    missing: [
      'Facturación en moneda local (COP, MXN) con selector dinámico y conversión de divisas en Stripe Checkout.',
      'Débito automático bancario local (PSE recurrente, SPEI domiciliado) alternativo a tarjeta de crédito para cobros de suscripción.',
    ],
    opportunities: [
      'Suscripciones corporativas y acuerdos anuales mediante facturación tradicional y transferencia bancaria.',
      'Marketplace de integraciones y extensiones modulares de terceros (contabilidad externa, delivery).',
      'Programa de partners y comisiones para agencias gastronómicas y consultores de restaurantes con tracking de referidos.',
    ],
  },
  {
    id: 'analytics',
    phase: 'Fase 4',
    phaseColor: '#f59e0b',
    icon: '📈',
    title: 'Analytics & Business Intelligence',
    description: 'Dashboard de inteligencia de negocio: análisis de horas pico, tendencias semanales, rotación de mesas, análisis ABC de rentabilidad, mapa de calor (heatmap) de piso, predicción de demanda a 7 días, rendimiento de meseros, desglose por canal, pantalla ejecutiva Live TV y despacho de reportes por email.',
    routes: [
      { route: '/dashboard/analytics', view: 'Dashboard BI: horas pico, ventas por día de semana, rotación, análisis ABC, heatmap de mesas, predicción y ranking de meseros', status: 'done', roles: 'ADMIN, ACCOUNTANT, ORG_ADMIN' },
      { route: '/dashboard/analytics/live-tv', view: 'Dashboard ejecutivo Live TV Fullscreen de alto contraste para pantallas de sala o cocina con KPIs en tiempo real', status: 'done', roles: 'ADMIN, MANAGER, ORG_ADMIN' },
      { route: '/api/analytics/dashboard', view: 'GET métricas analíticas calculadas por el motor (lib/analytics/engine.ts)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/analytics/reports/email', view: 'POST despacho de reporte ejecutivo dominical y resumen semanal por correo electrónico', status: 'done', roles: 'ADMIN, ORG_ADMIN, Sistema' },
      { route: '/api/analytics/export', view: 'GET exportación CSV de facturas y libros contables', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El motor de analytics (lib/analytics/engine.ts) calcula: ventas por hora, ventas por día de la semana, rotación de mesas y clasificación ABC.',
      'Heatmap interactivo de piso (TableFloorPlanHeatmap): mapa de calor visual que refleja la ocupación, intensidad de rotación e ingresos por zona del restaurante.',
      'Predicción de demanda a 7 días (DemandPredictionChart): proyección algorítmica de comensales y ventas esperadas basada en históricos recientes.',
      'Gráfico de tendencias temporales (TrendAreaChart): comparación interactiva de períodos con cálculo de variaciones porcentuales de crecimiento.',
      'Rendimiento de meseros (WaiterPerformanceTable): ranking de personal de sala por ticket promedio, cantidad de órdenes y propinas acumuladas.',
      'Desglose por canales de servicio (ServiceChannelBreakdown): distribución porcentual de ventas entre mesas del salón, barra y pedidos para llevar/delivery.',
      'Dashboard Live TV: pantalla optimizada para televisores y monitores con métricas clave del turno, alertas de pedidos retrasados y estado de aforo en tiempo real.',
      'Envío automatizado de reporte ejecutivo por email (/api/analytics/reports/email) para dueños y gerentes.',
      'El análisis ABC clasifica productos por margen × volumen: A (top 20% en rentabilidad), B (siguiente 30%), C (resto).',
      'La exportación CSV genera archivos separados: facturas, ítems, gastos.',
    ],
    missing: [
      'Integración con Google Analytics 4 (GA4) o Mixpanel para tracking de eventos y embudo de conversión comensal en el menú QR.',
      'Análisis de afinidad y canasta de compra (Market Basket Analysis) para identificar platos y bebidas frecuentemente ordenados juntos.',
    ],
    opportunities: [
      'Alertas tempranas push / WhatsApp ante anomalías de ventas (caídas súbitas de facturación o picos de retraso en comanda).',
      'Benchmarking anónimo de rendimiento y ticket promedio contra restaurantes de la misma categoría gastronómica.',
    ],
  },
  {
    id: 'dian',
    phase: 'Fase 4',
    phaseColor: '#f59e0b',
    icon: '⚡',
    title: 'Factura Electrónica DIAN & Fiscal Multi-país',
    description: 'Integración SOAP directa con la DIAN de Colombia para emisión de facturas electrónicas UBL 2.1, set de pruebas automatizado, notas crédito, cancelación formal, consulta de estado sin PTH externo y motores fiscales internacionales para SAT México (CFDI 4.0) y SII Chile (DTE).',
    routes: [
      { route: '/dashboard/settings/electronic-invoicing', view: 'Wizard de habilitación DIAN: Software ID, PIN, clave técnica, resolución, certificado .p12', status: 'done', roles: 'ADMIN' },
      { route: '/api/billing/electronic-invoicing/config', view: 'GET/PUT configuración DIAN del restaurante', status: 'done', roles: 'ADMIN' },
      { route: '/api/billing/electronic-invoicing/send', view: 'POST envío de factura a DIAN (SendBillAsync)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/billing/electronic-invoicing/test-set', view: 'POST ejecución automatizada del set de pruebas DIAN (SendTestSetAsync) para habilitación', status: 'done', roles: 'ADMIN' },
      { route: '/api/billing/electronic-invoicing/status', view: 'GET/POST consulta y sincronización de estado de facturas y paquetes ZIP ante la DIAN (GetStatusZip)', status: 'done', roles: 'ADMIN, ACCOUNTANT, Sistema' },
      { route: '/api/billing/electronic-invoicing/credit-note', view: 'POST generación y transmisión de Notas Crédito UBL 2.1 ante la DIAN para corrección o devolución', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/billing/electronic-invoicing/cancel', view: 'POST anulación formal de factura electrónica emitiendo Nota Crédito UBL 2.1 con motivo estandarizado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/billing/electronic-invoicing/events', view: 'POST transmisión de eventos de acuse de recibo y recepción de bienes/servicios', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'La librería lib/dian/ implementa: generador UBL 2.1, firmador XML (node-forge), calculador CUFE SHA-384, cliente SOAP y empaquetado ZIP.',
      'Implementación completa del ciclo UBL 2.1 DIAN: emisión (SendBillAsync), habilitación (SendTestSetAsync), consulta de estado (GetStatusZip), notas crédito y eventos de factura.',
      'Adaptadores fiscales internacionales ya integrados en el motor: SAT México CFDI 4.0 (lib/fiscal/sat-mexico.ts) y SII Chile DTE (lib/fiscal/sii-chile.ts).',
      'El certificado .p12 se almacena cifrado con AES-256 en Vercel Blob en un bucket privado.',
      'El sistema soporta ambientes de habilitación y producción.',
      'El widget DianInvoiceAction integrado en /dashboard/billing/invoices/[id] muestra el estado del envío, CUFE y enlace directo a la DIAN.',
      'Mecanismo de contingencia por indisponibilidad de servicios DIAN con cola de reintentos.',
    ],
    missing: [
      'Nómina Electrónica formal DIAN: transmisión y validación previa de comprobantes XML de nómina ante los servidores de la DIAN.',
      'Documento Soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura de venta con numeración autorizada.',
      'Eventos RADIAN para registro de facturas electrónicas de venta como título valor para operaciones de factoring.',
    ],
    opportunities: [
      'Integración con buzón tributario para recepción, validación UBL y contabilización automática de facturas de proveedores.',
      'Módulo de contingencia Tipo 4 (inconvenientes tecnológicos del emisor) con emisión de comprobantes talonario y retransmisión asíncrona masiva.',
    ],
  },
  {
    id: 'storage-cdn',
    phase: 'Base',
    phaseColor: '#06b6d4',
    icon: '☁️',
    title: 'Almacenamiento Global & CDN (Vercel Blob)',
    description: 'Infraestructura centralizada de almacenamiento en la nube para distribución perimetral global de cartas en PDF, páginas WebP pre-renderizadas, fotografías de platillos y branding multitenant con tiempos de entrega en milisegundos.',
    routes: [
      { route: 'lib/storage.ts', view: 'Servicio unificado de almacenamiento con uploadBlob y deleteBlob (Vercel Blob + fallback local)', status: 'done', roles: 'Sistema' },
      { route: '/api/pdf/upload', view: 'POST/DELETE subida y gestión del PDF del menú en Vercel Blob con borrado de páginas hijas', status: 'done', roles: 'ADMIN, SUPERADMIN, ORG_ADMIN' },
      { route: '/api/pdf/jobs', view: 'POST/GET cola de procesamiento asíncrono para renderizado de cartas PDF extensas en segundo plano', status: 'done', roles: 'ADMIN, Sistema' },
      { route: '/api/storage/purge-cache', view: 'POST purga inmediata de caché en Edge CDN de Vercel Blob ante actualizaciones de menú', status: 'done', roles: 'ADMIN, Sistema' },
      { route: '/api/menu/upload', view: 'POST subida y optimización de fotos de platillos a Vercel Blob (restaurants/{id}/products/...)', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: 'scripts/migrate_assets_to_vercel_blob.js', view: 'CLI de migración masiva de activos locales hacia Vercel Blob y actualización MySQL', status: 'done', roles: 'DevOps / Admin' },
      { route: 'scripts/prerender_menu_pdf.js', view: 'CLI de pre-renderizado automático de menús PDF a páginas WebP optimizadas (~41 KB/pág)', status: 'done', roles: 'DevOps / Admin' },
    ],
    observations: [
      'Distribución CDN perimetral global mediante la red de borde de Vercel (Edge Network con Cloudflare), logrando TTFB y descargas en < 100 ms.',
      'Convención canónica de rutas multitenant: restaurants/{restaurantId}/menu/ (PDF y páginas), restaurants/{restaurantId}/products/ (fotos) y restaurants/{restaurantId}/branding/ (logos).',
      'Configuración de Next.js Image Optimization en next.config.ts con remotePatterns para *.public.blob.vercel-storage.com.',
      'Eliminación de la sobrecarga del sistema de archivos local en producción: previene errores EROFS (Read-Only File System) en entornos serverless.',
      'Pre-renderizado WebP que reduce el consumo de datos móviles en más del 85% comparado con la descarga del PDF completo en el cliente.',
      'Procesamiento en segundo plano de PDFs pesados mediante Background Worker para evitar timeouts en Edge/Serverless.',
      'Purga instantánea de CDN ante actualizaciones de carta desde el panel de control (/api/storage/purge-cache).',
    ],
    missing: [
      'Soporte para formato de imagen de próxima generación AVIF y compresión WebP progresiva.',
      'Copia de seguridad geográfica secundaria (multi-cloud backup) de comprobantes fiscales y contratos.',
    ],
    opportunities: [
      'Auto-optimización cromática de fotos gastronómicas mediante visión computacional.',
      'Recorte inteligente centrado en el platillo (Smart Crop) al momento de subir la imagen.',
    ],
  },
]

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      ✓ Implementada
    </span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      ⚡ Parcial
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
      ✗ Faltante
    </span>
  )
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  'Base': { label: 'Base', color: '#6b7280' },
  'Fase 1': { label: 'Fase 1', color: '#10b981' },
  'Fase 2': { label: 'Fase 2', color: '#3b82f6' },
  'Fase 3': { label: 'Fase 3', color: '#8b5cf6' },
  'Fase 4': { label: 'Fase 4', color: '#f59e0b' },
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const totalRoutes = modules.reduce((acc, m) => acc + m.routes.length, 0)
  const doneRoutes = modules.reduce((acc, m) => acc + m.routes.filter(r => r.status === 'done').length, 0)
  const partialRoutes = modules.reduce((acc, m) => acc + m.routes.filter(r => r.status === 'partial').length, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              i<span className="text-amber-500">Menu</span>
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-400 font-medium">Documentación Técnica</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/specs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <span>Ficha Técnica &amp; Hardware</span>
              <span className="text-[10px]">↗</span>
            </Link>
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">← Landing</Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950
                         px-4 py-2 rounded-lg transition-all"
            >
              Acceder al panel →
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* ── Header ── */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400
                          bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            📖 Documentación interna — iMenu v4.0
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Documentación técnica
          </h1>
          <p className="text-zinc-400 text-lg max-w-3xl leading-relaxed mb-8">
            Inventario completo de todas las funcionalidades desarrolladas en las 4 fases del roadmap.
            Incluye rutas, vistas, estado de implementación, observaciones técnicas, lo que falta y
            oportunidades de mejora por módulo.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
              <div className="text-2xl font-black text-white">{totalRoutes}</div>
              <div className="text-xs text-zinc-500">Rutas totales</div>
            </div>
            <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl px-5 py-3">
              <div className="text-2xl font-black text-emerald-400">{doneRoutes}</div>
              <div className="text-xs text-zinc-500">Implementadas</div>
            </div>
            <div className="bg-zinc-900 border border-amber-500/20 rounded-xl px-5 py-3">
              <div className="text-2xl font-black text-amber-400">{partialRoutes}</div>
              <div className="text-xs text-zinc-500">Parciales</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
              <div className="text-2xl font-black text-white">{modules.length}</div>
              <div className="text-xs text-zinc-500">Módulos</div>
            </div>
          </div>
        </div>

        {/* ── Banner a Especificaciones Técnicas (Hardware & Arquitectura) ── */}
        <div className="mb-14 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">⚡ Hardware &amp; Red Homologado</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">Producción</span>
            </div>
            <h3 className="text-xl font-bold text-white">Especificaciones Técnicas &amp; Periféricos ESC/POS</h3>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Consulta la ficha técnica: buffers ESC/POS construidos en TypeScript transmitidos por TCP directo al puerto 9100, compatibilidad verificada con Epson TM-T20/T88, Bixolon SRP-350 y RONGTA, ruteo multi-estación KDS y SOAP UBL 2.1 DIAN.
            </p>
          </div>
          <Link
            href="/specs"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span>Ver Especificaciones Técnicas</span>
            <span>↗</span>
          </Link>
        </div>

        {/* ── Table of Contents ── */}
        <div className="mb-16 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4">Índice de módulos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {modules.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{m.title}</div>
                  <div className="text-xs font-medium" style={{ color: phaseLabels[m.phase]?.color }}>{m.phase}</div>
                </div>
                <span className="text-xs text-zinc-600">{m.routes.length} rutas</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Modules ── */}
        <div className="space-y-16">
          {modules.map((mod) => (
            <section key={mod.id} id={mod.id} className="scroll-mt-20">
              {/* Module header */}
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-zinc-800">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ background: `${mod.phaseColor}18`, border: `1px solid ${mod.phaseColor}30` }}
                >
                  {mod.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white">{mod.title}</h2>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color: mod.phaseColor, background: `${mod.phaseColor}18`, border: `1px solid ${mod.phaseColor}30` }}
                    >
                      {mod.phase}
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{mod.description}</p>
                </div>
              </div>

              {/* Routes table */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Rutas & Vistas</h3>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-900/80 border-b border-zinc-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ruta</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vista / Propósito</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Roles</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {mod.routes.map((r, i) => (
                        <tr key={i} className="bg-zinc-900/40 hover:bg-zinc-900/80 transition-colors">
                          <td className="px-4 py-3">
                            <code className="text-xs text-amber-400 font-mono bg-amber-500/5 px-1.5 py-0.5 rounded">
                              {r.route}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-zinc-300 text-xs leading-relaxed">
                            {r.view}
                            {r.notes && (
                              <div className="mt-1 text-zinc-500 italic">{r.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-500 font-mono">{r.roles}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Three columns: observations, missing, opportunities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Observations */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="text-blue-400">💬</span> Observaciones técnicas
                  </h3>
                  <ul className="space-y-2">
                    {mod.observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                        <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing */}
                <div className="bg-zinc-900 border border-red-500/10 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="text-red-400">⚠️</span> Qué falta / Gaps
                  </h3>
                  <ul className="space-y-2">
                    {mod.missing.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                        <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-zinc-900 border border-amber-500/10 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="text-amber-400">💡</span> Oportunidades de mejora
                  </h3>
                  <ul className="space-y-2">
                    {mod.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* ── Overall Summary ── */}
        <section className="mt-20 border-t border-zinc-800 pt-16">
          <h2 className="text-3xl font-bold mb-2">Resumen del estado actual</h2>
          <p className="text-zinc-400 mb-10">Evaluación honesta del producto y prioridades de próximo desarrollo para las siguientes iteraciones.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Strengths */}
            <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-emerald-400 mb-4">✅ Fortalezas del producto</h3>
              <ul className="space-y-3">
                {[
                  'Stack moderno y escalable: Next.js 16 App Router + Prisma + Socket.IO + Redis + Vercel Blob.',
                  'Ciclo operativo 360° completo: QR → Comanda → Cocina KDS → Inventario → Facturación → Contabilidad.',
                  'Impresión térmica ESC/POS de red nativa (puerto TCP 9100) con gestor visual de impresoras por estación.',
                  'Facturación electrónica DIAN UBL 2.1 completa: emisión, habilitación automática (Test Set), notas crédito y eventos.',
                  'Cobros flexibles y Datáfonos POS: división de cuenta (Split Bill), propinas, pasarelas QR e integración de datáfonos físicos (Ingenico, Verifone, Pax).',
                  'Gestión integral de abastecimiento: catálogo de proveedores, órdenes de compra, conteo físico y transferencias multisede.',
                  'Módulo contable avanzado: Estado P&L, Formulario 300 IVA con XML oficial para MUISCA, conciliación bancaria y nómina de personal.',
                  'Reservas inteligentes: Table Turnover Predictor (7 etapas), confirmación WhatsApp/SMS y pre-orden con auto-KDS.',
                  'KDS Fullscreen independiente para tablets de cocina y pantalla ejecutiva Live TV en tiempo real.',
                  'Business Intelligence avanzado: mapa de calor (Heatmap) de mesas, predicción de demanda a 7 días y rendimiento de meseros.',
                  'Brand Studio integral con Caddy On-Demand TLS automático, generación de Brand Kit en PDF y paquetes de iconos PWA.',
                  'Multi-tenant real con organizaciones, franquicias, food courts multi-restaurante, roles granulares y Stripe SaaS.',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-500 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical gaps */}
            <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-red-400 mb-4">🚨 Gaps críticos para producción (Próximas Iteraciones)</h3>
              <ul className="space-y-3">
                {[
                  'Nómina Electrónica formal DIAN: transmisión y validación de comprobantes XML ante el webservice DIAN.',
                  'Documento Soporte en compras efectuadas a sujetos no obligados a expedir factura con numeración autorizada.',
                  'Múltiples cajas registradoras por sucursal con control independiente de prefijos y consecutivo DIAN asignado por terminal.',
                  'Spooler de impresión local offline con almacenamiento en búfer para tolerancia a caídas temporales de red local.',
                  'Integración de webhooks bidireccionales con agregadores de delivery (Rappi, Uber Eats, Didi Food).',
                  'Dispersión y liquidación bancaria automatizada (Escrow / Split Payout) a cuentas de inquilinos en Food Courts.',
                ].map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-red-500 mt-0.5">✗</span> {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick wins */}
            <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-amber-400">⚡ Quick wins de alto impacto</h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  20 Completados
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                    ✓ Implementados recientemente:
                  </p>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>División de cuenta (Split Bill) por comensal o partes iguales y múltiples medios de pago.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Reimpresión rápida de tickets térmicos desde el listado de facturas en 1 clic y exportación masiva ZIP.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Conciliación bancaria (Bancolombia, Davivienda, CSV) y nómina de personal integrada a contabilidad.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Exportador oficial del Formulario 300 DIAN en XML estructurado para importación en MUISCA.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Exportación directa de liquidaciones en Food Courts a CSV con BOM UTF-8 y fórmulas netas.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Hook Caddy On-Demand TLS para emisión automática de certificados SSL Let’s Encrypt.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Generador oficial de Brand Kit en HTML/PDF y editor visual de favicons e iconos PWA.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Heatmap visual de mesas, predicción de demanda a 7 días y ranking de meseros en Analytics.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Traducción multilingüe asistida por IA del menú comensal a inglés y portugués.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Adaptadores fiscales internacionales para SAT México (CFDI 4.0) y SII Chile (DTE).</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Impresión térmica ESC/POS por red TCP al puerto 9100 con gestor de impresoras por estación.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Predicción de rotación de mesas (Table Turnover Predictor) en 7 etapas operativas.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-zinc-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                    → Próxima ola de Quick Wins (1-2 días):
                  </p>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>Buscador de insumos con lectura de código de barras / QR desde la cámara del móvil.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>Certificados de retención en la fuente e ICA para proveedores y clientes corporativos.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>Alertas tempranas de stock perecedero y lotes con vencimiento próximo (FIFO/PEPS).</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>Envío automático de órdenes de compra en PDF formateado vía WhatsApp / Email al proveedor.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">→</span>
                      <span>Filtros visuales de alérgenos y dietas (Vegano, Sin Gluten, Keto) en el menú QR.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Strategic opportunities */}
            <div className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-violet-400 mb-4">🚀 Oportunidades estratégicas</h3>
              <ul className="space-y-3">
                {[
                  'Autopago biométrico y Apple Pay / Google Pay directo mediante Web Payments SDK en el navegador del comensal.',
                  'Integración con plataformas de delivery (Rappi, Uber Eats) para inyección directa al KDS.',
                  'Conexión bancaria en tiempo real vía Open Banking (Belvo, Prometeo) para extractos directos sin archivos.',
                  'App nativa (React Native / Expo) para meseros con soporte offline y comanderos Bluetooth.',
                  'Motor de recomendaciones, maridaje y upselling inteligente impulsado por IA según comanda.',
                  'Marketplace de iMenu: catálogo unificado de restaurantes para descubrimiento de comensales.',
                  'Programa de partners y comisiones para agencias gastronómicas y consultores de restaurantes.',
                ].map((so, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-violet-500 mt-0.5">◆</span> {so}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── API Endpoints Summary ── */}
        <section className="mt-16 border-t border-zinc-800 pt-16">
          <h2 className="text-2xl font-bold mb-2">Stack de APIs</h2>
          <p className="text-zinc-400 mb-8 text-sm">Todas las APIs son REST sobre Next.js Route Handlers en <code className="text-amber-400 text-xs">/app/api/</code>. La autenticación se valida con <code className="text-amber-400 text-xs">auth()</code> de NextAuth v5 en cada endpoint.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { path: '/api/auth/[...nextauth]', tag: 'Auth' },
              { path: '/api/menu/[slug]', tag: 'Público' },
              { path: '/api/menu', tag: 'CRUD' },
              { path: '/api/menu/upload', tag: 'Media' },
              { path: '/api/menu/translate', tag: 'AI' },
              { path: '/api/menu/purge-cache', tag: 'CDN' },
              { path: '/api/orders', tag: 'RT' },
              { path: '/api/orders/[id]', tag: 'RT' },
              { path: '/api/push/subscribe', tag: 'Push' },
              { path: '/api/tables', tag: 'CRUD' },
              { path: '/api/tables/[id]/session', tag: 'Session' },
              { path: '/api/reservations/notify', tag: 'Notify' },
              { path: '/api/reservations/reminders', tag: 'Cron' },
              { path: '/api/hardware/printers', tag: 'Hardware' },
              { path: '/api/hardware/print-escpos', tag: 'Print' },
              { path: '/api/hardware/pos-terminal', tag: 'Hardware' },
              { path: '/api/additions', tag: 'CRUD' },
              { path: '/api/special-offers', tag: 'CRUD' },
              { path: '/api/brand', tag: 'Config' },
              { path: '/api/brand/domain', tag: 'Config' },
              { path: '/api/brand/domain/check-tls', tag: 'TLS' },
              { path: '/api/brand/icons', tag: 'PWA' },
              { path: '/api/brand/brand-kit', tag: 'Export' },
              { path: '/api/food-courts', tag: 'CRUD' },
              { path: '/api/food-courts/[id]/memberships', tag: 'CRUD' },
              { path: '/api/food-courts/[id]/reports', tag: 'Report' },
              { path: '/api/food-courts/[id]/payments', tag: 'Billing' },
              { path: '/api/food-courts/[id]/settlements/export', tag: 'Export' },
              { path: '/api/invoices', tag: 'Billing' },
              { path: '/api/invoices/[id]', tag: 'Billing' },
              { path: '/api/invoices/[id]/notify', tag: 'Email' },
              { path: '/api/billing/proforma', tag: 'Billing' },
              { path: '/api/billing/daily-summary', tag: 'Billing' },
              { path: '/api/payments/split', tag: 'Billing' },
              { path: '/api/export/invoices', tag: 'Export' },
              { path: '/api/export/invoices/zip', tag: 'Export' },
              { path: '/api/export/inventory', tag: 'Export' },
              { path: '/api/pdf', tag: 'PDF' },
              { path: '/api/pdf/jobs', tag: 'Worker' },
              { path: '/api/storage/purge-cache', tag: 'CDN' },
              { path: '/api/billing/tax-config', tag: 'Config' },
              { path: '/api/billing/subscription', tag: 'Stripe' },
              { path: '/api/referrals', tag: 'SaaS' },
              { path: '/api/cron/trial-alerts', tag: 'Cron' },
              { path: '/api/billing/electronic-invoicing/config', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/send', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/test-set', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/status', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/credit-note', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/cancel', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/events', tag: 'DIAN' },
              { path: '/api/inventory', tag: 'CRUD' },
              { path: '/api/inventory/[id]', tag: 'CRUD' },
              { path: '/api/inventory/movements', tag: 'CRUD' },
              { path: '/api/suppliers', tag: 'Inventory' },
              { path: '/api/purchase-orders', tag: 'Inventory' },
              { path: '/api/inventory/physical-count', tag: 'Inventory' },
              { path: '/api/inventory/transfers', tag: 'Inventory' },
              { path: '/api/accounting/expenses', tag: 'Contab.' },
              { path: '/api/accounting/cash-register', tag: 'Contab.' },
              { path: '/api/accounting/bank-reconciliation', tag: 'Contab.' },
              { path: '/api/accounting/payroll', tag: 'Contab.' },
              { path: '/api/accounting/periods', tag: 'Contab.' },
              { path: '/api/accounting/reports/pl', tag: 'Report' },
              { path: '/api/accounting/reports/vat', tag: 'Report' },
              { path: '/api/accounting/reports/cashflow', tag: 'Contab.' },
              { path: '/api/accounting/fixed-assets', tag: 'Contab.' },
              { path: '/api/export/accounting/form-300-xml', tag: 'Export' },
              { path: '/api/export/accounting/pl', tag: 'Export' },
              { path: '/api/export/accounting/vat', tag: 'Export' },
              { path: '/api/export/accounting/cashflow', tag: 'Export' },
              { path: '/api/org/branches', tag: 'SaaS' },
              { path: '/api/org/reports', tag: 'SaaS' },
              { path: '/api/superadmin/organizations', tag: 'Admin' },
              { path: '/api/webhooks/stripe', tag: 'Webhook' },
              { path: '/api/analytics/dashboard', tag: 'BI' },
              { path: '/api/analytics/reports/email', tag: 'BI' },
              { path: '/api/analytics/export', tag: 'Export' },
            ].map((api) => (
              <div key={api.path} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{api.tag}</span>
                <code className="text-xs text-amber-400 font-mono truncate">{api.path}</code>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white">
            i<span className="text-amber-500">Menu</span>
            <span className="text-zinc-500 font-normal text-sm ml-2">— Documentación v4.0</span>
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Landing</Link>
            <Link href="/pricing" className="hover:text-zinc-300 transition-colors">Precios</Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Panel</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
