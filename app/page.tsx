import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'iMenu — Menú digital inteligente para restaurantes',
  description:
    'Digitaliza tu restaurante con iMenu: pedidos en tiempo real, facturación electrónica DIAN, inventario, contabilidad P&L y analytics avanzado. Multi-sucursal, multi-país.',
}

const features = [
  {
    icon: '📱',
    label: 'Operaciones',
    title: 'Menú QR & Pedidos en Tiempo Real',
    desc: 'Tus clientes escanean el QR de la mesa y ordenan desde su celular. Los pedidos llegan al panel y a cocina al instante vía Socket.IO.',
  },
  {
    icon: '🍳',
    label: 'Cocina',
    title: 'Vista de Cocina en Vivo',
    desc: 'Pantalla exclusiva para cocina con estados de cada orden (pendiente → en preparación → listo). Sin imprimir comandas.',
  },
  {
    icon: '🔔',
    label: 'Servicio',
    title: 'Llamada al Mesero',
    desc: 'El cliente llama al mesero con un toque. El equipo recibe la notificación al instante sin necesidad de aplicación instalada.',
  },
  {
    icon: '🧾',
    label: 'Facturación',
    title: 'Facturación Completa',
    desc: 'Cierre de mesa → factura con IVA, descuentos y cargo por servicio. Múltiples métodos de pago: efectivo, tarjeta, Nequi, QR.',
  },
  {
    icon: '🖨️',
    label: 'Impresión',
    title: 'Tickets Térmicos ESC/POS',
    desc: 'Impresión directa desde el navegador vía WebUSB o red. Tickets configurables: logo, 58mm/80mm, IVA desglosado.',
  },
  {
    icon: '📦',
    label: 'Inventario',
    title: 'Inventario & Recetas',
    desc: 'Cada producto tiene una receta. Al recibir un pedido el stock se descuenta automáticamente. Alertas de bajo inventario en tiempo real.',
  },
  {
    icon: '📊',
    label: 'Contabilidad',
    title: 'Módulo Contable P&L',
    desc: 'Estado de resultados mensual, gastos por categoría, cierre de caja diario, reporte fiscal IVA (Formulario 300 DIAN).',
  },
  {
    icon: '⚡',
    label: 'DIAN',
    title: 'Factura Electrónica DIAN',
    desc: 'Integración SOAP directa con la DIAN. Genera XML UBL 2.1 firmado, calcula CUFE SHA-384 y envía sin PTH externo.',
  },
  {
    icon: '🏢',
    label: 'Multi-sede',
    title: 'Franquicias & Multi-sucursal',
    desc: 'Un ORG_ADMIN monitorea todas sus sedes en un panel consolidado. Suscripción única con planes Basic, Pro y Enterprise.',
  },
  {
    icon: '📈',
    label: 'Analytics',
    title: 'Business Intelligence',
    desc: 'Horas pico, ventas por día de la semana, rotación de mesas y análisis ABC de rentabilidad. Exportación CSV.',
  },
  {
    icon: '🎨',
    label: 'Branding',
    title: 'Menú con Identidad de Marca',
    desc: 'Logo, colores, categorías, modificadores y PDF interactivo con hotspots. Tu menú, con tu imagen.',
  },
  {
    icon: '🔐',
    label: 'Seguridad',
    title: 'Roles & Acceso Granular',
    desc: 'SUPERADMIN, ORG_ADMIN, RESTAURANT_ADMIN, MANAGER, ACCOUNTANT, WAITER y KITCHEN. Cada quien ve solo lo que necesita.',
  },
]

const phases = [
  {
    number: '01',
    tag: 'Fase 1',
    title: 'Facturación + Inventario',
    gradientFrom: '#10b981',
    gradientTo: '#0d9488',
    items: [
      'Cierre de mesa y generación de facturas con IVA Colombia',
      'Múltiples métodos de pago (efectivo, tarjeta, Nequi, QR)',
      'Impresión térmica ESC/POS con WebUSB',
      'Descuento automático de stock al recibir pedido',
      'Alertas de bajo inventario y badges "Sin stock" en menú QR',
      'CRUD completo de insumos, compras, ajustes y mermas',
    ],
  },
  {
    number: '02',
    tag: 'Fase 2',
    title: 'Módulo Contable',
    gradientFrom: '#3b82f6',
    gradientTo: '#6366f1',
    items: [
      'Estado de Resultados P&L mensual',
      'Registro de gastos con soporte y NIT del proveedor',
      'Cierre de caja diario con arqueo y auditoría de diferencias',
      'Reporte fiscal IVA (Formulario 300 DIAN)',
      'Períodos contables con cierre formal',
      'Motor contable multi-país: Colombia / México / Chile',
    ],
  },
  {
    number: '03',
    tag: 'Fase 3',
    title: 'SaaS + Multi-sucursal',
    gradientFrom: '#8b5cf6',
    gradientTo: '#a855f7',
    items: [
      'Organizaciones con roles ORG_ADMIN para franquicias',
      'Planes Basic, Pro y Enterprise con Stripe',
      'Trial automático de 14 días al registrarse',
      'Panel consolidado de franquicia con monitoreo en vivo',
      'Webhook Stripe para eventos de pago y cancelación',
      'SUPERADMIN con métricas de plataforma (MRR, clientes)',
    ],
  },
  {
    number: '04',
    tag: 'Fase 4',
    title: 'Analytics + DIAN',
    gradientFrom: '#f59e0b',
    gradientTo: '#f97316',
    items: [
      'Integración SOAP directa con DIAN (habilitación + producción)',
      'XML UBL 2.1 firmado con certificado .p12',
      'Cálculo de CUFE SHA-384 + QR de verificación oficial',
      'Wizard de habilitación DIAN paso a paso',
      'Dashboard BI: horas pico, análisis ABC, rotación de mesas',
      'Exportación CSV de facturas y libros contables',
    ],
  },
]

const roles = [
  { role: 'SUPERADMIN', desc: 'Plataforma completa, organizaciones y planes', icon: '👑' },
  { role: 'ORG_ADMIN', desc: 'Todas las sucursales de su franquicia', icon: '🏢' },
  { role: 'RESTAURANT_ADMIN', desc: 'Operaciones + finanzas + inventario de su local', icon: '🍽️' },
  { role: 'ACCOUNTANT', desc: 'Solo módulos financieros y contables', icon: '📊' },
  { role: 'MANAGER', desc: 'Operativo completo + inventario', icon: '👔' },
  { role: 'WAITER', desc: 'Pedidos y mesas asignadas', icon: '🙋' },
  { role: 'KITCHEN', desc: 'Vista de cocina únicamente', icon: '🍳' },
]

const stats = [
  { value: '4', label: 'Fases completadas', suffix: '' },
  { value: '7', label: 'Roles de acceso', suffix: '+' },
  { value: '3', label: 'Países soportados', suffix: '' },
  { value: '100', label: 'Roadmap completado', suffix: '%' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight">
            i<span className="text-amber-500">Menu</span>
          </span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#phases" className="hover:text-white transition-colors">Fases</a>
            <a href="#roles" className="hover:text-white transition-colors">Roles</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Precios</Link>
            {/* <Link href="/docs" className="hover:text-amber-400 transition-colors text-amber-500/80 font-medium">Docs →</Link> */}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950
                         px-4 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              Comenzar gratis →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-28 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[140px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400
                           bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            🎉 Roadmap Empresarial de 4 Fases — Completado al 100%
          </span>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            El sistema más completo<br />
            para tu{' '}
            <span className="text-amber-500">restaurante.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Desde el QR en la mesa hasta la factura electrónica DIAN. iMenu integra pedidos en
            tiempo real, inventario automatizado, contabilidad P&amp;L y analytics de negocio
            en una sola plataforma SaaS multi-sucursal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/login"
              id="hero-cta-primary"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                         bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold
                         px-8 py-4 rounded-xl transition-all active:scale-95
                         shadow-xl shadow-amber-500/25 text-base"
            >
              Empieza gratis — 14 días de prueba
            </Link>
            {/* <Link
              href="/docs"
              id="hero-cta-docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                         border border-zinc-700 hover:border-amber-500/50 text-zinc-300
                         hover:text-amber-400 px-8 py-4 rounded-xl transition-all text-base"
            >
              Ver documentación →
            </Link> */}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-white">
                  {s.value}<span className="text-amber-500">{s.suffix}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock dashboard UI */}
        <div className="relative max-w-4xl mx-auto mt-20 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            {/* Browser chrome */}
            <div className="bg-zinc-800/60 px-4 py-3 flex items-center gap-3 border-b border-zinc-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-2 bg-zinc-700/40 rounded-md h-6 flex items-center px-3">
                <span className="text-xs text-zinc-500">imenu.app/dashboard/orders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-zinc-400">En vivo</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-5 grid grid-cols-3 gap-4">
              <div className="col-span-3 grid grid-cols-4 gap-3">
                {[
                  { label: 'Ventas hoy', value: '$847.500', color: 'text-emerald-400' },
                  { label: 'Pedidos activos', value: '12', color: 'text-amber-400' },
                  { label: 'Mesas ocupadas', value: '8/14', color: 'text-blue-400' },
                  { label: 'IVA recaudado', value: '$160.925', color: 'text-violet-400' },
                ].map((k) => (
                  <div key={k.label} className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-1">{k.label}</div>
                    <div className={`font-bold text-sm ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div className="col-span-2 bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
                <div className="text-xs font-semibold text-zinc-400 mb-3">Pedidos recientes</div>
                <div className="space-y-2">
                  {[
                    { mesa: 'Mesa 4', item: '2× Hamburguesa + 1× Gaseosa', estado: 'EN PREP.', color: 'bg-amber-500/20 text-amber-400' },
                    { mesa: 'Mesa 7', item: '1× Bandeja Paisa', estado: 'LISTO', color: 'bg-emerald-500/20 text-emerald-400' },
                    { mesa: 'Mesa 2', item: '3× Tacos al pastor', estado: 'RECIBIDO', color: 'bg-blue-500/20 text-blue-400' },
                  ].map((o) => (
                    <div key={o.mesa} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-white">{o.mesa}</div>
                        <div className="text-xs text-zinc-500">{o.item}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.color}`}>{o.estado}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-1 bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
                <div className="text-xs font-semibold text-zinc-400 mb-3">⚠️ Stock bajo</div>
                <div className="space-y-2">
                  {[
                    { item: 'Pechuga pollo', stock: '0.8 kg' },
                    { item: 'Papa nevada', stock: '1.2 kg' },
                    { item: 'Aguacate', stock: '4 und' },
                  ].map((i) => (
                    <div key={i.item} className="text-xs">
                      <div className="text-white">{i.item}</div>
                      <div className="text-red-400">{i.stock}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-3 right-4 sm:right-8 bg-amber-500 text-zinc-950
                          font-bold text-xs px-4 py-2 rounded-full shadow-lg shadow-amber-500/40 rotate-3">
            ¡En tiempo real!
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-28 px-6 border-t border-zinc-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
              Funcionalidades
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-6 mb-4">
              Todo lo que tu restaurante necesita
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Una plataforma completa: desde el primer escaneo de QR hasta el reporte fiscal mensual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6
                           hover:border-amber-500/40 hover:bg-zinc-800/60 transition-all duration-300
                           hover:-translate-y-0.5"
              >
                <div className="absolute top-3 right-3 text-xs font-semibold text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                  {f.label}
                </div>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2 text-sm leading-tight">{f.title}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Phases Timeline ── */}
      <section id="phases" className="py-28 px-6 border-t border-zinc-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
              Roadmap
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-6 mb-4">
              4 fases. Todo completado.
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Un roadmap empresarial construido de forma sistemática, fase a fase.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {phases.map((phase) => (
              <div
                key={phase.number}
                className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8
                           hover:border-zinc-700 transition-all duration-300 overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(to right, ${phase.gradientFrom}, ${phase.gradientTo})` }}
                />

                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${phase.gradientFrom}, ${phase.gradientTo})` }}
                  >
                    <span className="text-white font-black text-sm">{phase.number}</span>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-semibold mb-0.5">{phase.tag}</div>
                    <h3 className="font-bold text-white text-lg">{phase.title}</h3>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      ✅ Completada
                    </span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="roles" className="py-28 px-6 border-t border-zinc-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
              Control de acceso
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold mt-6 mb-4">
              Cada persona, su vista
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              7 roles granulares. Desde el SUPERADMIN de la plataforma hasta el cocinero.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((r) => (
              <div
                key={r.role}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5
                           hover:border-amber-500/30 transition-all duration-200"
              >
                <div className="text-2xl mb-3">{r.icon}</div>
                <div className="font-mono text-amber-400 text-xs font-bold mb-1">{r.role}</div>
                <p className="text-zinc-500 text-xs leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="py-20 px-6 border-t border-zinc-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-zinc-600 uppercase tracking-widest font-semibold mb-8">Stack tecnológico</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Next.js 16', 'Prisma ORM', 'MySQL', 'Redis', 'Socket.IO', 'NextAuth v5', 'Stripe', 'Vercel Blob', 'ESC/POS', 'DIAN UBL 2.1', 'SOAP DIAN', 'SHA-384 CUFE'].map((tech) => (
              <span key={tech}
                className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 px-6 border-t border-zinc-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/60
                          border border-zinc-700/60 rounded-3xl p-16 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute inset-0 bg-amber-500/3 pointer-events-none" />
            <div className="relative">
              <span className="text-3xl mb-4 block">🚀</span>
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                ¿Listo para modernizar<br />tu restaurante?
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
                14 días de prueba gratuita. Sin tarjeta de crédito. Sin instalaciones.
                Comienza a recibir pedidos en minutos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  id="cta-start"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400
                             text-zinc-950 font-bold px-10 py-4 rounded-xl transition-all
                             active:scale-95 shadow-xl shadow-amber-500/25 text-base"
                >
                  Comenzar gratis →
                </Link>
                {/* <Link
                  href="/docs"
                  id="cta-docs"
                  className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500
                             text-zinc-300 hover:text-white px-8 py-4 rounded-xl transition-all text-base"
                >
                  Ver documentación
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white text-lg">
            i<span className="text-amber-500">Menu</span>
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            {/* <Link href="/docs" className="hover:text-zinc-300 transition-colors">Documentación</Link> */}
            <Link href="/pricing" className="hover:text-zinc-300 transition-colors">Precios</Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Iniciar sesión</Link>
          </div>
          <p className="text-zinc-600 text-xs">© 2026 iMenu. Sistema de menú digital para restaurantes.</p>
        </div>
      </footer>

    </div>
  )
}
