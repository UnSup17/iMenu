import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PdfMenuEditor } from '@/components/dashboard/PdfMenuEditor'

export const metadata: Metadata = {
  title: 'Menú PDF — iMenu',
}

export default async function MenuPdfPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const sessionUser = session.user as { id?: string; role?: string }
  if (sessionUser.role !== 'RESTAURANT_ADMIN' && sessionUser.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  // Obtener restaurante del admin
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { restaurantId: true },
  })
  if (!user?.restaurantId) redirect('/dashboard')

  const [restaurant, products, hotspots] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { id: true, pdfUrl: true },
    }),
    prisma.product.findMany({
      where: { restaurantId: user.restaurantId, isAvailable: true },
      select: { id: true, name: true },
      orderBy: [{ category: { orderIndex: 'asc' } }, { name: 'asc' }],
    }),
    prisma.pdfHotspot.findMany({
      where: { restaurantId: user.restaurantId },
      select: {
        id: true,
        page: true,
        x: true,
        y: true,
        width: true,
        height: true,
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!restaurant) redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Menú PDF Interactivo</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Sube el PDF de tu menú y define zonas que abrirán el detalle de cada producto cuando el cliente las toque.
        </p>
      </div>

      <PdfMenuEditor
        restaurantId={restaurant.id}
        initialPdfUrl={restaurant.pdfUrl ?? null}
        initialHotspots={hotspots}
        products={products}
      />
    </div>
  )
}
