import { assertSupabase } from '@/lib/supabase'

export type CheckoutInput = {
  scope: 'school' | 'user'
  schoolId?: string
  userId?: string
  planTier: string
  billing: 'monthly' | 'annual'
  seats?: number
}

export async function createCheckout(input: CheckoutInput): Promise<{ redirect_url?: string }> {
  // This calls our serverless function (to be added) which will
  // 1) compute amount from plan tier
  // 2) insert billing_invoices and payment_transactions
  // 3) create a PayFast payment request and return a redirect URL
  try {
    const { data, error } = await assertSupabase().functions.invoke('payments-create-checkout', {
      body: input as any,
    })
    if (error) throw error
    return data || {}
  } catch (e: any) {
    throw new Error(e?.message || 'Failed to start checkout')
  }
}
