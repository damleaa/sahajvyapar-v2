// BetaDisclaimer — disabled for production launch.
// The beta popup said "payment gateway is in TEST mode — no real money charged"
// which is a legal risk when live Razorpay keys are active.
// Returning null here removes the popup entirely.
export default function BetaDisclaimer() {
  return null
}
