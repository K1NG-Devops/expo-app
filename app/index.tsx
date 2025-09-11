import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Modal,
  ColorValue,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DesignSystem, getRoleColors } from '@/constants/DesignSystem';
import { Avatar } from '@/components/ui/Avatar';
import AdBanner from '@/components/ui/AdBanner';
import { featuresContent, testimonialsContent } from '@/constants/marketing';

const { width, height } = Dimensions.get('window');
const isSmall = width < 400;
const isMedium = width < 600;

interface HoloStatCardProps {
  icon: string;
  number: string;
  label: string;
  color: readonly ColorValue[];
}

interface FeaturesSectionProps {
  setSelectedFeature: (feature: any) => void;
}

interface TestimonialsSectionProps {
  activeTestimonial: number;
  setActiveTestimonial: (index: number | ((prev: number) => number)) => void;
}

interface QASectionProps {
  showQA: boolean;
  setShowQA: (show: boolean) => void;
}

interface FeatureModalProps {
  selectedFeature: any;
  setSelectedFeature: (feature: any) => void;
}

export default function Landing() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [showQA, setShowQA] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate a lightweight refresh (e.g., refetch marketing content later)
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  useEffect(() => {
    // If a session exists, route to the appropriate dashboard
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase!.auth.getSession();
        if (data.session) {
          router.replace('/profiles-gate');
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}
        >
          <HeroSection />
          <FeaturesSection setSelectedFeature={setSelectedFeature} />
          <TestimonialsSection activeTestimonial={activeTestimonial} setActiveTestimonial={setActiveTestimonial} />
          <QASection showQA={showQA} setShowQA={setShowQA} />
          <AdBanner />
          <FooterSection />
        </ScrollView>
      </SafeAreaView>

      <FeatureModal selectedFeature={selectedFeature} setSelectedFeature={setSelectedFeature} />
    </View>
  );
}

const HeroSection = () => {
  const floatingY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingY, { toValue: isSmall ? -12 : -20, duration: 2000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatingY, { toValue: 0, duration: 2000, useNativeDriver: Platform.OS !== 'web' }),
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
                <IconSymbol name="brain" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.logoText}>EduDash Pro</Text>
              <Text style={styles.logoSubtext}>Society 5.0</Text>
            </View>
            <TouchableOpacity style={styles.accessButton} onPress={() => router.push('/(auth)/sign-in')}>
              <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.accessGradient}>
                <Text style={styles.accessButtonText}>Neural Access</Text>
                <IconSymbol name="arrow.right" size={16} color="#000000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.heroTextContainer}>
            <Animated.View style={[styles.heroTitle, { transform: [{ translateY: floatingY }] }]}>
              <Text style={styles.heroMainTitle}>
                <Text style={styles.gradientTextPrimary}>NEURAL</Text> EDUCATION{String.fromCharCode(10)}
                <Text style={styles.gradientTextSecondary}>REVOLUTION</Text>
              </Text>
              <Text style={styles.heroTagline}>🚀 Society 5.0 • AI • Robotics • Virtual Reality • Quantum Learning</Text>
              <Text style={styles.heroSubtitle}>
                The convergence of artificial intelligence, quantum computing, and neural networks creates the ultimate
                educational ecosystem for the super-human digital age.
              </Text>
            </Animated.View>

            <View style={styles.holoStats}>
              <HoloStatCard icon="cpu" number="∞" label="AI Neurons" color={['#00f5ff', '#0080ff']} />
              <HoloStatCard icon="brain" number="5.0" label="Society" color={['#8000ff', '#ff0080']} />
              <HoloStatCard icon="sparkles" number="∞²" label="Possibilities" color={['#ff0080', '#ff8000']} />
            </View>

          <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryCTA} onPress={() => router.push('/(auth)/sign-up')}>
                <LinearGradient colors={['#00f5ff', '#0080ff', '#8000ff']} style={styles.ctaGradient}>
                  <IconSymbol name="bolt" size={20} color="#000000" />
                  <Text style={styles.ctaText}>ACTIVATE NEURAL LINK</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryCTA} onPress={() => router.push('/(auth)/sign-in')}>
                <LinearGradient colors={['rgba(0,245,255,0.1)', 'rgba(0,128,255,0.1)']} style={styles.secondaryGradient}>
                  <Text style={styles.secondaryCtaText}>Access Portal</Text>
                  <IconSymbol name="arrow.right" size={16} color="#00f5ff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tertiaryCTA} onPress={() => router.push('/sales/contact?plan=enterprise')}>
                <LinearGradient colors={['rgba(255,128,0,0.12)', 'rgba(255,0,128,0.08)']} style={styles.tertiaryGradient}>
                  <Text style={styles.tertiaryCtaText}>Contact Sales</Text>
                  <IconSymbol name="arrow.right" size={16} color="#ff8000" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const HoloStatCard: React.FC<HoloStatCardProps> = ({ icon, number, label, color }) => (
  <View style={styles.holoCard}>
    <LinearGradient colors={color as readonly [string, string, ...string[]]} style={styles.holoCardGradient}>
      <IconSymbol name={icon} size={24} color="#000000" />
      <Text style={styles.holoNumber}>{number}</Text>
      <Text style={styles.holoLabel}>{label}</Text>
    </LinearGradient>
  </View>
);

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ setSelectedFeature }) => {
  const features = featuresContent;
  return (
    <View style={styles.featuresContainer}>
      <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.featuresGradient}>
        <Text style={styles.sectionTitle}>Revolutionary Tech</Text>
        <Text style={styles.sectionSubtitle}>Powered by Society 5.0 • AI • Neural Networks</Text>
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
  const isDesktop = width >= (DesignSystem.breakpoints?.lg ?? 1024);

  useEffect(() => {
    if (isDesktop) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isDesktop]);

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
        <Text style={styles.sectionTitle}>Neural Testimonials</Text>
        <Text style={styles.sectionSubtitle}>From the educators using tomorrow's technology today</Text>
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

const QASection: React.FC<QASectionProps> = ({ showQA, setShowQA }) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const qaData = [
    { question: 'How does the Quantum AI Brain work?', answer: 'Server-side AI with strict privacy and compliance.' },
    { question: 'Is the Neural Interface safe for children?', answer: 'Yes — child safety and privacy first.' },
  ];
  return (
    <View style={styles.qaContainer}>
      <LinearGradient colors={['#0f3460', '#533a71']} style={styles.qaGradient}>
        <Text style={styles.sectionTitle}>NEURAL Q&A</Text>
        <Text style={styles.sectionSubtitle}>Quantum answers to key questions</Text>
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

const FooterSection = () => (
  <View style={styles.footerContainer}>
    <LinearGradient colors={DesignSystem.gradients.professionalSubtle as [ColorValue, ColorValue]} style={styles.footerGradient}>
      <View style={styles.footerContent}>
        <View style={styles.footerLogo}>
          <LinearGradient colors={['#00f5ff', '#8000ff']} style={styles.footerLogoGradient}>
            <IconSymbol name="brain" size={32} color="#000000" />
          </LinearGradient>
          <Text style={styles.footerLogoText}>EduDash Pro</Text>
          <Text style={styles.footerLogoSubtext}>AI-Powered Education Platform</Text>
        </View>
      </View>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DesignSystem.colors.background },
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
  heroTagline: { fontSize: 13, color: DesignSystem.colors.text.quantum, textAlign: 'center', marginBottom: 12, fontWeight: '600', letterSpacing: 0.5 },
  heroSubtitle: { fontSize: isSmall ? 15 : 17, color: DesignSystem.colors.text.secondary, textAlign: 'center', lineHeight: isSmall ? 21 : 24, maxWidth: 420, marginTop: 6 },
  holoStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: isSmall ? 18 : 28, width: '100%' },
  holoCard: { alignItems: 'center', flex: 1 },
  holoCardGradient: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, alignItems: 'center', minWidth: 80 },
  holoNumber: { fontSize: 22, fontWeight: '900', color: '#000000', marginVertical: 4 },
  holoLabel: { fontSize: 12, color: '#000000', fontWeight: '600', textAlign: 'center' },
  heroActions: { width: '100%', alignItems: 'center' },
  primaryCTA: { borderRadius: 30, overflow: 'hidden', marginBottom: 14, width: 'auto' },
  ctaGradient: { paddingHorizontal: isSmall ? 20 : 28, paddingVertical: isSmall ? 12 : 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: isSmall ? 15 : 16, fontWeight: '800', color: '#000000', marginLeft: 8, letterSpacing: 0.5 },
  secondaryCTA: { borderRadius: 30, overflow: 'hidden', width: 'auto' },
  secondaryGradient: { paddingHorizontal: isSmall ? 20 : 28, paddingVertical: isSmall ? 12 : 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#00e5ff', borderRadius: 30, backgroundColor: 'rgba(0,229,255,0.05)' },
  secondaryCtaText: { fontSize: isSmall ? 14 : 15, fontWeight: '700', color: '#00e5ff', marginRight: 8 },
  tertiaryCTA: { borderRadius: 30, overflow: 'hidden', width: 'auto', marginTop: 12 },
  tertiaryGradient: { paddingHorizontal: isSmall ? 20 : 28, paddingVertical: isSmall ? 12 : 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ff8000', borderRadius: 30, backgroundColor: 'rgba(255,128,0,0.06)' },
  tertiaryCtaText: { fontSize: isSmall ? 14 : 15, fontWeight: '700', color: '#ff8000', marginRight: 8 },
  featuresContainer: {},
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
  testimonialsContainer: {},
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
  qaContainer: {},
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
});
