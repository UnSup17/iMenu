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
  const [qrUrl, setQrUrl] = useState<string | null>(
    initialCufe
      ? `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${initialCufe}`
      : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmitDian = async () => {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/billing/electronic-invoicing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al emitir factura ante la DIAN')
      }

      const result = await res.json()
      setCufe(result.cufe)
      setStatus(result.status)
      setQrUrl(result.qrCodeUrl)
      onSuccess?.(result.cufe)
    } catch (err: any) {
      setError(err.message || 'Error en transmisión DIAN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          <h3 className="text-sm font-bold text-white">Facturación Electrónica DIAN</h3>
        </div>
        {status && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            {status}
          </span>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {cufe ? (
        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase block">
              CUFE (Código Único de Factura Electrónica):
            </span>
            <p className="text-xs font-mono text-amber-400/90 break-all select-all bg-zinc-950 p-2 rounded-lg border border-zinc-800 mt-1">
              {cufe}
            </p>
          </div>

          {qrUrl && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <a
                href={qrUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>🔍</span>
                <span>Verificar en portal DIAN ↗</span>
              </a>
              <span className="text-zinc-500">Documento Válido</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Esta factura aún no ha sido reportada electrónicamente a la DIAN.
          </p>
          <button
            onClick={handleEmitDian}
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            <span>⚡</span>
            <span>{loading ? 'Transmitiendo a DIAN...' : 'Emitir Factura Electrónica (UBL 2.1)'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
