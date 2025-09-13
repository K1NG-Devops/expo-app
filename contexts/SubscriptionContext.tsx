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
        const { data: userRes } = await supabase!.auth.getUser();
        const user = userRes.user;
        
        if (!mounted) return; // Prevent state updates if unmounted
        
        let t: Tier = 'free';
        const metaTier = (user?.user_metadata as any)?.subscription_tier as string | undefined;
        if (metaTier === 'pro' || metaTier === 'enterprise') t = metaTier as Tier;

        // Try to detect school-owned subscription (draft schema).
        let seatsData: Seats = null;
        try {
          const schoolId = (user?.user_metadata as any)?.preschool_id as string | undefined;
          if (schoolId && mounted) {
            const { data: sub } = await supabase!.from('subscriptions').select('id, plan, owner_type, seats_total, seats_used').eq('owner_type','school').eq('school_id', schoolId).ilike('plan', '%enterprise%').maybeSingle();
            if (sub && mounted) {
              seatsData = { total: (sub as any).seats_total ?? 0, used: (sub as any).seats_used ?? 0 };
              if (t === 'free') t = 'enterprise';
            }
          }
        } catch (e) {
          console.debug('Enterprise subscription detection failed', e);
        }

        if (mounted) {
          setTier(t);
          setSeats(seatsData);
          setReady(true);
        }
      } catch {
        if (mounted) {
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
      const { error } = await supabase!.rpc('assign_teacher_seat', { p_subscription_id: subscriptionId, p_user_id: userId });
      return !error;
    } catch {
      return false;
    }
  };

  const revokeSeat = async (subscriptionId: string, userId: string) => {
    try {
      const { error } = await supabase!.rpc('revoke_teacher_seat', { p_subscription_id: subscriptionId, p_user_id: userId });
      return !error;
    } catch {
      return false;
    }
  };

  const value = useMemo<Ctx>(() => ({ ready, tier, seats, assignSeat, revokeSeat }), [ready, tier, seats]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
