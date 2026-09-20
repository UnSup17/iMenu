import { FiscalAdapter, FiscalCountry, FiscalDocumentPayload, FiscalEmissionResult } from './types'
import { SatMexicoAdapter } from './sat-mexico'
import { SiiChileAdapter } from './sii-chile'
import { sendInvoiceToDian } from '@/lib/dian/soap-client'
import { DianDocumentPayload } from '@/lib/dian/types'
import { getDianPublicVerificationUrl, calculateCUFE } from '@/lib/dian/cufe'
import { buildUbl21Xml } from '@/lib/dian/ubl-builder'

export * from './types'
export { SatMexicoAdapter } from './sat-mexico'
export { SiiChileAdapter } from './sii-chile'

/**
 * Adaptador DIAN Colombia adaptado a la interfaz FiscalAdapter unificada.
 */
class DianColombiaAdapter implements FiscalAdapter {
  country: 'CO' = 'CO'

  buildXml(payload: FiscalDocumentPayload): string {
    const dianPayload = toDianPayload(payload)
    const cufe = calculateCUFE(dianPayload)
    const qrUrl = getDianPublicVerificationUrl(cufe, dianPayload.environment)
    return buildUbl21Xml(dianPayload, cufe, qrUrl)
  }

  async emitDocument(payload: FiscalDocumentPayload): Promise<FiscalEmissionResult> {
    const dianPayload = toDianPayload(payload)
    const res = await sendInvoiceToDian(dianPayload)

    return {
      success: res.success,
      fiscalId: res.cufe,
      xmlContent: res.xmlSigned,
      qrCodeUrl: res.qrCodeUrl,
      verificationUrl: res.qrCodeUrl,
      status: res.status,
      message: res.message,
      rawResponse: res.dianResponseXml,
    }
  }

  getVerificationUrl(fiscalId: string, payload?: FiscalDocumentPayload): string {
    return getDianPublicVerificationUrl(fiscalId, payload?.environment || '1')
  }
}

function toDianPayload(payload: FiscalDocumentPayload): DianDocumentPayload {
  return {
    prefix: payload.prefix,
    invoiceNumber: `${payload.prefix}-${payload.number}`,
    fullNumber: payload.fullNumber,
    issueDate: payload.issueDate,
    issueTime: payload.issueTime.includes('-05:00') ? payload.issueTime : `${payload.issueTime}-05:00`,
    company: {
      legalName: payload.company.legalName,
      taxId: payload.company.taxId.replace(/[^0-9]/g, ''),
      dv: payload.company.dv || '7',
      taxScheme: '01',
      address: payload.company.address,
      phone: payload.company.phone,
      email: payload.company.email,
      city: payload.company.city,
    },
    customer: {
      name: payload.customer.name,
      taxId: payload.customer.taxId ? payload.customer.taxId.replace(/[^0-9]/g, '') : '222222222222',
      email: payload.customer.email,
      phone: payload.customer.phone,
      address: payload.customer.address,
    },
    items: payload.items.map((it) => ({
      id: it.id,
      code: it.code,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      subtotal: it.subtotal,
      total: it.total,
    })),
    subtotal: payload.subtotal,
    taxTotal: payload.taxTotal,
    discountTotal: payload.discountTotal,
    total: payload.total,
    paymentMethod: payload.paymentMethod || '10',
    environment: payload.environment,
  }
}

/**
 * Factory para obtener el adaptador fiscal correspondiente al país configurado.
 */
export function getFiscalAdapter(country: FiscalCountry | string): FiscalAdapter {
  switch (country.toUpperCase()) {
    case 'MX':
      return new SatMexicoAdapter()
    case 'CL':
      return new SiiChileAdapter()
    case 'CO':
    default:
      return new DianColombiaAdapter()
  }
}
