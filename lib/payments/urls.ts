// Helper to build PayFast-compatible return/cancel URLs
// Prefer a bridge endpoint (https) that can deep-link back into the app

export function getPaymentsBaseUrl(): string {
  const bridge = process.env.EXPO_PUBLIC_PAYMENTS_BRIDGE_URL;
  if (bridge && /^https?:\/\//i.test(bridge)) return bridge.replace(/\/$/, '');
  // Fallback to new bridge domain (Vercel)
  return 'https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments';
}

export function getReturnUrl(): string {
  const base = getPaymentsBaseUrl();
  // Allow both styles: if base already includes /payments, keep it consistent
  if (/\/payments\b/.test(base)) return `${base}/return`;
  return `${base}/payments/return`;
}

export function getCancelUrl(): string {
  const base = getPaymentsBaseUrl();
  if (/\/payments\b/.test(base)) return `${base}/cancel`;
  return `${base}/payments/cancel`;
}