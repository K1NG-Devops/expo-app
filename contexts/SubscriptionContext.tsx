import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Tier = 'free' | 'pro' | 'enterprise';

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
        const { data: userRes, error: userError } = await supabase!.auth.getUser();
        if (userError || !userRes.user) {
          console.debug('Failed to get user for subscription detection:', userError);
          if (mounted) setReady(true);
          return;
        }
        
        const user = userRes.user;
        
        if (!mounted) return; // Prevent state updates if unmounted
        
        let t: Tier = 'free';
        const metaTier = (user?.user_metadata as any)?.subscription_tier as string | undefined;
        if (metaTier === 'pro' || metaTier === 'enterprise') t = metaTier as Tier;

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
              const { data: profileData, error: profileError } = await supabase!
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
              const { data: sub, error: subError } = await supabase!
                .from('subscriptions')
                .select('id, plan_id, owner_type, seats_total, seats_used, status')
                .eq('owner_type', 'school')
                .eq('school_id', schoolId)
                .eq('status', 'active') // Only active subscriptions
                .maybeSingle();
              
              if (!subError && sub && mounted) {
                // Check if this is an enterprise subscription based on plan_id
                const planId = sub.plan_id?.toLowerCase() || '';
                const isEnterprise = planId.includes('enterprise') || planId.includes('pro');
                
                if (isEnterprise) {
                  seatsData = { 
                    total: sub.seats_total ?? 0, 
                    used: sub.seats_used ?? 0 
                  };
                  if (t === 'free') t = 'enterprise';
                }
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
      const { error } = await supabase!.rpc('assign_teacher_seat', { 
        p_subscription_id: subscriptionId, 
        p_user_id: userId 
      });
      
      if (error) {
        console.debug('Seat assignment RPC error:', error);
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
      const { error } = await supabase!.rpc('revoke_teacher_seat', { 
        p_subscription_id: subscriptionId, 
        p_user_id: userId 
      });
      
      if (error) {
        console.debug('Seat revocation RPC error:', error);
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
