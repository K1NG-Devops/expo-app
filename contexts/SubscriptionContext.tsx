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
  refresh: () => void;
};

const SubscriptionContext = createContext<Ctx>({
  ready: false,
  tier: 'free',
  seats: null,
  assignSeat: async () => false,
  revokeSeat: async () => false,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<Tier>('free');
  const [seats, setSeats] = useState<Seats>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to manually refresh subscription data
  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { data: userRes, error: userError } = await assertSupabase().auth.getUser();
        if (userError || !userRes.user) {
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
              // ignore profile lookup debug noise
            }
          }
          
          // Now query subscriptions with correct schema columns
          if (schoolId && mounted) {
            try {
              const { data: sub, error: subError } = await assertSupabase()
                .from('subscriptions')
                .select('id, plan_id, seats_total, seats_used, status')
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

                  // Debug logging for tier detection (can be removed once verified)
                  console.debug('[SubscriptionContext] Active subscription found', {
                    schoolId,
                    subscriptionId: sub.id,
                    planId: sub.plan_id,
                    planTier: tierStr,
                    resolvedTier: t,
                    seats_total: sub.seats_total,
                    seats_used: sub.seats_used,
                  });
                } catch (e) {
                  // fallback ignored, t remains previous or 'free'
                  console.debug('[SubscriptionContext] Failed to resolve plan tier from subscription_plans', e);
                }

                // Seats are available for any school-owned subscription (including free)
                seatsData = {
                  total: sub.seats_total ?? 0,
                  used: sub.seats_used ?? 0,
                };
              } else if (subError) {
                // ignore non-critical subscription query debug noise
              }
            } catch (subErr) {
              // ignore debug noise
            }
          }
        } catch (e) {
          // ignore debug noise
        }

        if (mounted) {
          setTier(t);
          setSeats(seatsData);
          setReady(true);
        }
      } catch (err) {
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
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  const assignSeat = async (subscriptionId: string, userId: string) => {
    try {
      const { data, error } = await assertSupabase().rpc('rpc_assign_teacher_seat', { 
        target_user_id: userId 
      });
      
      if (error) {
        console.error('Seat assignment RPC error:', error?.message || error);
        // Throw the error with the actual message so the UI can show it
        throw new Error(error?.message || 'Failed to assign seat');
      }
      return true;
    } catch (err) {
      console.error('Seat assignment failed:', err);
      // Re-throw to let the UI handle it
      throw err;
    }
  };

  const revokeSeat = async (subscriptionId: string, userId: string) => {
    try {
      const { data, error } = await assertSupabase().rpc('rpc_revoke_teacher_seat', { 
        target_user_id: userId 
      });
      
      if (error) {
        console.error('Seat revocation RPC error:', error?.message || error);
        throw new Error(error?.message || 'Failed to revoke seat');
      }
      return true;
    } catch (err) {
      console.error('Seat revocation failed:', err);
      throw err;
    }
  };

  const value = useMemo<Ctx>(() => ({ ready, tier, seats, assignSeat, revokeSeat, refresh }), [ready, tier, seats]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
