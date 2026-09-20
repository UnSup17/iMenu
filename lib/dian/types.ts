export interface DianCompanyInfo {
  legalName: string
  taxId: string // NIT sin dígito de verificación
  dv: string // Dígito de verificación (ej. "7")
  taxScheme: string // "01" (IVA), "04" (INC)
  address?: string
  phone?: string
  email?: string
  city?: string // Código DANE ciudad (ej. "11001" Bogotá)
  department?: string // "11"
}

export interface DianCustomerInfo {
  name: string
  taxId: string // NIT o Cédula
  email?: string
  phone?: string
  address?: string
}

export interface DianInvoiceItem {
  id: string
  code?: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number // ej. 0.19
  taxAmount: number
  subtotal: number
  total: number
}

export interface DianDocumentPayload {
  prefix: string
  invoiceNumber: string // "FV-0042"
  fullNumber: string // "FV0042" o solo número
  issueDate: string // "YYYY-MM-DD"
  issueTime: string // "HH:mm:ss-05:00"
  company: DianCompanyInfo
  customer: DianCustomerInfo
  items: DianInvoiceItem[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  paymentMethod: string // "10" (Efectivo), "48" (Tarjeta), "49" (Transferencia)
  technicalKey?: string
  environment: '1' | '2' // '1' Producción, '2' Pruebas
  // Modo de contingencia DIAN:
  // '01' = Factura electrónica estándar
  // '03' = Factura por talonario / contingencia facturador
  // '04' = Factura electrónica de contingencia DIAN
  invoiceTypeCode?: '01' | '02' | '03' | '04'
  isContingency?: boolean
}

export interface DianSendResult {
  success: boolean
  cufe: string
  qrCodeUrl: string
  xmlSigned: string
  zipName: string
  status: 'ACCEPTED' | 'REJECTED' | 'TEST_PASSED' | 'PENDING'
  message: string
  dianResponseXml?: string
}

// ============================================================
// Notas Crédito y Notas Débito Electrónicas UBL 2.1
// ============================================================

export type DianDiscrepancyCode =
  | '1' // Devolución parcial de los bienes y/o no aceptación parcial del servicio
  | '2' // Anulación de factura electrónica
  | '3' // Rebaja o descuento parcial o total
  | '4' // Ajuste de precio
  | '5' // Otros

export interface DianCreditNotePayload {
  prefix: string
  noteNumber: string // "NC-0001"
  fullNumber: string // "NC0001"
  issueDate: string // "YYYY-MM-DD"
  issueTime: string // "HH:mm:ss-05:00"
  originalInvoiceNumber: string // "FV-0042"
  originalCufe: string
  originalIssueDate: string
  discrepancyCode: DianDiscrepancyCode
  discrepancyDescription: string
  company: DianCompanyInfo
  customer: DianCustomerInfo
  items: DianInvoiceItem[]
  subtotal: number
  taxTotal: number
  total: number
  technicalKey?: string
  environment: '1' | '2'
}

export interface DianDebitNotePayload {
  prefix: string
  noteNumber: string // "ND-0001"
  fullNumber: string // "ND0001"
  issueDate: string
  issueTime: string
  originalInvoiceNumber: string
  originalCufe: string
  originalIssueDate: string
  discrepancyCode: '1' | '2' | '3' | '4' // 1: Intereses, 2: Gastos por cobrar, 3: Cambio valor, 4: Otros
  discrepancyDescription: string
  company: DianCompanyInfo
  customer: DianCustomerInfo
  items: DianInvoiceItem[]
  subtotal: number
  taxTotal: number
  total: number
  technicalKey?: string
  environment: '1' | '2'
}

// ============================================================
// Eventos DIAN / RADIAN / ApplicationResponse (B2B & Anulación)
// ============================================================

export type DianEventCode =
  | '030' // Acuse de recibo de Factura Electrónica de Venta
  | '031' // Reclamo de la Factura Electrónica de Venta
  | '032' // Recibo del bien y/o prestación del servicio
  | '033' // Aceptación expresa
  | '034' // Aceptación tácita
  | '04'  // Notificación de documento anulado ante DIAN

export interface DianEventPayload {
  eventCode: DianEventCode
  eventDescription: string
  invoiceNumber: string
  invoiceCufe: string
  invoiceIssueDate: string
  issuer: DianCompanyInfo
  receiver: DianCustomerInfo
  environment: '1' | '2'
  comment?: string
}

export interface DianEventResult {
  success: boolean
  eventCode: DianEventCode
  invoiceCufe: string
  status: 'ACCEPTED' | 'REJECTED'
  message: string
  dianResponseXml?: string
}

// ============================================================
// Consultas y Polling (GetStatusZip)
// ============================================================

export interface DianStatusCheckResult {
  trackId: string
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING'
  statusCode: string
  message: string
  dianResponseXml?: string
  isValid: boolean
}

// ============================================================
// Set de Pruebas Automatizado (SendTestSetAsync)
// ============================================================

export interface DianTestSetItemResult {
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'
  number: string
  cufeOrCude: string
  status: 'TEST_PASSED' | 'TEST_FAILED'
  message: string
}

export interface DianTestSetBatchResult {
  testSetId: string
  totalSent: number
  passed: number
  failed: number
  environment: '2'
  items: DianTestSetItemResult[]
}
