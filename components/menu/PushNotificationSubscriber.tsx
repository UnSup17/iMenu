'use client'

import { useState, useEffect } from 'react'

interface PushNotificationSubscriberProps {
  tableId: string
  restaurantName?: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationSubscriber({
  tableId,
  restaurantName = 'el restaurante',
}: PushNotificationSubscriberProps) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setSupported(true)
      if (Notification.permission === 'granted') {
        setSubscribed(true)
      }
    }
  }, [])

  const handleSubscribe = async () => {
    try {
      setLoading(true)
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setLoading(false)
        setDismissed(true)
        return
      }

      // Registrar Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Obtener VAPID public key
      const keyRes = await fetch('/api/push/subscribe')
      const { publicKey } = await keyRes.json()

      const appServerKey = urlBase64ToUint8Array(publicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      })

      // Guardar en backend vinculado a la mesa
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          subscription: sub.toJSON(),
        }),
      })

      setSubscribed(true)
    } catch (err) {
      console.warn('[Push] Error subscribing to push notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!supported || dismissed) return null

  if (subscribed) {
    return (
      <div className="mx-4 my-2 px-3 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
        <div className="flex items-center gap-2">
          <span>🔔</span>
          <span>Te notificaremos en tu pantalla cuando el pedido esté listo.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-500 hover:text-white text-xs px-1.5 py-0.5"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="mx-4 my-2 px-3.5 py-2.5 bg-zinc-900 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-zinc-300 shadow-md animate-in fade-in">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">🔔</span>
        <div>
          <p className="font-semibold text-white">¿Quieres saber cuando tu pedido esté listo?</p>
          <p className="text-[11px] text-zinc-400">Recibe una notificación directa en tu teléfono.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {loading ? 'Activando...' : 'Activar avisos'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-500 hover:text-zinc-300 p-1 text-xs cursor-pointer"
          title="Ocultar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
