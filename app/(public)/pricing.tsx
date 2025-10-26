import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { marketingTokens } from '@/components/marketing/tokens';
import { GlassCard } from '@/components/marketing/GlassCard';
import { GradientButton } from '@/components/marketing/GradientButton';
import { supabase } from '@/lib/supabase';

type DBPlan = {
  id: string;
  name: string;
  tier: string;
  price_monthly: number | null;
  features: string[] | any;
  is_active: boolean;
  description?: string | null;
};

const fallbackPlans = [
  {
    name: 'Free',
    price: 'R0',
    period: 'forever',
    description: 'Perfect for small preschools getting started',
    features: [
      { name: 'Up to 50 students', included: true },
      { name: 'Basic lessons', included: true },
      { name: 'Parent messaging', included: true },
      { name: 'Community support', included: true },
      { name: 'AI features', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom branding', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Get Started',
    featured: false,
  },
  {
    name: 'Starter',
    price: 'R49',
    period: 'per month',
    description: 'For very small preschools starting with AI tools',
    features: [
      { name: 'Up to 100 students', included: true },
      { name: '5 AI lessons/day', included: true },
      { name: 'Progress tracking', included: true },
      { name: 'No ads', included: true },
      { name: 'Analytics', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom branding', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Basic',
    price: 'R299',
    period: 'per month',
    description: 'For growing preschools using AI in the classroom',
    features: [
      { name: 'Up to 200 students', included: true },
      { name: 'AI lesson generation', included: true },
      { name: 'Analytics & insights', included: true },
      { name: 'AI homework grading', included: true },
      { name: 'Priority support', included: false },
      { name: 'Custom branding', included: false },
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Premium',
    price: 'R499',
    period: 'per month',
    description: 'Most popular plan for established preschools',
    features: [
      { name: 'Up to 400 students', included: true },
      { name: 'Unlimited AI lessons', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Custom branding', included: true },
      { name: 'Priority support', included: true },
      { name: 'Export data', included: true },
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Pro',
    price: 'R899',
    period: 'per month',
    description: 'Advanced management and insights for larger schools',
    features: [
      { name: 'Up to 800 students', included: true },
      { name: 'Advanced teacher management', included: true },
      { name: 'AI-powered insights', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Enterprise',
    price: 'R1999',
    period: 'per month',
    description: 'For multi-school organizations with custom needs',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Multi-school management', included: true },
      { name: 'Enterprise security', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Training & onboarding', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'API access', included: true },
      { name: 'White-label options', included: true },
      { name: 'Custom features', included: true },
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

/**
 * Detailed public pricing page (no auth required)
 */
export default function PricingPage() {
  const [plans, setPlans] = useState(fallbackPlans);

  useEffect(() => {
    (async () => {
      try {
        let mapped: any[] | null = null;

        // Try RPC
        const rpc = await supabase.rpc('public_list_plans');
        if (!rpc.error && Array.isArray(rpc.data)) {
          mapped = rpc.data.map((p: DBPlan) => ({
            name: p.name,
            price: p.price_monthly && p.price_monthly > 0 ? `R${p.price_monthly}` : 'Custom',
            period: p.price_monthly && p.price_monthly > 0 ? 'per month' : 'contact us',
            description: p.description || undefined,
            features: Array.isArray(p.features) ? p.features : [],
            cta: p.price_monthly && p.price_monthly > 0 ? 'Start Free Trial' : 'Contact Sales',
            featured: p.tier === 'pro' || p.tier === 'premium',
          }));
        } else {
          // Fallback to table select
          const sel = await supabase
            .from('subscription_plans')
            .select('name,tier,price_monthly,features,is_active')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

          if (!sel.error && Array.isArray(sel.data)) {
            mapped = sel.data.map((p: DBPlan) => ({
              name: p.name,
              price: p.price_monthly && p.price_monthly > 0 ? `R${p.price_monthly}` : 'Custom',
              period: p.price_monthly && p.price_monthly > 0 ? 'per month' : 'contact us',
              description: p.description || undefined,
              features: Array.isArray(p.features) ? p.features : [],
              cta: p.price_monthly && p.price_monthly > 0 ? 'Start Free Trial' : 'Contact Sales',
              featured: p.tier === 'pro' || p.tier === 'premium',
            }));
          }
        }

        setPlans(mapped || fallbackPlans);
      } catch {
        setPlans(fallbackPlans);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background */}
      <LinearGradient
        colors={marketingTokens.gradients.background}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconSymbol name="chevron.left" size={24} color={marketingTokens.colors.fg.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.titleSection}>
            <Text style={styles.overline}>PRICING</Text>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>
              Transparent pricing that scales with your preschool.{'\n'}
              All plans include a 14-day free trial.
            </Text>
          </View>

          {/* Pricing Cards */}
          <View style={styles.grid}>
            {plans.map((plan) => (
              <View key={plan.name} style={styles.cardWrapper}>
                <GlassCard 
                  intensity={plan.featured ? 'strong' : 'medium'}
                  style={[
                    styles.card,
                    plan.featured && styles.featuredCard,
                  ]}
                >
                  {/* Featured badge */}
                  {plan.featured && (
                    <View style={styles.featuredBadge}>
                      <LinearGradient
                        colors={marketingTokens.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.badgeGradient}
                      >
                        <Text numberOfLines={1} ellipsizeMode="clip" style={styles.badgeText}>MOST POPULAR</Text>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Plan Header */}
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>

                  {/* Price */}
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{plan.price}</Text>
                    <Text style={styles.period}>{plan.period}</Text>
                  </View>

                  {/* Features List */}
                  <View style={styles.features}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <IconSymbol 
                          name={feature.included ? 'checkmark.circle.fill' : 'xmark.circle'} 
                          size={18} 
                          color={
                            feature.included 
                              ? marketingTokens.colors.accent.cyan400 
                              : marketingTokens.colors.fg.tertiary
                          }
                        />
                        <Text style={[
                          styles.featureText,
                          !feature.included && styles.featureTextDisabled,
                        ]}>
                          {feature.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  <GradientButton
                    label={plan.cta}
                    onPress={() => router.push('/(auth)/sign-up')}
                    size="md"
                    variant={plan.featured ? 'primary' : 'indigo'}
                    style={styles.cta}
                  />
                </GlassCard>
              </View>
            ))}
          </View>

          {/* FAQ Section */}
          <View style={styles.faq}>
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            
            <GlassCard style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Can I switch plans anytime?</Text>
              <Text style={styles.faqAnswer}>
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </Text>
            </GlassCard>

            <GlassCard style={styles.faqCard}>
              <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
              <Text style={styles.faqAnswer}>
                We accept all major credit cards, debit cards, and EFT payments for South African accounts.
              </Text>
            </GlassCard>

            <GlassCard style={styles.faqCard}>
              <Text style={styles.faqQuestion}>Is there a setup fee?</Text>
              <Text style={styles.faqAnswer}>
                No setup fees. No hidden charges. You only pay the monthly subscription fee.
              </Text>
            </GlassCard>
          </View>

          {/* Contact Support */}
          <View style={styles.contact}>
            <Text style={styles.contactTitle}>Need help choosing?</Text>
            <Text style={styles.contactText}>
              Our team is here to help you find the perfect plan for your preschool.
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/sign-up')}
              style={styles.contactButton}
            >
              <Text style={styles.contactButtonText}>Contact Sales</Text>
              <IconSymbol name="arrow.right" size={16} color={marketingTokens.colors.accent.cyan400} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: marketingTokens.colors.bg.base,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: marketingTokens.spacing.lg,
    paddingVertical: marketingTokens.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: marketingTokens.spacing.sm,
  },
  backText: {
    ...marketingTokens.typography.body,
    color: marketingTokens.colors.fg.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: marketingTokens.spacing.lg,
    paddingBottom: marketingTokens.spacing['4xl'],
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: marketingTokens.spacing['3xl'],
  },
  overline: {
    ...marketingTokens.typography.overline,
    color: marketingTokens.colors.accent.cyan400,
    marginBottom: marketingTokens.spacing.sm,
  },
  title: {
    ...marketingTokens.typography.h1,
    fontSize: 32,
    color: marketingTokens.colors.fg.primary,
    textAlign: 'center',
    marginBottom: marketingTokens.spacing.md,
  },
  subtitle: {
    ...marketingTokens.typography.body,
    color: marketingTokens.colors.fg.secondary,
    textAlign: 'center',
    maxWidth: 480,
  },
  grid: {
    gap: marketingTokens.spacing.xl,
    marginBottom: marketingTokens.spacing['4xl'],
  },
  cardWrapper: {
    marginTop: marketingTokens.spacing.md,
  },
  card: {
    position: 'relative',
    paddingTop: marketingTokens.spacing.xl,
  },
  featuredCard: {
    borderColor: marketingTokens.colors.accent.cyan400,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: [{ translateX: -60 }],
    borderRadius: marketingTokens.radii.full,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: marketingTokens.spacing['2xl'],
    paddingVertical: marketingTokens.spacing.xs,
    minWidth: 140,
    alignItems: 'center',
  },
  badgeText: {
    ...marketingTokens.typography.overline,
    color: marketingTokens.colors.fg.inverse,
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  planName: {
    ...marketingTokens.typography.h2,
    color: marketingTokens.colors.fg.primary,
    marginBottom: marketingTokens.spacing.sm,
  },
  planDescription: {
    ...marketingTokens.typography.caption,
    color: marketingTokens.colors.fg.secondary,
    marginBottom: marketingTokens.spacing.xl,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: marketingTokens.spacing.xl,
  },
  price: {
    fontSize: 48,
    fontWeight: '900',
    color: marketingTokens.colors.fg.primary,
    lineHeight: 56,
  },
  period: {
    ...marketingTokens.typography.caption,
    color: marketingTokens.colors.fg.tertiary,
  },
  features: {
    gap: marketingTokens.spacing.md,
    marginBottom: marketingTokens.spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: marketingTokens.spacing.sm,
  },
  featureText: {
    ...marketingTokens.typography.body,
    fontSize: 14,
    color: marketingTokens.colors.fg.secondary,
    flex: 1,
  },
  featureTextDisabled: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  cta: {
    width: '100%',
  },
  faq: {
    marginBottom: marketingTokens.spacing['4xl'],
  },
  faqTitle: {
    ...marketingTokens.typography.h2,
    color: marketingTokens.colors.fg.primary,
    textAlign: 'center',
    marginBottom: marketingTokens.spacing.xl,
  },
  faqCard: {
    marginBottom: marketingTokens.spacing.lg,
  },
  faqQuestion: {
    ...marketingTokens.typography.body,
    fontWeight: '700',
    color: marketingTokens.colors.fg.primary,
    marginBottom: marketingTokens.spacing.sm,
  },
  faqAnswer: {
    ...marketingTokens.typography.body,
    fontSize: 14,
    color: marketingTokens.colors.fg.secondary,
    lineHeight: 22,
  },
  contact: {
    alignItems: 'center',
  },
  contactTitle: {
    ...marketingTokens.typography.h3,
    color: marketingTokens.colors.fg.primary,
    marginBottom: marketingTokens.spacing.sm,
  },
  contactText: {
    ...marketingTokens.typography.body,
    color: marketingTokens.colors.fg.secondary,
    textAlign: 'center',
    marginBottom: marketingTokens.spacing.lg,
    maxWidth: 400,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: marketingTokens.spacing.sm,
    paddingVertical: marketingTokens.spacing.md,
  },
  contactButtonText: {
    ...marketingTokens.typography.body,
    color: marketingTokens.colors.accent.cyan400,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
