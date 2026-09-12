export type Locale = 'es' | 'en' | 'pt'

export interface TranslationDictionary {
  // Navigation & General
  menu: string
  searchPlaceholder: string
  categories: string
  allCategories: string
  table: string
  callWaiter: string
  callingWaiter: string
  waiterCalled: string
  changeAlias: string
  viewOnlyTitle: string
  viewOnlySubtitle: string
  viewOnlyBanner: string
  viewOnlyMode: string
  viewPdfMenu: string
  viewPdf: string
  viewGridMenu: string
  viewByCategory: string
  viewHistory: string
  viewOrder: string
  tableOrder: string
  shareMenu: string
  linkCopied: string

  // Cart & Order
  cart: string
  viewCart: string
  myOrders: string
  items: string
  emptyCart: string
  emptyCartPrompt: string
  draftRound: string
  draftDescription: string
  inKitchen: string
  readOnly: string
  orderRound: string
  totalToPay: string
  sendOrderToKitchen: string
  sendingOrder: string
  addMoreDishes: string
  dishAdded: string
  dishAddedToCart: string
  itemUnavailable: string
  outOfStock: string
  notes: string
  notesPlaceholder: string
  modifiers: string
  additions: string
  removeIngredients: string
  forPerson: string

  // Order Status & Kitchen
  orderStatus: string
  statusReceived: string
  statusPreparing: string
  statusReady: string
  statusDelivered: string
  statusCancelled: string
  preparingNotification: string
  readyNotification: string
  deliveredNotification: string
  estimatedWaitTime: string
  estimatedWait: string
  kitchenWaitShort: string
  kitchenNormal: string
  kitchenBusy: string
  kitchenCalm: string
  minutes: string

  // Rating & Feedback
  rateExperience: string
  rateTitle: string
  rateSubtitle: string
  ratePrompt: string
  rateComments: string
  rateCommentsPlaceholder: string
  submitRating: string
  submittingRating: string
  ratingSentSuccess: string
  ratingSentSubtitle: string
  tagDeliciousFood: string
  tagQuickService: string
  tagFriendlyStaff: string
  tagGreatAtmosphere: string
  tagSlowService: string
  tagColdFood: string

  // Participants & Shared Table
  dinersAtTable: string
  sharedTableNotice: string
  recommendDish: string
  recommendedBy: string
}

export const translations: Record<Locale, TranslationDictionary> = {
  es: {
    menu: 'Menú',
    searchPlaceholder: 'Buscar platos, bebidas, postres...',
    categories: 'Categorías',
    allCategories: 'Todos',
    table: 'Mesa',
    callWaiter: 'Llamar al Mesero',
    callingWaiter: 'Llamando...',
    waiterCalled: '¡Mesero notificado!',
    changeAlias: 'Cambiar nombre',
    viewOnlyTitle: 'Menú Digital Interactivo',
    viewOnlySubtitle: 'Explora nuestra oferta gastronómica y precios en vivo',
    viewOnlyBanner: 'Estás en modo visualización web. Para pedir, escanea el código QR de tu mesa.',
    viewOnlyMode: 'Modo solo lectura',
    viewPdfMenu: 'Ver Menú PDF',
    viewPdf: 'Menú PDF',
    viewGridMenu: 'Ver Cuadrícula',
    viewByCategory: 'Por Categorías',
    viewHistory: 'Ver Historial',
    viewOrder: 'Ver Pedido',
    tableOrder: 'Pedido de la Mesa',
    shareMenu: 'Compartir menú',
    linkCopied: '¡Enlace copiado!',

    cart: 'Carrito',
    viewCart: 'Ver Carrito',
    myOrders: 'Mis Pedidos',
    items: 'platillos',
    emptyCart: 'Tu carrito está vacío',
    emptyCartPrompt: 'Selecciona tus platillos favoritos del menú para comenzar.',
    draftRound: 'Por Enviar (Ronda Actual)',
    draftDescription: 'Editable antes de enviar a cocina',
    inKitchen: 'Pedidos en Cocina',
    readOnly: 'Solo lectura',
    orderRound: 'Ronda',
    totalToPay: 'Total de la mesa',
    sendOrderToKitchen: 'Enviar Pedido a Cocina',
    sendingOrder: 'Enviando orden a cocina...',
    addMoreDishes: 'Pedir algo más',
    dishAdded: 'Agregado al carrito',
    dishAddedToCart: 'Tu elección fue agregada',
    itemUnavailable: 'Agotado temporalmente',
    outOfStock: 'Sin stock',
    notes: 'Instrucciones especiales',
    notesPlaceholder: 'Ej: Sin sal, término medio, aderezo aparte...',
    modifiers: 'Opciones y Términos',
    additions: 'Adiciones & Extras',
    removeIngredients: 'Quitar ingredientes',
    forPerson: '¿Para quién es?',

    orderStatus: 'Estado de tu pedido',
    statusReceived: 'Recibido',
    statusPreparing: 'En preparación',
    statusReady: 'Listo para servir',
    statusDelivered: 'Servido en mesa',
    statusCancelled: 'Cancelado',
    preparingNotification: '🍳 Tu orden ha entrado a preparación en cocina.',
    readyNotification: '🔔 ¡Tu pedido está listo! El mesero se acerca a tu mesa.',
    deliveredNotification: '🍽️ ¡Buen provecho! Tu pedido fue servido.',
    estimatedWaitTime: 'Tiempo estimado de cocina',
    estimatedWait: 'Tiempo estimado',
    kitchenWaitShort: 'espera',
    kitchenNormal: 'Carga normal',
    kitchenBusy: 'Cocina con alta demanda',
    kitchenCalm: 'Cocina ágil',
    minutes: 'min',

    rateExperience: 'Calificar experiencia',
    rateTitle: '¿Cómo estuvo tu experiencia?',
    rateSubtitle: 'Tu opinión nos ayuda a brindarte el mejor servicio.',
    ratePrompt: 'Toca las estrellas para calificar:',
    rateComments: 'Comentario opcional',
    rateCommentsPlaceholder: 'Cuéntanos qué fue lo que más te gustó o qué podemos mejorar...',
    submitRating: 'Enviar calificación',
    submittingRating: 'Enviando...',
    ratingSentSuccess: '¡Gracias por tus comentarios!',
    ratingSentSubtitle: 'Tu opinión ha sido registrada exitosamente.',
    tagDeliciousFood: 'Comida deliciosa 😋',
    tagQuickService: 'Atención rápida ⚡',
    tagFriendlyStaff: 'Mesero amable 😊',
    tagGreatAtmosphere: 'Buen ambiente 🎶',
    tagSlowService: 'Demoró un poco ⏳',
    tagColdFood: 'Comida fría ❄️',

    dinersAtTable: 'Comensales en la mesa',
    sharedTableNotice: 'Mesa compartida en tiempo real',
    recommendDish: 'Recomendar a la mesa',
    recommendedBy: 'Recomendado por',
  },
  en: {
    menu: 'Menu',
    searchPlaceholder: 'Search dishes, drinks, desserts...',
    categories: 'Categories',
    allCategories: 'All',
    table: 'Table',
    callWaiter: 'Call Waiter',
    callingWaiter: 'Calling...',
    waiterCalled: 'Waiter notified!',
    changeAlias: 'Change name',
    viewOnlyTitle: 'Interactive Digital Menu',
    viewOnlySubtitle: 'Explore our cuisine and live pricing',
    viewOnlyBanner: "You are in web browsing mode. Scan your table's QR code to order.",
    viewOnlyMode: 'View-only mode',
    viewPdfMenu: 'View PDF Menu',
    viewPdf: 'PDF Menu',
    viewGridMenu: 'View Grid',
    viewByCategory: 'By Categories',
    viewHistory: 'View History',
    viewOrder: 'View Order',
    tableOrder: 'Table Order',
    shareMenu: 'Share menu',
    linkCopied: 'Link copied!',

    cart: 'Cart',
    viewCart: 'View Cart',
    myOrders: 'My Orders',
    items: 'items',
    emptyCart: 'Your cart is empty',
    emptyCartPrompt: 'Select your favorite dishes from the menu to start.',
    draftRound: 'To Send (Current Round)',
    draftDescription: 'Editable before sending to kitchen',
    inKitchen: 'Orders in Kitchen',
    readOnly: 'Read only',
    orderRound: 'Round',
    totalToPay: 'Table Total',
    sendOrderToKitchen: 'Send Order to Kitchen',
    sendingOrder: 'Sending to kitchen...',
    addMoreDishes: 'Order more dishes',
    dishAdded: 'Added to cart',
    dishAddedToCart: 'Your item was added',
    itemUnavailable: 'Temporarily unavailable',
    outOfStock: 'Out of stock',
    notes: 'Special requests',
    notesPlaceholder: 'E.g., No salt, medium rare, dressing on the side...',
    modifiers: 'Options & Cooking Style',
    additions: 'Add-ons & Extras',
    removeIngredients: 'Remove ingredients',
    forPerson: 'Who is this for?',

    orderStatus: 'Order Status',
    statusReceived: 'Received',
    statusPreparing: 'In kitchen',
    statusReady: 'Ready to serve',
    statusDelivered: 'Served',
    statusCancelled: 'Cancelled',
    preparingNotification: '🍳 Your order is now being prepared in the kitchen.',
    readyNotification: '🔔 Your order is ready! The server is heading to your table.',
    deliveredNotification: '🍽️ Enjoy your meal! Your order has been served.',
    estimatedWaitTime: 'Estimated kitchen time',
    estimatedWait: 'Estimated wait',
    kitchenWaitShort: 'wait',
    kitchenNormal: 'Normal pace',
    kitchenBusy: 'High kitchen demand',
    kitchenCalm: 'Fast pace',
    minutes: 'min',

    rateExperience: 'Rate your visit',
    rateTitle: 'How was your experience?',
    rateSubtitle: 'Your feedback helps us deliver the best dining experience.',
    ratePrompt: 'Tap the stars to rate:',
    rateComments: 'Optional comment',
    rateCommentsPlaceholder: 'Tell us what you loved or how we can improve...',
    submitRating: 'Submit feedback',
    submittingRating: 'Sending...',
    ratingSentSuccess: 'Thank you for your feedback!',
    ratingSentSubtitle: 'Your review was registered successfully.',
    tagDeliciousFood: 'Delicious food 😋',
    tagQuickService: 'Fast service ⚡',
    tagFriendlyStaff: 'Friendly staff 😊',
    tagGreatAtmosphere: 'Great vibe 🎶',
    tagSlowService: 'Took a while ⏳',
    tagColdFood: 'Cold food ❄️',

    dinersAtTable: 'Diners at table',
    sharedTableNotice: 'Real-time shared table',
    recommendDish: 'Recommend to table',
    recommendedBy: 'Recommended by',
  },
  pt: {
    menu: 'Cardápio',
    searchPlaceholder: 'Buscar pratos, bebidas, sobremesas...',
    categories: 'Categorias',
    allCategories: 'Todos',
    table: 'Mesa',
    callWaiter: 'Chamar Garçom',
    callingWaiter: 'Chamando...',
    waiterCalled: 'Garçom notificado!',
    changeAlias: 'Mudar nome',
    viewOnlyTitle: 'Cardápio Digital Interativo',
    viewOnlySubtitle: 'Explore nossos pratos e preços em tempo real',
    viewOnlyBanner: 'Você está no modo de visualização web. Para pedir, escaneie o QR da sua mesa.',
    viewOnlyMode: 'Modo somente leitura',
    viewPdfMenu: 'Ver Cardápio PDF',
    viewPdf: 'Cardápio PDF',
    viewGridMenu: 'Ver Grade',
    viewByCategory: 'Por Categorias',
    viewHistory: 'Ver Histórico',
    viewOrder: 'Ver Pedido',
    tableOrder: 'Pedido da Mesa',
    shareMenu: 'Compartir cardápio',
    linkCopied: 'Link copiado!',

    cart: 'Carrinho',
    viewCart: 'Ver Carrinho',
    myOrders: 'Meus Pedidos',
    items: 'itens',
    emptyCart: 'Seu carrinho está vazio',
    emptyCartPrompt: 'Selecione seus pratos favoritos do cardápio para começar.',
    draftRound: 'A Enviar (Rodada Atual)',
    draftDescription: 'Editável antes de enviar para a cozinha',
    inKitchen: 'Pedidos na Cozinha',
    readOnly: 'Apenas leitura',
    orderRound: 'Rodada',
    totalToPay: 'Total da mesa',
    sendOrderToKitchen: 'Enviar Pedido à Cozinha',
    sendingOrder: 'Enviando para a cozinha...',
    addMoreDishes: 'Pedir mais itens',
    dishAdded: 'Adicionado ao carrinho',
    dishAddedToCart: 'Seu item foi adicionado',
    itemUnavailable: 'Temporariamente esgotado',
    outOfStock: 'Sem estoque',
    notes: 'Instruções especiais',
    notesPlaceholder: 'Ex: Sem sal, ao ponto, molho à parte...',
    modifiers: 'Opções e Ponto da Carne',
    additions: 'Adicionais & Extras',
    removeIngredients: 'Remover ingredientes',
    forPerson: 'Para quem é?',

    orderStatus: 'Status do Pedido',
    statusReceived: 'Recebido',
    statusPreparing: 'Em preparo',
    statusReady: 'Pronto para servir',
    statusDelivered: 'Servido na mesa',
    statusCancelled: 'Cancelado',
    preparingNotification: '🍳 Seu pedido começou a ser preparado na cozinha.',
    readyNotification: '🔔 Seu pedido está pronto! O garçom está a caminho da sua mesa.',
    deliveredNotification: '🍽️ Bom apetite! Seu pedido foi servido.',
    estimatedWaitTime: 'Tempo estimado de preparo',
    estimatedWait: 'Tempo estimado',
    kitchenWaitShort: 'espera',
    kitchenNormal: 'Fluxo normal',
    kitchenBusy: 'Cozinha em alta demanda',
    kitchenCalm: 'Cozinha ágil',
    minutes: 'min',

    rateExperience: 'Avaliar atendimento',
    rateTitle: 'Como foi sua experiência?',
    rateSubtitle: 'Sua opinião nos ajuda a oferecer o melhor atendimento.',
    ratePrompt: 'Toque nas estrelas para avaliar:',
    rateComments: 'Comentário opcional',
    rateCommentsPlaceholder: 'Conte-nos o que você mais gostou ou o que podemos melhorar...',
    submitRating: 'Enviar avaliação',
    submittingRating: 'Enviando...',
    ratingSentSuccess: 'Obrigado pela sua avaliação!',
    ratingSentSubtitle: 'Sua opinião foi registrada com sucesso.',
    tagDeliciousFood: 'Comida deliciosa 😋',
    tagQuickService: 'Atendimento rápido ⚡',
    tagFriendlyStaff: 'Garçom atencioso 😊',
    tagGreatAtmosphere: 'Ótimo ambiente 🎶',
    tagSlowService: 'Demorou um pouco ⏳',
    tagColdFood: 'Comida fria ❄️',

    dinersAtTable: 'Comensais na mesa',
    sharedTableNotice: 'Mesa compartilhada em tempo real',
    recommendDish: 'Recomendar à mesa',
    recommendedBy: 'Recomendado por',
  },
}

/**
 * Traduce nombres comunes de categorías de restaurantes para internacionalización fluida
 */
export function translateCategoryName(name: string, locale: Locale): string {
  if (locale === 'es') return name

  const normalized = name.trim().toLowerCase()
  const mapEn: Record<string, string> = {
    entradas: 'Starters & Appetizers',
    entrada: 'Starters',
    'platos fuertes': 'Main Courses',
    plato: 'Main Course',
    fuertes: 'Mains',
    hamburguesas: 'Burgers',
    carnes: 'Steaks & Meats',
    pizzas: 'Pizzas',
    pastas: 'Pastas',
    ensaladas: 'Salads',
    bebidas: 'Drinks & Beverages',
    'bebidas calientes': 'Hot Drinks',
    'bebidas frias': 'Cold Drinks',
    'bebidas frías': 'Cold Drinks',
    cocteles: 'Cocktails',
    cócteles: 'Cocktails',
    cervezas: 'Beers',
    postres: 'Desserts',
    cafes: 'Coffee',
    cafés: 'Coffee',
    adiciones: 'Add-ons & Extras',
    extras: 'Extras',
    combos: 'Combos & Deals',
    infantil: 'Kids Menu',
  }

  const mapPt: Record<string, string> = {
    entradas: 'Entradas & Petiscos',
    entrada: 'Entrada',
    'platos fuertes': 'Pratos Principais',
    plato: 'Prato Principal',
    fuertes: 'Principais',
    hamburguesas: 'Hambúrgueres',
    carnes: 'Carnes & Grelhados',
    pizzas: 'Pizzas',
    pastas: 'Massas',
    ensaladas: 'Saladas',
    bebidas: 'Bebidas',
    'bebidas calientes': 'Bebidas Quentes',
    'bebidas frias': 'Bebidas Geladas',
    'bebidas frías': 'Bebidas Geladas',
    cocteles: 'Coquetéis',
    cócteles: 'Coquetéis',
    cervezas: 'Cervejas',
    postres: 'Sobremesas',
    cafes: 'Cafés',
    cafés: 'Cafés',
    adiciones: 'Adicionais & Extras',
    extras: 'Extras',
    combos: 'Combos',
    infantil: 'Menu Infantil',
  }

  if (locale === 'en' && mapEn[normalized]) return mapEn[normalized]
  if (locale === 'pt' && mapPt[normalized]) return mapPt[normalized]

  return name
}
