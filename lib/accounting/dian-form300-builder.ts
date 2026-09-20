import { VatReportData } from './types'

export interface RestaurantDianMetadata {
  name: string
  taxId?: string | null // NIT
  dv?: string | null // Dígito de Verificación
  city?: string | null
}

/**
 * Redondea un valor monetario al múltiplo de mil más cercano (regla estándar formularios DIAN).
 */
function roundToThousands(val: number): number {
  return Math.round(val / 1000) * 1000
}

/**
 * Genera el XML en formato MUISCA para la Declaración de IVA - Formulario 300 de la DIAN.
 */
export function buildDianForm300Xml(
  vatData: VatReportData,
  restaurant: RestaurantDianMetadata,
  periodYear: number,
  bimonthlyPeriod: number
): string {
  // Casillas calculadas (redondeadas a miles según norma DIAN)
  const casilla27_baseVentas = roundToThousands(vatData.salesTaxableBase)
  const casilla39_totalIngresosBrutos = casilla27_baseVentas
  const casilla41_totalIngresosNetos = casilla39_totalIngresosBrutos
  const casilla57_ivaGenerado = roundToThousands(vatData.vatCollected)
  const casilla64_totalIvaGenerado = casilla57_ivaGenerado

  const casilla66_baseCompras = roundToThousands(vatData.expensesTaxableBase)
  const casilla79_ivaDescontable = roundToThousands(vatData.vatPaid)
  const casilla83_totalIvaDescontable = casilla79_ivaDescontable

  const saldoNeto = casilla64_totalIvaGenerado - casilla83_totalIvaDescontable
  const casilla84_saldoPagar = saldoNeto > 0 ? saldoNeto : 0
  const casilla85_saldoFavor = saldoNeto < 0 ? Math.abs(saldoNeto) : 0

  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

  const cleanedNit = (restaurant.taxId || '900000000').replace(/[^0-9]/g, '')
  const dv = restaurant.dv || '1'
  const restaurantName = escapeXml(restaurant.name || 'Restaurante')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mas:Documento xmlns:mas="http://www.dian.gov.co/contratos/mas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- Archivo Plano DIAN MUISCA - Formulario 300: Declaración de Impuesto sobre las Ventas (IVA) -->
  <mas:Cabecera>
    <mas:Formulario>300</mas:Formulario>
    <mas:Version>10</mas:Version>
    <mas:Ano>${periodYear}</mas:Ano>
    <mas:Periodo>${String(bimonthlyPeriod).padStart(2, '0')}</mas:Periodo>
    <mas:FechaGeneracion>${new Date().toISOString()}</mas:FechaGeneracion>
    <mas:GeneradoPor>iMenu Cloud POS</mas:GeneradoPor>
  </mas:Cabecera>
  <mas:Declarante>
    <mas:NIT>${cleanedNit}</mas:NIT>
    <mas:DV>${dv}</mas:DV>
    <mas:RazonSocial>${restaurantName}</mas:RazonSocial>
  </mas:Declarante>
  <mas:DatosFormulario>
    <!-- SECCIÓN INGRESOS / BASE GRAVABLE -->
    <!-- Casilla 27: Ingresos brutos por operaciones gravadas a la tarifa general (19%) -->
    <mas:Casilla num="27">${casilla27_baseVentas}</mas:Casilla>
    <!-- Casilla 39: Total ingresos brutos -->
    <mas:Casilla num="39">${casilla39_totalIngresosBrutos}</mas:Casilla>
    <!-- Casilla 41: Total ingresos netos gravados -->
    <mas:Casilla num="41">${casilla41_totalIngresosNetos}</mas:Casilla>

    <!-- SECCIÓN IMPUESTO GENERADO -->
    <!-- Casilla 57: A la tarifa general -->
    <mas:Casilla num="57">${casilla57_ivaGenerado}</mas:Casilla>
    <!-- Casilla 64: Total impuesto generado por operaciones gravadas -->
    <mas:Casilla num="64">${casilla64_totalIvaGenerado}</mas:Casilla>

    <!-- SECCIÓN COMPRAS E IMPORTACIONES (IVA DESCONTABLE) -->
    <!-- Casilla 66: De servicios y bienes gravados a la tarifa general -->
    <mas:Casilla num="66">${casilla66_baseCompras}</mas:Casilla>
    <!-- Casilla 79: Impuesto descontable por servicios y bienes nacionales -->
    <mas:Casilla num="79">${casilla79_ivaDescontable}</mas:Casilla>
    <!-- Casilla 83: Total impuesto descontable -->
    <mas:Casilla num="83">${casilla83_totalIvaDescontable}</mas:Casilla>

    <!-- SECCIÓN LIQUIDACIÓN PRIVADA -->
    <!-- Casilla 84: Saldo a pagar por el período fiscal -->
    <mas:Casilla num="84">${casilla84_saldoPagar}</mas:Casilla>
    <!-- Casilla 85: Saldo a favor por el período fiscal -->
    <mas:Casilla num="85">${casilla85_saldoFavor}</mas:Casilla>
    <!-- Casilla 89: Total saldo a pagar -->
    <mas:Casilla num="89">${casilla84_saldoPagar}</mas:Casilla>
    <!-- Casilla 90: Total saldo a favor -->
    <mas:Casilla num="90">${casilla85_saldoFavor}</mas:Casilla>
  </mas:DatosFormulario>
  <mas:Control>
    <mas:CantidadFacturasEmitidas>${vatData.invoicesCount}</mas:CantidadFacturasEmitidas>
    <mas:CantidadEgresosProcesados>${vatData.expensesCount}</mas:CantidadEgresosProcesados>
    <mas:TarifaIvaAplicada>${vatData.taxRatePercent}%</mas:TarifaIvaAplicada>
    <mas:RangoInicio>${vatData.startDate}</mas:RangoInicio>
    <mas:RangoFin>${vatData.endDate}</mas:RangoFin>
  </mas:Control>
</mas:Documento>
`

  return xml.trim()
}
