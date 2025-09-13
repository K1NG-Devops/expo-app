import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ColorValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DesignSystem } from '@/constants/DesignSystem';
import { setPageMetadata, pricingSEO } from '@/lib/webSEO';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  recommended?: boolean;
  cta: string;
  color: readonly ColorValue[];
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for small preschools getting started',
    features: [
      'Up to 50 students',
      '2 teacher accounts',
      'Basic lesson templates',
      'Parent communication',
      'Mobile app access',
      'Email support'
    ],
    cta: 'Start Free',
    color: ['#00f5ff', '#0080ff'],
  },
  {
    name: 'Professional',
    price: 'R299',
    period: '/month',
    description: 'Advanced features for growing schools',
    features: [
      'Up to 200 students',
      'Unlimited teachers',
      'AI lesson generation',
      'Advanced analytics',
      'Parent portal',
      'Priority support',
      'Custom branding',
      'Bulk operations'
    ],
    recommended: true,
    cta: 'Start Professional',
    color: ['#8000ff', '#ff0080'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Complete solution for large organizations',
    features: [
      'Unlimited students',
      'Multi-school management',
      'Advanced AI features',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantee',
      'White-label solution',
      'On-premise deployment'
    ],
    cta: 'Contact Sales',
    color: ['#ff8000', '#ff0080'],
  },
];

export default function PricingPage() {
  useEffect(() => {
    setPageMetadata(pricingSEO);
  }, []);

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
          </LinearGradient>
          
          <View style={styles.pricingSection}>
            <LinearGradient
              colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]}
              style={styles.pricingSectionGradient}
            >
              <PricingGrid />
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
        <IconSymbol name="brain" size={28} color="#000000" />
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

const PricingGrid = () => (
  <View style={styles.pricingGrid}>
    {pricingTiers.map((tier, index) => (
      <PricingCard key={tier.name} tier={tier} index={index} />
    ))}
  </View>
);

const PricingCard = ({ tier, index }: { tier: PricingTier; index: number }) => (
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
        onPress={() => {
          if (tier.cta === 'Contact Sales') {
            router.push('/marketing/contact');
          } else {
            router.push('/(auth)/sign-up');
          }
        }}
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
        onPress={() => router.push('/marketing/contact')}
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