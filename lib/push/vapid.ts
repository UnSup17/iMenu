import webpush from 'web-push'

const publicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BNyyTPyPad4jxQYVG5D1Vs2rzmM076IojeLOY4LQfJbgiJRxLdiW2829lN92TYx1HI3ReiGkSCTE5PU9Gax1xwQ'

const privateKey =
  process.env.VAPID_PRIVATE_KEY ||
  'Ex4f7B7FruJjRNzY522BQPBW6zK9xW5dNnRPHR_314I'

const subject = process.env.VAPID_SUBJECT || 'mailto:support@imenu.app'

let configured = false

export function getWebPush() {
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  }
  return webpush
}

export { publicKey }
