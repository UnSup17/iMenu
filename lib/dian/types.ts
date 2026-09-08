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
}

export interface DianSendResult {
  success: boolean
  cufe: string
  qrCodeUrl: string
  xmlSigned: string
  zipName: string
  status: 'ACCEPTED' | 'REJECTED' | 'TEST_PASSED'
  message: string
  dianResponseXml?: string
}
