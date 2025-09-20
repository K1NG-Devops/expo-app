import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { createCheckout } from '@/lib/payments';
import { navigateTo } from '@/lib/navigation/router-utils';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

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
  school_types: string[];
}

interface RouteParams {
  currentTier?: string;
  reason?: 'limit_reached' | 'feature_needed' | 'manual_upgrade';
  feature?: string;
}

export default function SubscriptionUpgradePostScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<RouteParams>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(true); // Default to annual for better savings
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadPlans();
    trackPageView();
  }, []);

  const trackPageView = () => {
    track('upgrade_post_screen_viewed', {
      current_tier: params.currentTier || 'unknown',
      reason: params.reason || 'manual_upgrade',
      feature: params.feature,
      user_role: profile?.role,
    });
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await assertSupabase()
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      
      // Filter out current tier (but allow free users to see paid upgrades)
      const currentTier = params.currentTier?.toLowerCase() || 'free';
      const filteredPlans = (data || []).filter(plan => {
        // If user is on free tier, show all paid tiers
        if (currentTier === 'free') {
          return plan.tier.toLowerCase() !== 'free';
        }
        // For other tiers, show higher tiers only
        const tierOrder = { free: 0, starter: 1, premium: 2, enterprise: 3 };
        const currentOrder = tierOrder[currentTier as keyof typeof tierOrder] || 0;
        const planOrder = tierOrder[plan.tier.toLowerCase() as keyof typeof tierOrder] || 0;
        return planOrder > currentOrder;
      });
      
      setPlans(filteredPlans);
      
      // Auto-select next tier up if available
      if (filteredPlans.length > 0) {
        setSelectedPlan(filteredPlans[0].id);
      }
      
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load subscription plans');
      track('upgrade_post_load_failed', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      Alert.alert('Error', 'Selected plan not found');
      return;
    }

    const isEnterprise = plan.tier.toLowerCase() === 'enterprise';
    const price = annual ? plan.price_annual : plan.price_monthly;

    setUpgrading(true);
    
    try {
      if (isEnterprise) {
        // Enterprise tier - redirect to Contact Sales
        Alert.alert(
          'Enterprise Upgrade',
          'Enterprise plans require custom setup. Our sales team will contact you to configure your upgrade.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Contact Sales', 
              onPress: () => {
                track('enterprise_upgrade_contact', {
                  from_tier: params.currentTier,
                  reason: params.reason,
                });
                navigateTo.contact();
              }
            },
          ]
        );
        return;
      }

      // Track upgrade attempt
      track('upgrade_attempt', {
        from_tier: params.currentTier,
        to_tier: plan.tier,
        billing: annual ? 'annual' : 'monthly',
        price: price,
        reason: params.reason,
      });

      const checkoutInput = {
        scope: 'school' as const,
        schoolId: profile?.organization_id,
        userId: profile?.id,
        planTier: plan.tier,
        billing: annual ? 'annual' : 'monthly' as const,
        seats: plan.max_teachers,
        return_url: 'edudashpro://screens/payments/return',
        cancel_url: 'edudashpro://screens/subscription-upgrade-post',
      };
      
      const result = await createCheckout(checkoutInput);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (!result.redirect_url) {
        throw new Error('No payment URL received');
      }

      // Track checkout redirect
      track('upgrade_checkout_redirected', {
        to_tier: plan.tier,
        billing: annual ? 'annual' : 'monthly',
      });
      
      // Open payment URL
      const browserResult = await WebBrowser.openBrowserAsync(result.redirect_url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        toolbarColor: '#0b1220',
      });
      
      if (browserResult.type === 'dismiss' || browserResult.type === 'cancel') {
        track('upgrade_checkout_cancelled', {
          to_tier: plan.tier,
          browser_result: browserResult.type,
        });
      }
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start upgrade');
      track('upgrade_failed', {
        to_tier: plan.tier,
        error: error.message,
      });
    } finally {
      setUpgrading(false);
    }
  };

  const getUpgradeReason = () => {
    switch (params.reason) {
      case 'limit_reached':
        return {
          title: 'Upgrade Required',
          subtitle: 'You\'ve reached your current plan limits',
          icon: 'warning',
          color: '#f59e0b'
        };
      case 'feature_needed':
        return {
          title: 'Unlock Premium Features',
          subtitle: params.feature ? `${params.feature} requires a higher tier plan` : 'This feature requires an upgrade',
          icon: 'lock-closed',
          color: '#8b5cf6'
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          subtitle: 'Get access to more features and higher limits',
          icon: 'trending-up',
          color: '#10b981'
        };
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'starter': return '#3b82f6';
      case 'premium': return '#8b5cf6';
      case 'enterprise': return '#f59e0b';
      default: return '#00f5ff';
    }
  };

  const reason = getUpgradeReason();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text style={styles.loadingText}>Loading upgrade options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Upgrade Plan',
        headerStyle: { backgroundColor: '#0b1220' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#00f5ff'
      }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={[styles.reasonIcon, { backgroundColor: reason.color + '20' }]}>
              <Ionicons name={reason.icon as any} size={32} color={reason.color} />
            </View>
            <Text style={styles.title}>{reason.title}</Text>
            <Text style={styles.subtitle}>{reason.subtitle}</Text>
          </View>

          {/* Current Tier Info */}
          {params.currentTier && (
            <View style={styles.currentTierCard}>
              <Text style={styles.currentTierLabel}>Your current plan:</Text>
              <Text style={styles.currentTierName}>{params.currentTier} Plan</Text>
            </View>
          )}

          {/* Billing Toggle */}
          <View style={styles.toggleSection}>
            <Text style={styles.toggleLabel}>Choose billing cycle:</Text>
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
                  Annual
                </Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save 17%</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upgrade Options */}
          <View style={styles.plansSection}>
            <Text style={styles.plansSectionTitle}>Choose your upgrade:</Text>
            
            <View style={styles.plansGrid}>
              {plans.map((plan) => {
                const price = annual ? plan.price_annual : plan.price_monthly;
                const monthlyPrice = annual ? Math.round(plan.price_annual / 12) : plan.price_monthly;
                const savings = annual ? Math.round((plan.price_monthly * 12 - plan.price_annual) / 12) : 0;
                const isEnterprise = plan.tier.toLowerCase() === 'enterprise';
                const isSelected = selectedPlan === plan.id;
                const planColor = getPlanColor(plan.tier);

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      { borderColor: isSelected ? planColor : '#1f2937' }
                    ]}
                    onPress={() => setSelectedPlan(plan.id)}
                    activeOpacity={0.8}
                  >
                    {/* Plan Header */}
                    <View style={styles.planHeader}>
                      <View style={styles.planTitleSection}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <View style={[styles.planTierBadge, { backgroundColor: planColor + '20' }]}>
                          <Text style={[styles.planTier, { color: planColor }]}>{plan.tier}</Text>
                        </View>
                      </View>
                      
                      {/* Selection Indicator */}
                      <View style={[styles.selectionIndicator, { borderColor: planColor }]}>
                        {isSelected && (
                          <View style={[styles.selectionDot, { backgroundColor: planColor }]} />
                        )}
                      </View>
                    </View>

                    {/* Price Section */}
                    <View style={styles.priceSection}>
                      {isEnterprise ? (
                        <View>
                          <Text style={[styles.customPrice, { color: planColor }]}>Custom</Text>
                          <Text style={styles.contactText}>Contact for pricing</Text>
                        </View>
                      ) : (
                        <View>
                          <View style={styles.priceRow}>
                            <Text style={[styles.price, { color: planColor }]}>R{monthlyPrice}</Text>
                            <Text style={styles.pricePeriod}>/month</Text>
                          </View>
                          {annual && (
                            <View>
                              <Text style={styles.annualPrice}>R{price} billed annually</Text>
                              {savings > 0 && (
                                <Text style={styles.savingsAmount}>Save R{savings}/month</Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Plan Features */}
                    <View style={styles.featuresSection}>
                      <View style={styles.limitsRow}>
                        <View style={styles.limitItem}>
                          <Text style={styles.limitNumber}>
                            {isEnterprise || plan.max_teachers === null || plan.max_teachers === undefined
                              ? '-'
                              : (plan.max_teachers < 0 ? 'Unlimited' : String(plan.max_teachers))}
                          </Text>
                          <Text style={styles.limitLabel}>Teachers</Text>
                        </View>
                        <View style={styles.limitItem}>
                          <Text style={styles.limitNumber}>
                            {isEnterprise || plan.max_students === null || plan.max_students === undefined
                              ? '-'
                              : (plan.max_students < 0 ? 'Unlimited' : String(plan.max_students))}
                          </Text>
                          <Text style={styles.limitLabel}>Students</Text>
                        </View>
                      </View>

                      {plan.features && plan.features.length > 0 && (
                        <View style={styles.featuresList}>
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                              <Text style={[styles.featureIcon, { color: planColor }]}>✓</Text>
                              <Text style={styles.featureText}>{feature}</Text>
                            </View>
                          ))}
                          {plan.features.length > 3 && (
                            <Text style={styles.moreFeatures}>+{plan.features.length - 3} more</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* CTA Section */}
          {selectedPlan && (
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { 
                    backgroundColor: getPlanColor(plans.find(p => p.id === selectedPlan)?.tier || ''),
                    opacity: upgrading ? 0.7 : 1
                  }
                ]}
                onPress={() => handleUpgrade(selectedPlan)}
                disabled={upgrading}
              >
                {upgrading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.upgradeButtonText}>
                      {plans.find(p => p.id === selectedPlan)?.tier.toLowerCase() === 'enterprise'
                        ? 'Contact Sales'
                        : 'Upgrade Now'}
                    </Text>
                    <Text style={styles.upgradeButtonSubtext}>
                      Start your {annual ? 'annual' : 'monthly'} subscription
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          )}

          {plans.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No upgrade options available</Text>
              <Text style={styles.emptyStateSubtext}>
                You're already on our highest tier or there are no upgrade options available.
              </Text>
            </View>
          )}
          
        </ScrollView>
      </SafeAreaView>
    </View>
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
    gap: 20,
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
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  reasonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Current Tier
  currentTierCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  currentTierLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  currentTierName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Billing Toggle
  toggleSection: {
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#111827',
    padding: 4,
    borderRadius: 12,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    position: 'relative',
  },
  toggleBtnActive: {
    backgroundColor: '#00f5ff',
  },
  toggleBtnText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleBtnTextActive: {
    color: '#000',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Plans Section
  plansSection: {
    marginTop: 8,
  },
  plansSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  plansGrid: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  planCardSelected: {
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  planTitleSection: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planTier: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // Price Section
  priceSection: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
    marginRight: 4,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  annualPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  savingsAmount: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  customPrice: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Features Section
  featuresSection: {
    gap: 12,
  },
  limitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0b1220',
    borderRadius: 12,
    padding: 16,
  },
  limitItem: {
    alignItems: 'center',
  },
  limitNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  limitLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },

  // CTA Section
  ctaSection: {
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  upgradeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  upgradeButtonSubtext: {
    color: '#000',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});