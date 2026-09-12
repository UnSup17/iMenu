export type RoleType =
  | 'SUPERADMIN'
  | 'ORG_ADMIN'
  | 'FOOD_COURT_ADMIN'
  | 'RESTAURANT_ADMIN'
  | 'ACCOUNTANT'
  | 'MANAGER'
  | 'WAITER'
  | 'KITCHEN'

export interface CalloutPin {
  id: number
  label: string
  description: string
  zone: string
}

export interface StepItem {
  stepNumber: number
  title: string
  detail: string
  tip?: string
}

export interface Considerations {
  prerequisites: string[]
  warnings: string[]
  bestPractices: string[]
  crossModuleImpact: string[]
}

export interface FunctionalityItem {
  id: string
  title: string
  module: string
  moduleIcon: string
  route: string
  allowedRoles: RoleType[]
  targetAudience: string
  summary: string
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado'
  estimatedMinutes: number
  tags: string[]
  uiMockup: {
    previewTitle: string
    previewBadge: string
    uiType: 'tables' | 'kds' | 'orders' | 'menu' | 'inventory' | 'cashier' | 'dian' | 'team' | 'brand' | 'generic'
    pins: CalloutPin[]
  }
  steps: StepItem[]
  considerations: Considerations
}

export const ROLE_LABELS: Record<RoleType, { label: string; badgeColor: string; description: string }> = {
  SUPERADMIN: {
    label: 'Super Administrador',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Acceso total a métricas SaaS globales, clientes y control de plataforma.',
  },
  ORG_ADMIN: {
    label: 'Admin de Franquicia',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Supervisión y control consolidado de todas las sucursales y franquicias.',
  },
  FOOD_COURT_ADMIN: {
    label: 'Admin de Plaza',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    description: 'Gestión de plazas gastronómicas compartidas y comisiones.',
  },
  RESTAURANT_ADMIN: {
    label: 'Administrador de Local',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Control absoluto del restaurante: menú, salón, facturación, equipo y marca.',
  },
  MANAGER: {
    label: 'Gerente Operativo',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    description: 'Operación completa de salón, KDS, pedidos, inventario y arqueos de turno.',
  },
  WAITER: {
    label: 'Mesero / Salón',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Atención en salón, toma de comandas, estado de mesas y pre-cuentas.',
  },
  KITCHEN: {
    label: 'Chef / Cocina (KDS)',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Tablero KDS en vivo, tiempos de preparación y despacho de comandas.',
  },
  ACCOUNTANT: {
    label: 'Contador / Finanzas',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Cierres de caja, facturas electrónicas DIAN, libros de gastos y P&L.',
  },
}

export const MODULE_CATEGORIES = [
  { id: 'all', label: 'Todas las funcionalidades', icon: '✨' },
  { id: 'salon', label: 'Salón & Mesas', icon: '🪑' },
  { id: 'comandas', label: 'Toma de Pedidos', icon: '📋' },
  { id: 'cocina', label: 'Cocina & KDS', icon: '🍳' },
  { id: 'menu', label: 'Menú & Catálogo', icon: '🍽️' },
  { id: 'inventario', label: 'Inventario & Recetas', icon: '📦' },
  { id: 'caja', label: 'Facturación & Caja', icon: '💰' },
  { id: 'contabilidad', label: 'Contabilidad & DIAN', icon: '🏛️' },
  { id: 'equipo', label: 'Equipo & Seguridad', icon: '👥' },
  { id: 'franquicia', label: 'Franquicia & Sedes', icon: '🏢' },
]

export const WALKTHROUGH_DATA: FunctionalityItem[] = [
  // ─── 1. Salón & Mesas: Plano SVG Interactivo ──────────────────────────────
  {
    id: 'tables-floorplan',
    title: 'Plano SVG Interactivo & Monitoreo del Salón',
    module: 'Salón & Mesas',
    moduleIcon: '🪑',
    route: '/dashboard/tables',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER'],
    targetAudience: 'Meseros, Capitanes de salón, Gerentes y Administradores.',
    summary:
      'Supervisa la ocupación en tiempo real del salón en un plano visual interactivo. Identifica mesas libres, sesiones QR activas, tiempos de permanencia y alertas de llamados de clientes.',
    difficulty: 'Básico',
    estimatedMinutes: 5,
    tags: ['Salón', 'Mesas', 'Plano SVG', 'En vivo', 'QR'],
    uiMockup: {
      previewTitle: 'Tablero del Salón — Vista Plano SVG',
      previewBadge: 'Sincronizado vía Socket.IO en tiempo real',
      uiType: 'tables',
      pins: [
        {
          id: 1,
          label: 'Selector de Vistas',
          description: 'Alterna entre Plano SVG, Editor Drag & Drop, Vista Cuadrícula y Reservas.',
          zone: 'Encabezado superior',
        },
        {
          id: 2,
          label: 'Mesa con Sesión QR Activa',
          description: 'Color ámbar/esmeralda: Comensales sentados ordenando desde su celular.',
          zone: 'Centro del plano',
        },
        {
          id: 3,
          label: 'Mesa Disponible',
          description: 'Color gris tenue con contorno: lista para recibir nuevos comensales.',
          zone: 'Zona lateral',
        },
        {
          id: 4,
          label: 'Panel Rápido de Mesa',
          description: 'Muestra comensales activos, monto acumulado, tiempo sentados y botón de pre-cuenta.',
          zone: 'Panel lateral derecho',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Ingreso al Tablero',
        detail:
          'Haz clic en "Mesas" en la barra lateral de navegación o accede directamente a /dashboard/tables.',
        tip: 'La pantalla se sincroniza automáticamente sin recargar gracias a WebSockets.',
      },
      {
        stepNumber: 2,
        title: 'Lectura del Código de Colores',
        detail:
          'Verde/Gris: Mesa Disponible. Ámbar pulsante: Sesión QR activa con pedidos en curso. Azul: Servicio Tradicional. Rojo suave: Mesa solicitando atención o cuenta.',
      },
      {
        stepNumber: 3,
        title: 'Abrir Detalles de una Mesa',
        detail:
          'Haz clic sobre cualquier mesa en el plano SVG. Se abrirá la tarjeta informativa con el número de personas, pedidos activos y botón para generar pre-cuenta o liberar la mesa.',
      },
      {
        stepNumber: 4,
        title: 'Liberar o Cerrar Sesión',
        detail:
          'Al completar el servicio y verificar el pago, presiona "Liberar Mesa" para dejarla disponible para el siguiente turno.',
        tip: 'Liberar una mesa archiva la sesión y resetea el carrito digital para los siguientes clientes.',
      },
    ],
    considerations: {
      prerequisites: [
        'Tener al menos una mesa creada en el sistema.',
        'Haber impreso o dispuesto el código QR en la mesa física para el modo digital.',
      ],
      warnings: [
        'No liberes una mesa si los clientes aún tienen comandas pendientes de pago en caja.',
        'Si el plano no carga, verifica tu conexión a internet o refresca la página para reconectar el WebSocket.',
      ],
      bestPractices: [
        'Monitorea el contador de tiempo de las mesas para anticipar la rotación en horas pico.',
        'Atiende de inmediato las mesas con icono de campana (solicitud de asistencia al mesero).',
      ],
      crossModuleImpact: [
        'Al cerrar o liberar la mesa se actualiza la disponibilidad en el dashboard y se refleja en los reportes de ocupación.',
        'Si la mesa tiene pedidos abiertos, deben saldarse en el módulo de Facturación.',
      ],
    },
  },

  // ─── 2. Salón & Mesas: Editor Drag & Drop ─────────────────────────────────
  {
    id: 'tables-editor',
    title: 'Diseñador de Salón & Editor Drag-and-Drop',
    module: 'Salón & Mesas',
    moduleIcon: '🪑',
    route: '/dashboard/tables',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'],
    targetAudience: 'Administradores y Gerentes responsables de la distribución física.',
    summary:
      'Modela la distribución exacta de tu restaurante: arrastra mesas, ajusta formas (redondas, cuadradas, rectangulares), capacidad de sillas y genera códigos QR listos para imprimir.',
    difficulty: 'Intermedio',
    estimatedMinutes: 8,
    tags: ['Editor', 'Drag & Drop', 'Distribución', 'Configuración de Salón'],
    uiMockup: {
      previewTitle: 'Editor Gráfico de Salón',
      previewBadge: 'Arrastra y ajusta coordenadas milimétricas',
      uiType: 'tables',
      pins: [
        {
          id: 1,
          label: 'Herramienta Nueva Mesa',
          description: 'Formulario flotante para indicar número, capacidad (2, 4, 8 pers.) y morfología.',
          zone: 'Barra de herramientas superior',
        },
        {
          id: 2,
          label: 'Lienzo SVG con Grilla Magnética',
          description: 'Cuadrícula con ajuste automático para alinear mesas prolijamente.',
          zone: 'Lienzo central',
        },
        {
          id: 3,
          label: 'Descarga Masiva de QR',
          description: 'Genera un PDF con todos los códigos QR formateados con logo para mesa.',
          zone: 'Esquina superior derecha',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Activar el Modo Editor',
        detail:
          'En /dashboard/tables, haz clic en la pestaña "Editor de Plano" o activa el interruptor de edición.',
      },
      {
        stepNumber: 2,
        title: 'Agregar una Nueva Mesa',
        detail:
          'Haz clic en "+ Nueva Mesa", escribe el nombre o número (ej: "Mesa 12", "Terraza 3"), define la capacidad y selecciona si es Redonda o Rectangular.',
      },
      {
        stepNumber: 3,
        title: 'Posicionar en el Lienzo',
        detail:
          'Arrastra la mesa a su ubicación física real. El lienzo guardará automáticamente las coordenadas X/Y en la base de datos.',
        tip: 'Mantén un espaciado realista entre mesas para que los meseros identifiquen la zona al instante en tabletas.',
      },
      {
        stepNumber: 4,
        title: 'Exportar Códigos QR',
        detail:
          'Haz clic en "Descargar Códigos QR" para obtener los archivos listos para imprimir en acrílicos o stickers de mesa.',
      },
    ],
    considerations: {
      prerequisites: [
        'Permiso de Administrador o Gerente.',
        'Tener clara la distribución física y numeración del salón.',
      ],
      warnings: [
        'No elimines una mesa que tenga un pedido activo o sesión en curso; el sistema bloqueará el borrado para evitar inconsistencias.',
      ],
      bestPractices: [
        'Nombra las mesas con prefijos por zona (ej: "INT-01" para interior, "TER-01" para terraza).',
        'Imprime los códigos QR con laminado mate para evitar reflejos de luz que dificulten el escaneo con cámaras de celulares.',
      ],
      crossModuleImpact: [
        'Cada mesa creada genera una URL única accesible por el cliente en /menu/[slug]/[tableSlug].',
      ],
    },
  },

  // ─── 3. Cocina & KDS: Tablero en Tiempo Real ──────────────────────────────
  {
    id: 'kds-screen',
    title: 'KDS (Kitchen Display System) — Pantalla de Cocina',
    module: 'Cocina & KDS',
    moduleIcon: '🍳',
    route: '/dashboard/kds',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'KITCHEN'],
    targetAudience: 'Jefes de cocina, cocineros, bartenders y despachadores.',
    summary:
      'Sustituye los tickets de papel por comandas digitales interactivas. Controla los tiempos de cocción con colores por urgencia, modifica estados y despacha platos en 1 clic.',
    difficulty: 'Básico',
    estimatedMinutes: 5,
    tags: ['Cocina', 'KDS', 'Comandas', 'Tiempo Real', 'Despacho'],
    uiMockup: {
      previewTitle: 'KDS — Tablero de Producción en Vivo',
      previewBadge: 'Actualización instantánea y timbre sonoro',
      uiType: 'kds',
      pins: [
        {
          id: 1,
          label: 'Filtro por Estación',
          description: 'Alterna entre Todas, Cocina Caliente, Cocina Fría, Postres y Barra.',
          zone: 'Barra superior',
        },
        {
          id: 2,
          label: 'Ticket de Comanda',
          description: 'Muestra Mesa, Hora de entrada, Cronómetro en vivo y lista de platos con notas.',
          zone: 'Columna de Recibidos',
        },
        {
          id: 3,
          label: 'Botón de Cambio de Estado',
          description: 'Pasa el plato o ticket de "RECIBIDO" ➔ "EN PREPARACIÓN" ➔ "LISTO".',
          zone: 'Pie del ticket',
        },
        {
          id: 4,
          label: 'Indicador de Carga',
          description: 'Muestra el tiempo promedio de despacho y carga actual de la cocina.',
          zone: 'Cabecera de métricas',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir KDS en la Pantalla de Cocina',
        detail:
          'Inicia sesión con el usuario de cocina (ej: cocina@demo.com) o navega a /dashboard/kds en la tableta o monitor de la estación.',
        tip: 'Presiona F11 en el navegador para activar el modo pantalla completa sin barras de navegación.',
      },
      {
        stepNumber: 2,
        title: 'Recepción de Comanda Sonora',
        detail:
          'Cuando entra un nuevo pedido desde una mesa o mesero, el sistema reproduce un sonido característico y resalta el ticket nuevo con borde brillante.',
      },
      {
        stepNumber: 3,
        title: 'Iniciar Preparación',
        detail:
          'El cocinero pulsa "Preparar" (o la tecla rápida). El ticket pasa a color ámbar y el comensal ve en su celular el estado "En Cocina".',
      },
      {
        stepNumber: 4,
        title: 'Marcar como Listo / Despachado',
        detail:
          'Al emplatar, presiona "Listo". Se envía una notificación Web Push inmediata al celular del cliente y al mesero para retirar el plato.',
      },
    ],
    considerations: {
      prerequisites: [
        'Habilitar el permiso de sonido en el navegador al iniciar la jornada para escuchar las alertas.',
        'Configurar el dispositivo en pantalla fija sin suspensión de energía.',
      ],
      warnings: [
        'Si un ticket sobrepasa los 15 minutos sin despacho, cambiará a color rojo indicando retraso operativo.',
      ],
      bestPractices: [
        'Lee atentamente las notas en rojo dentro de cada plato (ej: "Sin cebolla", "Alergia a mariscos").',
        'Despacha primero los tickets más antiguos (orden FIFO: First In, First Out).',
      ],
      crossModuleImpact: [
        'Al marcar "Listo" en el KDS se actualiza el tiempo de espera estimado en el menú público de los demás comensales.',
      ],
    },
  },

  // ─── 4. Toma de Pedidos & Comandas Manuales ────────────────────────────────
  {
    id: 'orders-intake',
    title: 'Toma de Comandas & Pedidos de Salón',
    module: 'Toma de Pedidos',
    moduleIcon: '📋',
    route: '/dashboard/orders',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER'],
    targetAudience: 'Meseros y Capitanes para atención presencial.',
    summary:
      'Registra pedidos tradicionales tomados por el mesero en mesa, agrega notas especiales por plato, selecciona extras/modificadores y envía la comanda a cocina sin demoras.',
    difficulty: 'Básico',
    estimatedMinutes: 6,
    tags: ['Comandas', 'Meseros', 'Pedidos Manuales', 'Salón'],
    uiMockup: {
      previewTitle: 'Módulo de Pedidos — Toma de Comanda',
      previewBadge: 'Diseño táctil optimizado para smartphone/tablet',
      uiType: 'orders',
      pins: [
        {
          id: 1,
          label: 'Selección de Mesa',
          description: 'Desplegable rápido para asignar el pedido a la mesa correspondiente.',
          zone: 'Cabecera de comanda',
        },
        {
          id: 2,
          label: 'Selector Rápido de Categorías',
          description: 'Filtra entradas, fuertes, bebidas, cócteles y postres con 1 toque.',
          zone: 'Barra lateral de catálogo',
        },
        {
          id: 3,
          label: 'Personalización de Plato',
          description: 'Modal para término de cocción, adiciones pagas y notas para el chef.',
          zone: 'Ventana flotante',
        },
        {
          id: 4,
          label: 'Botón Enviar a Cocina',
          description: 'Dispara la comanda a las pantallas KDS de cocina y bar instantáneamente.',
          zone: 'Barra inferior',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Abrir Nueva Comanda',
        detail:
          'En /dashboard/orders o directamente desde la mesa en /dashboard/tables, pulsa "+ Tomar Pedido".',
      },
      {
        stepNumber: 2,
        title: 'Seleccionar Mesa y Comensales',
        detail:
          'Indica la mesa que estás atendiendo. Puedes asignar un apodo o número de puesto a cada plato.',
      },
      {
        stepNumber: 3,
        title: 'Agregar Platos con Modificadores',
        detail:
          'Toca el producto deseado. Si tiene variantes obligatorias (ej: Término de la carne) o extras (ej: Queso extra, Tocineta), selecciónalas antes de confirmar.',
        tip: 'Escribe notas claras para cocina como "Alergia al maní" o "Salsa aparte".',
      },
      {
        stepNumber: 4,
        title: 'Confirmar y Disparar a Cocina',
        detail:
          'Revisa el resumen con el cliente y pulsa "Enviar a Cocina". La comanda aparecerá de inmediato en el KDS.',
      },
    ],
    considerations: {
      prerequisites: ['El menú debe tener productos activos con precios configurados.'],
      warnings: [
        'Verifica dos veces el número de mesa antes de pulsar enviar para evitar preparar platos en mesas equivocadas.',
      ],
      bestPractices: [
        'Confirma con el cliente los extras con costo adicional antes de cargarlos.',
        'Utiliza el buscador por texto para encontrar platos complejos rápidamente.',
      ],
      crossModuleImpact: [
        'Descuenta automáticamente ingredientes del inventario si el plato tiene receta configurada.',
        'Alimenta la pre-cuenta de la mesa en el módulo de facturación.',
      ],
    },
  },

  // ─── 5. Menú & Catálogo: Gestor de Platos & Precios ────────────────────────
  {
    id: 'menu-catalog',
    title: 'Gestor de Menú, Precios & Categorías',
    module: 'Menú & Catálogo',
    moduleIcon: '🍽️',
    route: '/dashboard/menu',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'],
    targetAudience: 'Administradores, Gerentes de Alimentos & Bebidas y Chefs ejecutivos.',
    summary:
      'Crea y edita categorías, platos, descripciones gastronómicas, fotografías apetitosas, alérgenos, precios con impuestos y activa/desactiva disponibilidad al instante.',
    difficulty: 'Intermedio',
    estimatedMinutes: 8,
    tags: ['Menú', 'Platos', 'Precios', 'Fotos', 'Categorías', 'Alérgenos'],
    uiMockup: {
      previewTitle: 'Gestor de Menú Digital',
      previewBadge: 'Cambios reflejados en tiempo real en los QR',
      uiType: 'menu',
      pins: [
        {
          id: 1,
          label: 'Estructura de Categorías',
          description: 'Crea, reordena y activa categorías como Entradas, Fuertes o Bebidas.',
          zone: 'Columna izquierda',
        },
        {
          id: 2,
          label: 'Tarjeta de Producto',
          description: 'Muestra foto, nombre, precio, estado de disponibilidad y botón de edición.',
          zone: 'Grilla de productos',
        },
        {
          id: 3,
          label: 'Interruptor de Disponibilidad (Agotado)',
          description: 'Marca un plato como agotado con 1 clic para evitar que los clientes lo pidan.',
          zone: 'Esquina de cada tarjeta',
        },
        {
          id: 4,
          label: 'Cargador de Fotografía',
          description: 'Sube imágenes de alta resolución optimizadas para carga rápida móvil.',
          zone: 'Modal de edición',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Navegar al Gestor de Menú',
        detail: 'Ingresa a /dashboard/menu desde el menú lateral.',
      },
      {
        stepNumber: 2,
        title: 'Crear o Modificar Categoría',
        detail:
          'Haz clic en "+ Nueva Categoría", asígnale un nombre atractivo (ej: "Cortes Madurados") y un orden de aparición.',
      },
      {
        stepNumber: 3,
        title: 'Agregar un Nuevo Plato',
        detail:
          'Haz clic en "+ Nuevo Ítem". Completa el nombre, descripción sensorial, precio base, categoría y marca los alérgenos pertinentes (gluten, lácteos, mariscos).',
        tip: 'Las fotos bien iluminadas con fondo neutro aumentan el ticket promedio hasta un 24%.',
      },
      {
        stepNumber: 4,
        title: 'Guardar y Publicar',
        detail:
          'Presiona "Guardar Plato". El cambio se propaga de inmediato al menú QR de todos los clientes sin necesidad de reimprimir nada.',
      },
    ],
    considerations: {
      prerequisites: ['Permiso de Administrador o Gerente.'],
      warnings: [
        'Si un ingrediente clave se agota durante el servicio, no elimines el plato; simplemente desactiva el switch "Disponible".',
      ],
      bestPractices: [
        'Usa descripciones que destaquen la procedencia y técnica (ej: "Cocción lenta 12 horas").',
        'Revisa periódicamente que los precios incluyan el IVA o Impoconsumo según la legislación de tu país.',
      ],
      crossModuleImpact: [
        'Afecta directamente la visualización en /menu/[slug] y la disponibilidad para comandas en KDS.',
      ],
    },
  },

  // ─── 6. Menú: Adiciones, Modificadores & Extras ────────────────────────────
  {
    id: 'menu-modifiers',
    title: 'Adiciones & Grupos de Modificadores',
    module: 'Menú & Catálogo',
    moduleIcon: '🍽️',
    route: '/dashboard/additions',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'],
    targetAudience: 'Administradores y Gerentes para configuración de upsell y opciones.',
    summary:
      'Configura grupos de opciones personalizables: modificadores obligatorios (ej: Término de carne: 1/2, 3/4, Bien cocido) y adiciones con costo adicional (ej: Queso extra, Tocineta, Salsa trufada).',
    difficulty: 'Intermedio',
    estimatedMinutes: 7,
    tags: ['Adiciones', 'Modificadores', 'Extras', 'Upselling', 'Personalización'],
    uiMockup: {
      previewTitle: 'Gestor de Adiciones & Modificadores',
      previewBadge: 'Grupos configurables por plato o por categoría',
      uiType: 'menu',
      pins: [
        {
          id: 1,
          label: 'Grupo de Modificadores',
          description: 'Define si es selección única obligatoria o múltiple opcional.',
          zone: 'Cabecera de grupo',
        },
        {
          id: 2,
          label: 'Opciones y Precios',
          description: 'Lista de opciones con su precio suplementario (ej: Aguacate +$3.500).',
          zone: 'Cuerpo del grupo',
        },
        {
          id: 3,
          label: 'Platos Vinculados',
          description: 'Asocia el grupo a uno, varios platos o a toda una categoría.',
          zone: 'Pestaña de vinculación',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Crear Grupo de Modificadores',
        detail:
          'En /dashboard/additions, pulsa "+ Nuevo Grupo". Asigna un título como "Elige tu Guarnición" o "Extras para tu Hamburguesa".',
      },
      {
        stepNumber: 2,
        title: 'Definir Reglas de Selección',
        detail:
          'Especifica el mínimo y máximo de selecciones permitidas (ej: Mínimo 1 y Máximo 1 para una opción obligatoria; Mínimo 0 y Máximo 5 para extras libres).',
      },
      {
        stepNumber: 3,
        title: 'Agregar las Opciones y Precios',
        detail:
          'Escribe el nombre de cada opción y su precio extra (deja $0 si está incluido en el precio base del plato).',
      },
      {
        stepNumber: 4,
        title: 'Asignar a los Productos',
        detail:
          'Marca las casillas de los platos que deben ofrecer este grupo de opciones.',
        tip: 'Puedes vincular el grupo "Término de la carne" a todos los cortes de una sola vez.',
      },
    ],
    considerations: {
      prerequisites: ['Tener los platos base creados en el Gestor de Menú.'],
      warnings: [
        'Si defines un mínimo obligatorio de 1 selección, el cliente no podrá añadir el plato al carrito hasta que elija una opción.',
      ],
      bestPractices: [
        'Ofrece entre 3 y 5 adiciones atractivas para maximizar las ventas adicionales sin abrumar al comensal.',
      ],
      crossModuleImpact: [
        'Las adiciones seleccionadas se imprimen y muestran con claridad en los tickets del KDS.',
        'El valor de los extras se suma automáticamente a la cuenta de la mesa.',
      ],
    },
  },

  // ─── 7. Inventario & Recetas Maestras ──────────────────────────────────────
  {
    id: 'inventory-recipes',
    title: 'Inventario, Recetas Maestras & Control de Mermas',
    module: 'Inventario & Recetas',
    moduleIcon: '📦',
    route: '/dashboard/inventory',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'],
    targetAudience: 'Jefes de cocina, Gerentes de compras y Administradores.',
    summary:
      'Controla tus existencias de materia prima, escandallos y costo de recetas. Cada venta realizada descuenta los ingredientes proporcionalmente y alerta cuando el stock llega al punto de reorden.',
    difficulty: 'Avanzado',
    estimatedMinutes: 10,
    tags: ['Inventario', 'Recetas', 'Escandallos', 'Stock Mínimo', 'Costos'],
    uiMockup: {
      previewTitle: 'Control de Inventario & Existencias',
      previewBadge: 'Descuento automático por porción vendida',
      uiType: 'inventory',
      pins: [
        {
          id: 1,
          label: 'Semáforo de Stock',
          description: 'Verde (Óptimo), Amarillo (Punto de Reorden), Rojo (Stock Crítico agotándose).',
          zone: 'Columna de estado',
        },
        {
          id: 2,
          label: 'Ficha de Receta Maestro',
          description: 'Desglose de ingredientes en gramos, mililitros o unidades y costo por porción.',
          zone: 'Pestaña Recetas',
        },
        {
          id: 3,
          label: 'Registro de Ajustes / Mermas',
          description: 'Registra mermas por vencimiento, roturas o ajustes de conteo físico.',
          zone: 'Botón de ajustes rápidos',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Crear Ingredientes Base',
        detail:
          'En /dashboard/inventory, registra los insumos de tu bodega con su unidad de medida (kg, g, lt, ml, unidad) y costo unitario de compra.',
      },
      {
        stepNumber: 2,
        title: 'Construir la Receta del Plato (Escandallo)',
        detail:
          'Ve a /dashboard/inventory/recipes, selecciona un plato del menú (ej: "Lomo al Trapo") y añade los ingredientes exactos por porción (ej: 250g de Lomo Fino, 10g de Sal Marina).',
        tip: 'El sistema calcula el Costo Teórico de Alimentos y el porcentaje de margen de ganancia de cada plato.',
      },
      {
        stepNumber: 3,
        title: 'Configurar Alertas de Stock Mínimo',
        detail:
          'Define la cantidad mínima para cada insumo (ej: mínimo 5 kg). Si el stock cae por debajo, el sistema mostrará alerta inmediata.',
      },
      {
        stepNumber: 4,
        title: 'Registrar Movimientos y Mermas',
        detail:
          'En /dashboard/inventory/movements registra entradas por facturas de proveedores o salidas por merma justificada.',
      },
    ],
    considerations: {
      prerequisites: ['Conocer las porciones estándar y costos unitarios de compra de los proveedores.'],
      warnings: [
        'No modifiques la unidad de medida de un insumo con movimientos históricos sin hacer un nuevo conteo físico.',
      ],
      bestPractices: [
        'Realiza conteos físicos semanales para conciliar el stock teórico del sistema con el stock real de bodega.',
      ],
      crossModuleImpact: [
        'Cada comanda despachada en KDS descuenta automáticamente el inventario según la receta configurada.',
      ],
    },
  },

  // ─── 8. Facturación: Pre-cuentas & Emisión de Facturas ─────────────────────
  {
    id: 'billing-invoices',
    title: 'Facturación, Pre-cuentas & Medios de Pago',
    module: 'Facturación & Caja',
    moduleIcon: '💰',
    route: '/dashboard/billing',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAITER'],
    targetAudience: 'Cajeros, Meseros, Contadores y Administradores.',
    summary:
      'Genera el resumen de consumo de la mesa (pre-cuenta para el cliente), divide cuentas, aplica propina voluntaria sugerida (10%), registra pagos mixtos (efectivo, tarjeta, transferencia) y emite la factura.',
    difficulty: 'Básico',
    estimatedMinutes: 6,
    tags: ['Facturación', 'Pre-cuenta', 'Caja', 'Propina', 'Medios de Pago'],
    uiMockup: {
      previewTitle: 'Módulo de Facturación & Cobro',
      previewBadge: 'Cálculo automático de impuestos y propina',
      uiType: 'cashier',
      pins: [
        {
          id: 1,
          label: 'Selector de Mesa / Comanda',
          description: 'Carga instantánea de todos los ítems consumidos en la mesa activa.',
          zone: 'Panel superior',
        },
        {
          id: 2,
          label: 'Desglose de Totales',
          description: 'Subtotal neto, Impuesto al Consumo (8%) o IVA (19%) y Propina voluntaria sugerida.',
          zone: 'Centro de la cuenta',
        },
        {
          id: 3,
          label: 'Botones de Pago Rápido',
          description: 'Efectivo con cálculo de cambio/vueltos, Datáfono, Transferencia o Mixto.',
          zone: 'Columna de pago',
        },
        {
          id: 4,
          label: 'Imprimir Pre-cuenta / Factura',
          description: 'Emite el ticket térmico de 80mm o 58mm para entregar a la mesa.',
          zone: 'Botón de acción principal',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Generar la Pre-cuenta',
        detail:
          'Cuando el cliente solicita la cuenta, accede a /dashboard/billing, selecciona la mesa y pulsa "Imprimir Pre-cuenta" para llevarla a la mesa.',
      },
      {
        stepNumber: 2,
        title: 'Verificar la Propina Voluntaria',
        detail:
          'Pregunta al comensal si desea incluir la propina sugerida del 10%. Activa o desactiva la casilla según su respuesta.',
      },
      {
        stepNumber: 3,
        title: 'Seleccionar Medio de Pago',
        detail:
          'Elige Efectivo, Tarjeta, QR Bancolombia / Nequi o Pago Mixto. Si es efectivo, digita el monto recibido para que el sistema calcule el cambio.',
      },
      {
        stepNumber: 4,
        title: 'Finalizar y Liberar',
        detail:
          'Pulsa "Emitir Factura". La transacción se registra en el libro diario de caja y la mesa queda liberada automáticamente para nuevos comensales.',
      },
    ],
    considerations: {
      prerequisites: ['Tener configurada la resolución de facturación y los impuestos en el sistema.'],
      warnings: [
        'Nunca liberes una mesa sin haber registrado el pago o la causa de descargo correspondiente.',
      ],
      bestPractices: [
        'Verifica que el comprobante del datáfono coincida con el valor exacto de la factura antes de cerrar.',
      ],
      crossModuleImpact: [
        'Alimentan el arqueo de cierre de caja y las estadísticas de venta del turno en tiempo real.',
      ],
    },
  },

  // ─── 9. Cierre de Caja & Arqueo Ciego ──────────────────────────────────────
  {
    id: 'cashier-close',
    title: 'Arqueo de Turno & Cierre de Caja Ciego',
    module: 'Facturación & Caja',
    moduleIcon: '💰',
    route: '/dashboard/accounting/cash-register',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT'],
    targetAudience: 'Cajeros, Gerentes de turno y Contadores.',
    summary:
      'Garantiza la transparencia financiera mediante el arqueo ciego: el cajero cuenta el dinero físico real sin ver el saldo teórico del sistema, evitando manipulaciones y detectando sobrantes o faltantes al instante.',
    difficulty: 'Intermedio',
    estimatedMinutes: 8,
    tags: ['Caja', 'Cierre de Caja', 'Arqueo Ciego', 'Cuadre', 'Turnos'],
    uiMockup: {
      previewTitle: 'Cierre de Caja & Arqueo de Turno',
      previewBadge: 'Metodología ciega de alta seguridad',
      uiType: 'cashier',
      pins: [
        {
          id: 1,
          label: 'Fondo de Caja Inicial',
          description: 'Monto con el que inició el turno para cambio/sencillo.',
          zone: 'Encabezado superior',
        },
        {
          id: 2,
          label: 'Matriz de Conteo Físico',
          description: 'Campos para ingresar billetes y monedas por denominación ($100k, $50k, $20k...).',
          zone: 'Formulario central',
        },
        {
          id: 3,
          label: 'Conciliación de Datáfonos',
          description: 'Ingreso del total de vouchers de tarjeta y transferencias bancarias verificadas.',
          zone: 'Sección electrónica',
        },
        {
          id: 4,
          label: 'Resultado del Cuadre',
          description: 'Calcula automáticamente Diferencia = Saldo Real - Saldo Teórico (Exacto, Faltante o Sobrante).',
          zone: 'Pie de página con firma digital',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Apertura de Turno (Inicio del Día)',
        detail:
          'Al iniciar la jornada, registra la Base de Caja (ej: $200.000 COP) para dar cambio a los clientes.',
      },
      {
        stepNumber: 2,
        title: 'Asegurar que no Haya Mesas Abiertas',
        detail:
          'Antes del cierre, confirma que todas las mesas del salón hayan pagado o estén liberadas.',
      },
      {
        stepNumber: 3,
        title: 'Realizar el Conteo Físico Ciego',
        detail:
          'Ingresa a /dashboard/accounting/cash-register. Cuenta el efectivo billete por billete y escribe las cantidades en la matriz de denominaciones.',
        tip: 'Suma también los comprobantes de datáfono (cierre de lote del terminal POS).',
      },
      {
        stepNumber: 4,
        title: 'Cerrar Caja y Firmar Acta',
        detail:
          'Presiona "Ejecutar Cierre de Caja". El sistema mostrará si hubo diferencia (exacto, faltante o sobrante), guardará el registro inmutable y generará el PDF del turno.',
      },
    ],
    considerations: {
      prerequisites: ['Todas las órdenes de la jornada deben estar cobradas o anuladas.'],
      warnings: [
        'Una vez cerrada la caja, no se pueden modificar las ventas de ese período; cualquier ajuste requerirá nota contable.',
      ],
      bestPractices: [
        'Realiza arqueos intermedios en cambios de turno entre el personal de la mañana y la noche.',
        'Guarda el reporte impreso junto con los vouchers en el sobre sellado del día.',
      ],
      crossModuleImpact: [
        'El cierre de caja traslada los saldos al libro mayor contable y al estado de P&L.',
      ],
    },
  },

  // ─── 10. Contabilidad & DIAN: Facturación Electrónica UBL 2.1 ─────────────
  {
    id: 'accounting-dian',
    title: 'Facturación Electrónica DIAN (UBL 2.1) & Reportes Fiscales',
    module: 'Contabilidad & DIAN',
    moduleIcon: '🏛️',
    route: '/dashboard/settings/electronic-invoicing',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT'],
    targetAudience: 'Contadores públicos, Revisor fiscal y Representante legal.',
    summary:
      'Configura la resolución oficial de facturación electrónica DIAN (Colombia), prefijos, rangos autorizados, llaves técnicas y vigila la transmisión de XML UBL 2.1 con código CUFE y QR reglamentario.',
    difficulty: 'Avanzado',
    estimatedMinutes: 12,
    tags: ['DIAN', 'Factura Electrónica', 'UBL 2.1', 'CUFE', 'Impuestos', 'Contabilidad'],
    uiMockup: {
      previewTitle: 'Configuración de Facturación DIAN',
      previewBadge: 'Estándar DIAN UBL 2.1 / Anexo Técnico Vigente',
      uiType: 'dian',
      pins: [
        {
          id: 1,
          label: 'Datos del Emisor Fiscal',
          description: 'NIT, Razón Social, Régimen Tributario (Responsable de IVA / No Responsable).',
          zone: 'Cabecera tributaria',
        },
        {
          id: 2,
          label: 'Resolución de Facturación DIAN',
          description: 'Número de formulario 1876, Prefijo (ej: FE), Rango autorizado (1 a 50.000) y Vigencia.',
          zone: 'Bloque de resolución',
        },
        {
          id: 3,
          label: 'Ambiente de Transmisión',
          description: 'Selector de Habilitación / Pruebas ➔ Producción Oficial en Vivo.',
          zone: 'Control de entorno',
        },
        {
          id: 4,
          label: 'Monitor de Transmisión CUFE',
          description: 'Estado de validación previa DIAN: Aprobada con éxito, rechazada o en cola.',
          zone: 'Tabla de comprobantes',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Verificar Parámetros Tributarios',
        detail:
          'En /dashboard/settings/electronic-invoicing, ingresa el NIT del restaurante con su dígito de verificación y código de actividad económica CIIU.',
      },
      {
        stepNumber: 2,
        title: 'Cargar la Resolución de la DIAN',
        detail:
          'Digita el número de resolución obtenido en el portal Muisca de la DIAN, la fecha de inicio, fecha de vencimiento y el rango de consecutivos aprobados.',
      },
      {
        stepNumber: 3,
        title: 'Configurar la Clave Técnica y Certificado',
        detail:
          'Pega la Clave Técnica provista por la DIAN para generar la firma digital SHA-384 y el código CUFE.',
        tip: 'iMenu incluye proveedor tecnológico certificado para timbrado directo sin intermediarios costosos.',
      },
      {
        stepNumber: 4,
        title: 'Emitir Factura Electrónica con Datos del Comprador',
        detail:
          'Al facturar una orden donde el cliente exija factura electrónica, captura su Cédula/NIT, Nombre, Teléfono y Correo electrónico. El sistema transmitirá el XML a la DIAN y enviará el PDF al correo del cliente.',
      },
    ],
    considerations: {
      prerequisites: [
        'RUT actualizado de la empresa con la responsabilidad de facturador electrónico activa.',
        'Resolución de facturación vigente expedida por la DIAN.',
      ],
      warnings: [
        'Monitorea la fecha de caducidad de la resolución; facturar fuera del rango o con resolución vencida acarrea sanciones de la DIAN.',
      ],
      bestPractices: [
        'Revisa semanalmente el reporte de IVA / Impoconsumo en /dashboard/accounting/reports/vat para tu declaración bimestral.',
      ],
      crossModuleImpact: [
        'Las facturas electrónicas emitidas alimentan automáticamente los libros contables y el reporte P&L.',
      ],
    },
  },

  // ─── 11. Equipo & Roles: Gestión de Personal & Seguridad ──────────────────
  {
    id: 'team-security',
    title: 'Gestión de Equipo, Invitaciones & Seguridad 2FA',
    module: 'Equipo & Seguridad',
    moduleIcon: '👥',
    route: '/dashboard/settings/team',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'],
    targetAudience: 'Propietarios, Socios y Administradores de Restaurante.',
    summary:
      'Administra a todo el personal de tu restaurante: envía invitaciones seguras con token de 72h, asigna roles específicos (Mesero, Cocina, Gerente, Contador) y protege las cuentas críticas con 2FA TOTP.',
    difficulty: 'Intermedio',
    estimatedMinutes: 7,
    tags: ['Equipo', 'Personal', 'Roles', 'Invitaciones', 'Seguridad', '2FA'],
    uiMockup: {
      previewTitle: 'Administración de Equipo & Permisos',
      previewBadge: 'Control de accesos basado en roles estrictos',
      uiType: 'team',
      pins: [
        {
          id: 1,
          label: 'Botón Invitar Miembro',
          description: 'Formulario para ingresar correo, nombre completo y rol operativo.',
          zone: 'Esquina superior derecha',
        },
        {
          id: 2,
          label: 'Lista de Miembros Activos',
          description: 'Muestra estado, último acceso, rol asignado e insignia de seguridad 2FA.',
          zone: 'Tabla central',
        },
        {
          id: 3,
          label: 'Menú de Acciones',
          description: 'Permite cambiar rol, reenviar enlace de invitación o revocar acceso de inmediato.',
          zone: 'Columna derecha de cada usuario',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Invitar a un Nuevo Empleado',
        detail:
          'En /dashboard/settings/team, pulsa "Invitar Miembro". Escribe el correo electrónico del empleado y selecciona su rol (ej: WAITER para meseros o KITCHEN para cocineros).',
      },
      {
        stepNumber: 2,
        title: 'Envío del Enlace Seguro',
        detail:
          'El sistema envía un correo con un token criptográfico único con vigencia de 72 horas. El empleado abrirá el enlace en /accept-invite y establecerá su propia contraseña.',
        tip: 'Si el correo no llega, puedes copiar el enlace directo de invitación y enviárselo por WhatsApp.',
      },
      {
        stepNumber: 3,
        title: 'Verificar Accesos según el Rol',
        detail:
          'Una vez que el usuario ingresa, sus menús se ajustan automáticamente: un mesero no verá reportes contables ni configuración; un cocinero entrará directo al KDS.',
      },
      {
        stepNumber: 4,
        title: 'Activar Autenticación en 2 Pasos (2FA)',
        detail:
          'Recomienda a todos los administradores ingresar a /dashboard/settings/security, escanear el código QR con Google Authenticator o Authy y activar el 2FA obligatorio.',
      },
    ],
    considerations: {
      prerequisites: ['Rol de Administrador del Restaurante u Organización.'],
      warnings: [
        'Revoca de inmediato el acceso a empleados desvinculados para proteger los datos financieros y recetas del restaurante.',
      ],
      bestPractices: [
        'Aplica el principio de menor privilegio: nunca asignes rol de ADMIN a meseros o cocineros.',
      ],
      crossModuleImpact: [
        'Determina con precisión qué pantallas y botones puede ver cada trabajador en el sistema.',
      ],
    },
  },

  // ─── 12. Identidad de Marca: Brand Studio & White-Label ───────────────────
  {
    id: 'brand-studio',
    title: 'Estudio de Marca & Personalización White-Label',
    module: 'Equipo & Seguridad',
    moduleIcon: '🎨',
    route: '/dashboard/brand',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'FOOD_COURT_ADMIN'],
    targetAudience: 'Dueños de marca, Diseñadores y Administradores.',
    summary:
      'Personaliza toda la estética visual del menú digital y del dashboard: sube tu logotipo, define tu paleta cromática (color primario, secundario, acento), fuentes tipográficas y banner de bienvenida.',
    difficulty: 'Básico',
    estimatedMinutes: 5,
    tags: ['Branding', 'Marca', 'Logo', 'Colores', 'White-Label', 'Diseño'],
    uiMockup: {
      previewTitle: 'Brand Studio — Identidad Visual',
      previewBadge: 'Inyección de variables CSS dinámicas',
      uiType: 'brand',
      pins: [
        {
          id: 1,
          label: 'Cargador de Logotipo & Favicon',
          description: 'Soporta formatos PNG transparentes, SVG y WebP de alta definición.',
          zone: 'Panel izquierdo superior',
        },
        {
          id: 2,
          label: 'Paleta Cromática de Marca',
          description: 'Selectores de color para botón primario, fondo oscuro, acentos y textos.',
          zone: 'Selectores de color',
        },
        {
          id: 3,
          label: 'Vista Previa en Vivo de Celular',
          description: 'Simulador en tiempo real que muestra cómo verán el menú los clientes con tu marca.',
          zone: 'Mockup de iPhone a la derecha',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Acceder al Estudio de Marca',
        detail: 'Navega a /dashboard/brand desde el menú lateral.',
      },
      {
        stepNumber: 2,
        title: 'Subir el Logo de tu Restaurante',
        detail:
          'Haz clic en la zona de carga de logo. Usa un archivo con fondo transparente en formato PNG o SVG.',
      },
      {
        stepNumber: 3,
        title: 'Ajustar la Paleta de Colores',
        detail:
          'Selecciona el Color Primario que identifique tu marca (ej: Ámbar cálido, Verde olivo, Borgoña). Ajusta el color de acento y tipografía.',
        tip: 'El simulador en pantalla muestra instantáneamente el contraste para garantizar la legibilidad.',
      },
      {
        stepNumber: 4,
        title: 'Guardar Cambios de Marca',
        detail:
          'Pulsa "Guardar Tema de Marca". Se actualizará de inmediato la experiencia del menú QR y la interfaz del personal.',
      },
    ],
    considerations: {
      prerequisites: ['Tener los archivos de logo y código hexadecimal de los colores de la marca.'],
      warnings: [
        'Evita seleccionar colores de texto demasiado oscuros sobre fondos negros para no dificultar la lectura en salones con poca luz.',
      ],
      bestPractices: [
        'Utiliza imágenes de banner optimizadas (menos de 800 KB) para que el menú cargue en menos de 1 segundo en redes móviles 4G.',
      ],
      crossModuleImpact: [
        'Inyecta las variables CSS personalizadas en todas las páginas públicas del cliente y en los códigos QR.',
      ],
    },
  },

  // ─── 13. Franquicias & Sedes Múltiples ─────────────────────────────────────
  {
    id: 'org-franchise',
    title: 'Hub de Franquicia & Gestión Multi-Sede',
    module: 'Franquicia & Sedes',
    moduleIcon: '🏢',
    route: '/dashboard/org',
    allowedRoles: ['SUPERADMIN', 'ORG_ADMIN'],
    targetAudience: 'Directores de Operaciones, Franquiciados Maestros y Gerentes de Cadena.',
    summary:
      'Gestiona cadenas de restaurantes: crea nuevas sucursales, supervisa ventas consolidadas por sede, compara ticket promedio y propaga el menú maestro a todas las sucursales con 1 clic.',
    difficulty: 'Avanzado',
    estimatedMinutes: 9,
    tags: ['Franquicia', 'Multi-sede', 'Sucursales', 'Cadena', 'Consolidado'],
    uiMockup: {
      previewTitle: 'Hub Franquicia — Rendimiento por Sucursal',
      previewBadge: 'Métricas consolidadas de red',
      uiType: 'generic',
      pins: [
        {
          id: 1,
          label: 'Selector de Sucursal Activa',
          description: 'Permite saltar entre sedes para inspeccionar inventario o ventas puntuales.',
          zone: 'Barra superior',
        },
        {
          id: 2,
          label: 'Comparativa de Ventas',
          description: 'Gráfico comparativo de ingresos, platos más vendidos y ticket promedio por local.',
          zone: 'Gráficos centrales',
        },
        {
          id: 3,
          label: 'Propagador de Menú Central',
          description: 'Publica cambios de precios o recetas a todas las sucursales simultáneamente.',
          zone: 'Botón de catálogo central',
        },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Ver el Panel de Franquicia',
        detail: 'Inicia sesión como ORG_ADMIN y abre /dashboard/org o /dashboard/org/branches.',
      },
      {
        stepNumber: 2,
        title: 'Dar de Alta una Nueva Sucursal',
        detail:
          'Pulsa "+ Nueva Sucursal". Asigna nombre, slug único, dirección física, moneda y gerente encargado.',
      },
      {
        stepNumber: 3,
        title: 'Sincronizar Catálogo Maestro',
        detail:
          'Elige si la nueva sucursal heredará los platos, recetas y precios del catálogo central de la franquicia.',
        tip: 'Puedes permitir que cada sede tenga precios diferenciados según la zona geográfica.',
      },
      {
        stepNumber: 4,
        title: 'Consultar Reportes Consolidados',
        detail:
          'En /dashboard/org/reports analiza el comportamiento global de la marca, rotación de personal y rentabilidad por metro cuadrado.',
      },
    ],
    considerations: {
      prerequisites: ['Suscripción SaaS en plan PRO o ENTERPRISE.'],
      warnings: [
        'Ten precaución al propagar cambios masivos de precios a sedes que manejen listas de precios independientes.',
      ],
      bestPractices: [
        'Estandariza los códigos de insumos de inventario entre todas las sedes para facilitar compras por volumen.',
      ],
      crossModuleImpact: [
        'Permite a los administradores cambiar de contexto de restaurante sin tener que cerrar sesión.',
      ],
    },
  },
]
