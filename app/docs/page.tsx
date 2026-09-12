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
    title: 'Autenticación & Roles',
    description: 'Sistema de autenticación basado en NextAuth v5 con soporte multi-rol. Cada usuario tiene un único rol que determina su vista y permisos.',
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
    ],
    missing: [
      'Soporte para llaves de seguridad físicas (WebAuthn / Passkeys / FIDO2).',
      'Registro de auditoría de accesos (IP y User-Agent en logs de inicio de sesión).',
    ],
    opportunities: [
      'Login unificado con SSO empresarial (SAML / Okta) para grandes cadenas y franquicias.',
      'Restricción de acceso por IP para terminales de caja y KDS en cocina.',
    ],
  },
  {
    id: 'menu-public',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '📱',
    title: 'Menú QR (Vista del Cliente)',
    description: 'La interfaz que ven los clientes del restaurante al escanear el código QR de su mesa. Permite navegar el menú, agregar ítems al carrito y realizar pedidos en tiempo real.',
    routes: [
      { route: '/menu/[slug]/[tableSlug]', view: 'Menú digital del restaurante con carrito, apodo, pedidos en vivo y tracker', status: 'done', roles: 'Público (clientes)' },
      { route: '/menu/[slug]', view: 'Modo solo visualización web del menú (sin sesión de mesa) para consulta o entrada', status: 'done', roles: 'Público' },
      { route: '/api/menu/[slug]', view: 'GET productos, categorías y modificadores del restaurante', status: 'done', roles: 'Público' },
      { route: '/api/orders', view: 'POST pedido a cocina y GET órdenes confirmadas de la mesa actual', status: 'done', roles: 'Público (sesión de mesa)' },
      { route: '/api/kitchen/load', view: 'GET cálculo de carga de cocina y tiempo estimado de preparación en minutos', status: 'done', roles: 'Público / Sistema' },
      { route: '/api/feedback', view: 'POST calificación de experiencia de servicio y GET métricas agregadas', status: 'done', roles: 'Público (POST) / ADMIN (GET)' },
      { route: '/waiter/[tableId]', view: 'Llamada al mesero desde QR secundario o botón flotante', status: 'done', roles: 'Público (clientes)' },
    ],
    observations: [
      'Las sesiones de mesa son colaborativas y sincronizadas en tiempo real vía Socket.IO entre comensales.',
      'Historial de rondas de pedidos accesible desde el menú con stepper de estado (RECEIVED ➔ PREPARING ➔ READY ➔ DELIVERED).',
      'Alertas en vivo con chime armónico (Web Audio API) y notificaciones de navegador (Web Notification API) al cambiar de estado el pedido.',
      'Internacionalización (i18n) completa con selector fluido para Español (es), English (en) y Português (pt).',
      'Indicador de tiempo estimado de espera en cocina según cantidad de pedidos activos y ritmo de preparación.',
      'Modo solo visualización web (/menu/[slug]) ideal para menús en entrada del local o consulta previa sin mesa.',
      'Soporte dual de vista por Cuadrícula/Categorías y Menú PDF interactivo con hotspots clicables.',
      'Módulo de calificación de servicio (1 a 5 estrellas, tags rápidos y comentarios) persistido en base de datos.',
      'Disponibilidad de ingredientes y stock actualizada en tiempo real vía Socket.IO.',
    ],
    missing: [
      'Soporte para división de cuenta individual por comensal directamente en pasarela de pago.',
      'Sugerencias de maridaje o upselling inteligente impulsado por IA según los ítems del carrito.',
    ],
    opportunities: [
      'Integración de programa de lealtad / puntos para clientes frecuentes al registrar su calificación.',
      'Traducción automática y enriquecimiento de descripciones de platillos usando LLMs.',
    ],
  },
  {
    id: 'tables',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🪑',
    title: 'Mesas & QR',
    description: 'Gestión integral del salón: plano SVG interactivo, editor gráfico drag-and-drop, rotación de mesas con alertas de tiempo y módulo propio de reservaciones.',
    routes: [
      { route: '/dashboard/tables', view: 'Tablero 4-en-1: Plano SVG interactivo, Editor Drag & Drop, Vista Cuadrícula y Agenda de Reservaciones', status: 'done', roles: 'ADMIN, MANAGER, WAITER' },
      { route: '/api/tables', view: 'CRUD de mesas con capacidad, morfología (redonda/cuadrada/rectangular), coordenadas y generación de QR', status: 'done', roles: 'ADMIN' },
      { route: '/api/tables/layout', view: 'PUT guardado en batch de coordenadas (X, Y) y dimensiones del plano drag-and-drop', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/tables/[tableId]', view: 'PATCH/DELETE edición de zona, capacidad, morfología y eliminación de mesa', status: 'done', roles: 'ADMIN' },
      { route: '/api/tables/[id]/session', view: 'GET/DELETE sesión activa de una mesa y cálculo de tiempo transcurrido', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/reservations', view: 'GET/POST gestión y creación de reservaciones con validación de capacidad y fecha', status: 'done', roles: 'ADMIN, MANAGER, WAITER' },
      { route: '/api/reservations/[id]', view: 'PATCH/DELETE transición de estados (CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW)', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/plaza/[slug]', view: 'Vista pública del plano de mesas del restaurante', status: 'done', roles: 'Público' },
    ],
    observations: [
      'Plano del salón interactivo renderizado en SVG vectorial con sillas posicionadas según capacidad y morfología (redonda, cuadrada, rectangular).',
      'Editor gráfico Drag-and-Drop integrado con cuadrícula magnética (grid snap), panel de propiedades y guardado en batch vía API.',
      'Métricas de rotación y aforo en tiempo real: porcentaje de ocupación, comensales sentados, mesas libres y alertas de sobretiempo (>90m).',
      'Módulo de reservaciones completo con filtrado por fecha, asignación de mesa, estados de comensal (Confirmada, Sentada, etc.) y modal de creación.',
      'Monitoreo de tiempo transcurrido por mesa desde el inicio de la sesión QR con badges de advertencia si excede el umbral de servicio.',
      'Los QR se generan con un slug único por restaurante+mesa.',
    ],
    missing: [
      'Integración bidireccional externa con agregadores comerciales de reservas (OpenTable, Resy, TheFork).',
      'Plano 3D interactivo con Three.js para recorridos virtuales del restaurante.',
    ],
    opportunities: [
      'Notificaciones SMS/WhatsApp automáticas de confirmación y recordatorio de reserva para comensales.',
      'Predicción de tiempo de desocupación estimada de mesas basada en órdenes activas y ritmo de cocina.',
      'Pre-orden y pre-pago opcional de platos al confirmar la reservación.',
    ],
  },
  {
    id: 'orders',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🛒',
    title: 'Pedidos & Panel de Cocina',
    description: 'Sistema integral de gestión de comandas en tiempo real: panel del mesero/administrador con filtros avanzados, historial del día, métricas de rendimiento y pantalla de cocina dedicada (KDS Tablet Fullscreen).',
    routes: [
      { route: '/dashboard/orders', view: 'Panel de comandas: 3 tabs (En Vivo, Historial con búsqueda y Métricas de cocina)', status: 'done', roles: 'ADMIN, MANAGER, WAITER, KITCHEN' },
      { route: '/dashboard/kds', view: 'Pantalla de cocina dedicada (KDS) para tablets a pantalla completa con cronómetros y checklist táctil', status: 'done', roles: 'ADMIN, MANAGER, KITCHEN' },
      { route: '/api/orders', view: 'GET (lista de órdenes activas) + POST (crear comanda y emitir WebSocket)', status: 'done', roles: 'ADMIN, WAITER, Público' },
      { route: '/api/orders/[id]', view: 'GET detalle + PATCH transición de estados (RECEIVED→PREPARING→READY→DELIVERED) y prioridad', status: 'done', roles: 'ADMIN, MANAGER, WAITER, KITCHEN' },
      { route: '/api/orders/[id]/items/[itemId]', view: 'PATCH toggle de ítem completado en checklist táctil de cocina', status: 'done', roles: 'ADMIN, MANAGER, KITCHEN' },
      { route: '/api/orders/history', view: 'GET historial diario con búsqueda libre y filtros por mesero, hora, producto y estado', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/kitchen/stats', view: 'GET estadísticas de tiempos promedio de preparación, tasa a tiempo y cuellos de botella', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/kitchen/load', view: 'GET cálculo de carga en cocina y tiempo estimado de entrega', status: 'done', roles: 'Público / Sistema' },
    ],
    observations: [
      'Pantalla de cocina KDS táctil dedicada (/dashboard/kds) con soporte para tablets y modo Fullscreen nativo.',
      'Cronómetros en vivo (MM:SS) en cada comanda con cambio dinámico de color según antigüedad (<12m verde, 12-20m ámbar, >20m rojo).',
      'Sistema de alarmas audibles estridentes con Web Audio API y vibración táctil para ambientes ruidosos de cocina.',
      'Checklists táctiles plato por plato en la tablet de cocina con sincronización instantánea vía WebSockets.',
      'Priorización de órdenes (URGENTE / NORMAL) con ordenamiento prioritario al inicio de la cola.',
      'Historial diario completo con buscador predictivo y métricas consolidadas de facturación y despacho.',
      'Auditoría automática de tiempos de preparación (preparedAt y deliveredAt) para detección de cuellos de botella.',
      'Al cancelar una orden, el stock de inventario se restaura automáticamente.',
    ],
    missing: [
      'Integración con impresoras térmicas de cocina (ESC/POS de red o Bluetooth) para comandas en papel.',
      'Ruteo multi-estación de cocina (separar comandas por estación: parrilla, freidora, barra fría).',
    ],
    opportunities: [
      'Algoritmo de estimación de despacho con Machine Learning basado en histórico de horas pico.',
      'Paging por bíper digital o SMS al cliente cuando su pedido está listo para recoger en barra.',
    ],
  },
  {
    id: 'menu-admin',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🍽️',
    title: 'Catálogo del Menú (Admin)',
    description: 'Gestión del catálogo del restaurante: categorías, productos, modificadores, ingredientes removibles y menú PDF interactivo.',
    routes: [
      { route: '/dashboard/menu', view: 'Lista de categorías y productos con estado (activo/inactivo)', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/menu-pdf', view: 'Configuración y previsualización del menú en PDF con hotspots', status: 'done', roles: 'ADMIN' },
      { route: '/dashboard/additions', view: 'Gestión de adicionales/extras reutilizables', status: 'done', roles: 'ADMIN' },
      { route: '/dashboard/special-offers', view: 'Ofertas especiales con vigencia y descuento', status: 'done', roles: 'ADMIN' },
      { route: '/api/menu', view: 'CRUD de categorías y productos', status: 'done', roles: 'ADMIN' },
      { route: '/api/additions', view: 'CRUD de adicionales', status: 'done', roles: 'ADMIN' },
      { route: '/api/special-offers', view: 'CRUD de ofertas especiales', status: 'done', roles: 'ADMIN' },
    ],
    observations: [
      'Los productos pueden tener modificadores (grupo de opciones opcionales u obligatorias) y adicionales (extras con costo).',
      'El menú PDF usa hotspots interactivos sobre una imagen del menú impreso.',
      'El campo isAvailable en Product se actualiza automáticamente cuando se agota un ingrediente de su receta.',
    ],
    missing: [
      'Carga masiva de productos vía CSV/Excel.',
      'Drag-and-drop para reordenar categorías y productos.',
      'Programación de precios (happy hour, precio fin de semana).',
      'Imágenes de productos: actualmente soporta URL, pero no subida directa de imágenes.',
    ],
    opportunities: [
      'Editor de imágenes integrado con recorte automático a proporciones estándar para el menú.',
      'Precios dinámicos según horario o demanda (dynamic pricing).',
      'Control de alérgenos por producto (RGPD / normativas alimentarias).',
      'Integración con ChatGPT para generar descripciones atractivas de productos automáticamente.',
    ],
  },
  {
    id: 'branding',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🎨',
    title: 'Branding & Configuración del Restaurante',
    description: 'Personalización visual del restaurante: logo, colores, nombre, información de contacto y configuración general.',
    routes: [
      { route: '/dashboard/brand', view: 'Editor de branding: logo, colores primarios, información', status: 'done', roles: 'ADMIN' },
      { route: '/api/brand', view: 'GET/PATCH configuración de branding del restaurante', status: 'done', roles: 'ADMIN' },
    ],
    observations: [
      'El logo se almacena en Vercel Blob con acceso público.',
      'Los colores del menú QR del cliente se derivan del branding configurado.',
    ],
    missing: [
      'Preview en tiempo real del menú QR con los cambios de branding antes de guardar.',
      'Templates de diseño predefinidos para restaurantes que no quieren configurar desde cero.',
      'Dominio personalizado para el menú QR (ej: menu.mirestaurante.com).',
    ],
    opportunities: [
      'White-label completo: eliminar referencias a iMenu del menú del cliente.',
      'Theme builder visual con selector de fuentes y estilos.',
    ],
  },
  {
    id: 'food-courts',
    phase: 'Base',
    phaseColor: '#6b7280',
    icon: '🏪',
    title: 'Food Courts / Plazas',
    description: 'Soporte para plazas de comida donde múltiples restaurantes comparten el mismo espacio físico y el cliente puede ordenar de varios a la vez.',
    routes: [
      { route: '/dashboard/food-courts', view: 'Gestión de food courts asociados al restaurante', status: 'done', roles: 'ADMIN' },
      { route: '/plaza/[slug]', view: 'Vista pública del food court con lista de restaurantes y estado', status: 'done', roles: 'Público' },
      { route: '/api/food-courts', view: 'CRUD de food courts y sus restaurantes miembros', status: 'done', roles: 'ADMIN' },
    ],
    observations: [
      'La vista /plaza muestra todos los restaurantes del food court con su disponibilidad.',
      'El módulo es funcional pero su uso en la práctica depende mucho de la configuración correcta de slugs.',
    ],
    missing: [
      'Pedido unificado a múltiples restaurantes del food court en una sola transacción.',
      'Dashboard consolidado para el administrador del food court (no del restaurante individual).',
    ],
    opportunities: [
      'Sistema de comisiones entre el food court y los restaurantes miembros.',
      'Panel de reporting para el operador del food court.',
    ],
  },
  {
    id: 'billing',
    phase: 'Fase 1',
    phaseColor: '#10b981',
    icon: '🧾',
    title: 'Facturación',
    description: 'Módulo completo de facturación: cierre de mesas, registro de pagos, emisión de tickets térmicos y configuración fiscal por restaurante.',
    routes: [
      { route: '/dashboard/billing', view: 'Hub: KPIs del día, facturas recientes, estado de mesas activas', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/invoices', view: 'Listado de facturas con filtros por fecha, estado y método de pago', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/invoices/[id]', view: 'Detalle de factura: ítems, pagos, anulación, impresión, emisión DIAN', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/billing/close-table/[tableId]', view: 'Wizard de cierre de mesa: resumen, método de pago, emisión', status: 'done', roles: 'ADMIN, MANAGER, WAITER' },
      { route: '/dashboard/billing/config', view: 'Configuración fiscal: país, IVA, cargo por servicio, datos legales, formato de tickets', status: 'done', roles: 'ADMIN' },
      { route: '/api/invoices', view: 'GET (lista) + POST (crear factura desde tabla)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/invoices/[id]', view: 'GET detalle + PATCH (registrar pago, anular)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/billing/tax-config', view: 'GET/PUT configuración fiscal del restaurante', status: 'done', roles: 'ADMIN' },
      { route: '/api/pdf', view: 'Generación de PDF de factura descargable', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El IVA (19% por defecto en Colombia) se calcula automáticamente al crear la factura.',
      'La impresión térmica ESC/POS funciona vía WebUSB en Chrome/Edge. El fallback genera un PDF imprimible en cualquier navegador.',
      'Los tickets son configurables: logo, header, footer, mostrar/ocultar IVA, mesa, mesero y propina sugerida.',
      'El consecutivo de facturas (FV-0001) es auto-incremental por restaurante y se maneja atómicamente para evitar duplicados.',
      'La anulación de facturas requiere motivo y cambia el estado a VOID sin eliminar el registro.',
    ],
    missing: [
      'Reimpresión de ticket para facturas ya cerradas desde el listado (sin necesidad de entrar al detalle).',
      'Propina en el ticket: campo editable en el wizard de cierre.',
      'División de cuenta entre varios comensales (split bill).',
      'Reporte diario de ventas exportable en PDF directamente desde el hub.',
    ],
    opportunities: [
      'Envío de factura por WhatsApp o email directamente al cliente desde el detalle.',
      'Integración con POS físico como Ingenico o Verifone para confirmar cobros con tarjeta.',
      'Factura proforma o presupuesto para eventos/grupos grandes.',
    ],
  },
  {
    id: 'inventory',
    phase: 'Fase 1',
    phaseColor: '#10b981',
    icon: '📦',
    title: 'Inventario',
    description: 'Control de insumos, recetas por producto, compras a proveedores, ajustes manuales, mermas y alertas de stock bajo en tiempo real.',
    routes: [
      { route: '/dashboard/inventory', view: 'Hub: stock actual, alertas de bajo inventario, movimientos recientes', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/[id]', view: 'Detalle de ítem: stock, movimientos, edición', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/movements', view: 'Historial completo de movimientos de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/new', view: 'Formulario de creación de nuevo ítem de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/dashboard/inventory/recipes', view: 'Editor de recetas: asignar ingredientes y cantidades a cada producto', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory', view: 'CRUD de ítems de inventario', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/[id]', view: 'GET/PATCH/DELETE ítem individual', status: 'done', roles: 'ADMIN, MANAGER' },
      { route: '/api/inventory/movements', view: 'GET historial + POST ajuste/compra manual', status: 'done', roles: 'ADMIN, MANAGER' },
    ],
    observations: [
      'El descuento de stock se ejecuta atómicamente en la misma transacción de base de datos que el cambio de estado de la orden a RECEIVED.',
      'Si el stock de un ingrediente llega a 0, el sistema calcula los productos afectados y emite product:unavailable por Socket.IO.',
      'El costo unitario de cada insumo permite calcular el costo de ventas (COGS) para el P&L.',
      'Las unidades soportadas: KG, GRAM, LITER, ML, UNIT, PORTION.',
    ],
    missing: [
      'Módulo de compras/proveedores: registro formal de proveedores con historial de pedidos.',
      'Inventario físico periódico: formulario para contar manualmente el stock y cuadrar diferencias.',
      'Predicción de reposición: "En X días te quedarás sin Y insumo según tu consumo promedio".',
      'Transferencias entre sucursales (contemplado en el roadmap como Fase 3 pero no implementado).',
      'Valorización de inventario: valor total del stock en COP.',
    ],
    opportunities: [
      'Integración con proveedores para generar órdenes de compra directamente desde el sistema.',
      'Alertas automáticas por WhatsApp o email al proveedor cuando el stock baja del mínimo.',
      'Código de barras/QR en los insumos para agilizar conteos físicos con escáner.',
    ],
  },
  {
    id: 'accounting',
    phase: 'Fase 2',
    phaseColor: '#3b82f6',
    icon: '📊',
    title: 'Contabilidad',
    description: 'Módulo contable completo: gastos, cierre de caja, P&L mensual, reporte IVA DIAN y períodos contables con cierre formal.',
    routes: [
      { route: '/dashboard/accounting', view: 'Hub: P&L del mes, widget fiscal DIAN, arqueo del día, accesos rápidos', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/expenses', view: 'Libro de gastos: tabla, búsqueda, filtros por categoría, modal de registro', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/cash-register', view: 'Historial de arqueos y wizard de cierre de caja diario', status: 'done', roles: 'ADMIN, ACCOUNTANT, MANAGER' },
      { route: '/dashboard/accounting/periods', view: 'Períodos contables: ver, cerrar mes, historial', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports', view: 'Hub de reportes contables', status: 'partial', roles: 'ADMIN, ACCOUNTANT', notes: 'Existe el directorio pero la ruta hub puede redirigir directamente a sub-reportes' },
      { route: '/dashboard/accounting/reports/pl', view: 'Estado de Resultados P&L: ventas netas, COGS, gastos OPEX, margen neto', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/dashboard/accounting/reports/vat', view: 'Reporte de IVA: formulario 300 DIAN, IVA generado vs descontable', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/expenses', view: 'GET lista + POST nuevo gasto', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/cash-register', view: 'GET historial + POST cierre de caja', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/periods', view: 'GET lista + POST cerrar período', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/reports/pl', view: 'GET cálculo P&L para un período dado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/accounting/reports/vat', view: 'GET cálculo IVA para un mes dado', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El motor contable (lib/accounting/) tiene adaptadores por país: colombia.ts (predeterminado), generic.ts.',
      'El Formulario 300 simulado es útil como guía, pero NO reemplaza la declaración oficial en el portal MUISCA.',
      'Los gastos con IVA discriminan el 19% acreditable automáticamente al registrar el monto total.',
      'El cierre de caja permite detectar diferencias entre ventas electrónicas y conteo físico de gaveta.',
      'Los períodos contables cerrados bloquean modificaciones retroactivas de facturas y gastos.',
    ],
    missing: [
      'Reporte de flujo de caja (cashflow) contemplado en el roadmap pero falta la ruta /dashboard/accounting/reports/cashflow.',
      'Exportación de reportes P&L e IVA a Excel/PDF directamente desde la UI.',
      'Integración real con MUISCA DIAN para pre-llenar el Formulario 300 (requiere credenciales del RUT).',
      'Contabilidad de depreciación de activos fijos (equipos de cocina, etc.).',
      'Manejo de retención en la fuente para clientes empresariales.',
    ],
    opportunities: [
      'Generar el archivo plano (.xml) del Formulario 300 para importación directa en MUISCA.',
      'Módulo de nómina simplificado para registrar salarios como gasto de LABOR.',
      'Conciliación bancaria: importar extracto del banco y cruzarlo con los movimientos registrados.',
    ],
  },
  {
    id: 'saas',
    phase: 'Fase 3',
    phaseColor: '#8b5cf6',
    icon: '🏢',
    title: 'SaaS & Multi-sucursal',
    description: 'Infraestructura SaaS: organizaciones, suscripciones con Stripe, roles de franquicia y panel de SUPERADMIN para gestión de la plataforma.',
    routes: [
      { route: '/pricing', view: 'Página pública de precios: Basic, Pro, Enterprise con comparativa', status: 'done', roles: 'Público' },
      { route: '/dashboard/org', view: 'Hub de franquicia: monitoreo en vivo de sucursales, mesas y facturación', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/org/branches', view: 'Gestión de sucursales: crear nueva sede con control de límites del plan', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/org/reports', view: 'Reportes consolidados: ventas totales de la cadena, comparativa por sede', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/dashboard/settings/billing', view: 'Facturación SaaS: plan actual, trial, upgrade mensual/anual', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/dashboard/superadmin', view: 'Panel global: MRR, clientes activos, sedes, métricas de plataforma', status: 'done', roles: 'SUPERADMIN' },
      { route: '/dashboard/superadmin/organizations', view: 'Lista de organizaciones con modificación manual de plan', status: 'done', roles: 'SUPERADMIN' },
      { route: '/api/billing/subscription', view: 'GET estado suscripción + POST crear sesión de checkout Stripe', status: 'done', roles: 'ADMIN, ORG_ADMIN' },
      { route: '/api/webhooks/stripe', view: 'Handler de eventos Stripe: payment_succeeded, subscription.deleted', status: 'done', roles: 'Sistema (Stripe)' },
      { route: '/api/org/branches', view: 'GET/POST sucursales de la organización', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/api/org/reports', view: 'GET métricas consolidadas de todas las sucursales', status: 'done', roles: 'ORG_ADMIN' },
      { route: '/api/superadmin/organizations', view: 'GET/PATCH organizaciones de la plataforma', status: 'done', roles: 'SUPERADMIN' },
    ],
    observations: [
      'Los límites de sucursales por plan se validan al crear una nueva sede: BASIC=1, PRO=5, ENTERPRISE=ilimitado.',
      'El trial de 14 días se activa automáticamente al crear una organización. Al expirar, el acceso queda bloqueado hasta suscribirse.',
      'El middleware verifica el estado de la suscripción en cada request a /dashboard.',
      'El descuento del 20% en plan anual se aplica en el precio del Stripe Checkout.',
      'El portal de cliente de Stripe permite al usuario autogestionar su suscripción (cancelar, actualizar tarjeta).',
    ],
    missing: [
      'Email de bienvenida al registrarse con instrucciones de onboarding.',
      'Notificación de prueba por expirar (3 días antes, 1 día antes).',
      'Facturación en moneda local (COP, MXN) en Stripe — actualmente puede estar en USD.',
      'Página de éxito/error del checkout de Stripe con instrucciones claras.',
      'Revocación automática de acceso a sucursales que exceden el plan al degradar.',
    ],
    opportunities: [
      'Programa de referidos: código de descuento para nuevos clientes referidos.',
      'API pública para integraciones de terceros (POS, sistemas de delivery).',
      'White-label del producto: un restaurante puede vender iMenu como su propio producto a sus clientes.',
    ],
  },
  {
    id: 'analytics',
    phase: 'Fase 4',
    phaseColor: '#f59e0b',
    icon: '📈',
    title: 'Analytics & Business Intelligence',
    description: 'Dashboard de inteligencia de negocio con análisis de horas pico, tendencias semanales, rotación de mesas, análisis ABC de rentabilidad y exportación de datos.',
    routes: [
      { route: '/dashboard/analytics', view: 'Dashboard BI: horas pico, ventas por día de semana, rotación, análisis ABC', status: 'done', roles: 'ADMIN, ACCOUNTANT, ORG_ADMIN' },
      { route: '/api/analytics/dashboard', view: 'GET métricas analíticas calculadas por el motor (lib/analytics/engine.ts)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
      { route: '/api/analytics/export', view: 'GET exportación CSV de facturas y libros contables', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'El motor de analytics (lib/analytics/engine.ts) calcula: ventas por hora, ventas por día de la semana, rotación de mesas y clasificación ABC.',
      'El análisis ABC clasifica productos por margen × volumen: A (top 20% en rentabilidad), B (siguiente 30%), C (resto).',
      'La exportación CSV genera archivos separados: facturas, ítems, gastos.',
    ],
    missing: [
      'Comparativa temporal: mes vs mes anterior, año vs año anterior.',
      'Gráficas visuales (actualmente los datos se calculan pero la UI puede ser tabular — verificar renderizado).',
      'Análisis de ticket promedio por mesa, por día de semana y por mesero.',
      'Heatmap visual de mesas por ocupación y rotación.',
      'Predicción de demanda basada en histórico (ML o regresión simple).',
    ],
    opportunities: [
      'Dashboard ejecutivo en tiempo real con KPIs del día en una pantalla de TV del restaurante.',
      'Reporte automático semanal/mensual enviado por email al ADMIN con los principales KPIs.',
      'Integración con Google Analytics o Mixpanel para tracking del comportamiento en el menú QR.',
      'Segmentación de ventas por tipo de cliente (mesa vs delivery vs barra).',
    ],
  },
  {
    id: 'dian',
    phase: 'Fase 4',
    phaseColor: '#f59e0b',
    icon: '⚡',
    title: 'Factura Electrónica DIAN',
    description: 'Integración SOAP directa con la DIAN de Colombia para emisión de facturas electrónicas UBL 2.1 sin dependencia de PTH externo.',
    routes: [
      { route: '/dashboard/settings/electronic-invoicing', view: 'Wizard de habilitación DIAN: Software ID, PIN, clave técnica, resolución, certificado .p12', status: 'done', roles: 'ADMIN' },
      { route: '/api/billing/electronic-invoicing/config', view: 'GET/PUT configuración DIAN del restaurante', status: 'done', roles: 'ADMIN' },
      { route: '/api/billing/electronic-invoicing/send', view: 'POST envío de factura a DIAN (SendBillAsync)', status: 'done', roles: 'ADMIN, ACCOUNTANT' },
    ],
    observations: [
      'La librería lib/dian/ implementa: generador UBL 2.1, firmador XML (node-forge), calculador CUFE SHA-384, cliente SOAP y empaquetado ZIP.',
      'El certificado .p12 se almacena cifrado con AES-256 en Vercel Blob en un bucket privado.',
      'El sistema soporta ambientes de habilitación y producción.',
      'El widget DianInvoiceAction integrado en /dashboard/billing/invoices/[id] muestra el estado del envío y el CUFE.',
    ],
    missing: [
      'Proceso de set de pruebas (SendTestSetAsync) para habilitación automática ante la DIAN — actualmente el admin debe hacerlo manualmente.',
      'Polling automático del estado de facturas enviadas (GetStatusZip) — el estado puede quedar "pending" si no se revisa manualmente.',
      'Cancelación electrónica de facturas ante la DIAN (SendEventUpdateStatus con código de anulación).',
      'Nota débito y nota crédito electrónicas.',
      'Manejo de acuse de recibo del comprador (obligatorio en algunas transacciones B2B).',
    ],
    opportunities: [
      'Verificación pública de CUFE en el portal DIAN integrada como botón en la factura.',
      'Soporte para factura contingencia cuando el servicio DIAN no está disponible.',
      'Extensión a México (SAT/CFDI 4.0) y Chile (SII/DTE) usando los adaptadores contemplados en el roadmap.',
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
        <div className="mb-16">
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
          <p className="text-zinc-400 mb-10">Evaluación honesta del producto y prioridades de próximo desarrollo.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Strengths */}
            <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-emerald-400 mb-4">✅ Fortalezas del producto</h3>
              <ul className="space-y-3">
                {[
                  'Stack moderno y escalable: Next.js 16 App Router + Prisma + Socket.IO + Redis.',
                  'Ciclo operativo completo: QR → Pedido → Inventario → Factura → Contabilidad.',
                  'Facturación electrónica DIAN sin PTH externo, reduciendo costos por factura.',
                  'Multi-tenant real con organizaciones, roles granulares y Stripe integrado.',
                  'Tiempo real en toda la plataforma: pedidos, stock, estados de mesa.',
                  'Motor contable con adaptadores multi-país (Colombia, México, Chile).',
                  'Analytics BI con análisis ABC y detección de horas pico.',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-500 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical gaps */}
            <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-red-400 mb-4">🚨 Gaps críticos para producción</h3>
              <ul className="space-y-3">
                {[
                  'Flujo de registro público y onboarding: los nuevos clientes no pueden auto-registrarse.',
                  'Reset de contraseña: sin esta funcionalidad no se puede lanzar al público.',
                  'Reporte de cashflow: el roadmap lo contempla pero la ruta no existe aún.',
                  'Set de pruebas DIAN automatizado: el wizard está, pero el admin debe enviar los casos manualmente.',
                  'Cancelación electrónica ante DIAN (SendEventUpdateStatus): sin esto la anulación solo existe en iMenu, no ante la DIAN.',
                  'Notificaciones por email: no hay emails transaccionales (bienvenida, facturas, alertas de stock).',
                  'Exportación de reportes P&L e IVA a PDF/Excel desde la UI.',
                ].map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-red-500 mt-0.5">✗</span> {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick wins */}
            <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-amber-400 mb-4">⚡ Quick wins de alto impacto</h3>
              <ul className="space-y-3">
                {[
                  'Envío de factura por WhatsApp (link wa.me + PDF adjunto) — 1 día de desarrollo.',
                  'Notificación push al cliente cuando su pedido está listo — Web Push API.',
                  'Email transaccional con Resend o SendGrid para facturas, alertas y bienvenida.',
                  'KDS (Kitchen Display System) fullscreen para tablets de cocina.',
                  'Historial de pedidos visible para el cliente en el menú QR durante su sesión.',
                  'Exportación a Excel de facturas e inventario para RESTAURANT_ADMIN.',
                  'Preview en tiempo real del branding en el menú QR.',
                ].map((qw, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-amber-500 mt-0.5">→</span> {qw}
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic opportunities */}
            <div className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-violet-400 mb-4">🚀 Oportunidades estratégicas</h3>
              <ul className="space-y-3">
                {[
                  'App nativa (React Native / Expo) para meseros: más rápida que la web en campo.',
                  'Integración con plataformas de delivery (Rappi, Uber Eats) para pedidos externos.',
                  'Motor de recomendaciones: "los clientes de esta mesa también pidieron...".',
                  'Expansión a México (CFDI 4.0 SAT) y Chile (DTE SII) reutilizando los adaptadores.',
                  'Módulo de reservaciones integrado con Google Calendar y notificaciones.',
                  'Marketplace de iMenu: la plataforma puede monetizarse como mercado de restaurantes.',
                  'IA generativa: descripciones de platillos, sugerencias de precios, análisis de reseñas.',
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
              { path: '/api/orders', tag: 'RT' },
              { path: '/api/orders/[id]', tag: 'RT' },
              { path: '/api/tables', tag: 'CRUD' },
              { path: '/api/tables/[id]/session', tag: 'Session' },
              { path: '/api/menu', tag: 'CRUD' },
              { path: '/api/additions', tag: 'CRUD' },
              { path: '/api/special-offers', tag: 'CRUD' },
              { path: '/api/brand', tag: 'Config' },
              { path: '/api/food-courts', tag: 'CRUD' },
              { path: '/api/invoices', tag: 'Billing' },
              { path: '/api/invoices/[id]', tag: 'Billing' },
              { path: '/api/pdf', tag: 'PDF' },
              { path: '/api/billing/tax-config', tag: 'Config' },
              { path: '/api/billing/subscription', tag: 'Stripe' },
              { path: '/api/billing/electronic-invoicing/config', tag: 'DIAN' },
              { path: '/api/billing/electronic-invoicing/send', tag: 'DIAN' },
              { path: '/api/inventory', tag: 'CRUD' },
              { path: '/api/inventory/[id]', tag: 'CRUD' },
              { path: '/api/inventory/movements', tag: 'CRUD' },
              { path: '/api/accounting/expenses', tag: 'Contab.' },
              { path: '/api/accounting/cash-register', tag: 'Contab.' },
              { path: '/api/accounting/periods', tag: 'Contab.' },
              { path: '/api/accounting/reports/pl', tag: 'Report' },
              { path: '/api/accounting/reports/vat', tag: 'Report' },
              { path: '/api/org/branches', tag: 'SaaS' },
              { path: '/api/org/reports', tag: 'SaaS' },
              { path: '/api/superadmin/organizations', tag: 'Admin' },
              { path: '/api/webhooks/stripe', tag: 'Webhook' },
              { path: '/api/analytics/dashboard', tag: 'BI' },
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
