/** Minimal server-side Razorpay REST helper. Never import this from client components. */
export async function razorpayRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) throw new Error('Razorpay credentials not configured')

  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.description || `Razorpay API error (${res.status})`)
  }
  return data
}
