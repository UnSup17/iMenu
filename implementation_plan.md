# iMenu — Roadmap Empresarial (v3)
## Contabilidad · Facturación · Inventario · Escala Multi-País

---

## Estado Actual de la Aplicación

**iMenu** es una plataforma SaaS multi-tenant para restaurantes con:
- ✅ Auth con roles (SUPERADMIN, RESTAURANT_ADMIN, WAITER, KITCHEN)
- ✅ Gestión de mesas con QR y sesiones efímeras
- ✅ Pedidos en tiempo real vía Socket.IO + Redis
- ✅ Menú digital con PDF interactivo (hotspots)
- ✅ Catálogo de productos con modificadores
- Stack: **Next.js 16, Prisma, MySQL, Redis, Vercel Blob, NextAuth v5**

---

## Decisión Arquitectónica: Roles

El estándar SaaS para restaurantes es **un solo panel** con acceso controlado por rol. No se separa en aplicaciones distintas.

**Estructura de roles final:**

| Rol | Acceso |
|-----|--------|
| `SUPERADMIN` | Todo: plataforma, organizaciones, planes |
| `ORG_ADMIN` | Todas las sucursales de su franquicia |
| `RESTAURANT_ADMIN` | Todo su restaurante: operaciones + finanzas + inventario |
| `ACCOUNTANT` *(nuevo)* | Solo módulos financieros (facturas, contabilidad, reportes) |
| `MANAGER` *(nuevo)* | Operativo completo + inventario, sin contabilidad profunda |
| `WAITER` | Pedidos y mesas asignadas |
| `KITCHEN` | Vista de cocina únicamente |

---

## Autoridades Fiscales por País (Contexto)

> [!NOTE]
> **SAT** — México: *Servicio de Administración Tributaria*. Maneja CFDI 4.0 (XML timbrado).
> **SII** — Chile: *Servicio de Impuestos Internos*. Maneja DTE (Documento Tributario Electrónico).
> **DIAN** — Colombia: *Dirección de Impuestos y Aduanas Nacionales*. Maneja factura electrónica UBL 2.1 (Resolución DIAN).
>
> **País inicial: Colombia (DIAN)**. La arquitectura se diseña desde el inicio para ser extensible a México, Chile y otros países sin refactoring mayor.

---

## Roadmap por Fases

| Fase | Nombre | Objetivo | Estado |
|------|--------|----------|--------|
| 🟢 **Fase 1** | Facturación + Inventario MVP | Cerrar el ciclo completo: pedido → factura → descuento de stock | ✅ **Completada** |
| 🟢 **Fase 2** | Módulo Contable Completo | Gastos, cierre de caja, P&L, IVA DIAN, multi-país | ✅ **Completada** |
| 🟢 **Fase 3** | Multi-sucursal + SaaS + Stripe | Franquicias, suscripciones, escala | ✅ **Completada** |
| 🟢 **Fase 4** | Analytics + Factura Electrónica DIAN | Inteligencia operativa, cumplimiento fiscal | ✅ **Completada** |

---

## 🔴 FASE 1 — Facturación + Inventario MVP

### Objetivo
Cerrar el ciclo completo: un pedido se convierte en factura, se cobra, se imprime el ticket y el stock de ingredientes se descuenta automáticamente.

---

### 1A. Inventario

#### Concepto
Cada `Product` tiene una **receta** (lista de ingredientes con cantidades). Al cerrar una `Invoice` como `PAID`, el sistema descuenta automáticamente esas cantidades del stock. Si un ingrediente cae por debajo del umbral de alerta, se notifica al administrador.

#### Modelos Prisma — Inventario

```prisma
enum InventoryUnit {
  KG         // Kilogramos
  GRAM       // Gramos
  LITER      // Litros
  ML         // Mililitros
  UNIT       // Unidades (huevos, panes, etc.)
  PORTION    // Porciones predefinidas
}

// Ingrediente / Ítem de inventario
model InventoryItem {
  id           String         @id @default(uuid())
  restaurantId String
  restaurant   Restaurant     @relation(...)
  name         String         // "Pechuga de pollo", "Papa nevada"
  sku          String?        // Código interno
  unit         InventoryUnit
  currentStock Decimal        @db.Decimal(10,3)
  minStock     Decimal        @db.Decimal(10,3)  // Umbral de alerta
  costPerUnit  Decimal        @db.Decimal(10,4)  // Costo unitario (para P&L)
  supplier     String?
  isActive     Boolean        @default(true)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  productIngredients ProductRecipeItem[]
  movements          InventoryMovement[]

  @@map("inventory_items")
}

// Receta de un producto: qué ingredientes y en qué cantidad usa
model ProductRecipeItem {
  id              String        @id @default(uuid())
  productId       String
  product         Product       @relation(...)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(...)
  quantity        Decimal       @db.Decimal(10,3) // Ej: 0.200 (200g)

  @@unique([productId, inventoryItemId])
  @@map("product_recipe_items")
}

enum MovementType {
  PURCHASE       // Entrada por compra
  SALE           // Salida por venta (automática al cerrar factura)
  ADJUSTMENT     // Ajuste manual (merma, inventario físico)
  WASTE          // Desperdicio registrado
  TRANSFER       // Transferencia entre sucursales (Fase 3)
}

// Historial de movimientos de inventario
model InventoryMovement {
  id              String        @id @default(uuid())
  restaurantId    String
  restaurant      Restaurant    @relation(...)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(...)
  type            MovementType
  quantity        Decimal       @db.Decimal(10,3) // Positivo = entrada, Negativo = salida
  stockBefore     Decimal       @db.Decimal(10,3)
  stockAfter      Decimal       @db.Decimal(10,3)
  unitCost        Decimal?      @db.Decimal(10,4)
  reference       String?       // ID de factura, pedido, etc.
  notes           String?
  createdAt       DateTime      @default(now())
  createdById     String
  createdBy       User          @relation(...)

  @@map("inventory_movements")
}
```

#### Flujo de stock: deducción en RECEPCIÓN, restauración en CANCELACIÓN

> [!IMPORTANT]
> El stock se descuenta en el momento que la orden llega a estado `RECEIVED` (no al pagar).
> Esto permite detectar agotamientos **antes** de que el cliente espere y antes de que la cocina comience a preparar algo sin ingredientes.
> Si la orden es cancelada, el stock se **restaura** automáticamente con un movimiento inverso.

```
Orden → RECEIVED
  → Para cada OrderItem
    → Buscar ProductRecipeItem[] del producto
      → Para cada ingrediente en la receta × quantity
        → Crear InventoryMovement (type: SALE, qty negativa, ref: orderId)
        → Actualizar InventoryItem.currentStock
        → Emitir evento Socket.IO "inventory:updated" al dashboard
        → Si currentStock <= minStock → emitir alerta (Socket + email)
        → Si currentStock < 0 → marcar InventoryItem.currentStock = 0

Orden → CANCELLED (desde cualquier estado previo)
  → Buscar todos los InventoryMovement con ref = orderId y type = SALE
    → Para cada uno → crear movimiento inverso (type: ADJUSTMENT, qty positiva)
    → Actualizar InventoryItem.currentStock
    → Emitir evento Socket.IO "inventory:updated"

Factura → PAID
  → No afecta stock (ya fue descontado al recibir la orden)
  → Solo registra el método de pago y emite el comprobante
```

#### Disponibilidad en tiempo real en el menú del cliente

> [!IMPORTANT]
> Cuando un ingrediente llega a stock = 0, los productos que lo requieran en su receta deben mostrarse como **no disponibles** en el menú QR del cliente, con el motivo específico.

**Flujo:**
```
InventoryItem.currentStock → 0
  → Sistema calcula qué productos tienen ese ingrediente en su receta
  → Marca Product.isAvailable = false  (o agrega entrada en ProductStockIssue)
  → Emite evento Socket.IO "product:unavailable" { productId, reason: "Sin stock de Pollo" }
  → El menú QR del cliente recibe el evento y actualiza la UI sin recargar
  → El producto muestra el badge: "Sin stock de Pollo"
  → El botón de agregar al carrito queda deshabilitado
```

**Nuevo modelo auxiliar (opcional, más granular que el flag `isAvailable`):**
```prisma
// Razón de no disponibilidad por ingrediente (más informativo que solo isAvailable)
model ProductStockIssue {
  id              String        @id @default(uuid())
  productId       String
  product         Product       @relation(...)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(...)
  restaurantId    String
  createdAt       DateTime      @default(now())
  resolvedAt      DateTime?     // Se resuelve al reponer stock

  @@unique([productId, inventoryItemId])
  @@map("product_stock_issues")
}
```

**UI en el menú del cliente (ejemplo visual):**
```
┌─────────────────────────────────────────┐
│  🍔 BURGUER MIXTA                $28.000 │
│  Carne de res y pollo a la parrilla     │
│                                         │
│  ⚠️ Sin stock: Pollo                    │
│  [No disponible]                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🍔 BURGUER CLÁSICA              $24.000 │
│  Carne de res, lechuga, tomate          │
│                                         │
│  [+ Agregar al pedido]                  │
└─────────────────────────────────────────┘
```

**Cambios técnicos en el menú QR:**
- El endpoint `GET /menu/[slug]` incluye `stockIssues` por producto
- El cliente Socket.IO del menú escucha `product:unavailable` y `product:available`
- Los productos sin stock muestran badge de aviso con el ingrediente específico
- El botón "Agregar" queda deshabilitado pero el ítem sigue visible (UX: el cliente sabe que existe pero no está disponible)

#### Rutas — Inventario

| Ruta | Descripción |
|------|-------------|
| `/dashboard/inventory` | Hub: stock actual, alertas de bajo inventario |
| `/dashboard/inventory/items` | CRUD de ítems de inventario |
| `/dashboard/inventory/items/[id]` | Detalle + historial de movimientos |
| `/dashboard/inventory/recipes` | Asignar receta a cada producto del menú |
| `/dashboard/inventory/purchases` | Registrar entradas (compras a proveedores) |
| `/dashboard/inventory/adjustments` | Ajustes manuales y mermas |
| `/dashboard/inventory/reports` | Valorización de stock, consumo por período |

---

### 1B. Facturación

#### Modelos Prisma — Configuración Fiscal Multi-País

```prisma
enum TaxCountry {
  CO   // Colombia — DIAN, IVA 19%
  MX   // México — SAT, IVA 16%
  CL   // Chile — SII, IVA 19%
  PE   // Perú — SUNAT, IGV 18%
  OTHER
}

// Configuración fiscal del restaurante (1 por restaurante)
model TaxConfig {
  id                 String     @id @default(uuid())
  restaurantId       String     @unique
  restaurant         Restaurant @relation(...)
  country            TaxCountry @default(CO)
  currency           String     @default("COP")  // ISO 4217
  currencySymbol     String     @default("$")
  
  // Impuestos
  vatRate            Decimal    @default(0.19) @db.Decimal(5,4) // IVA Colombia 19%
  vatEnabled         Boolean    @default(true)
  serviceChargeRate  Decimal    @default(0.00) @db.Decimal(5,4) // Propina obligatoria
  serviceChargeEnabled Boolean  @default(false)
  
  // Datos del negocio (para encabezado de facturas)
  legalName          String?    // Razón social: "Restaurante XYZ S.A.S."
  taxId              String?    // NIT (Colombia), RFC (México), RUT (Chile)
  address            String?
  phone              String?
  email              String?
  website            String?
  invoiceFooter      String?    // Texto al pie de facturas
  invoicePrefix      String     @default("FV")  // FV-0001
  nextInvoiceNumber  Int        @default(1)
  
  // Configuración de impresión de tickets
  ticketEnabled      Boolean    @default(true)
  ticketWidth        Int        @default(80)   // mm: 58, 80
  ticketLogoUrl      String?
  ticketHeader       String?    // Texto libre encabezado ticket
  ticketFooter       String?    // Texto libre pie ticket (ej: "¡Gracias por su visita!")
  ticketShowLogo     Boolean    @default(true)
  ticketShowTax      Boolean    @default(true)
  ticketShowTable    Boolean    @default(true)
  ticketShowWaiter   Boolean    @default(true)
  
  @@map("tax_configs")
}
```

#### Modelos Prisma — Factura

```prisma
enum PaymentMethod {
  CASH
  DEBIT_CARD
  CREDIT_CARD
  TRANSFER      // Transferencia / Nequi / Daviplata (Colombia)
  QR_CODE       // Código QR (Bancolombia, etc.)
  SPLIT         // Cuenta dividida
  ROOM_CHARGE   // Para hoteles
  OTHER
}

enum InvoiceStatus {
  DRAFT          // Cuenta abierta (en curso)
  ISSUED         // Emitida, pendiente de cobro
  PAID           // Pagada → dispara descuento de stock
  VOID           // Anulada
  REFUNDED       // Reembolsada
}

model Invoice {
  id             String        @id @default(uuid())
  restaurantId   String
  restaurant     Restaurant    @relation(...)
  tableId        String?
  table          Table?        @relation(...)
  sessionId      String?
  session        TableSession? @relation(...)
  invoiceNumber  String        // FV-0001 (auto-incremental por restaurante)
  status         InvoiceStatus @default(DRAFT)
  
  // Montos
  subtotal       Decimal       @db.Decimal(12,2)
  taxAmount      Decimal       @db.Decimal(12,2)
  serviceCharge  Decimal       @default(0) @db.Decimal(12,2)
  discountAmount Decimal       @default(0) @db.Decimal(12,2)
  total          Decimal       @db.Decimal(12,2)
  
  // Pago
  paymentMethod  PaymentMethod?
  paidAt         DateTime?
  issuedAt       DateTime      @default(now())
  voidedAt       DateTime?
  voidReason     String?
  
  // Cliente (para factura nominal)
  customerName   String?
  customerTaxId  String?       // NIT del cliente en Colombia
  customerEmail  String?
  
  // Servidor que atendió
  waiterId       String?
  waiter         User?         @relation(...)
  
  notes          String?
  pdfUrl         String?       // PDF en Vercel Blob
  
  // Factura electrónica DIAN (Fase 4)
  electronicInvoiceId    String?   // CUFE (Colombia)
  electronicInvoiceStatus String?  // pending, accepted, rejected
  
  items     InvoiceItem[]
  payments  Payment[]

  @@map("invoices")
}

model InvoiceItem {
  id          String   @id @default(uuid())
  invoiceId   String
  invoice     Invoice  @relation(...)
  productId   String?  // Referencia al producto (puede ser null si fue editado)
  description String   // Snapshot: "Hamburguesa clásica + Extra queso"
  quantity    Int
  unitPrice   Decimal  @db.Decimal(12,2)
  taxRate     Decimal  @db.Decimal(5,4)
  taxAmount   Decimal  @db.Decimal(12,2)
  subtotal    Decimal  @db.Decimal(12,2) // Con impuestos

  @@map("invoice_items")
}

model Payment {
  id          String        @id @default(uuid())
  invoiceId   String
  invoice     Invoice       @relation(...)
  amount      Decimal       @db.Decimal(12,2)
  method      PaymentMethod
  reference   String?       // Nº autorización tarjeta, referencia QR, etc.
  receivedAt  DateTime      @default(now())
  receivedById String?
  receivedBy  User?         @relation(...)

  @@map("payments")
}
```

---

### 1C. Impresión Física de Tickets

> [!IMPORTANT]
> La impresión de tickets físicos se hace vía **WebUSB** (impresoras térmicas USB conectadas al PC del admin) o **vía red** (impresoras ESC/POS en red local). Es parametrizable por restaurante.

#### Configuración por cliente (ya incluida en `TaxConfig`):
- Ancho del ticket: 58mm o 80mm
- Logo personalizado
- Header/footer de texto libre
- Mostrar/ocultar: IVA desglosado, número de mesa, nombre del mesero, propina sugerida

#### Contenido del ticket generado:
```
┌─────────────────────────────┐
│  [LOGO DEL RESTAURANTE]      │
│  Restaurante La Mesa S.A.S.  │
│  NIT: 900.123.456-7          │
│  Cra 5 #23-45, Bogotá        │
│  Tel: 601-234-5678           │
├─────────────────────────────┤
│  FACTURA DE VENTA            │
│  No. FV-0042                 │
│  Fecha: 05/09/2026 18:00     │
│  Mesa: 7 | Mesero: Carlos    │
├─────────────────────────────┤
│  2x Hamburguesa Clásica      │
│    + Extra queso             │
│                    $28.000   │
│  1x Gaseosa 400ml            │
│                     $5.000   │
│  1x Papas medianas           │
│                     $8.000   │
├─────────────────────────────┤
│  Subtotal:         $41.000   │
│  IVA (19%):         $7.790   │
├─────────────────────────────┤
│  TOTAL:            $48.790   │
│  Método: Tarjeta débito      │
├─────────────────────────────┤
│  ¡Gracias por su visita!     │
│  www.restaurantelamesa.com   │
└─────────────────────────────┘
```

#### Implementación técnica:
- **Navegador**: `WebUSB API` + librería `escpos` para imprimir directamente desde Chrome/Edge
- **Red local**: Endpoint en el servidor de Socket.IO que envía el trabajo de impresión a la impresora en red
- **Fallback**: Generar PDF y abrir ventana de impresión del sistema operativo (funciona en cualquier dispositivo)

#### Rutas nuevas:
| Ruta | Descripción |
|------|-------------|
| `/dashboard/billing/config` | Configuración fiscal + impresión de tickets |
| `/api/invoices/[id]/print` | Genera el payload ESC/POS para impresión física |
| `/api/invoices/[id]/pdf` | Genera PDF descargable (fallback) |

---

### 1D. Resumen de Rutas — Fase 1 Completa

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/dashboard/billing` | ADMIN, ACCOUNTANT | Hub: ingresos del día, facturas recientes |
| `/dashboard/billing/invoices` | ADMIN, ACCOUNTANT | Listado con filtros |
| `/dashboard/billing/invoices/[id]` | ADMIN, ACCOUNTANT | Detalle, imprimir, anular |
| `/dashboard/billing/close-table/[tableId]` | ADMIN, MANAGER, WAITER | Flujo de cierre de cuenta |
| `/dashboard/billing/config` | ADMIN | Config fiscal + tickets |
| `/dashboard/billing/reports/daily` | ADMIN, ACCOUNTANT | Resumen del día |
| `/dashboard/inventory` | ADMIN, MANAGER | Hub de inventario |
| `/dashboard/inventory/items` | ADMIN, MANAGER | CRUD ítems |
| `/dashboard/inventory/recipes` | ADMIN, MANAGER | Recetas de productos |
| `/dashboard/inventory/purchases` | ADMIN, MANAGER | Entradas de stock |
| `/dashboard/inventory/adjustments` | ADMIN, MANAGER | Ajustes y mermas |

---

## 🟠 FASE 2 — Módulo Contable Completo

### Diseño Multi-País

> [!IMPORTANT]
> La contabilidad se diseña con una capa de **adaptadores por país**. Colombia (DIAN) es el predeterminado, pero agregar México (SAT) o Chile (SII) solo requiere crear un nuevo adaptador sin tocar el núcleo.

```
lib/
  accounting/
    core/           ← Lógica contable universal
    adapters/
      colombia.ts   ← IVA 19%, retenciones, NIT
      mexico.ts     ← IVA 16%, CFDI, RFC
      chile.ts      ← IVA 19%, SII, RUT
      generic.ts    ← Para países sin adapter específico
```

### Colombia — Particularidades Implementadas

| Concepto | Valor | Implementación |
|----------|-------|----------------|
| IVA General | 19% | Configurable en TaxConfig |
| IVA Excluido | Servicios de restaurante (Art. 476 ET) | Toggle por producto |
| Propina voluntaria | No obligatoria, sugerida | Campo en factura |
| NIT del cliente | Para facturas empresariales | Campo opcional en Invoice |
| Retención en la fuente | Aplica para clientes personas jurídicas | Campo de retención en Invoice |
| Factura electrónica | Obligatoria para contribuyentes | Fase 4 — DIAN UBL 2.1 |
| Régimen simplificado | Negocios pequeños exentos | Flag en TaxConfig |

### Nuevos Modelos — Contabilidad

```prisma
enum ExpenseCategory {
  FOOD_INGREDIENTS   // Costo de alimentos (relacionado con inventario)
  BEVERAGES          // Bebidas
  LABOR              // Nómina, prestaciones
  UTILITIES          // Servicios públicos
  RENT               // Arriendo del local
  EQUIPMENT          // Equipo y mantenimiento
  MARKETING          // Publicidad
  ADMIN              // Administración
  TAXES              // Impuestos pagados
  OTHER
}

model Expense {
  id           String          @id @default(uuid())
  restaurantId String
  restaurant   Restaurant      @relation(...)
  category     ExpenseCategory
  description  String
  amount       Decimal         @db.Decimal(12,2)
  taxAmount    Decimal         @default(0) @db.Decimal(12,2) // IVA acreditable
  supplier     String?
  supplierTaxId String?        // NIT del proveedor
  receiptUrl   String?         // Foto del soporte en Vercel Blob
  date         DateTime
  createdAt    DateTime        @default(now())
  createdById  String
  createdBy    User            @relation(...)

  @@map("expenses")
}

model CashRegisterClose {
  id              String     @id @default(uuid())
  restaurantId    String
  restaurant      Restaurant @relation(...)
  date            DateTime
  openingBalance  Decimal    @db.Decimal(12,2)
  cashSales       Decimal    @db.Decimal(12,2)
  cardSales       Decimal    @db.Decimal(12,2)
  transferSales   Decimal    @db.Decimal(12,2)
  qrSales         Decimal    @db.Decimal(12,2)
  totalIncome     Decimal    @db.Decimal(12,2)
  totalExpenses   Decimal    @db.Decimal(12,2)
  expectedCash    Decimal    @db.Decimal(12,2)
  actualCash      Decimal    @db.Decimal(12,2)
  difference      Decimal    @db.Decimal(12,2)
  closedById      String
  closedBy        User       @relation(...)
  notes           String?

  @@map("cash_register_closes")
}

model AccountingPeriod {
  id              String     @id @default(uuid())
  restaurantId    String
  restaurant      Restaurant @relation(...)
  year            Int
  month           Int
  isClosed        Boolean    @default(false)
  closedAt        DateTime?
  totalRevenue    Decimal    @db.Decimal(14,2)
  totalExpenses   Decimal    @db.Decimal(14,2)
  grossProfit     Decimal    @db.Decimal(14,2)
  vatCollected    Decimal    @db.Decimal(14,2) // IVA cobrado a clientes
  vatPaid         Decimal    @db.Decimal(14,2) // IVA pagado a proveedores
  vatOwed         Decimal    @db.Decimal(14,2) // IVA neto → DIAN

  @@unique([restaurantId, year, month])
  @@map("accounting_periods")
}
```

### Rutas — Fase 2

| Ruta | Descripción |
|------|-------------|
| `/dashboard/accounting` | Hub: P&L del mes, alertas |
| `/dashboard/accounting/expenses` | CRUD de gastos con soporte |
| `/dashboard/accounting/cash-register` | Cierre de caja diario (wizard) |
| `/dashboard/accounting/periods` | Períodos: ver, cerrar mes, exportar |
| `/dashboard/accounting/reports/pl` | Estado P&L |
| `/dashboard/accounting/reports/vat` | IVA cobrado vs pagado vs a declarar (DIAN) |
| `/dashboard/accounting/reports/cashflow` | Flujo de caja |

---

## 🟡 FASE 3 — Multi-sucursal + SaaS + Stripe

### Arquitectura Multi-Tenant con Organizaciones

```prisma
enum PlanTier {
  BASIC      // 1 restaurante, facturación básica
  PRO        // Hasta 5 sucursales, contabilidad completa, inventario
  ENTERPRISE // Ilimitado, API, white-label, soporte prioritario
}

model Organization {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  logoUrl     String?
  plan        PlanTier   @default(BASIC)
  restaurants Restaurant[]
  users       User[]
  subscription Subscription?

  @@map("organizations")
}

model Subscription {
  id               String       @id @default(uuid())
  organizationId   String       @unique
  organization     Organization @relation(...)
  tier             PlanTier
  status           String       // active, past_due, cancelled, trialing
  currentPeriodEnd DateTime
  stripeSubId      String?      @unique
  stripeCustomerId String?

  @@map("subscriptions")
}
```

### Stripe — Billing de la Plataforma

- Planes con precios mensuales/anuales en Stripe Dashboard
- Webhooks: `invoice.payment_succeeded`, `customer.subscription.deleted`
- Middleware que bloquea acceso si suscripción expirada
- Portal de cliente Stripe para autogestión
- Trial de 14 días automático al registrarse

### Rutas — Fase 3

| Ruta | Descripción |
|------|-------------|
| `/dashboard/org` | Vista consolidada multi-sucursal |
| `/dashboard/org/reports` | Reportes consolidados |
| `/dashboard/settings/billing` | Plan actual, facturas de Stripe, upgrade |
| `/superadmin` | Panel global: organizaciones, planes, soporte |
| `/superadmin/organizations` | CRUD de orgs |
| `/pricing` | Página pública de precios |
| `/api/webhooks/stripe` | Webhook de Stripe |

---

## 🟢 FASE 4 — Analytics + Factura Electrónica DIAN

### Facturación Electrónica Colombia — Integración Directa con DIAN (sin PTH)

> [!IMPORTANT]
> La facturación electrónica en Colombia es obligatoria (Resolución DIAN 000042/2020). Implementaremos integración **directa** con los servicios SOAP de la DIAN, sin depender de un Proveedor Tecnológico Habilitado (PTH) como Alegra o Siigo. Esto elimina costos de terceros pero requiere mayor trabajo de configuración por restaurante.

#### Endpoints SOAP de la DIAN

| Ambiente | URL |
|----------|-----|
| **Habilitación (pruebas)** | `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc` |
| **Producción** | `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc` |

**Operaciones SOAP utilizadas:**

| Operación | Descripción |
|-----------|-------------|
| `SendBillAsync` | Enviar factura en formato ZIP (XML firmado) |
| `SendEventUpdateStatus` | Enviar acuse de recibo / reclamación del cliente |
| `GetStatus` | Consultar estado de procesamiento de una factura |
| `GetStatusZip` | Consultar estado por ZIP enviado |
| `GetNumberingRange` | Obtener rangos de numeración autorizados por DIAN |

#### Flujo completo de emisión directa

```
1. CONFIGURACIÓN PREVIA (una sola vez por restaurante):
   → Restaurante obtiene resolución de numeración de la DIAN
   → Restaurante obtiene certificado digital .p12 (Firma Digital Colombia)
   → Admin sube .p12 a iMenu → se almacena cifrado en Vercel Blob (acceso restringido)
   → iMenu llama GetNumberingRange → valida rangos autorizados
   → iMenu registra software ID y PIN en DIAN (ambiente habilitación)

2. EMISIÓN (por cada factura):
   → Generar XML en formato UBL 2.1 (estándar DIAN)
     → Incluir: NIT emisor, NIT receptor, items, IVA, totales
   → Calcular y añadir firma XML (XMLDSig con certificado .p12)
     → SHA256withRSA sobre el contenido del documento
   → Calcular CUFE:
     CUFE = SHA384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
                   ValImp2 + ValImp3 + ValTolFac + NitOFE + NumAdq + ClTec)
   → Empaquetar: XML → ZIP (nombre: {NIT}000{consecutivo}.zip)
   → Enviar ZIP vía SOAP → SendBillAsync
   → Polling con GetStatusZip hasta respuesta (max 30s)
     → Éxito: guardar CUFE, ApplicationResponse XML
     → Error: guardar mensaje, marcar para reintentar
   → Generar PDF con código QR de verificación DIAN
   → Enviar XML + PDF al email del cliente

3. CANCELACIÓN:
   → Enviar evento de anulación vía SendEventUpdateStatus
   → Código de evento: 03 (Rechazo) o según tipo de anulación
```

#### Estructura técnica en iMenu

```
lib/
  dian/
    ubl-builder.ts        ← Genera el XML UBL 2.1 del documento
    xml-signer.ts         ← Firma XML con certificado .p12 (node-forge)
    cufe-calculator.ts    ← Calcula el CUFE según algoritmo DIAN
    soap-client.ts        ← Cliente SOAP para servicios DIAN
    zip-packager.ts       ← Empaqueta el XML en ZIP según convención
    status-poller.ts      ← Polling de estado de envío
    qr-generator.ts       ← QR de verificación para el PDF
```

**Dependencias nuevas:**
```
node-forge        ← Manejo de certificados .p12 y firma XML
fast-xml-parser   ← Parseo de respuestas SOAP
archiver          ← Empaquetado ZIP
```

**Modelos adicionales:**
```prisma
model ElectronicInvoiceConfig {
  id                  String     @id @default(uuid())
  restaurantId        String     @unique
  restaurant          Restaurant @relation(...)
  country             TaxCountry @default(CO)
  testMode            Boolean    @default(true)
  
  // Credenciales DIAN (todo cifrado en reposo)
  softwareId          String?    // Software ID registrado en DIAN
  softwarePin         String?    // PIN del software (cifrado)
  certificateUrl      String?    // URL del .p12 en Vercel Blob (acceso privado)
  certificatePassword String?    // Cifrada con AES-256
  
  // Resolución de numeración
  resolutionNumber    String?    // Nº resolución DIAN
  resolutionPrefix    String?    // Prefijo autorizado (FV, FE, etc.)
  resolutionFrom      Int?       // Rango desde
  resolutionTo        Int?       // Rango hasta
  resolutionDate      DateTime?  // Fecha de la resolución
  resolutionEnd       DateTime?  // Fecha de vencimiento
  
  @@map("electronic_invoice_configs")
}

// Log de cada envío a DIAN
model ElectronicInvoiceLog {
  id           String   @id @default(uuid())
  invoiceId    String
  invoice      Invoice  @relation(...)
  attempt      Int      @default(1)
  zipName      String   // nombre del ZIP enviado
  cufe         String?  // CUFE retornado por DIAN
  status       String   // pending, accepted, rejected, error
  dianResponse String?  @db.Text // ApplicationResponse XML completo
  errorMessage String?
  sentAt       DateTime @default(now())
  respondedAt  DateTime?
  
  @@map("electronic_invoice_logs")
}
```

---

### Guía de Onboarding DIAN para Administradores de Restaurante

> [!NOTE]
> Esta guía se presenta dentro de iMenu en `/dashboard/settings/electronic-invoicing` como un **wizard paso a paso** con estado de progreso. Cada paso tiene instrucciones detalladas, enlaces directos a los portales oficiales y campos para ingresar las credenciales obtenidas.

#### Resumen de requisitos previos

| Requisito | Entidad | Costo aprox. | Tiempo aprox. |
|-----------|---------|--------------|----------------|
| Inscripción en RUT como responsable de IVA | DIAN (gratuito) | $0 | 1–2 días hábiles |
| Resolución de numeración de facturación | DIAN (gratuito) | $0 | 1–3 días hábiles |
| Certificado de firma digital | Certicámara / GSE / Andes SCD | $150.000–$350.000 COP/año | 1–3 días hábiles |
| Registro de software y habilitación | DIAN (gratuito) | $0 | 1–5 días hábiles |
| **Total estimado** | | **~$250.000 COP/año** | **~7–13 días hábiles** |

---

#### PASO 1 — Verificar inscripción en el RUT

**¿Qué es?** El Registro Único Tributario. El restaurante debe estar inscrito como **Responsable de IVA** (Régimen Ordinario) para poder emitir facturas electrónicas. Los negocios en Régimen Simple de Tributación también están obligados.

**Cómo verificarlo:**
1. Ingresar a [https://muisca.dian.gov.co](https://muisca.dian.gov.co)
2. Ir a **"Servicios en línea" → "Consultar RUT"**
3. Verificar que la **Responsabilidad 14** (IVA) o **Responsabilidad 49** (No responsable de IVA) esté activa según el régimen del negocio

**Si no está inscrito:**
- Ir a una oficina DIAN con cámara de comercio y documento de identidad del representante legal
- O tramitar virtualmente con Firma Electrónica en el portal MUISCA

> **En iMenu:** El admin ingresa su NIT y el sistema consulta automáticamente el estado del RUT vía la API de verificación de la DIAN.

---

#### PASO 2 — Solicitar Resolución de Numeración

**¿Qué es?** Un documento oficial de la DIAN que autoriza al negocio a emitir facturas electrónicas con un prefijo y rango de números específico (ej: prefijo `FV`, rango `1` al `5.000`).

**Cómo obtenerla:**
1. Ingresar a [https://muisca.dian.gov.co](https://muisca.dian.gov.co) con usuario y contraseña del NIT
2. Ir a **"Facturación Electrónica" → "Numeración de Facturación" → "Autorización de Rangos"**
3. Completar el formulario:
   - Tipo de documento: **Factura de Venta Electrónica** (código 01)
   - Prefijo: el que el negocio elija (ej: `FV`, `FACT`, o sin prefijo)
   - Desde / Hasta: rango numérico deseado (ej: 1 – 5000)
4. La resolución se genera automáticamente y se puede descargar en PDF

**Datos que se ingresan en iMenu:**
```
Número de resolución: 18760000001 (ejemplo)
Prefijo:             FV
Rango desde:         1
Rango hasta:         5000
Fecha resolución:    2026-09-05
Fecha vencimiento:   2028-09-05
```

> **En iMenu:** El admin ingresa estos datos manualmente. iMenu valida que el consecutivo actual no exceda el rango y alerta cuando queden menos del 10% de números disponibles.

---

#### PASO 3 — Obtener Certificado de Firma Digital

**¿Qué es?** Un certificado digital en formato `.p12` (PKCS#12) que permite firmar digitalmente los XML de las facturas. La firma garantiza la autenticidad e integridad del documento ante la DIAN.

**Entidades habilitadas en Colombia:**

| Entidad | Portal | Precio aprox. | Notas |
|---------|--------|---------------|-------|
| **Certicámara** | [certicamara.com](https://www.certicamara.com) | $280.000–$350.000/año | La más usada, compatible 100% DIAN |
| **GSE** | [gse.com.co](https://www.gse.com.co) | $200.000–$300.000/año | Buena relación precio/calidad |
| **Andes SCD** | [andesscd.com.co](https://www.andesscd.com.co) | $150.000–$250.000/año | Opción económica |

**Proceso típico (Certicámara):**
1. Ingresar al portal y seleccionar **"Certificado de Firma Digital Persona Jurídica"**
2. Subir documentos: RUT, cámara de comercio, cédula del representante legal
3. Pagar en línea
4. En 1–3 días hábiles se recibe el archivo `.p12` y la contraseña por correo seguro

**Cómo subirlo a iMenu:**
1. Ir a `/dashboard/settings/electronic-invoicing` → Paso 3
2. Subir el archivo `.p12` (máx. 5MB)
3. Ingresar la contraseña del certificado

> **Seguridad en iMenu:** El `.p12` se almacena **cifrado con AES-256** en Vercel Blob en un bucket privado. La contraseña se cifra con la clave maestra de la plataforma antes de guardar en base de datos. Nunca se almacena en texto plano.

---

#### PASO 4 — Registrar el Software en la DIAN

**¿Qué es?** Antes de poder enviar facturas reales, la DIAN requiere que el software (iMenu) esté registrado y habilitado en su portal. Esto genera un **Software ID** y un **PIN** que se usan en cada envío.

> [!NOTE]
> Como operador de la plataforma iMenu, **tú (SUPERADMIN) registras el software una sola vez**. Los restaurantes usan el Software ID y PIN de la plataforma. Esto simplifica el proceso para cada cliente.

**Registro del software (lo hace el SUPERADMIN de iMenu):**
1. Ingresar a MUISCA con el NIT de la empresa que opera iMenu
2. Ir a **"Facturación Electrónica" → "Facturación Electrónica" → "Registro de Software"**
3. Ingresar:
   - Nombre del software: `iMenu`
   - Identificador del software: (UUID generado por la DIAN)
   - PIN: (generado por la DIAN, 6 dígitos)
4. Descargar la constancia de registro

**Proceso de habilitación (ambiente de pruebas):**
1. Ir a **"Set de Pruebas"** en el portal DIAN
2. La DIAN envía casos de prueba (facturas de ejemplo que deben procesarse correctamente)
3. Enviar los casos de prueba desde iMenu usando `SendTestSetAsync`
4. Superar los casos → la DIAN emite la **constancia de habilitación**
5. Cambiar a ambiente de **Producción**

> **En iMenu:** El SUPERADMIN ingresa el Software ID y PIN en el panel `/superadmin/dian-config`. Todos los restaurantes de la plataforma usan estas credenciales compartidas.

---

#### PASO 5 — Configuración Final en iMenu y Primera Factura de Prueba

Una vez completados los 4 pasos anteriores, el wizard de iMenu guía al admin para:

1. ✅ Verificar NIT en RUT
2. ✅ Ingresar datos de la resolución de numeración
3. ✅ Subir certificado `.p12` y contraseña
4. ✅ Confirmar Software ID de la plataforma
5. 🧪 **Enviar factura de prueba** → el sistema genera una factura de $0 en ambiente de habilitación y muestra la respuesta de la DIAN
6. ✅ Si la DIAN acepta → activar **Modo Producción**
7. 🎉 El restaurante ya puede emitir facturas electrónicas válidas ante la DIAN

**Estado del wizard en el dashboard:**
```
[✅] Paso 1: RUT verificado — Responsable de IVA
[✅] Paso 2: Resolución FV 1–5000 vence 2028-09-05
[✅] Paso 3: Certificado Certicámara cargado (vence 2027-09-01)
[✅] Paso 4: Software habilitado (Ambiente producción)
[⚠️] 423 facturas disponibles en el rango actual (renovar antes de llegar a 5000)
```

---

#### Alertas automáticas de la plataforma

| Evento | Acción de iMenu |
|--------|-----------------|
| Quedan menos del 10% del rango de numeración | Email + notificación en dashboard: "Renueva tu resolución ante la DIAN" |
| El certificado vence en menos de 30 días | Email + notificación: "Renueva tu certificado de firma digital" |
| La resolución vence en menos de 30 días | Email + notificación: "Solicita nueva resolución de numeración" |
| DIAN rechaza una factura | Notificación inmediata con código de error y descripción |
| 3 rechazos consecutivos | Alerta de revisión técnica al SUPERADMIN |

---

### Analytics

| Feature | Descripción |
|---------|-------------|
| Dashboard ejecutivo | Ventas por hora, por día de semana, por categoría |
| Heatmap de mesas | Rotación, duración promedio de sesión |
| Análisis ABC | Productos más rentables (margen × volumen) |
| Comparativa temporal | Mes a mes, año a año |
| Consumo de inventario | Qué ingredientes se usan más, predicción de reposición |
| Exportación | Excel, CSV, PDF para todos los reportes |

### Notificaciones Inteligentes
- Stock bajo → alerta al manager/admin
- Diferencia de caja en cierre → alerta al admin
- Reporte diario automático por email al admin
- Factura electrónica rechazada por DIAN → alerta inmediata

---

## Estructura de Archivos Final

```
app/
  (dashboard)/
    dashboard/
      page.tsx                      ✅ (expandir con KPIs del día)
      orders/                       ✅
      tables/                       ✅
      menu-pdf/                     ✅
      
      billing/                      🆕 FASE 1
        page.tsx
        invoices/
          page.tsx
          [id]/page.tsx
        close-table/[tableId]/
          page.tsx
        config/page.tsx
        reports/daily/page.tsx
      
      inventory/                    🆕 FASE 1
        page.tsx
        items/page.tsx
        items/[id]/page.tsx
        recipes/page.tsx
        purchases/page.tsx
        adjustments/page.tsx
        reports/page.tsx
      
      accounting/                   🆕 FASE 2
        page.tsx
        expenses/page.tsx
        cash-register/page.tsx
        periods/page.tsx
        reports/
          pl/page.tsx
          vat/page.tsx
          cashflow/page.tsx
      
      org/                          🆕 FASE 3
        page.tsx
        reports/page.tsx
      
      settings/
        billing/page.tsx            🆕 FASE 3 (Stripe)
  
  superadmin/                       🆕 FASE 3
    page.tsx
    organizations/page.tsx

lib/
  accounting/
    core/
    adapters/
      colombia.ts                   🆕 FASE 2 (predeterminado)
      mexico.ts                     🆕 FASE 4
      generic.ts

prisma/
  schema.prisma                     📝 Expandir por fases
```

---

## Checklist por Fase

### 🟢 Fase 1 — Facturación + Inventario MVP (Estado: ✅ COMPLETADA)
- [x] Cerrar mesa → generar factura con IVA Colombia (19%) y cargos por servicio parametrizables
- [x] Registrar pago (efectivo, tarjeta de débito/crédito, transferencia/Nequi/Daviplata, QR)
- [x] Imprimir ticket físico térmico (formato ESC/POS 58mm/80mm) con fallback a impresión del sistema
- [x] Descuento automático de stock en tiempo real al recibir pedido (`RECEIVED`), restauración si se cancela (`CANCELLED`)
- [x] Alerta de stock bajo (`minStock`) y detección de agotamiento con badges dinámicos ("Sin stock de [Ingrediente]") y deshabilitación en menú QR
- [x] Dashboard admin y contable con KPIs de facturación, ventas, IVA recaudado, facturas recientes y estado de mesas
- [x] Configuración fiscal parametrizable por restaurante (`TaxConfig`: país, moneda, IVA, servicio, datos legales, formato de tickets)
- [x] Gestión de inventario completa: CRUD de insumos (`InventoryUnit`), compras a proveedores, ajustes manuales, mermas (`WASTE`) y editor de recetas por producto

### 🟢 Fase 2 — Módulo Contable Completo (Estado: ✅ COMPLETADA)
- [x] Modelos de Prisma y migraciones para `Expense`, `ExpenseCategory`, `CashRegisterClose`, `AccountingPeriod`
- [x] Gastos registrables con categoría, soporte en comprobante/URL, proveedor/NIT y cálculo automático de IVA descontable (19%)
- [x] Cierre de caja diario y arqueo (wizard con desglose de ventas por método de pago vs conteo físico y auditoría de diferencias)
- [x] Estado de Resultados P&L mensual vs facturación e inventario (Ventas Netas, Utilidad Bruta, OPEX por categoría, Margen Neto)
- [x] Reporte fiscal de IVA (Formulario 300 DIAN) con IVA generado vs descontable y saldo neto (a pagar o a favor)
- [x] Cierre de períodos contables mensuales y bloqueo de modificaciones

### 🟢 Fase 3 — Multi-sucursal + SaaS + Stripe (Estado: ✅ COMPLETADA)
- [x] Modelos de organizaciones (`Organization`, `Subscription`, `PlanTier`), rol `ORG_ADMIN` y relaciones en `Restaurant` y `User`
- [x] ORG_ADMIN ve panel de franquicia (`/dashboard/org`) y reportes consolidados de todas sus sucursales (`/dashboard/org/reports`)
- [x] SUPERADMIN gestiona organizaciones, suscripciones y planes (`/dashboard/superadmin` y `/dashboard/superadmin/organizations`)
- [x] Integración de Stripe: checkout de suscripción, periodicidad mensual/anual con descuento, y webhook handler para eventos de pago y cancelación
- [x] Trial automático de 14 días al registrarse, validación de límites de sucursales según plan y página pública de precios (`/pricing`)

### 🟢 Fase 4 — Analytics + Factura Electrónica DIAN (Estado: ✅ COMPLETADA)
- [x] Integración SOAP directa con DIAN (`SendBillAsync`, `GetStatusZip`) y soporte para ambientes de Habilitación y Producción
- [x] Módulo UBL 2.1 estándar DIAN, cálculo oficial de CUFE (SHA-384) y validación mediante código QR
- [x] Wizard de habilitación DIAN para restaurantes (`/dashboard/settings/electronic-invoicing`) con gestión de resolución de numeración y certificado .p12
- [x] Widget de emisión DIAN en detalle de facturas (`DianInvoiceAction`) con consulta pública
- [x] Dashboard analytics avanzado (`/dashboard/analytics`) con detección de horas pico, ventas por día de la semana, rotación de mesas y análisis ABC de rentabilidad
- [x] Exportación directa en CSV de todas las facturas y libros contables (`/api/analytics/export`)

---

## Historial de Ejecución y Estado de Tareas

### ✅ Fase 1 Completada (Facturación + Inventario MVP):
1. [x] **Modelos Prisma & Migraciones**: `TaxConfig`, `InventoryItem`, `ProductRecipeItem`, `InventoryMovement`, `ProductStockIssue`, `Invoice`, `InvoiceItem`, `Payment`.
2. [x] **Configuración Fiscal**: Formulario `/dashboard/billing/config` y API `/api/billing/tax-config`.
3. [x] **Gestión de Inventario**: Hub `/dashboard/inventory`, CRUD `/items`, restock `/purchases`, ajustes/mermas `/adjustments`, y editor de recetas `/recipes`.
4. [x] **Flujo de Facturación y Cierre de Mesa**: `/dashboard/billing/close-table/[tableId]`, API de facturas e items con cálculo dinámico de impuestos.
5. [x] **Cobros y Pagos**: `/dashboard/billing/invoices/[id]` con registro de pagos parciales/totales (`/api/invoices/[id]`) y anulación.
6. [x] **Impresión Térmica**: Componente `TicketPrintButton` con previsualización formateada para 58mm/80mm y comandos ESC/POS.
7. [x] **Descuento de Stock en Tiempo Real**: Deducción atómica en `app/api/orders/route.ts` al recibir orden, emisión Socket.IO (`inventory:updated`, `product:unavailable`) y feedback visual en menú QR.
8. [x] **Dashboard de Facturación**: KPIs de hoy, facturas recientes, alertas y estado de mesas activas en `/dashboard/billing`.

### ✅ Fase 2 Completada (Módulo Contable Completo):
1. [x] **Modelos Prisma**: `ExpenseCategory` (enum), `Expense`, `CashRegisterClose`, `AccountingPeriod` con relaciones completas.
2. [x] **Motor de Cálculo Contable** (`lib/accounting/`): `calculatePL`, `calculateVATSummary` (DIAN Formulario 300) y `calculateDailyCashRegister`.
3. [x] **APIs Contables** (`app/api/accounting/*`): Endpoints para gastos (`/expenses`), arqueos de caja (`/cash-register`), períodos (`/periods`), reportes P&L (`/reports/pl`) y reporte de IVA (`/reports/vat`).
4. [x] **Hub Contable** (`/dashboard/accounting`): Panel general con métricas mensuales, widget fiscal DIAN, widget de arqueo del día y accesos rápidos.
5. [x] **Libro de Gastos** (`/dashboard/accounting/expenses`): Tabla con búsqueda, filtros por categoría y modal de registro con desglose automático de IVA 19%.
6. [x] **Cierre de Caja Diario** (`/dashboard/accounting/cash-register`): Historial y wizard paso a paso con conciliación automática de ventas electrónicas vs conteo de gaveta.
7. [x] **Reportes P&L e IVA DIAN** (`/dashboard/accounting/reports/*`): Estado de resultados estructurado y simulación del Formulario 300 DIAN con soporte de impresión.
8. [x] **Períodos Contables** (`/dashboard/accounting/periods`): Registro y cierre formal de períodos contables mensuales.

### ✅ Fase 3 Completada (Multi-sucursal + SaaS + Stripe):
1. [x] **Modelos Prisma & Roles**: `Role.ORG_ADMIN`, `PlanTier` (BASIC, PRO, ENTERPRISE), `Organization` y `Subscription`.
2. [x] **Motor SaaS & Stripe** (`lib/subscription.ts`, `lib/stripe.ts`): Gestión de planes, cálculo de 14 días de trial, validación de cupo de sucursales y creación de sesiones de checkout Stripe.
3. [x] **APIs SaaS y Franquicia** (`app/api/`): `/api/billing/subscription`, `/api/webhooks/stripe`, `/api/org/branches`, `/api/org/reports`, `/api/superadmin/organizations`.
4. [x] **Hub de Franquicia** (`/dashboard/org`): Panel consolidado con monitoreo en vivo de sucursales, mesas ocupadas y facturación de la cadena.
5. [x] **Gestor de Sucursales** (`/dashboard/org/branches`): Creación de sedes con control de límites del plan e inicialización fiscal automática.
6. [x] **Reportes Consolidados** (`/dashboard/org/reports`): Métricas de ventas totales de la cadena y tabla de rendimiento comparativo por sede.
7. [x] **Facturación SaaS** (`/dashboard/settings/billing`): Selector mensual/anual (-20%), contador de trial y selector de upgrade de plan.
8. [x] **Página Pública de Precios** (`/pricing`): Landing pública con comparativa de planes Basic vs Pro vs Enterprise.
9. [x] **Panel Global Superadmin** (`/dashboard/superadmin` y `/dashboard/superadmin/organizations`): Métricas de plataforma (MRR, clientes, sedes) y modificación manual de planes de clientes.

### ✅ Fase 4 Completada (Analytics + Factura Electrónica DIAN):
1. [x] **Modelos Prisma DIAN**: `ElectronicInvoiceConfig` y `ElectronicInvoiceLog`.
2. [x] **Motor DIAN UBL 2.1** (`lib/dian/`): Cálculo de CUFE SHA-384, generador de UBL 2.1 XML y cliente SOAP `SendBillAsync`.
3. [x] **Motor de Analytics & BI** (`lib/analytics/engine.ts`): Ventas por hora (horas pico), ventas por día de la semana, rotación de mesas, análisis ABC de rentabilidad y generador CSV.
4. [x] **APIs de Fase 4** (`app/api/`): `/api/billing/electronic-invoicing/config`, `/api/billing/electronic-invoicing/send`, `/api/analytics/dashboard`, `/api/analytics/export`.
5. [x] **Wizard de Habilitación DIAN** (`/dashboard/settings/electronic-invoicing`): Configuración de software ID, PIN, clave técnica y certificado `.p12`.
6. [x] **Emisión DIAN en Factura** (`components/billing/dian-invoice-action.tsx`): Integrado en `/dashboard/billing/invoices/[id]` con copia de CUFE y QR oficial.
7. [x] **Dashboard de Business Intelligence** (`/dashboard/analytics`): Gráfica de horas pico, tendencias semanales, clasificación ABC y exportación CSV.

---

🎉 **Roadmap Empresarial de 4 Fases Completado con Éxito al 100%**.
