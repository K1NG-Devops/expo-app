import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_annual: number;
  max_teachers: number;
  max_students: number;
  features: string[];
  is_active: boolean;
}

export default function SubscriptionSetupScreen() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [existingSubscription, setExistingSubscription] = useState<any>(null);

  useEffect(() => {
    console.log('Profile context:', profile);
    loadPlans();
    checkExistingSubscription();
  }, [profile]);

  async function loadPlans() {
    try {
      const { data, error } = await assertSupabase()
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      console.log('Loaded subscription plans:', data);
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }

  async function checkExistingSubscription() {
    try {
      const { data, error } = await assertSupabase()
        .from('subscriptions')
        .select('*')
        .eq('school_id', profile?.organization_id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setExistingSubscription(data);
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  }

  async function createSubscription(planId: string) {
    console.log('createSubscription called with:', { planId, profileOrgId: profile?.organization_id, annual });
    
    if (!profile?.organization_id) {
      Alert.alert('Error', 'School information not found');
      return;
    }

    const plan = plans.find(p => p.id === planId);
    console.log('Found plan:', plan);
    
    if (!plan) {
      Alert.alert('Error', 'Selected plan not found');
      return;
    }

    setCreating(true);
    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      
      // Fix date calculation - use proper date arithmetic
      if (annual) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      
      console.log('Date calculation:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      const subscriptionData = {
        school_id: profile.organization_id,
        plan_id: plan.id, // keep actual plan row id for display; RPC maps tier to school_tier
        status: 'active',
        owner_type: 'school' as const,
        billing_frequency: annual ? 'annual' : 'monthly',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        next_billing_date: endDate.toISOString(),
        seats_total: plan.max_teachers || 10,
        seats_used: 0,
        metadata: {
          plan_name: plan.name,
          price: annual ? plan.price_annual : plan.price_monthly,
          billing_cycle: annual ? 'annual' : 'monthly'
        }
      };
      
      console.log('Attempting to create subscription with data:', subscriptionData);

      // For principals, allow immediate FREE plan via secure RPC; paid plans require admin flow
      let data: any = null;
      let error: any = null;
      if ((plan.tier || '').toLowerCase() === 'free') {
        // Use ensure_school_free_subscription which is granted to authenticated
        const res = await assertSupabase().rpc('ensure_school_free_subscription', {
          p_school_id: profile.organization_id,
          p_seats: subscriptionData.seats_total,
        });
        data = { id: res.data };
        error = res.error || null;
      } else {
        // Non-free: guide to Super-Admin or Sales instead of inserting directly (avoids RLS and auth issues)
        Alert.alert(
          'Contact Sales',
          'Paid plans require administrator setup. We will redirect you to pricing/sales.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Pricing', onPress: () => router.push('/pricing' as any) },
          ]
        );
        setCreating(false);
        return;
      }

      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Update school subscription tier to match
      try {
        await assertSupabase()
          .from('preschools')
          .update({ subscription_tier: (plan.tier || 'free') })
          .eq('id', profile.organization_id);
      } catch (e) {
        console.debug('Update school tier failed (non-blocking):', e);
      }

      track('subscription_created', {
        plan_id: plan.tier,
        billing_cycle: annual ? 'annual' : 'monthly',
        school_id: profile.organization_id
      });

      Alert.alert(
        'Success!', 
        `Your ${plan.name} subscription has been created. You can now manage teacher seats.`,
        [
          {
            text: 'Manage Seats',
            onPress: () => router.push('/screens/principal-seat-management')
          }
        ]
      );

    } catch (error: any) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', error.message || 'Failed to create subscription');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </View>
    );
  }

  if (existingSubscription) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ 
          title: 'Subscription Active',
          headerStyle: { backgroundColor: '#0b1220' },
          headerTitleStyle: { color: '#fff' },
          headerTintColor: '#00f5ff'
        }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.existingSubscriptionCard}>
              <Text style={styles.title}>Active Subscription</Text>
              <Text style={styles.subtitle}>Your school already has an active subscription</Text>
              
              <View style={styles.subscriptionInfo}>
                <Text style={styles.infoLabel}>Plan:</Text>
                <Text style={styles.infoValue}>{existingSubscription.plan_id}</Text>
              </View>
              
              <View style={styles.subscriptionInfo}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={styles.infoValue}>{existingSubscription.status}</Text>
              </View>
              
              <View style={styles.subscriptionInfo}>
                <Text style={styles.infoLabel}>Seats:</Text>
                <Text style={styles.infoValue}>{existingSubscription.seats_used} / {existingSubscription.seats_total}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.push('/screens/principal-seat-management')}
              >
                <Text style={styles.buttonText}>Manage Teacher Seats</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Setup Subscription',
        headerStyle: { backgroundColor: '#0b1220' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#00f5ff'
      }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Choose Your Subscription Plan</Text>
          <Text style={styles.subtitle}>
            Select a plan to enable teacher seat management for your school
          </Text>

          {/* Billing toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity 
              onPress={() => setAnnual(false)} 
              style={[styles.toggleBtn, !annual && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleBtnText, !annual && styles.toggleBtnTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setAnnual(true)} 
              style={[styles.toggleBtn, annual && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleBtnText, annual && styles.toggleBtnTextActive]}>
                Annual (Save 10%)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                annual={annual}
                selected={selectedPlan === plan.id}
                onSelect={() => {
                  console.log('Plan selected:', plan.id);
                  setSelectedPlan(plan.id);
                }}
                onSubscribe={() => {
                  console.log('onSubscribe called for plan:', plan.id);
                  createSubscription(plan.id);
                }}
                creating={creating}
              />
            ))}
          </View>

          {plans.length === 0 && (
            <View style={styles.noPlansCard}>
              <Text style={styles.noPlansText}>No subscription plans available</Text>
              <Text style={styles.noPlansSubtext}>
                Contact support to set up subscription plans for your school
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  annual: boolean;
  selected: boolean;
  onSelect: () => void;
  onSubscribe: () => void;
  creating: boolean;
}

function PlanCard({ plan, annual, selected, onSelect, onSubscribe, creating }: PlanCardProps) {
  const price = annual ? plan.price_annual : plan.price_monthly;
  const savings = annual ? Math.round((plan.price_monthly * 12 - plan.price_annual) / 12) : 0;

  return (
    <TouchableOpacity 
      style={[styles.planCard, selected && styles.planCardSelected]}
      onPress={onSelect}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planTier}>({plan.tier})</Text>
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.price}>R{price}</Text>
        <Text style={styles.pricePeriod}>/ {annual ? 'year' : 'month'}</Text>
        {savings > 0 && (
          <Text style={styles.savings}>Save R{savings}/month</Text>
        )}
      </View>

      <View style={styles.limitsContainer}>
        <Text style={styles.limitItem}>• Up to {plan.max_teachers} teachers</Text>
        <Text style={styles.limitItem}>• Up to {plan.max_students} students</Text>
      </View>

      {plan.features && plan.features.length > 0 && (
        <View style={styles.featuresContainer}>
          {plan.features.slice(0, 3).map((feature, index) => (
            <Text key={index} style={styles.featureItem}>• {feature}</Text>
          ))}
        </View>
      )}

      {selected && (
        <TouchableOpacity 
          style={[styles.subscribeButton, creating && styles.subscribeButtonDisabled]}
          onPress={() => {
            console.log('Subscribe button pressed for plan:', plan.id);
            onSubscribe();
          }}
          disabled={creating}
          testID={`subscribe-${plan.id}`}
        >
          <Text style={styles.subscribeButtonText}>
            {creating ? 'Creating...' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  toggleBtnActive: {
    backgroundColor: '#00f5ff',
    borderColor: '#00f5ff',
  },
  toggleBtnText: {
    color: '#9CA3AF',
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#000',
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  planCardSelected: {
    borderColor: '#00f5ff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planTier: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00f5ff',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  savings: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  limitsContainer: {
    marginBottom: 12,
  },
  limitItem: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#00f5ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
  },
  noPlansCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  noPlansText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  noPlansSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  existingSubscriptionCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  subscriptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#00f5ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
  },
});