import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setPageMetadata, landingPageSEO } from '@/lib/webSEO';

// Modern design system imports
import { marketingTokens } from './tokens';
import { useResponsive } from './useResponsive';

// Section components
import { HeroSection } from './sections/HeroSection';
import { TrustBadgesSection } from './sections/TrustBadgesSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { DashAISection } from './sections/DashAISection';
import { RoleBasedBenefitsSection } from './sections/RoleBasedBenefitsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { PricingSection } from './sections/PricingSection';
import { QASection } from './sections/QASection';
import { CTASection } from './sections/CTASection';
import { FooterSection } from './sections/FooterSection';

const isWeb = Platform.OS === 'web';

/**
 * Modern marketing landing page with glassmorphism design
 * Dark theme optimized for web and mobile
 * 
 * Architecture: Modular section-based design
 * Each section is a self-contained component in ./sections/
 */
export default function MarketingLanding() {
  const [refreshing, setRefreshing] = useState(false);
  const { columns } = useResponsive();

  // Web-only: handle invitation codes and SEO
  useEffect(() => {
    if (isWeb) {
      try {
        const sp = new URLSearchParams(window.location.search);
        const rawCode = sp.get('code') || sp.get('invitationCode');
        if (rawCode) {
          router.replace(`/invite?code=${encodeURIComponent(rawCode)}` as any);
        }
      } catch (e) {
        console.warn('[Landing] Failed to parse query for invite code:', e);
      }
      setPageMetadata(landingPageSEO);
    }
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Background gradient */}
      <LinearGradient
        colors={marketingTokens.gradients.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={marketingTokens.colors.accent.cyan400}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeroSection />
        <TrustBadgesSection />
        <FeaturesSection columns={columns} />
        <DashAISection />
        <RoleBasedBenefitsSection columns={columns} />
        <TestimonialsSection columns={columns} />
        <PricingSection columns={columns} />
        <QASection />
        <CTASection />
        <FooterSection />
      </ScrollView>
    </View>
  );
}

// Styles for container and basic layout
// All section styles are now co-located in ./sections/ components

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, { toValue: isSmall ? -12 : -20, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatingY, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={['#0a0a0f', '#1a0a2e', '#16213e', '#0f3460', '#533a71']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroContent}>
          <View style={styles.navbar}>
            <View style={styles.logo}>
              <LinearGradient colors={['#00f5ff', '#0080ff', '#8000ff']} style={styles.logoGradient}>
                <IconSymbol name="help-circle" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.logoText}>EduDash Pro</Text>
            </View>
          </View>

          <View style={[styles.heroTextContainer, webOptimized && styles.heroTextContainerWeb]}>
            <Animated.View style={[styles.heroTitle, { transform: [{ translateY: floatingY }] }, webOptimized && styles.heroTitleWeb]}>
              <Text style={[styles.heroMainTitle, webOptimized && styles.heroMainTitleWeb]}>
                Empower Your Preschool with{String.fromCharCode(10)}
                <Text style={styles.gradientTextPrimary}>AI-Powered Education</Text>
              </Text>
              <Text style={[styles.heroSubtitle, webOptimized && styles.heroSubtitleWeb]}>
                A comprehensive platform for preschools, teachers, and parents. Streamline classroom management, track student progress, and enhance learning outcomes with intelligent tools designed for early childhood education.
                {webOptimized && " Trusted by educational institutions across South Africa."}
              </Text>
            </Animated.View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>3-6</Text>
                <Text style={styles.statLabel}>Years Old</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>AI</Text>
                <Text style={styles.statLabel}>Powered</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>100%</Text>
                <Text style={styles.statLabel}>COPPA Safe</Text>
              </View>
            </View>

          <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryCTA} onPress={() => router.push('/(auth)/sign-up')}>
                <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.ctaGradient}>
                  <Text style={styles.ctaText}>Get Started Free</Text>
                  <IconSymbol name="arrow.right" size={20} color="#000000" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCTANew}
                onPress={() => router.push('/(auth)/sign-in')}
              >
                <Text style={styles.secondaryCtaTextNew}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

// Trust Badges Section
const TrustBadgesSection = () => {
  return (
    <View style={[styles.trustBadgesContainer, { backgroundColor: '#0a0a0f' }]}>
      <View style={styles.trustBadgesContent}>
        <View style={styles.trustBadge}>
          <IconSymbol name="checkmark.shield.fill" size={32} color="#00f5ff" />
          <Text style={styles.trustBadgeText}>COPPA Compliant</Text>
        </View>
        <View style={styles.trustBadge}>
          <IconSymbol name="lock.shield.fill" size={32} color="#00f5ff" />
          <Text style={styles.trustBadgeText}>Bank-Level Security</Text>
        </View>
        <View style={styles.trustBadge}>
          <IconSymbol name="globe" size={32} color="#00f5ff" />
          <Text style={styles.trustBadgeText}>South African Built</Text>
        </View>
        <View style={styles.trustBadge}>
          <IconSymbol name="star.fill" size={32} color="#00f5ff" />
          <Text style={styles.trustBadgeText}>5-Star Rated</Text>
        </View>
      </View>
    </View>
  );
};

// Problem/Solution Section
const ProblemSolutionSection = ({ webOptimized = false }: { webOptimized?: boolean }) => {
  return (
    <View style={styles.problemSolutionContainer}>
      <LinearGradient colors={['#0a0a0f', '#16213e']} style={styles.problemSolutionGradient}>
        <Text style={[styles.sectionTitle, { color: '#fff', marginBottom: 32 }]}>The Challenge of Modern Preschool Management</Text>
        
        <View style={styles.problemCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#64748b" />
          <Text style={styles.problemTitle}>Traditional Methods Fall Short</Text>
          <Text style={styles.problemText}>
            Paper-based tracking, inconsistent communication, limited parent visibility, manual grading, and overwhelming administrative tasks.
          </Text>
        </View>

        <View style={[styles.arrowDown, { alignSelf: 'center', marginVertical: 24 }]}>
          <IconSymbol name="arrow.down.circle.fill" size={48} color="#00f5ff" />
        </View>

        <View style={styles.solutionCard}>
          <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.solutionGradient}>
            <IconSymbol name="sparkles" size={40} color="#000" />
            <Text style={styles.solutionTitle}>EduDash Pro Solution</Text>
            <Text style={styles.solutionText}>
              Digital-first platform with real-time updates, AI-powered insights, instant parent communication, automated grading, and streamlined administration.
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};

// Dash AI Showcase Section
const DashAISection = ({ webOptimized = false }: { webOptimized?: boolean }) => {
  return (
    <View style={styles.dashAIContainer}>
      <LinearGradient colors={['#16213e', '#0f3460']} style={styles.dashAIGradient}>
        <View style={styles.dashAIContent}>
          <View style={styles.dashAIIcon}>
            <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.dashAIIconGradient}>
              <IconSymbol name="sparkles" size={48} color="#fff" />
            </LinearGradient>
          </View>
          
          <Text style={[styles.sectionTitle, { color: '#fff', marginTop: 16 }]}>Meet Dash AI</Text>
          <Text style={[styles.sectionSubtitle, { color: '#e2e8f0', marginBottom: 32 }]}>
            Your Intelligent Teaching Assistant
          </Text>

          <View style={styles.dashAIFeatures}>
            <View style={styles.dashAIFeature}>
              <IconSymbol name="doc.text.fill" size={28} color="#00f5ff" />
              <Text style={styles.dashAIFeatureTitle}>Lesson Planning</Text>
              <Text style={styles.dashAIFeatureDesc}>Generate curriculum-aligned lesson plans in seconds</Text>
            </View>
            
            <View style={styles.dashAIFeature}>
              <IconSymbol name="checkmark.circle.fill" size={28} color="#00f5ff" />
              <Text style={styles.dashAIFeatureTitle}>Auto Grading</Text>
              <Text style={styles.dashAIFeatureDesc}>Instant feedback with explainable results</Text>
            </View>
            
            <View style={styles.dashAIFeature}>
              <IconSymbol name="chart.bar.fill" size={28} color="#00f5ff" />
              <Text style={styles.dashAIFeatureTitle}>Progress Analytics</Text>
              <Text style={styles.dashAIFeatureDesc}>Identify learning gaps and celebrate wins</Text>
            </View>
            
            <View style={styles.dashAIFeature}>
              <IconSymbol name="mic.fill" size={28} color="#00f5ff" />
              <Text style={styles.dashAIFeatureTitle}>Voice Assistant</Text>
              <Text style={styles.dashAIFeatureDesc}>Hands-free classroom management with voice commands</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.dashAICTA}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Try Dash AI Free</Text>
              <IconSymbol name="arrow.right" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

// Role-Based Benefits Section
const RoleBasedBenefitsSection = ({ webOptimized = false }: { webOptimized?: boolean }) => {
  const roles = [
    {
      icon: 'person.2.fill',
      title: 'For Teachers',
      color: '#00f5ff',
      benefits: [
        'AI-powered lesson planning',
        'Automated grading & feedback',
        'Real-time progress tracking',
        'Instant parent communication',
        'CAPS curriculum alignment',
      ]
    },
    {
      icon: 'house.fill',
      title: 'For Parents',
      color: '#0080ff',
      benefits: [
        'Daily updates on child progress',
        'Direct messaging with teachers',
        'Photo & video sharing',
        'Homework tracking',
        'Event notifications',
      ]
    },
    {
      icon: 'building.2.fill',
      title: 'For Principals',
      color: '#0066cc',
      benefits: [
        'School-wide analytics dashboard',
        'Teacher performance insights',
        'Enrollment management',
        'Financial reporting',
        'Compliance tracking',
      ]
    },
  ];

  return (
    <View style={styles.roleBenefitsContainer}>
      <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.roleBenefitsGradient}>
        <Text style={styles.sectionTitle}>Built for Every Role</Text>
        <Text style={styles.sectionSubtitle}>Tailored features for teachers, parents, and administrators</Text>
        
        <View style={styles.rolesGrid}>
          {roles.map((role, index) => (
            <View key={index} style={styles.roleCard}>
              <View style={[styles.roleIconContainer, { backgroundColor: role.color + '20' }]}>
                <IconSymbol name={role.icon as any} size={40} color={role.color} />
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <View style={styles.benefitsList}>
                {role.benefits.map((benefit, idx) => (
                  <View key={idx} style={styles.benefitItem}>
                    <IconSymbol name="checkmark.circle.fill" size={18} color="#00f5ff" />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

// Pricing Preview Section
const PricingPreviewSection = ({ webOptimized = false }: { webOptimized?: boolean }) => {
  return (
    <View style={styles.pricingPreviewContainer}>
      <LinearGradient colors={['#0a0a0f', '#16213e']} style={styles.pricingPreviewGradient}>
        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Simple, Transparent Pricing</Text>
        <Text style={[styles.sectionSubtitle, { color: '#e2e8f0', marginBottom: 32 }]}>
          Choose the plan that fits your needs
        </Text>

        <View style={styles.pricingCards}>
          <View style={styles.pricingCard}>
            <Text style={styles.pricingPlan}>Free</Text>
            <Text style={styles.pricingPrice}>R0</Text>
            <Text style={styles.pricingPeriod}>forever</Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ Up to 30 students</Text>
              <Text style={styles.pricingFeature}>✓ Basic reporting</Text>
              <Text style={styles.pricingFeature}>✓ Parent communication</Text>
            </View>
          </View>

          <View style={[styles.pricingCard, styles.pricingCardFeatured]}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>MOST POPULAR</Text>
            </View>
            <Text style={styles.pricingPlan}>Pro</Text>
            <Text style={styles.pricingPrice}>R299</Text>
            <Text style={styles.pricingPeriod}>per month</Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ Unlimited students</Text>
              <Text style={styles.pricingFeature}>✓ Dash AI assistant</Text>
              <Text style={styles.pricingFeature}>✓ Advanced analytics</Text>
              <Text style={styles.pricingFeature}>✓ Priority support</Text>
            </View>
          </View>

          <View style={styles.pricingCard}>
            <Text style={styles.pricingPlan}>Enterprise</Text>
            <Text style={styles.pricingPrice}>Custom</Text>
            <Text style={styles.pricingPeriod}>contact us</Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ Multi-school management</Text>
              <Text style={styles.pricingFeature}>✓ Custom integrations</Text>
              <Text style={styles.pricingFeature}>✓ Dedicated support</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryCTA, { marginTop: 32, alignSelf: 'center' }]}
          onPress={() => router.push('/pricing')}
        >
          <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.ctaGradient}>
            <Text style={styles.ctaText}>View Full Pricing</Text>
            <IconSymbol name="arrow.right" size={20} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

// CTA Section
const CTASection = ({ webOptimized = false }: { webOptimized?: boolean }) => {
  return (
    <View style={styles.ctaSectionContainer}>
      <LinearGradient colors={['#00f5ff', '#0080ff', '#8000ff']} style={styles.ctaSectionGradient}>
        <Text style={styles.ctaSectionTitle}>Ready to Transform Your Preschool?</Text>
        <Text style={styles.ctaSectionSubtitle}>
          Join hundreds of educators using EduDash Pro to enhance learning outcomes
        </Text>
        
        <View style={styles.ctaSectionActions}>
          <TouchableOpacity
            style={styles.ctaSectionButton}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={styles.ctaSectionButtonText}>Start Free Trial</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.ctaSectionButton, styles.ctaSectionButtonSecondary]}
            onPress={() => router.push('/sales/contact')}
          >
            <Text style={[styles.ctaSectionButtonText, { color: '#fff' }]}>Book a Demo</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.ctaSectionNote}>No credit card required • 14-day free trial</Text>
      </LinearGradient>
    </View>
  );
};

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ setSelectedFeature }) => {
  const features = featuresContent;
  return (
    <View style={styles.featuresContainer}>
      <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.featuresGradient}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        <Text style={styles.sectionSubtitle}>Everything you need to run your preschool efficiently</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity key={feature.id} style={styles.featureCard} onPress={() => setSelectedFeature(feature)}>
              <LinearGradient colors={DesignSystem.gradients.surfaceCard as [ColorValue, ColorValue]} style={styles.featureGradient}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                {feature.tech ? (
                  <View style={styles.featureTech}>
                    <Text style={styles.featureTechText}>{feature.tech}</Text>
                  </View>
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ activeTestimonial, setActiveTestimonial }) => {
  const testimonials = require('@/constants/marketing').testimonialsContent as typeof import('@/constants/marketing').testimonialsContent;
  const isDesktopView = width >= (DesignSystem.breakpoints?.lg ?? 1024);

  useEffect(() => {
    if (isDesktopView) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isDesktopView]);

  const TestimonialCard = ({ index }: { index: number }) => (
    <View style={styles.testimonialCard}>
      <LinearGradient colors={DesignSystem.gradients.surfaceCard as [ColorValue, ColorValue]} style={styles.testimonialGradient}>
        <View style={styles.testimonialHeader}>
          <View style={styles.avatarContainer}>
            <Avatar name={testimonials[index].name} imageUri={testimonials[index].imageUri} size={50} />
          </View>
          <View style={styles.testimonialInfo}>
            <Text style={styles.testimonialName}>{testimonials[index].name}</Text>
            <Text style={styles.testimonialRole}>{testimonials[index].role}</Text>
            <Text style={styles.testimonialSchool}>{testimonials[index].org}</Text>
          </View>
        </View>
        <Text style={styles.testimonialMessage}>"{testimonials[index].message}"</Text>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.testimonialsContainer}>
      <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.testimonialsGradient}>
        <Text style={styles.sectionTitle}>What Educators Say</Text>
        <Text style={styles.sectionSubtitle}>Trusted by preschools across South Africa</Text>
        <View style={{ flex: 1 }}>
          <TestimonialCard index={activeTestimonial} />
          <View style={styles.testimonialDots}>
            {testimonials.map((_: any, index: number) => (
              <TouchableOpacity key={index} style={[styles.dot, index === activeTestimonial && styles.activeDot]} onPress={() => setActiveTestimonial(index)} />
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const QASection: React.FC<QASectionProps> = () => {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const qaData = [
    { question: 'How does the AI assistance work?', answer: 'Our AI tools run securely on the server with strict privacy and COPPA compliance. No child data is used for AI training.' },
    { question: 'Is it safe for preschool children?', answer: 'Yes. EduDash Pro is designed specifically for ages 3-6 with parental consent, data minimization, and child-directed advertising restrictions.' },
    { question: 'Do I need technical skills to use it?', answer: 'No technical skills required. Our platform is designed to be intuitive for teachers, parents, and administrators with no prior tech experience.' },
  ];
  return (
    <View style={styles.qaContainer}>
      <LinearGradient colors={['#0f3460', '#533a71']} style={styles.qaGradient}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Text style={styles.sectionSubtitle}>Common questions about EduDash Pro</Text>
        <View style={styles.qaList}>
          {qaData.map((item, index) => (
            <TouchableOpacity key={index} style={styles.qaItem} onPress={() => setSelectedQuestion(selectedQuestion === index ? null : index)}>
              <LinearGradient colors={selectedQuestion === index ? ['rgba(0,245,255,0.2)', 'rgba(128,0,255,0.2)'] : ['rgba(0,245,255,0.05)', 'rgba(128,0,255,0.05)']} style={styles.qaItemGradient}>
                <View style={styles.qaHeader}>
                  <Text style={styles.qaQuestion}>{item.question}</Text>
                  <IconSymbol name={selectedQuestion === index ? 'chevron.up' : 'chevron.down'} size={20} color="#00f5ff" />
                </View>
                {selectedQuestion === index && <Text style={styles.qaAnswer}>{item.answer}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const FeatureModal: React.FC<FeatureModalProps> = ({ selectedFeature, setSelectedFeature }) => {
  if (!selectedFeature) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedFeature(null)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient colors={selectedFeature.color} style={styles.modalGradient}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedFeature(null)}>
              <IconSymbol name="xmark" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedFeature.title}</Text>
            <Text style={styles.modalSubtitle}>{selectedFeature.subtitle}</Text>
            <Text style={styles.modalDescription}>{selectedFeature.description}</Text>
            <Text style={styles.modalTech}>Technology: {selectedFeature.tech}</Text>
            <TouchableOpacity style={styles.tryFeatureButton} onPress={() => setSelectedFeature(null)}>
              <Text style={styles.tryFeatureText}>ACTIVATE FEATURE</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const FooterSection = () => {
  const handleLegalNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <View style={styles.footerContainer}>
      <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.footerGradient}>
        <View style={styles.footerContent}>
          <View style={styles.footerLogo}>
            <LinearGradient colors={['#00f5ff', '#8000ff']} style={styles.footerLogoGradient}>
              <IconSymbol name="help-circle" size={32} color="#000000" />
            </LinearGradient>
            <Text style={styles.footerLogoText}>EduDash Pro</Text>
            <Text style={styles.footerLogoSubtext}>AI-Powered Education Platform</Text>
          </View>

          {/* Legal Links */}
          <View style={styles.footerLinks}>
            <Link href="/privacy-policy" asChild>
              <Pressable
                onPress={() => handleLegalNavigation('/privacy-policy')}
                style={({ pressed }) => [
                  styles.footerLink,
                  pressed && styles.footerLinkPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
              >
                <Text style={styles.footerLinkText}>Privacy Policy</Text>
              </Pressable>
            </Link>

            <View style={styles.footerLinkDivider} />

            <Link href="/terms-of-service" asChild>
              <Pressable
                onPress={() => handleLegalNavigation('/terms-of-service')}
                style={({ pressed }) => [
                  styles.footerLink,
                  pressed && styles.footerLinkPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
              >
                <Text style={styles.footerLinkText}>Terms of Service</Text>
              </Pressable>
            </Link>
          </View>

          {/* Copyright */}
          <Text style={styles.footerCopyright}>
            © 2025 EduDash Pro. All rights reserved.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DesignSystem.colors.background },
  loadingContainer: {
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00f5ff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  heroContainer: { minHeight: Math.max(600, height * 0.9) },
  heroGradient: { flex: 1, position: 'relative' },
  heroContent: { flex: 1, zIndex: 2, paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg },
  navbar: { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: isSmall ? 12 : 16, marginBottom: isSmall ? 28 : 32 },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: DesignSystem.colors.text.primary, marginRight: 6 },
  logoSubtext: { fontSize: 12, color: DesignSystem.colors.text.quantum, fontWeight: '600' },
  accessButton: { borderRadius: 25, overflow: 'hidden', marginTop: 10 },
  accessGradient: { paddingHorizontal: isSmall ? 16 : 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  accessButtonText: { fontSize: 16, fontWeight: '700', color: '#000000', marginRight: 8 },
  heroTextContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg, paddingTop: isSmall ? 6 : 10 },
  heroTitle: { alignItems: 'center', marginBottom: isSmall ? 24 : 32 },
  heroMainTitle: { fontSize: isSmall ? 28 : 36, fontWeight: '900', textAlign: 'center', color: DesignSystem.colors.text.primary, marginBottom: 12, lineHeight: isSmall ? 32 : 42 },
  gradientTextPrimary: { color: DesignSystem.colors.text.quantum },
  gradientTextSecondary: { color: DesignSystem.colors.secondary },
  heroSubtitle: { fontSize: isSmall ? 15 : 17, color: DesignSystem.colors.text.secondary, textAlign: 'center', lineHeight: isSmall ? 21 : 24, maxWidth: 420, marginTop: 6 },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: isSmall ? 24 : 32, 
    width: '100%',
    paddingHorizontal: DesignSystem.spacing.md,
  },
  statCard: { 
    alignItems: 'center', 
    flex: 1,
    paddingVertical: 16,
  },
  statNumber: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: DesignSystem.colors.text.primary, 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 12, 
    color: DesignSystem.colors.text.secondary, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  heroActions: { width: '100%', alignItems: 'center' },
  primaryCTA: { borderRadius: 30, overflow: 'hidden', marginBottom: 14, width: 'auto' },
  ctaGradient: { paddingHorizontal: isSmall ? 20 : 28, paddingVertical: isSmall ? 12 : 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: isSmall ? 15 : 16, fontWeight: '800', color: '#000000', marginLeft: 8, letterSpacing: 0.5 },
  secondaryCTANew: { 
    marginTop: 16, 
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryCtaTextNew: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: DesignSystem.colors.text.secondary,
    textDecorationLine: 'underline',
  },
  featuresContainer: { },
  featuresGradient: { paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg, paddingVertical: isSmall ? 24 : 36, justifyContent: 'center' },
  sectionTitle: { fontSize: isSmall ? 26 : 32, fontWeight: '900', color: DesignSystem.colors.text.primary, textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  sectionSubtitle: { fontSize: 14, color: DesignSystem.colors.text.quantum, textAlign: 'center', marginBottom: isSmall ? 18 : 24, fontWeight: '600' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: isSmall ? 12 : 16 },
  featureCard: { width: width < 480 ? width - 48 : (width - 80) / 2, borderRadius: 20, overflow: 'hidden', marginBottom: isSmall ? 14 : 18 },
  featureGradient: { padding: isSmall ? 16 : 18, minHeight: 140, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16 },
  featureTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  featureSubtitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  featureDescription: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 10 },
  featureTech: { marginTop: 'auto' },
  featureTechText: { fontSize: 12, color: '#6B7280', fontWeight: '600', fontStyle: 'italic' },
  testimonialsContainer: { },
  testimonialsGradient: { paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg, paddingVertical: isSmall ? 24 : 36, justifyContent: 'center' },
  testimonialCard: { marginHorizontal: isSmall ? 16 : 20, borderRadius: 20, overflow: 'hidden' },
  testimonialGradient: { padding: isSmall ? 18 : 22 },
  testimonialHeader: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  avatarContainer: { position: 'relative', alignItems: 'center' },
  testimonialInfo: { flex: 1, alignItems: 'flex-start' },
  testimonialName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  testimonialRole: { fontSize: 13, color: DesignSystem.colors.text.quantum, marginBottom: 2 },
  testimonialSchool: { fontSize: 12, color: '#6B7280' },
  testimonialMessage: { fontSize: 15, color: '#374151', lineHeight: 21, marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },
  testimonialDots: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  activeDot: { backgroundColor: DesignSystem.colors.text.quantum },
  qaContainer: { },
  qaGradient: { paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg, paddingVertical: isSmall ? 24 : 32, justifyContent: 'center' },
  qaList: { gap: isSmall ? 8 : 12 },
  qaItem: { borderRadius: 15, overflow: 'hidden' },
  qaItemGradient: { padding: isSmall ? 16 : 20 },
  qaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qaQuestion: { fontSize: 15, fontWeight: '700', color: DesignSystem.colors.text.primary, flex: 1, marginRight: 10 },
  qaAnswer: { fontSize: 13, color: DesignSystem.colors.text.secondary, lineHeight: 19, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: DesignSystem.spacing.lg },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 25, overflow: 'hidden' },
  modalGradient: { padding: 26, position: 'relative' },
  closeButton: { position: 'absolute', top: 12, right: 12, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15, padding: 8 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#000000', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 15, fontWeight: '600', color: 'rgba(0,0,0,0.8)', textAlign: 'center', marginBottom: 12 },
  modalDescription: { fontSize: 13, color: 'rgba(0,0,0,0.7)', textAlign: 'center', lineHeight: 19, marginBottom: 12 },
  modalTech: { fontSize: 12, color: 'rgba(0,0,0,0.6)', textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  tryFeatureButton: { backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 14, borderRadius: 25 },
  tryFeatureText: { fontSize: 15, fontWeight: '800', color: '#000000', textAlign: 'center', letterSpacing: 0.5 },
  footerContainer: { paddingTop: 32, paddingBottom: 12 },
  footerGradient: { paddingHorizontal: isSmall ? DesignSystem.spacing.md : DesignSystem.spacing.lg },
  footerContent: { alignItems: 'center' },
  footerLogo: { alignItems: 'center', marginBottom: 24 },
  footerLogoGradient: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  footerLogoText: { fontSize: 26, fontWeight: '900', color: DesignSystem.colors.text.primary, marginBottom: 4 },
  footerLogoSubtext: { fontSize: 13, color: DesignSystem.colors.text.quantum, fontWeight: '600' },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 16,
  },
  footerLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    }),
  },
  footerLinkPressed: {
    opacity: 0.6,
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: DesignSystem.colors.text.secondary,
    textDecorationLine: 'underline',
    ...(Platform.OS === 'web' && {
      ':hover': {
        color: DesignSystem.colors.text.primary,
      },
    }),
  },
  footerLinkDivider: {
    width: 1,
    height: 16,
    backgroundColor: DesignSystem.colors.text.secondary,
    opacity: 0.3,
  },
  footerCopyright: {
    fontSize: 12,
    color: DesignSystem.colors.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  // Web-specific styles
  accessButtonWeb: { borderRadius: 8 },
  accessGradientWeb: { paddingHorizontal: 24, paddingVertical: 14 },
  accessButtonTextWeb: { fontSize: 14 },
  heroTextContainerWeb: { maxWidth: 800, alignSelf: 'center' },
  heroTitleWeb: { marginBottom: 32 },
  heroMainTitleWeb: { fontSize: 48, lineHeight: 56 },
  heroTaglineWeb: { fontSize: 16, marginBottom: 16 },
  heroSubtitleWeb: { fontSize: 18, lineHeight: 26, maxWidth: 600 },
  
  // Trust Badges
  trustBadgesContainer: { paddingVertical: 32, paddingHorizontal: 16 },
  trustBadgesContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 16 },
  trustBadge: { alignItems: 'center', flex: 1, minWidth: 120, paddingVertical: 12 },
  trustBadgeText: { fontSize: 11, fontWeight: '700', color: '#e2e8f0', marginTop: 8, textAlign: 'center' },
  
  // Problem/Solution
  problemSolutionContainer: { marginVertical: 0 },
  problemSolutionGradient: { paddingVertical: 48, paddingHorizontal: 20 },
  problemCard: { backgroundColor: 'rgba(100,116,139,0.15)', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  problemTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  problemText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22, textAlign: 'center' },
  arrowDown: {},
  solutionCard: { borderRadius: 20, overflow: 'hidden' },
  solutionGradient: { padding: 24, alignItems: 'center' },
  solutionTitle: { fontSize: 22, fontWeight: '900', color: '#000', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  solutionText: { fontSize: 14, color: '#000', lineHeight: 22, textAlign: 'center', opacity: 0.8 },
  
  // Dash AI Section
  dashAIContainer: { marginVertical: 0 },
  dashAIGradient: { paddingVertical: 56, paddingHorizontal: 20 },
  dashAIContent: { alignItems: 'center' },
  dashAIIcon: { marginBottom: 8 },
  dashAIIconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  dashAIFeatures: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 32 },
  dashAIFeature: { width: (width - 64) / 2, minWidth: 140, backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, alignItems: 'center' },
  dashAIFeatureTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4, textAlign: 'center' },
  dashAIFeatureDesc: { fontSize: 12, color: '#e2e8f0', textAlign: 'center', lineHeight: 18 },
  dashAICTA: { borderRadius: 30, overflow: 'hidden' },
  
  // Role Benefits
  roleBenefitsContainer: { marginVertical: 0 },
  roleBenefitsGradient: { paddingVertical: 48, paddingHorizontal: 20 },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  roleCard: { width: width < 768 ? width - 48 : (width - 80) / 3, maxWidth: 320, backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center' },
  roleIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  roleTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  benefitsList: { width: '100%', gap: 8 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  
  // Pricing Preview
  pricingPreviewContainer: { marginVertical: 0 },
  pricingPreviewGradient: { paddingVertical: 56, paddingHorizontal: 20 },
  pricingCards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 16 },
  pricingCard: { width: width < 768 ? width - 48 : 260, backgroundColor: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pricingCardFeatured: { backgroundColor: 'rgba(0,245,255,0.15)', borderColor: '#00f5ff', borderWidth: 2, transform: [{ scale: isWeb && isDesktop ? 1.05 : 1 }] },
  featuredBadge: { position: 'absolute', top: -12, backgroundColor: '#00f5ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  featuredBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },
  pricingPlan: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8, marginTop: 8 },
  pricingPrice: { fontSize: 36, fontWeight: '900', color: '#fff' },
  pricingPeriod: { fontSize: 12, color: '#e2e8f0', marginBottom: 20 },
  pricingFeatures: { gap: 8, alignSelf: 'stretch' },
  pricingFeature: { fontSize: 13, color: '#e2e8f0', textAlign: 'left' },
  
  // CTA Section
  ctaSectionContainer: { marginVertical: 0 },
  ctaSectionGradient: { paddingVertical: 64, paddingHorizontal: 24, alignItems: 'center' },
  ctaSectionTitle: { fontSize: 32, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 12 },
  ctaSectionSubtitle: { fontSize: 16, color: '#000', textAlign: 'center', marginBottom: 32, opacity: 0.8, maxWidth: 500 },
  ctaSectionActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 16 },
  ctaSectionButton: { backgroundColor: '#000', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  ctaSectionButtonSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#000' },
  ctaSectionButtonText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  ctaSectionNote: { fontSize: 12, color: '#000', opacity: 0.7, textAlign: 'center', marginTop: 8 },
});
