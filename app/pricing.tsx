import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, FlatList, Dimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ComparisonTable } from '../components/pricing/ComparisonTable';
import type { PlanId } from '../components/pricing/ComparisonTable';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/rbac';
import { salesOrPricingPath } from '@/lib/sales';
import { navigateTo } from '@/lib/navigation/router-utils';
import { useTranslation } from 'react-i18next';

export default function PricingScreen() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const { profile } = useAuth();
  const roleNorm = normalizeRole(String(profile?.role || ''));
  const canRequestEnterprise = roleNorm === 'principal_admin' || roleNorm === 'super_admin';

  const priceStr = (monthly: number): string => {
    if (annual) {
      const yearly = Math.round(monthly * 12 * 0.9);
      return `R${yearly} / year (save 10%)`;
    }
    return `R${monthly} / month`;
  };

const visiblePlans: PlanId[] | undefined = canRequestEnterprise ? undefined : ['free','parent-starter','parent-plus','private-teacher','pro'];

  // Swipe carousel state and items
  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth - 32
  const [activeIndex, setActiveIndex] = useState(0)

  const topPlanItems = [
    {
      key: 'free',
      render: () => (
        <PlanCard
          name="Free"
          price={priceStr(0)}
          description="Get started with basics"
          features={[
            'Mobile app access',
            'Homework Helper (limited)',
            'Lesson generator (limited)',
            'Community support',
          ]}
          ctaText={t('pricing.cta.start_free', { defaultValue: 'Start Free' })}
          onPress={() => navigateTo.signUpWithPlan({ tier: 'free', billing: annual ? 'annual' : 'monthly' })}
        />
      ),
    },
    {
      key: 'parent-starter',
      render: () => (
        <PlanCard
          name="Parent Starter"
          price={priceStr(49)}
          description="Affordable AI help for families"
          features={[
            'Homework Helper · 30/mo',
            'Child-safe explanations',
            'Email support',
          ]}
          ctaText={t('pricing.cta.choose_named', { defaultValue: 'Choose Parent Starter', name: 'Parent Starter' })}
          onPress={() => navigateTo.subscriptionSetup({ planId: 'parent-starter', billing: annual ? 'annual' : 'monthly', auto: true })}
        />
      ),
    },
    {
      key: 'parent-plus',
      render: () => (
        <PlanCard
          name="Parent Plus"
          price={priceStr(149)}
          description="Expanded AI support for families"
          features={[
            'Homework Helper · 100/mo',
            'Priority processing',
            'Basic analytics',
          ]}
          ctaText={t('pricing.cta.choose_named', { defaultValue: 'Choose Parent Plus', name: 'Parent Plus' })}
          onPress={() => navigateTo.subscriptionSetup({ planId: 'parent-plus', billing: annual ? 'annual' : 'monthly', auto: true })}
        />
      ),
    },
    {
      key: 'private-teacher',
      render: () => (
        <PlanCard
          name="Private Teacher"
          price={priceStr(299)}
          description="For tutors and private teachers"
          features={[
            'Lesson Generator · 20/mo',
            'Grading Assistance · 20/mo',
            'Homework Helper · 100/mo',
          ]}
          ctaText={t('pricing.cta.choose_named', { defaultValue: 'Choose Private Teacher', name: 'Private Teacher' })}
          onPress={() => navigateTo.subscriptionSetup({ planId: 'private-teacher', billing: annual ? 'annual' : 'monthly', auto: true })}
        />
      ),
    },
    {
      key: 'pro',
      render: () => (
        <PlanCard
          name="Pro"
          price={priceStr(599)}
          description="For individual teachers"
          highlights={['Most popular']}
          features={[
            'All Free features',
            'AI Homework Helper increased limits',
            'AI Lesson Generator increased limits',
            'AI Grading Assistance increased limits',
            'Model selection (Haiku/Sonnet/Opus)',
            'Priority support',
          ]}
          ctaText={t('subscription.upgradeToPro', { defaultValue: 'Upgrade to Pro' })}
          onPress={() => navigateTo.subscriptionSetup({ planId: 'pro', billing: annual ? 'annual' : 'monthly', auto: true })}
        />
      ),
    },
  ] as const

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('pricing.title', { defaultValue: 'Pricing' }), headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Free ribbon if on free tier */}
          {String((profile as any)?.plan_tier || 'free').toLowerCase() === 'free' && (
            <View style={{ backgroundColor: '#111827', borderColor: '#1f2937', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#9CA3AF', fontWeight: '700' }}>{t('pricing.free_ribbon', { defaultValue: 'You are on the Free plan' })}</Text>
              <TouchableOpacity onPress={() => navigateTo.subscriptionSetup({ planId: 'pro', billing: annual ? 'annual' : 'monthly', auto: true })} style={{ backgroundColor: '#00f5ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#000', fontWeight: '800' }}>{t('common.upgrade', { defaultValue: 'Upgrade' })}</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.title}>{t('pricing.plans_title', { defaultValue: 'Plans & Pricing' })}</Text>
          <Text style={styles.subtitle}>{t('pricing.subtitle_app', { defaultValue: 'Flexible options for individuals, preschools and schools. AI usage includes monthly quotas. Overages require prepayment.' })}</Text>

          {/* Billing toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity onPress={() => setAnnual(false)} style={[styles.toggleBtn, !annual && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, !annual && styles.toggleBtnTextActive]}>{t('pricing.monthly', { defaultValue: 'Monthly' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAnnual(true)} style={[styles.toggleBtn, annual && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, annual && styles.toggleBtnTextActive]}>{t('pricing.annual', { defaultValue: 'Annual' })}</Text>
            </TouchableOpacity>
          </View>

          {/* Plans in order - horizontal carousel on mobile */}
          <View style={{ marginTop: 8 }}>
            <FlatList
              data={topPlanItems}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <View style={{ width: itemWidth, paddingHorizontal: 0 }}>
                  {item.render()}
                </View>
              )}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToAlignment="center"
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x
                const index = Math.round(offsetX / itemWidth)
                setActiveIndex(index)
              }}
              scrollEventThrottle={16}
            />
            <View style={styles.dotsRow}>
              {topPlanItems.map((it, idx) => (
                <View key={it.key} style={[styles.dot, activeIndex === idx && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* Legacy stacked grid kept for larger screens as fallback */}
          <View style={[styles.grid, { display: 'none' }]}>
            <PlanCard
              name="Free"
              price={priceStr(0)}
              description="Get started with basics"
              features={[
                'Mobile app access',
                'Homework Helper (limited)',
                'Lesson generator (limited)',
                'Community support',
              ]}
              ctaText="Start free"
              onPress={() => navigateTo.signUpWithPlan({ tier: 'free', billing: annual ? 'annual' : 'monthly' })}
            />

            <PlanCard
              name="Parent Starter"
              price={priceStr(49)}
              description="Affordable AI help for families"
              features={[
                'Homework Helper · 30/mo',
                'Child-safe explanations',
                'Email support',
              ]}
              ctaText="Choose Parent Starter"
              onPress={() => navigateTo.subscriptionSetup({ planId: 'parent-starter', billing: annual ? 'annual' : 'monthly' })}
            />

            <PlanCard
              name="Parent Plus"
              price={priceStr(149)}
              description="Expanded AI support for families"
              features={[
                'Homework Helper · 100/mo',
                'Priority processing',
                'Basic analytics',
              ]}
              ctaText="Choose Parent Plus"
              onPress={() => navigateTo.subscriptionSetup({ planId: 'parent-plus', billing: annual ? 'annual' : 'monthly' })}
            />

            <PlanCard
              name="Private Teacher"
              price={priceStr(299)}
              description="For tutors and private teachers"
              features={[
                'Lesson Generator · 20/mo',
                'Grading Assistance · 20/mo',
                'Homework Helper · 100/mo',
              ]}
              ctaText="Choose Private Teacher"
              onPress={() => navigateTo.subscriptionSetup({ planId: 'private-teacher', billing: annual ? 'annual' : 'monthly' })}
            />

            <PlanCard
              name="Pro"
              price={priceStr(599)}
              description="For individual teachers"
              highlights={['Most popular']}
              features={[
                'All Free features',
                'AI Homework Helper increased limits',
                'AI Lesson Generator increased limits',
                'AI Grading Assistance increased limits',
                'Model selection (Haiku/Sonnet/Opus)',
                'Priority support',
              ]}
              ctaText="Upgrade to Pro"
              onPress={() => navigateTo.subscriptionSetup({ planId: 'pro', billing: annual ? 'annual' : 'monthly' })}
            />

            {canRequestEnterprise && (
              <PlanCard
                name="Preschool Pro"
                price={annual ? 'Custom (annual)' : 'Custom'}
                description="For preschools"
                highlights={['Org allocation available']}
                features={[
                'All Pro features',
                'Org-level AI usage allocation',
                'Seat-based licensing',
                'Admin controls',
              ]}
              footnote="Org allocation available on Pro (R599) and up for preschools"
              ctaText={canRequestEnterprise ? 'Contact sales' : 'Admin only'}
              onPress={() => {
                if (!canRequestEnterprise) {
                  Alert.alert(t('common.restricted', { defaultValue: 'Restricted' }), t('pricing.restricted_principal_only', { defaultValue: 'Only principals or school admins can request Preschool Pro.' }));
                  return;
                }
                router.push('/sales/contact?plan=preschool-pro')
              }}
            />
            )}

            {canRequestEnterprise && (
              <PlanCard
                name="Enterprise (K-12)"
                price={annual ? 'Special pricing (annual)' : 'Special pricing'}
                description="For K-12 schools and districts"
                highlights={['Best for schools']}
                features={[
                'All Pro features',
                'Enterprise-grade security',
                'Unlimited or pooled AI usage (as contracted)',
                'Org-level AI usage allocation',
                'SSO, advanced analytics',
                'Dedicated support',
              ]}
              footnote="Org allocation available only on Enterprise for K-12"
              ctaText={canRequestEnterprise ? 'Contact sales' : 'Admin only'}
              onPress={() => {
                if (!canRequestEnterprise) {
                  Alert.alert(t('common.restricted', { defaultValue: 'Restricted' }), t('pricing.restricted_enterprise_only', { defaultValue: 'Only principals or school admins can request Enterprise.' }));
                  return;
                }
                router.push('/sales/contact?plan=enterprise')
              }}
            />
            )}
          </View>

          {/* Notes */}
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>{t('pricing.notes.title', { defaultValue: 'Notes' })}</Text>
            <Text style={styles.noteItem}>• {t('pricing.notes.quota', { defaultValue: 'AI quotas are monthly and reset at the start of each month.' })}</Text>
            <Text style={styles.noteItem}>• {t('pricing.notes.overages', { defaultValue: 'Overages require prepayment; once paid, access resumes immediately.' })}</Text>
            <Text style={styles.noteItem}>• {t('pricing.notes.model_selection', { defaultValue: 'Model selection affects cost; Opus > Sonnet > Haiku. We recommend Haiku for most classroom use.' })}</Text>
            <Text style={styles.noteItem}>• {t('pricing.notes.enterprise_contact', { defaultValue: 'For K-12 Enterprise pricing, contact sales. We tailor seat counts and AI usage pools to your school size and needs.' })}</Text>
          </View>

          {/* Comparison table */}
          <ComparisonTable
            annual={annual}
            visiblePlans={visiblePlans}
            onSelectPlan={(planId) => {
              if (planId === 'preschool-pro' || planId === 'enterprise') {
                if (!canRequestEnterprise) {
                  Alert.alert(t('common.restricted', { defaultValue: 'Restricted' }), t('pricing.restricted_submit_only', { defaultValue: 'Only principals or school admins can submit these requests.' }));
                  return;
                }
                router.push(`/sales/contact?plan=${planId}` as any)
                return;
              }
              // All other plans: go to subscription setup
              navigateTo.subscriptionSetup({ planId: planId, billing: annual ? 'annual' : 'monthly' })
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlanCard({ name, price, description, features, ctaText, onPress, footnote, highlights }: {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  onPress: () => void;
  footnote?: string;
  highlights?: string[];
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{name}</Text>
        {highlights && highlights.length > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{highlights[0]}</Text></View>
        )}
      </View>
      <Text style={styles.cardPrice}>{price}</Text>
      <Text style={styles.cardText}>{description}</Text>
      <View style={styles.featureList}>
        {features.map((f) => (
          <View key={f} style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      <TouchableOpacity style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>{ctaText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { color: '#9CA3AF', marginBottom: 4 },
  grid: { gap: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#1f2937' },
  toggleBtnActive: { backgroundColor: '#00f5ff', borderColor: '#00f5ff' },
  toggleBtnText: { color: '#9CA3AF', fontWeight: '800' },
  toggleBtnTextActive: { color: '#000' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontWeight: '800', marginBottom: 6, fontSize: 16 },
  cardPrice: { color: '#fff', fontWeight: '900', marginBottom: 6, fontSize: 18 },
  cardText: { color: '#9CA3AF' },
  featureList: { marginTop: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  featureBullet: { color: '#00f5ff' },
  featureText: { color: '#d1d5db', flex: 1 },
  footnote: { color: '#9CA3AF', marginTop: 8, fontSize: 12 },
  cta: { marginTop: 10, backgroundColor: '#00f5ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  ctaText: { color: '#000', fontWeight: '800' },
  notes: { marginTop: 16, backgroundColor: '#0b1220', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
  notesTitle: { color: '#fff', fontWeight: '800', marginBottom: 6 },
  noteItem: { color: '#9CA3AF', marginBottom: 4 },
  badge: { backgroundColor: '#00f5ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { color: '#000', fontWeight: '800', fontSize: 12 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  dotActive: { backgroundColor: '#00f5ff' },
});
