'use client'

import { useState, useRef } from 'react'

interface Props {
  onClose: () => void
  onImportSuccess: () => void
}

export function BulkImportExportModal({ onClose, onImportSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [file, setFile] = useState<File | null>(null)
  const [autoCreateCategories, setAutoCreateCategories] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    importedCount: number
    categoriesCreated: number
    totalRows: number
    errors: { row: number; reason: string }[]
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleFileSelect(selectedFile: File) {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.type.includes('csv')) {
      setErrorMsg('Por favor selecciona un archivo en formato .CSV')
      return
    }
    setErrorMsg(null)
    setImportResult(null)
    setFile(selectedFile)
  }

  async function handleImport() {
    if (!file) {
      setErrorMsg('Selecciona un archivo CSV antes de importar')
      return
    }

    setIsUploading(true)
    setErrorMsg(null)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('autoCreateCategories', String(autoCreateCategories))

      const res = await fetch('/api/menu/import', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Error al procesar la importación')
      }

      setImportResult(json)
      if (json.importedCount > 0) {
        onImportSuccess()
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al importar')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Carga Masiva & Exportación de Menú
              </h2>
              <p className="text-xs text-zinc-400">
                Administra cientos de platos rápidamente mediante hojas de cálculo CSV / Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 px-6 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📥 Importar Catálogo (CSV)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📤 Exportar & Plantilla
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'import' ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0])
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                  }}
                />
                <p className="text-4xl mb-2">{file ? '📄' : '📁'}</p>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB — Listo para importar
                    </p>
                    <span className="inline-block mt-3 text-xs text-amber-400 hover:underline">
                      Cambiar archivo
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Arrastra y suelta tu archivo CSV aquí o haz clic para explorar
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Formatos compatibles: .CSV delimitado por comas con codificación UTF-8
                    </p>
                  </div>
                )}
              </div>

              {/* Opción auto crear categorías */}
              <label className="flex items-center gap-3 select-none cursor-pointer p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <input
                  type="checkbox"
                  checked={autoCreateCategories}
                  onChange={(e) => setAutoCreateCategories(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded bg-zinc-900 border-zinc-700"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Crear automáticamente categorías que no existan
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Si el CSV tiene categorías nuevas, se registrarán en tu menú automáticamente
                  </span>
                </div>
              </label>

              {/* Mensajes de error */}
              {errorMsg && (
                <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Resultados de importación */}
              {importResult && (
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-sm">
                      ✓ Importación finalizada:
                    </span>
                    <span className="text-xs text-zinc-300">
                      <strong>{importResult.importedCount}</strong> productos procesados con éxito.
                    </span>
                  </div>
                  {importResult.categoriesCreated > 0 && (
                    <p className="text-xs text-amber-400">
                      ✨ Se crearon {importResult.categoriesCreated} nuevas categorías en tu menú.
                    </p>
                  )}

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs font-semibold text-red-400 mb-1">
                        Advertencias en algunas filas ({importResult.errors.length}):
                      </p>
                      <ul className="text-[11px] text-zinc-400 max-h-32 overflow-y-auto space-y-1 pl-2">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>
                            • Fila {err.row}: {err.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={!file || isUploading}
                  onClick={handleImport}
                  className="px-6 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isUploading ? 'Procesando catálogo…' : '🚀 Iniciar Importación Masiva'}
                </button>
              </div>
            </>
          ) : (
            /* Tab: Export */
            <div className="space-y-6">
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    📄 Plantilla Oficial de Menú iMenu
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md">
                    Descarga un archivo CSV con las columnas correctas, ejemplos de platos,
                    alérgenos y precios dinámicos para rellenar fácilmente.
                  </p>
                </div>
                <a
                  href="/api/menu/export?template=true"
                  download="plantilla_menu_imenu.csv"
                  className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-lg transition-colors shrink-0"
                >
                  📥 Descargar Plantilla (.CSV)
                </a>
              </div>

              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    💾 Exportar Menú Actual del Restaurante
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md">
                    Descarga una copia completa de todos tus platos, precios y configuraciones en
                    CSV para hacer copias de seguridad o editar en Excel.
                  </p>
                </div>
                <a
                  href="/api/menu/export"
                  download="catalogo_menu.csv"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors shrink-0 shadow-sm"
                >
                  📤 Exportar Menú (.CSV)
                </a>
              </div>

              {/* Guía de columnas */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Estructura de Columnas Soportadas:
                </h5>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div>
                    <strong className="text-zinc-200">categoria:</strong> Nombre de la categoría
                    (requerido).
                  </div>
                  <div>
                    <strong className="text-zinc-200">nombre:</strong> Nombre del plato (requerido).
                  </div>
                  <div>
                    <strong className="text-zinc-200">precio:</strong> Precio base en números
                    (requerido).
                  </div>
                  <div>
                    <strong className="text-zinc-200">descripcion:</strong> Ingredientes y detalles.
                  </div>
                  <div>
                    <strong className="text-zinc-200">alergenos:</strong> Separados por coma (ej:
                    gluten,lacteos).
                  </div>
                  <div>
                    <strong className="text-zinc-200">precio_promocional:</strong> Precio especial
                    (happy hour).
                  </div>
                  <div>
                    <strong className="text-zinc-200">dias_promocion:</strong> Números 0-6 (0=Dom,
                    1=Lun, etc.).
                  </div>
                  <div>
                    <strong className="text-zinc-200">hora_inicio/fin:</strong> Formato HH:MM (ej:
                    17:00, 20:00).
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
