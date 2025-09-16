import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { assertSupabase } from '@/lib/supabase';

type Tier = 'free' | 'starter' | 'basic' | 'premium' | 'pro' | 'enterprise';

type Seats = { total: number; used: number } | null;

type Ctx = {
  ready: boolean;
  tier: Tier;
  seats: Seats;
  assignSeat: (subscriptionId: string, userId: string) => Promise<boolean>;
  revokeSeat: (subscriptionId: string, userId: string) => Promise<boolean>;
};

const SubscriptionContext = createContext<Ctx>({
  ready: false,
  tier: 'free',
  seats: null,
  assignSeat: async () => false,
  revokeSeat: async () => false,
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<Tier>('free');
  const [seats, setSeats] = useState<Seats>(null);

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { data: userRes, error: userError } = await assertSupabase().auth.getUser();
        if (userError || !userRes.user) {
          console.debug('Failed to get user for subscription detection:', userError);
          if (mounted) setReady(true);
          return;
        }
        
        const user = userRes.user;
        
        if (!mounted) return; // Prevent state updates if unmounted
        
        let t: Tier = 'free';
        const metaTier = (user?.user_metadata as any)?.subscription_tier as string | undefined;
        if (metaTier && ['free','starter','basic','premium','pro','enterprise'].includes(metaTier)) {
          t = metaTier as Tier;
        }

        // Try to detect school-owned subscription using correct schema
        let seatsData: Seats = null;
        try {
          // First, get user's preschool_id from profiles table (correct approach)
          let schoolId: string | undefined;
          
          // Try user metadata first (fastest)
          schoolId = (user?.user_metadata as any)?.preschool_id;
          
          // If not in metadata, query profiles table
          if (!schoolId && user.id) {
            try {
              const { data: profileData, error: profileError } = await assertSupabase()
                .from('profiles')
                .select('preschool_id')
                .eq('id', user.id)
                .maybeSingle();
              
              if (!profileError && profileData?.preschool_id) {
                schoolId = profileData.preschool_id;
              }
            } catch (profileErr) {
              console.debug('Profile lookup failed:', profileErr);
            }
          }
          
          // Now query subscriptions with correct schema columns
          if (schoolId && mounted) {
            try {
              const { data: sub, error: subError } = await assertSupabase()
                .from('subscriptions')
                .select('id, plan_id, owner_type, seats_total, seats_used, status')
                .eq('owner_type', 'school')
                .eq('school_id', schoolId)
                .eq('status', 'active') // Only active subscriptions
                .maybeSingle();
              
              if (!subError && sub && mounted) {
                // Resolve plan tier from subscription_plans by plan_id (robust)
                try {
                  const { data: planRow } = await assertSupabase()
                    .from('subscription_plans')
                    .select('tier')
                    .eq('id', sub.plan_id)
                    .maybeSingle();
                  const tierStr = (planRow?.tier || '').toLowerCase();
                  const knownTiers: Tier[] = ['free','starter','basic','premium','pro','enterprise'];
                  if (knownTiers.includes(tierStr as Tier)) {
                    t = tierStr as Tier;
                  }
                } catch (e) {
                  // fallback ignored, t remains previous or 'free'
                }

                // Seats are available for any school-owned subscription (including free)
                seatsData = {
                  total: sub.seats_total ?? 0,
                  used: sub.seats_used ?? 0,
                };
              } else if (subError) {
                console.debug('Subscription query error:', subError);
              }
            } catch (subErr) {
              console.debug('Subscription query failed:', subErr);
            }
          }
        } catch (e) {
          console.debug('Enterprise subscription detection failed:', e);
        }

        if (mounted) {
          setTier(t);
          setSeats(seatsData);
          setReady(true);
        }
      } catch (err) {
        console.debug('SubscriptionContext initialization failed:', err);
        if (mounted) {
          // Always set ready to true to prevent blocking the UI
          setTier('free'); // Safe fallback
          setSeats(null);
          setReady(true);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  const assignSeat = async (subscriptionId: string, userId: string) => {
    try {
      console.debug('[assignSeat] payload', { subscriptionId, userId });
      const { data, error } = await assertSupabase().rpc('assign_teacher_seat', { 
        p_subscription_id: subscriptionId, 
        p_user_id: userId 
      });
      console.debug('[assignSeat] rpc response', { data, error });
      
      if (error) {
        console.debug('Seat assignment RPC error:', error?.message || error);
        return false;
      }
      return true;
    } catch (err) {
      console.debug('Seat assignment failed:', err);
      return false;
    }
  };

  const revokeSeat = async (subscriptionId: string, userId: string) => {
    try {
      console.debug('[revokeSeat] payload', { subscriptionId, userId });
      const { data, error } = await assertSupabase().rpc('revoke_teacher_seat', { 
        p_subscription_id: subscriptionId, 
        p_user_id: userId 
      });
      console.debug('[revokeSeat] rpc response', { data, error });
      
      if (error) {
        console.debug('Seat revocation RPC error:', error?.message || error);
        return false;
      }
      return true;
    } catch (err) {
      console.debug('Seat revocation failed:', err);
      return false;
    }
  };

  const value = useMemo<Ctx>(() => ({ ready, tier, seats, assignSeat, revokeSeat }), [ready, tier, seats]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
