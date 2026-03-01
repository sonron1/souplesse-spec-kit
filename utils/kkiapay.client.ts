let sdk: any = null

export default async function useKkiapay() {
  if (sdk) return sdk

  // Load official Kkiapay SDK script if not already present.
  // The real SDK URL should be verified from Kkiapay docs.
  const src = process.client ? (process.env.KKIAPAY_SDK_URL || 'https://js.kkiapay.me/v1/kkiapay.js') : null
  if (src && document) {
    if (!document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      document.head.appendChild(s)
      await new Promise((res) => { s.onload = res; s.onerror = res })
    }

    // SDK global name may vary; adjust if needed
    // Example: window.Kkiapay
    // Fallback: provide a minimal mock to avoid runtime errors in dev
    // @ts-ignore
    sdk = (window as any).Kkiapay || {
      open: ({ token }: { token: string }) => {
        // fallback - open new tab to Kkiapay payment URL pattern
        window.open(`https://pay.kkiapay.me/checkout?token=${encodeURIComponent(token)}`, '_blank')
      },
    }
  } else {
    // Server-side or no SDK URL: return a minimal mock
    sdk = { open: ({ token }: { token: string }) => null }
  }

  return sdk
}
