import crypto from 'crypto'
import {
  DianDocumentPayload,
  DianCreditNotePayload,
  DianDebitNotePayload,
} from './types'

/**
 * Calcula el Código Único de Factura Electrónica (CUFE) según la Resolución 000042 de la DIAN.
 *
 * Fórmula oficial DIAN:
 * CUFE = SHA384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTolFac + NitOFE + NumAdq + ClTec + TipoAmb)
 */
export function calculateCUFE(payload: DianDocumentPayload): string {
  const numFac = payload.fullNumber
  const fecFac = payload.issueDate
  // HorFac sin zona horaria para el hash (ej. 14:30:00)
  const horFac = payload.issueTime.replace('-05:00', '').trim()
  const valFac = payload.subtotal.toFixed(2)
  const codImp1 = '01' // IVA
  const valImp1 = payload.taxTotal.toFixed(2)
  const codImp2 = '04' // Impoconsumo
  const valImp2 = '0.00'
  const codImp3 = '03' // ICA
  const valImp3 = '0.00'
  const valTolFac = payload.total.toFixed(2)
  const nitOfe = payload.company.taxId.replace(/[^0-9]/g, '')
  const numAdq = payload.customer.taxId ? payload.customer.taxId.replace(/[^0-9]/g, '') : '222222222222' // Consumidor final
  const clTec = payload.technicalKey || 'ClaveTecnicaDIANPruebas2026'
  const tipoAmb = payload.environment // '1' o '2'

  const concatenatedString = `${numFac}${fecFac}${horFac}${valFac}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTolFac}${nitOfe}${numAdq}${clTec}${tipoAmb}`

  const hash = crypto.createHash('sha384').update(concatenatedString, 'utf8').digest('hex')
  return hash
}

/**
 * Calcula el Código Único de Documento Electrónico (CUDE) para Notas Crédito y Notas Débito.
 *
 * Fórmula oficial DIAN:
 * CUDE = SHA384(NumDoc + FecDoc + HorDoc + ValDoc + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTolDoc + NitOFE + NumAdq + PinSoftware + TipoAmb)
 */
export function calculateCUDE(payload: DianCreditNotePayload | DianDebitNotePayload): string {
  const numDoc = payload.fullNumber
  const fecDoc = payload.issueDate
  const horDoc = payload.issueTime.replace('-05:00', '').trim()
  const valDoc = payload.subtotal.toFixed(2)
  const codImp1 = '01'
  const valImp1 = payload.taxTotal.toFixed(2)
  const codImp2 = '04'
  const valImp2 = '0.00'
  const codImp3 = '03'
  const valImp3 = '0.00'
  const valTolDoc = payload.total.toFixed(2)
  const nitOfe = payload.company.taxId.replace(/[^0-9]/g, '')
  const numAdq = payload.customer.taxId ? payload.customer.taxId.replace(/[^0-9]/g, '') : '222222222222'
  const pin = payload.technicalKey || '12345'
  const tipoAmb = payload.environment

  const concatenatedString = `${numDoc}${fecDoc}${horDoc}${valDoc}${codImp1}${valImp1}${codImp2}${valImp2}${codImp3}${valImp3}${valTolDoc}${nitOfe}${numAdq}${pin}${tipoAmb}`

  return crypto.createHash('sha384').update(concatenatedString, 'utf8').digest('hex')
}

/**
 * Genera la URL oficial de consulta pública con código QR de la DIAN para un CUFE / CUDE.
 */
export function generateDianQrUrl(
  cufeOrCude: string,
  payloadOrEnv: DianDocumentPayload | '1' | '2'
): string {
  const env = typeof payloadOrEnv === 'string' ? payloadOrEnv : payloadOrEnv.environment
  return getDianPublicVerificationUrl(cufeOrCude, env)
}

/**
 * Retorna el enlace directo al catálogo VPFE de la DIAN para verificar la validez oficial de un comprobante.
 */
export function getDianPublicVerificationUrl(
  cufeOrCude: string,
  environment: '1' | '2' = '1'
): string {
  const baseUrl =
    environment === '1'
      ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr'
      : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr'

  return `${baseUrl}?documentkey=${cufeOrCude}`
}
