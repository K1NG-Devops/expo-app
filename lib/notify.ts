import { assertSupabase } from '@/lib/supabase'

export type NotifyRole = 'principal' | 'principal_admin' | 'superadmin' | 'teacher' | 'parent'

async function dispatch(event_type: string, payload: any) {
  const { data, error } = await assertSupabase().functions.invoke('notifications-dispatcher', {
    body: { event_type, ...payload } as any,
  })
  if (error) throw error
  return data
}

export async function notifySeatRequestCreated(preschool_id: string, requester_email?: string) {
  return dispatch('seat_request_created', {
    preschool_id,
    role_targets: ['principal', 'principal_admin', 'superadmin'] as NotifyRole[],
    include_email: true,
    custom_payload: { requester_email },
  })
}

export async function notifySeatRequestApproved(user_id: string) {
  return dispatch('seat_request_approved', {
    user_ids: [user_id],
    include_email: true,
  })
}

export async function notifySubscriptionCreated(preschool_id: string, plan_tier: string) {
  return dispatch('subscription_created', {
    preschool_id,
    plan_tier,
    role_targets: ['principal', 'principal_admin', 'superadmin'] as NotifyRole[],
    include_email: true,
  })
}

export async function notifyPaymentSuccessSchool(preschool_id: string, plan_tier?: string, amount?: string) {
  return dispatch('payment_success', {
    preschool_id,
    plan_tier,
    custom_payload: { amount },
    role_targets: ['principal', 'principal_admin', 'superadmin'] as NotifyRole[],
    include_email: true,
  })
}

export async function notifyPaymentSuccessUser(user_id: string, plan_tier?: string, amount?: string) {
  return dispatch('payment_success', {
    user_ids: [user_id],
    plan_tier,
    custom_payload: { amount },
    include_email: true,
  })
}

export async function notifyTrialStarted(preschool_id: string, plan_tier: string, trial_end_date?: string) {
  return dispatch('trial_started', {
    preschool_id,
    plan_tier,
    custom_payload: { trial_end_date },
    role_targets: ['principal', 'principal_admin', 'superadmin'] as NotifyRole[],
    include_email: true,
  })
}
