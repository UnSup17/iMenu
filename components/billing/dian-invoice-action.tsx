'use client'

import { useState } from 'react'

interface DianInvoiceActionProps {
  invoiceId: string
  initialCufe?: string | null
  initialStatus?: string | null
  onSuccess?: (cufe: string) => void
}

export function DianInvoiceAction({
  invoiceId,
  initialCufe,
  initialStatus,
  onSuccess,
}: DianInvoiceActionProps) {
  const [cufe, setCufe] = useState<string | null>(initialCufe || null)
  const [status, setStatus] = useState<string | null>(initialStatus || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Contingency & Credit Note Modals / States
  const [isContingency, setIsContingency] = useState(false)
  const [contingencyType, setContingencyType] = useState<'03' | '04'>('03')
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [creditNoteReason, setCreditNoteReason] = useState('')
  const [discrepancyCode, setDiscrepancyCode] = useState<'1' | '2' | '3' | '4' | '5'>('2')
  const [showB2BModal, setShowB2BModal] = useState(false)
  const [b2bEventCode, setB2bEventCode] = useState<'030' | '032' | '033' | '034'>('030')

  const publicVerificationUrl = cufe
    ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`
    : null

  const handleEmitDian = async (forceContingency = false) => {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          isContingency: forceContingency || isContingency,
          contingencyType: forceContingency || isContingency ? contingencyType : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al emitir factura ante la DIAN')
      }

      const result = await res.json()
      setCufe(result.cufe)
      setStatus(result.status)
      setSuccessMsg(result.message)
      onSuccess?.(result.cufe)
    } catch (err: any) {
      setError(err.message || 'Error en transmisión DIAN')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al consultar estado')
      }

      const result = await res.json()
      setStatus(result.status)
      setSuccessMsg(`Estado DIAN actualizado: ${result.message}`)
    } catch (err: any) {
      setError(err.message || 'Error al consultar estado')
    } finally {
      setLoading(false)
    }
  }

  const handleEmitCreditNote = async () => {
    if (!creditNoteReason.trim()) {
      setError('Por favor detalle el motivo de la Nota Crédito')
      return
    }

    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/credit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          discrepancyCode,
          discrepancyDescription: creditNoteReason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al emitir Nota Crédito')
      }

      const result = await res.json()
      setShowCreditNoteModal(false)
      setStatus(result.status === 'ACCEPTED' || result.status === 'TEST_PASSED' ? 'VOIDED_BY_CREDIT_NOTE' : result.status)
      setSuccessMsg(`Nota Crédito ${result.noteNumber} emitida exitosamente. CUDE registrado.`)
    } catch (err: any) {
      setError(err.message || 'Error al emitir Nota Crédito')
    } finally {
      setLoading(false)
    }
  }

  const handleEmitB2BEvent = async () => {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          eventCode: b2bEventCode,
          comment: 'Registro automático de evento desde portal de operaciones',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al emitir evento B2B')
      }

      const result = await res.json()
      setShowB2BModal(false)
      setSuccessMsg(`Evento ${result.eventCode} (${result.eventDescription}) transmitido formalmente a la DIAN.`)
    } catch (err: any) {
      setError(err.message || 'Error al transmitir evento B2B')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <div>
            <h3 className="text-sm font-bold text-white">Facturación Electrónica DIAN Directa</h3>
            <p className="text-[11px] text-zinc-400">Estándar UBL 2.1 Colombia (Resolución 000042)</p>
          </div>
        </div>
        {status && (
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
              status.includes('VOID')
                ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                : status === 'ACCEPTED' || status === 'TEST_PASSED'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950 text-amber-300 border-amber-800/60'
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
          <span>⚠️</span>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
          <span>✅</span>
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {cufe ? (
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
              CUFE (Código Único de Factura Electrónica):
            </span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs font-mono text-amber-400/90 break-all select-all bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex-1">
                {cufe}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(cufe)}
                title="Copiar CUFE"
                className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700 transition"
              >
                📋
              </button>
            </div>
          </div>

          {/* Botón oficial de verificación pública DIAN */}
          {publicVerificationUrl && (
            <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                <span className="text-emerald-400">🛡️</span>
                <span>Comprobante Oficial Registrado en DIAN</span>
              </div>
              <a
                href={publicVerificationUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <span>🔍</span>
                <span>Verificar CUFE en Portal DIAN ↗</span>
              </a>
            </div>
          )}

          {/* Acciones adicionales: Polling de Estado, Nota Crédito, Acuse B2B */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>🔄</span>
              <span>{loading ? 'Consultando...' : 'Revisar Estado'}</span>
            </button>

            {!status?.includes('VOID') && (
              <button
                onClick={() => setShowCreditNoteModal(true)}
                disabled={loading}
                className="py-2 px-3 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 text-xs font-medium border border-rose-800/60 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>📑</span>
                <span>Emitir Nota Crédito</span>
              </button>
            )}

            <button
              onClick={() => setShowB2BModal(true)}
              disabled={loading}
              className="py-2 px-3 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 text-blue-200 text-xs font-medium border border-blue-800/60 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span>🤝</span>
              <span>Acuse B2B</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Esta factura aún no ha sido reportada electrónicamente a la DIAN. Puedes emitirla en modo estándar o en modo contingencia si hay inconvenientes de red.
          </p>

          {/* Selector de contingencia */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isContingency}
                  onChange={(e) => setIsContingency(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="font-semibold text-zinc-200">Emitir en Modo de Contingencia</span>
              </label>
              {isContingency && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  UBL 2.1 Contingencia
                </span>
              )}
            </div>

            {isContingency && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setContingencyType('03')}
                  className={`p-2 rounded border text-left transition ${
                    contingencyType === '03'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                  }`}
                >
                  <p className="font-bold text-[11px]">Tipo 03</p>
                  <p className="text-[10px] text-zinc-400">Talonario / Inconvenientes Facturador</p>
                </button>
                <button
                  type="button"
                  onClick={() => setContingencyType('04')}
                  className={`p-2 rounded border text-left transition ${
                    contingencyType === '04'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                  }`}
                >
                  <p className="font-bold text-[11px]">Tipo 04</p>
                  <p className="text-[10px] text-zinc-400">Contingencia Servidores DIAN</p>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => handleEmitDian(false)}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50 cursor-pointer"
          >
            <span>⚡</span>
            <span>
              {loading
                ? 'Transmitiendo a DIAN...'
                : isContingency
                ? `Emitir Factura de Contingencia (Tipo ${contingencyType})`
                : 'Emitir Factura Electrónica Directa (UBL 2.1)'}
            </span>
          </button>
        </div>
      )}

      {/* Modal Nota Crédito */}
      {showCreditNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📑</span> Emitir Nota Crédito UBL 2.1 (DIAN)
              </h4>
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Concepto de Corrección DIAN:</label>
                <select
                  value={discrepancyCode}
                  onChange={(e) => setDiscrepancyCode(e.target.value as any)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                >
                  <option value="2">2 — Anulación de factura electrónica</option>
                  <option value="1">1 — Devolución parcial de los bienes y/o servicios</option>
                  <option value="3">3 — Rebaja o descuento parcial o total</option>
                  <option value="4">4 — Ajuste de precio</option>
                  <option value="5">5 — Otros</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Motivo / Explicación del Ajuste:</label>
                <textarea
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  placeholder="Ej: Anulación solicitada por cliente por cambio de razón social..."
                  rows={3}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmitCreditNote}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>⚡</span>
                <span>{loading ? 'Generando Nota...' : 'Emitir Nota Crédito'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Acuse B2B */}
      {showB2BModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🤝</span> Acuse de Recibo B2B (ApplicationResponse)
              </h4>
              <button
                onClick={() => setShowB2BModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">
                Selecciona el evento que deseas transmitir ante la DIAN para formalizar la aceptación comercial del documento:
              </p>
              <div>
                <label className="text-zinc-400 block mb-1">Tipo de Evento RADIAN / DIAN:</label>
                <select
                  value={b2bEventCode}
                  onChange={(e) => setB2bEventCode(e.target.value as any)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                >
                  <option value="030">030 — Acuse de recibo de Factura Electrónica de Venta</option>
                  <option value="032">032 — Recibo del bien y/o prestación del servicio</option>
                  <option value="033">033 — Aceptación expresa</option>
                  <option value="034">034 — Aceptación tácita</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowB2BModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmitB2BEvent}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>⚡</span>
                <span>{loading ? 'Transmitiendo...' : 'Transmitir Evento DIAN'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
