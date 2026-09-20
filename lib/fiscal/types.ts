export type FiscalCountry = 'CO' | 'MX' | 'CL'

export interface FiscalDocumentItem {
  id: string
  code?: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number // ej. 0.16 (MX), 0.19 (CL, CO)
  taxAmount: number
  subtotal: number
  total: number
  // SAT México:
  satProductServiceCode?: string // ej: '90101501' (Restaurantes)
  satUnitCode?: string // ej: 'H87' (Pieza) o 'E48' (Unidad de servicio)
  // SII Chile:
  siiExempt?: boolean
}

export interface FiscalCompanyInfo {
  legalName: string
  taxId: string // NIT (CO), RFC (MX), RUT (CL)
  dv?: string // Dígito de verificación (CO)
  fiscalRegime?: string // SAT Régimen Fiscal (ej. '601' General Personas Morales)
  economicActivity?: string // SII Giro Comercial
  postalCode?: string // SAT Código Postal Lugar de Expedición
  address: string
  city: string
  municipality?: string // Comuna (CL) o Municipio
  phone?: string
  email?: string
}

export interface FiscalCustomerInfo {
  name: string
  taxId: string // NIT, RFC o RUT
  fiscalRegime?: string // SAT Régimen Fiscal Receptor
  cfdiUse?: string // SAT Uso CFDI (ej. 'G03' Gastos en general)
  postalCode?: string // SAT DomicilioFiscalReceptor
  economicActivity?: string // SII Giro Comercial Receptor
  address?: string
  city?: string
  email?: string
  phone?: string
}

export interface FiscalDocumentPayload {
  prefix: string
  number: string
  fullNumber: string
  issueDate: string // "YYYY-MM-DD"
  issueTime: string // "HH:mm:ss"
  company: FiscalCompanyInfo
  customer: FiscalCustomerInfo
  items: FiscalDocumentItem[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  paymentMethod: string // SAT: '01' Efectivo, '04' Tarjeta Crédito, '28' Tarjeta Débito
  paymentWay?: string // SAT MetodoPago: 'PUE' (Pago en una sola exhibición)
  currency: string // 'MXN', 'CLP', 'COP'
  environment: '1' | '2' // 1: Producción, 2: Pruebas/Sandbox
  documentType?: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE'
  folio?: number // Folio numérico (Chile)
}

export interface FiscalEmissionResult {
  success: boolean
  fiscalId: string // CUFE (CO), UUID (SAT MX), Folio (SII CL)
  xmlContent: string
  qrCodeUrl: string
  verificationUrl: string
  status: 'ACCEPTED' | 'REJECTED' | 'TEST_PASSED' | 'PENDING'
  message: string
  rawResponse?: string
}

export interface FiscalAdapter {
  country: FiscalCountry
  buildXml(payload: FiscalDocumentPayload): string
  emitDocument(payload: FiscalDocumentPayload): Promise<FiscalEmissionResult>
  getVerificationUrl(fiscalId: string, payload?: FiscalDocumentPayload): string
}
