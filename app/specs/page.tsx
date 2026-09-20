import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Especificaciones Técnicas & Hardware — iMenu',
  description:
    'Especificaciones de arquitectura de bajo nivel, compatibilidad de impresoras térmicas ESC/POS (TCP 9100 / WebUSB), KDS multi-estación, facturación electrónica DIAN UBL 2.1 y topología de red de iMenu.',
}

export default function TechSpecsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950 font-sans antialiased">
      {/* ── Background Elements ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[650px] h-[650px] bg-amber-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -right-20 w-[550px] h-[550px] bg-blue-500/8 rounded-full blur-[180px]" />
        <div className="absolute bottom-10 -left-20 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[170px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                i<span className="text-amber-500">Menu</span>
              </span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono font-medium">
              Specs v2.4 · Hardware & Arquitectura
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400 font-medium">
            <a href="#hardware" className="hover:text-white transition-colors">Impresoras ESC/POS</a>
            <a href="#kds" className="hover:text-white transition-colors">KDS Multi-estación</a>
            <a href="#dian" className="hover:text-white transition-colors">DIAN UBL 2.1</a>
            <a href="#payments" className="hover:text-white transition-colors">Split Bill & Pagos</a>
            <a href="#network" className="hover:text-white transition-colors">Topología LAN</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
            >
              Docs Generales ↗
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3.5 py-1.5 rounded-lg transition shadow-md shadow-amber-500/20"
            >
              Ir a la App
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative z-10 pt-16 pb-16 px-6 border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/60 text-xs text-zinc-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ficha Técnica Oficial para Integradores, Técnicos y Restaurantes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Especificaciones Técnicas &amp; <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              Compatibilidad de Hardware
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Detalle de ingeniería de bajo nivel sobre la infraestructura de iMenu: generación directa
            de buffers binarios ESC/POS por TCP en red, ruteo multi-estación de comandas, integración
            SOAP con la DIAN sin intermediarios y topología LAN para alta disponibilidad gastronómica.
          </p>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="text-xs text-zinc-500 font-mono uppercase">Protocolo Impresión</div>
              <div className="text-lg font-bold text-amber-400 mt-1">TCP / RAW 9100</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Buffer TypeScript nativo</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="text-xs text-zinc-500 font-mono uppercase">Latencia Despacho</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">&lt; 120 ms</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Directo a cabezal térmico</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="text-xs text-zinc-500 font-mono uppercase">Estaciones KDS</div>
              <div className="text-lg font-bold text-blue-400 mt-1">6 Estaciones</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Ruteo + ETA predictivo</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="text-xs text-zinc-500 font-mono uppercase">Emisión Fiscal</div>
              <div className="text-lg font-bold text-purple-400 mt-1">UBL 2.1 Directo</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">SOAP DIAN sin PTH</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-24">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 1: IMPRESIÓN TÉRMICA ESC/POS & HARDWARE                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="hardware" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20 mb-2">
                Hardware & Periféricos POS
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Impresión Térmica de Red ESC/POS
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-md">
              Generación de binarios sin drivers externos · Envío vía Socket TCP RAW · Corte y apertura de gaveta
            </p>
          </div>

          {/* Quotation / Specification Hero Box */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/40 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                🖨️
              </div>
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Especificación Técnica Central
                </div>
                <div className="text-lg md:text-xl font-bold text-white font-mono leading-relaxed bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                  Buffer ESC/POS generado en TypeScript → enviado por TCP al puerto 9100 de la impresora.
                  Compatible con Epson TM-T20/T88, Bixolon SRP-350, RONGTA.
                </div>
                <p className="text-xs text-zinc-400">
                  Esta arquitectura elimina la necesidad de intermediarios como QZ Tray, PrintNodes, o servidores CUPS de Windows. El servidor Next.js construye la trama de bytes ESC/POS en memoria y abre una conexión TCP directa hacia la IP LAN de la impresora térmica en milisegundos.
                </p>
              </div>
            </div>
          </div>

          {/* Architecture Diagram Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-amber-500">❖</span> Flujo de Datos &amp; Pipeline de Impresión
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
                <div className="text-xs font-mono text-zinc-500">Paso 1 · Evento</div>
                <div className="my-3 font-semibold text-white text-sm">Cobro o Comanda</div>
                <div className="text-[11px] text-zinc-400">POS / Waiter emite orden o cierre de mesa</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 flex flex-col justify-between relative">
                <span className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-amber-500 font-mono text-sm">→</span>
                <div className="text-xs font-mono text-amber-400">Paso 2 · Motor Binario</div>
                <div className="my-3 font-semibold text-white text-sm">buildEscPosBuffer()</div>
                <div className="text-[11px] text-zinc-400">TypeScript serializa texto, alineación, negritas y corte</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-blue-500/30 flex flex-col justify-between relative">
                <span className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-blue-400 font-mono text-sm">→</span>
                <div className="text-xs font-mono text-blue-400">Paso 3 · Red Local</div>
                <div className="my-3 font-semibold text-white text-sm">net.Socket (TCP)</div>
                <div className="text-[11px] text-zinc-400">Conexión directa a IP:9100 con timeout de 4s</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/30 flex flex-col justify-between relative">
                <span className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono text-sm">→</span>
                <div className="text-xs font-mono text-emerald-400">Paso 4 · Hardware</div>
                <div className="my-3 font-semibold text-white text-sm">Corte Térmico</div>
                <div className="text-[11px] text-zinc-400">Impresión física de 80mm/58mm + apertura de gaveta</div>
              </div>
            </div>

            {/* Code / Protocol Commands reference */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                <span>Comandos ESC/POS Nativos Inyectados en el Buffer</span>
                <span className="text-amber-500 font-semibold">lib/hardware/esc-pos-printer.ts</span>
              </div>
              <pre className="text-xs font-mono text-zinc-300 pt-3 leading-relaxed">
{`const ESC = 0x1b, GS = 0x1d, LF = 0x0a

push([ESC, 0x40])             // Inicializar buffer y resetear estado térmico (ESC @)
push([ESC, 0x61, 0x01])       // Alineación centrada para encabezado (ESC a 1)
push([ESC, 0x45, 0x01])       // Negrita activada (ESC E 1)
push([ESC, 0x21, 0x10])       // Doble altura para nombre del local (GS !)
push([GS,  0x56, 0x41, 0x00]) // Corte de papel automático (GS V A 0)
push([ESC, 0x70, 0x00, 25, 250]) // Pulso de apertura a cajón monedero RJ11 (ESC p)`}
              </pre>
            </div>
          </div>

          {/* Supported Hardware Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Modelos de Impresoras Térmicas Homologados</h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Fabricante</th>
                    <th className="py-3 px-4">Modelos Certificados</th>
                    <th className="py-3 px-4">Interfaces</th>
                    <th className="py-3 px-4">Ancho</th>
                    <th className="py-3 px-4">Corte &amp; Cajón</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                  <tr className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-amber-400">Epson</td>
                    <td className="py-3.5 px-4 font-medium text-white">TM-T20II, TM-T20III, TM-T88V, TM-T88VI, TM-m30</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">Ethernet RJ45 / WiFi (Puerto 9100) + WebUSB</td>
                    <td className="py-3.5 px-4">80mm / 58mm</td>
                    <td className="py-3.5 px-4 text-emerald-400">✓ Soportado</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">Oficial 100%</span></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-amber-400">Bixolon</td>
                    <td className="py-3.5 px-4 font-medium text-white">SRP-350plusIII, SRP-330II, SRP-Q300</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">Ethernet / WiFi (Puerto 9100 RAW)</td>
                    <td className="py-3.5 px-4">80mm</td>
                    <td className="py-3.5 px-4 text-emerald-400">✓ Soportado</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">Oficial 100%</span></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-amber-400">RONGTA</td>
                    <td className="py-3.5 px-4 font-medium text-white">RP326, RP80, RP332, ACE V1</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">Ethernet / LAN (Puerto 9100 RAW)</td>
                    <td className="py-3.5 px-4">80mm</td>
                    <td className="py-3.5 px-4 text-emerald-400">✓ Soportado</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">Oficial 100%</span></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-amber-400">Star Micronics</td>
                    <td className="py-3.5 px-4 font-medium text-white">TSP100III, TSP650II (Modo Emulación ESC/POS)</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">Ethernet (Puerto 9100)</td>
                    <td className="py-3.5 px-4">80mm</td>
                    <td className="py-3.5 px-4 text-emerald-400">✓ Soportado</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">Compatible</span></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-zinc-400">Genéricas POS</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-300">Cualquier impresora POS térmica compatible con ESC/POS estándar</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">Socket RAW puerto 9100 o WebUSB</td>
                    <td className="py-3.5 px-4">58mm / 80mm</td>
                    <td className="py-3.5 px-4 text-zinc-300">Estándar</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold">Universal</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 2: KDS & MULTI-ESTACIÓN                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="kds" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20 mb-2">
                Cocina en Vivo & Pantallas
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                KDS Inteligente &amp; Ruteo Multi-Estación
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-md">
              Segmentación automática por partida de cocina · Algoritmo ETA histórico de 24h
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🍳</span> Ruteo Automático de Comandas
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cuando una comanda entra desde el código QR o el punto de venta, cada platillo se despacha
                a la pantalla KDS de su estación correspondiente. El personal de parrilla solo ve cortes
                y carnes, el barman solo ve cocteles, y el expedidor ve la comanda consolidada.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {[
                  { name: 'CALIENTE', icon: '🔥', desc: 'Sopas, salteados, guisados' },
                  { name: 'FRIA', icon: '🥗', desc: 'Ensaladas, entradas, ceviches' },
                  { name: 'BAR', icon: '🍹', desc: 'Bebidas, licores, coctelería' },
                  { name: 'PARRILLA', icon: '🥩', desc: 'Carnes, hamburguesas, BBQ' },
                  { name: 'POSTRES', icon: '🍰', desc: 'Repostería, helados, café' },
                  { name: 'EMPAQUE', icon: '📦', desc: 'Delivery y para llevar' },
                ].map((st) => (
                  <div key={st.name} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <div className="text-base">{st.icon}</div>
                    <div className="text-xs font-mono font-bold text-white mt-1">{st.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{st.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⏱️</span> Motor de ETA Predictivo Dinámico
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El endpoint <code className="text-amber-400 font-mono">/api/kitchen/load</code> no devuelve
                un tiempo estático; calcula una proyección en tiempo real ponderando tres variables:
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs font-semibold text-amber-400">1. Promedio Histórico Real (24h)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Mide el diferencial exacto entre <code className="text-zinc-300">createdAt</code> y <code className="text-zinc-300">updatedAt</code> de las últimas 20 órdenes despachadas.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs font-semibold text-blue-400">2. Tiempo Nominal por Receta (<code className="text-blue-300">prepTimeMinutes</code>)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Cada producto del menú almacena su tiempo óptimo de cocción configurado por el chef.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-xs font-semibold text-emerald-400">3. Factor de Saturación de Cocina</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Contabiliza comandas activas pendientes (<code className="text-zinc-300">RECEIVED / PREPARING</code>) para ajustar el tiempo que el comensal ve en su teléfono.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 3: FACTURACIÓN DIAN UBL 2.1                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="dian" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md border border-purple-500/20 mb-2">
                Cumplimiento Fiscal Colombia
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Factura Electrónica DIAN Directa (UBL 2.1)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-md">
              Conexión SOAP directa · XAdES-BES · Algoritmo CUFE SHA-384 sin cobros por documento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-2xl">🏛️</div>
              <h3 className="text-base font-bold text-white">SOAP 1.2 Nativo</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Transmisión directa a los Web Services de la DIAN (<code className="text-zinc-300 font-mono text-[11px]">vpfe.dian.gov.co</code>).
                Sin depender de Proveedores Tecnológicos Habilitados (PTH) intermediarios ni pagar tarifas mensuales por documento emitido.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-2xl">🔐</div>
              <h3 className="text-base font-bold text-white">Firma &amp; CUFE SHA-384</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cálculo de Código Único de Factura Electrónica (CUFE) bajo algoritmo SHA-384 concatenando número, fecha, valor, impuestos y clave técnica.
                Firma digital del XML UBL 2.1 con certificado de firma digital estándar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-2xl">📱</div>
              <h3 className="text-base font-bold text-white">QR &amp; Contingencia 04</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generación automática del código QR oficial de consulta DIAN incrustado en el ticket térmico de 80mm.
                Manejo transparente de contingencia tipo 04 ante caídas del servicio de la autoridad fiscal.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 4: DIVISIÓN DE CUENTA (SPLIT BILL) & PAGOS                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="payments" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20 mb-2">
                Experiencia en Mesa & Checkout
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Split Bill Avanzado &amp; Métodos de Pago
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-md">
              División modular en 4 modalidades · Comprobantes individuales ZIP · Wompi &amp; MercadoPago
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-amber-400 font-mono font-bold text-xs uppercase">Modalidad 01</div>
              <h4 className="text-sm font-bold text-white">Partes Iguales (1/N)</h4>
              <p className="text-xs text-zinc-400">
                División matemática exacta entre el número de comensales seleccionados (ej. 6 personas = 1/6 cada una), con cálculo proporcional de IVA y propina.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-blue-400 font-mono font-bold text-xs uppercase">Modalidad 02</div>
              <h4 className="text-sm font-bold text-white">Por Persona a Cargo</h4>
              <p className="text-xs text-zinc-400">
                Permite a un comensal asumir la cuenta de otros invitados específicos de la mesa (ej. pagar por pareja y acompañante) sin asumir el resto de la mesa.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-purple-400 font-mono font-bold text-xs uppercase">Modalidad 03</div>
              <h4 className="text-sm font-bold text-white">Por Consumo Individual</h4>
              <p className="text-xs text-zinc-400">
                Cada usuario paga de forma granular únicamente los platillos y bebidas que él mismo agregó a su comanda digital desde su teléfono.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="text-emerald-400 font-mono font-bold text-xs uppercase">Modalidad 04</div>
              <h4 className="text-sm font-bold text-white">Pago Total Mesa</h4>
              <p className="text-xs text-zinc-400">
                Cancelación íntegra de la mesa en un solo movimiento con descarga de comprobante y factura electrónica instantánea.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 5: TOPOLOGÍA DE RED & REQUERIMIENTOS LAN                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section id="network" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/60 px-3 py-1 rounded-md border border-zinc-700/40 mb-2">
                Infraestructura del Restaurante
              </div>
              <h2 className="text-3xl font-extrabold text-white">
                Topología LAN &amp; Requisitos de Red
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-md">
              Recomendaciones para instaladores y soporte técnico de campo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-amber-400 font-mono text-xs font-bold uppercase">Asignación IP</div>
              <h4 className="text-base font-bold text-white">Direcciones IP Estáticas</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Se recomienda asignar IP estática o reserva por DHCP a cada impresora térmica de cocina y caja
                (ej. <code className="text-amber-300 font-mono">192.168.1.200</code> a cocina caliente, <code className="text-amber-300 font-mono">192.168.1.201</code> a bar).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-blue-400 font-mono text-xs font-bold uppercase">Aislamiento de Tráfico</div>
              <h4 className="text-base font-bold text-white">VLAN de Operaciones</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Separar la red Wi-Fi de clientes (invitados con QR) de la red operativa donde residen las impresoras térmicas, KDS y cajas para máxima seguridad y evitar saturación.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="text-emerald-400 font-mono text-xs font-bold uppercase">Disponibilidad</div>
              <h4 className="text-base font-bold text-white">Tolerancia &amp; Fallbacks</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Si la impresora de red no responde tras 4 segundos, el sistema efectúa fallback automático a la pantalla KDS o a impresión por diálogo nativo del navegador sin bloquear el servicio.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/80 py-12 px-6 bg-zinc-950 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-white">
              i<span className="text-amber-500">Menu</span>
            </span>
            <span className="text-xs text-zinc-500">· Especificaciones Técnicas &amp; Hardware</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <Link href="/" className="hover:text-white transition">Inicio</Link>
            <Link href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Docs Completos ↗</Link>
            <Link href="/pricing" className="hover:text-white transition">Precios</Link>
            <Link href="/login" className="hover:text-white transition">Ingreso al Panel</Link>
          </div>

          <p className="text-zinc-600 text-xs font-mono">
            © 2026 iMenu Platform · Compatible con ESC/POS RAW 9100 &amp; DIAN UBL 2.1
          </p>
        </div>
      </footer>
    </div>
  )
}
