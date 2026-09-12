/**
 * Web Audio API synthesizer for pleasant order status chime notifications.
 * Runs 100% in-browser with zero external asset dependencies.
 */

class AudioNotifier {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  /**
   * Campana suave de dos tonos armonizados (C5 -> E5 -> G5) para "Pedido Listo"
   */
  playOrderReadyChime() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Nota 1: G5 (783.99 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(783.99, now)
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.8)

      // Nota 2: C6 (1046.50 Hz)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1046.5, now + 0.15)
      gain2.gain.setValueAtTime(0.35, now + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.15)
      osc2.stop(now + 1.2)
    } catch (e) {
      console.warn('[AudioNotifier] No se pudo reproducir audio:', e)
    }
  }

  /**
   * Tono suave de confirmación (E5 -> G5) para "En Preparación" o "Nuevo Plato"
   */
  playOrderPreparingChime() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25) // E5
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.6)
    } catch (e) {
      console.warn('[AudioNotifier] No se pudo reproducir audio:', e)
    }
  }
}

export const soundNotifier = new AudioNotifier()

/**
 * Solicita permiso de notificaciones HTML5 al navegador
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }

  return false
}

/**
 * Envía una notificación nativa del navegador al comensal
 */
export function sendBrowserNotification(title: string, body: string, icon?: string | null) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: icon || '/favicon.ico',
      })
    } catch {
      // Ignore if web notification fails
    }
  }
}
