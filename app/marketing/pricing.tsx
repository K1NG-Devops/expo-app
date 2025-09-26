import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ColorValue,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { navigateTo } from '@/lib/navigation/router-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DesignSystem } from '@/constants/DesignSystem';
import { setPageMetadata, pricingSEO } from '@/lib/webSEO';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_annual: number | null;
  max_teachers: number;
  max_students: number;
  features: any; // Could be string[], jsonb, or null
  is_active: boolean;
  [key: string]: any; // Allow for any additional fields from DB
}

interface PricingTier {
  id: string;
  name: string;
  tier: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  recommended?: boolean;
  cta: string;
  color: readonly ColorValue[];
  isEnterprise: boolean;
}

export default function PricingPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    setPageMetadata(pricingSEO);
    loadPlans();
    
    // Track pricing page view
    track('pricing_viewed', {
      user_authenticated: !!profile,
      user_role: profile?.role || 'guest',
    });
  }, [profile]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch via public RPC first (preferred)
      let { data, error } = await assertSupabase().rpc('public_list_plans');
      
      // Fallback to direct table access if RPC fails
      if (error || !data) {
        const response = await assertSupabase()
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        
        data = response.data;
        error = response.error;
      }
      
      if (error) {
        throw error;
      }
      
      setPlans(data || []);
      
    } catch (err: any) {
      console.error('Failed to load pricing plans:', err);
      setError('Unable to load pricing information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const convertToDisplayTier = (plan: SubscriptionPlan): PricingTier => {
    const isEnterprise = plan.tier.toLowerCase() === 'enterprise';
    const price = isAnnual ? (plan.price_annual || plan.price_monthly * 10) : plan.price_monthly;
    
    // Get tier-specific colors and descriptions
    const tierConfig = getTierConfig(plan.tier);
    
    // Handle features - could be JSON array, string array, or null
    let planFeatures: string[] = [];
    try {
      if (Array.isArray(plan.features)) {
        planFeatures = plan.features;
      } else if (typeof plan.features === 'string') {
        planFeatures = JSON.parse(plan.features);
      } else if (plan.features && typeof plan.features === 'object') {
        planFeatures = plan.features;
      }
    } catch {
      planFeatures = [];
    }
    
    return {
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      price: price === 0 ? 'Free' : (isEnterprise ? 'Custom' : `R${price}`),
      period: price === 0 || isEnterprise ? '' : `/${isAnnual ? 'year' : 'month'}`,
      description: tierConfig.description,
      features: planFeatures.length > 0 ? planFeatures : tierConfig.defaultFeatures,
      recommended: tierConfig.recommended,
      cta: isEnterprise ? 'Contact Sales' : (price === 0 ? 'Start Free' : `Choose ${plan.name}`),
      color: tierConfig.color,
      isEnterprise,
    };
  };
  
  const getTierConfig = (tier: string) => {
    const tierLower = tier.toLowerCase();
    const configs: Record<string, any> = {
      free: {
        description: 'Perfect for small preschools getting started',
        defaultFeatures: ['Basic dashboard', 'Student management', 'Parent communication'],
        recommended: false,
        color: ['#00f5ff', '#0080ff'],
      },
      starter: {
        description: 'Essential features for growing schools',
        defaultFeatures: ['Advanced dashboard', 'AI-powered insights', 'Priority support'],
        recommended: true,
        color: ['#8000ff', '#ff0080'],
      },
      basic: {
        description: 'Comprehensive tools for active schools',
        defaultFeatures: ['Full feature set', 'Advanced analytics', 'Multi-teacher support'],
        recommended: false,
        color: ['#00f5ff', '#8000ff'],
      },
      premium: {
        description: 'Professional features for established schools',
        defaultFeatures: ['Premium features', 'Advanced reporting', 'Priority support'],
        recommended: false,
        color: ['#ff0080', '#8000ff'],
      },
      pro: {
        description: 'Advanced solution for large schools',
        defaultFeatures: ['All features', 'Custom integrations', 'Dedicated support'],
        recommended: false,
        color: ['#ff8000', '#ff0080'],
      },
      enterprise: {
        description: 'Complete solution for large organizations',
        defaultFeatures: ['Unlimited features', 'Custom integrations', 'Dedicated success manager'],
        recommended: false,
        color: ['#ff8000', '#ff0080'],
      },
    };
    
    return configs[tierLower] || configs.basic;
  };
  
  const pricingTiers = plans.map(convertToDisplayTier);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00f5ff" />
            <Text style={styles.loadingText}>Loading pricing plans...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <View style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle" size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Unable to Load Pricing</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPlans}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const handlePlanCTA = (tier: PricingTier) => {
    // Track the CTA click
    track('plan_cta_clicked', {
      plan_tier: tier.tier,
      plan_name: tier.name,
      is_enterprise: tier.isEnterprise,
      user_authenticated: !!profile,
      user_role: profile?.role || 'guest',
    });

    if (tier.isEnterprise) {
      // Enterprise tier always goes to contact sales
      navigateTo.contact();
    } else {
      // Non-enterprise tiers
      if (!profile) {
        // Not authenticated - go to sign up with plan context
        navigateTo.signUpWithPlan({
          tier: tier.tier,
          billing: isAnnual ? 'annual' : 'monthly'
        });
      } else if ((profile as any).organization_id) {
        // Authenticated with organization - go to subscription setup
        navigateTo.subscriptionSetup({
          planId: tier.id,
          billing: isAnnual ? 'annual' : 'monthly'
        });
      } else {
        // Authenticated individual user - go to subscription setup
        navigateTo.subscriptionSetup({
          planId: tier.id,
          billing: isAnnual ? 'annual' : 'monthly'
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#0a0a0f', '#1a0a2e', '#16213e', '#0f3460']}
            style={styles.headerGradient}
          >
            <Header />
            <PricingHeader />
            <BillingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </LinearGradient>
          
          <View style={styles.pricingSection}>
            <LinearGradient
              colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]}
              style={styles.pricingSectionGradient}
            >
              <PricingGrid tiers={pricingTiers} onPlanCTA={handlePlanCTA} />
              <EnterpriseSection />
              <FAQSection />
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const Header = () => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      <IconSymbol name="arrow.left" size={24} color="#00f5ff" />
      <Text style={styles.backText}>Back to Home</Text>
    </TouchableOpacity>
    
    <View style={styles.logo}>
      <LinearGradient colors={['#00f5ff', '#8000ff']} style={styles.logoGradient}>
        <IconSymbol name="help-circle" size={28} color="#000000" />
      </LinearGradient>
      <Text style={styles.logoText}>EduDash Pro</Text>
    </View>
    
    <TouchableOpacity 
      style={styles.signInButton} 
      onPress={() => router.push('/(auth)/sign-in')}
    >
      <Text style={styles.signInText}>Sign In</Text>
    </TouchableOpacity>
  </View>
);

const PricingHeader = () => (
  <View style={styles.pricingHeader}>
    <Text style={styles.pricingTitle}>Choose Your Plan</Text>
    <Text style={styles.pricingSubtitle}>
      Flexible pricing for schools of all sizes. Start free and scale as you grow.
    </Text>
  </View>
);

const BillingToggle = ({ isAnnual, onToggle }: { isAnnual: boolean; onToggle: (value: boolean) => void }) => (
  <View style={styles.billingToggle}>
    <TouchableOpacity 
      style={[styles.toggleOption, !isAnnual && styles.toggleOptionActive]}
      onPress={() => onToggle(false)}
    >
      <Text style={[styles.toggleOptionText, !isAnnual && styles.toggleOptionTextActive]}>Monthly</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.toggleOption, isAnnual && styles.toggleOptionActive]}
      onPress={() => onToggle(true)}
    >
      <Text style={[styles.toggleOptionText, isAnnual && styles.toggleOptionTextActive]}>Annual</Text>
      <Text style={[styles.toggleOptionSavings, isAnnual && styles.toggleOptionSavingsActive]}>Save 10%</Text>
    </TouchableOpacity>
  </View>
);

const PricingGrid = ({ tiers, onPlanCTA }: { tiers: PricingTier[]; onPlanCTA: (tier: PricingTier) => void }) => (
  <View style={styles.pricingGrid}>
    {tiers.map((tier, index) => (
      <PricingCard key={tier.id} tier={tier} index={index} onPlanCTA={onPlanCTA} />
    ))}
  </View>
);


const PricingCard = ({ tier, index, onPlanCTA }: { tier: PricingTier; index?: number; onPlanCTA: (tier: PricingTier) => void }) => (
  <View style={[
    styles.pricingCard,
    tier.recommended && styles.recommendedCard,
    isDesktop && styles.pricingCardDesktop
  ]}>
    {tier.recommended && (
      <View style={styles.recommendedBadge}>
        <LinearGradient colors={tier.color as [string, string]} style={styles.badgeGradient}>
          <Text style={styles.badgeText}>Most Popular</Text>
        </LinearGradient>
      </View>
    )}
    
    <LinearGradient
      colors={tier.recommended 
        ? ['rgba(128,0,255,0.1)', 'rgba(255,0,128,0.1)'] 
        : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
      }
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.tierName}>{tier.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{tier.price}</Text>
          {tier.period && <Text style={styles.period}>{tier.period}</Text>}
        </View>
        <Text style={styles.description}>{tier.description}</Text>
      </View>
      
      <View style={styles.featuresList}>
        {tier.features.map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <IconSymbol name="checkmark.circle" size={16} color="#00f5ff" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.ctaButton,
          tier.recommended && styles.recommendedButton
        ]}
        onPress={() => onPlanCTA(tier)}
      >
        <LinearGradient
          colors={tier.recommended 
            ? tier.color as [string, string] 
            : ['rgba(0,245,255,0.2)', 'rgba(0,128,255,0.2)']
          }
          style={styles.ctaGradient}
        >
          <Text style={[
            styles.ctaText,
            tier.recommended && styles.recommendedCtaText
          ]}>
            {tier.cta}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

const EnterpriseSection = () => (
  <View style={styles.enterpriseSection}>
    <LinearGradient colors={['#0f3460', '#533a71']} style={styles.enterpriseGradient}>
      <Text style={styles.enterpriseTitle}>Need Something Custom?</Text>
      <Text style={styles.enterpriseText}>
        Our enterprise solutions are designed for large school districts, 
        government education departments, and multi-national education providers.
      </Text>
      <View style={styles.enterpriseFeatures}>
        <Text style={styles.enterpriseFeature}>🏢 Multi-tenant architecture</Text>
        <Text style={styles.enterpriseFeature}>🔒 Advanced security & compliance</Text>
        <Text style={styles.enterpriseFeature}>🔧 Custom integrations & APIs</Text>
        <Text style={styles.enterpriseFeature}>📞 Dedicated support team</Text>
      </View>
      <TouchableOpacity 
        style={styles.enterpriseButton}
        onPress={() => navigateTo.contact()}
      >
        <LinearGradient colors={['#ff8000', '#ff0080']} style={styles.enterpriseButtonGradient}>
          <Text style={styles.enterpriseButtonText}>Schedule Enterprise Demo</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

const FAQSection = () => (
  <View style={styles.faqSection}>
    <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
    <View style={styles.faqList}>
      <FAQItem 
        question="Can I upgrade or downgrade my plan anytime?"
        answer="Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the start of your next billing cycle."
      />
      <FAQItem 
        question="Is there a setup fee?"
        answer="No setup fees for Starter and Professional plans. Enterprise plans may include implementation services."
      />
      <FAQItem 
        question="What payment methods do you accept?"
        answer="We accept all major credit cards, PayFast, and bank transfers for South African customers."
      />
    </View>
  </View>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <TouchableOpacity 
      style={styles.faqItem}
      onPress={() => setIsOpen(!isOpen)}
    >
      <LinearGradient
        colors={isOpen 
          ? ['rgba(0,245,255,0.1)', 'rgba(128,0,255,0.1)']
          : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
        }
        style={styles.faqItemGradient}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{question}</Text>
          <IconSymbol 
            name={isOpen ? 'chevron.up' : 'chevron.down'} 
            size={20} 
            color="#00f5ff" 
          />
        </View>
        {isOpen && <Text style={styles.faqAnswer}>{answer}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#00f5ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    alignSelf: 'center',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#00f5ff',
  },
  toggleOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleOptionTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  toggleOptionSavings: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  toggleOptionSavingsActive: {
    color: '#000000',
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: DesignSystem.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isDesktop ? 40 : 20,
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#00f5ff',
    marginLeft: 8,
    fontWeight: '600',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DesignSystem.colors.text.primary,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00f5ff',
  },
  signInText: {
    color: '#00f5ff',
    fontWeight: '600',
  },
  pricingHeader: {
    alignItems: 'center',
    paddingHorizontal: isDesktop ? 40 : 20,
  },
  pricingTitle: {
    fontSize: isDesktop ? 48 : 32,
    fontWeight: '900',
    color: DesignSystem.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingSubtitle: {
    fontSize: isDesktop ? 20 : 16,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 600,
  },
  pricingSection: {
    flex: 1,
  },
  pricingSectionGradient: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: isDesktop ? 40 : 20,
  },
  pricingGrid: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: isDesktop ? 'flex-start' : 'center',
    gap: 24,
    marginBottom: 60,
  },
  pricingCard: {
    width: isDesktop ? 320 : '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  pricingCardDesktop: {
    minHeight: 600,
  },
  recommendedCard: {
    transform: isDesktop ? [{ scale: 1.05 }] : [{ scale: 1 }],
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    left: 20,
    right: 20,
    zIndex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  badgeText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  cardGradient: {
    padding: 24,
    paddingTop: 32,
    minHeight: isDesktop ? 560 : 400,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 24,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '800',
    color: DesignSystem.colors.text.primary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: '900',
    color: DesignSystem.colors.text.primary,
  },
  period: {
    fontSize: 16,
    color: DesignSystem.colors.text.secondary,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: DesignSystem.colors.text.secondary,
    lineHeight: 20,
  },
  featuresList: {
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: DesignSystem.colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  recommendedButton: {},
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00f5ff',
  },
  recommendedCtaText: {
    color: '#000000',
  },
  enterpriseSection: {
    marginBottom: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  enterpriseGradient: {
    padding: 32,
    alignItems: 'center',
  },
  enterpriseTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: DesignSystem.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  enterpriseText: {
    fontSize: 16,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 600,
    lineHeight: 22,
  },
  enterpriseFeatures: {
    marginBottom: 32,
  },
  enterpriseFeature: {
    fontSize: 16,
    color: DesignSystem.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  enterpriseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  enterpriseButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  enterpriseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  faqSection: {
    marginBottom: 40,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DesignSystem.colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  faqList: {
    gap: 16,
  },
  faqItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqItemGradient: {
    padding: 20,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: DesignSystem.colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: DesignSystem.colors.text.secondary,
    marginTop: 12,
    lineHeight: 20,
  },
});