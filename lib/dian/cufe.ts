import crypto from 'crypto'
import { DianDocumentPayload } from './types'

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
 * Genera la URL oficial de consulta pública con código QR de la DIAN.
 */
export function generateDianQrUrl(cufe: string, payload: DianDocumentPayload): string {
  const baseUrl =
    payload.environment === '1'
      ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr'
      : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr'

  return `${baseUrl}?documentkey=${cufe}`
}
