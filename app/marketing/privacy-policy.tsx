import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Privacy Policy</Text>
      <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
      
      <View style={styles.card}>
        <Text style={styles.h2}>1. About EduDash Pro</Text>
        <Text style={styles.p}>
          EduDash Pro is an AI-powered educational platform designed for preschools, teachers, parents, and children. 
          We are committed to protecting the privacy and safety of all users, especially children under 13 years of age.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Contact Information:</Text>{'\n'}
          EduDash Pro Team{'\n'}
          Email: support@edudashpro.com{'\n'}
          Website: https://www.edudashpro.org.za
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>2. Children's Privacy (COPPA Compliance)</Text>
        <Text style={styles.p}>
          We comply with the Children's Online Privacy Protection Act (COPPA) and take special care to protect children under 13.
        </Text>
        <Text style={styles.h3}>Information We Collect from Children:</Text>
        <Text style={styles.li}>• First name and grade level (for educational tracking)</Text>
        <Text style={styles.li}>• Learning progress and activity completion (for educational purposes)</Text>
        <Text style={styles.li}>• Creative work and submissions (with school/parent permission)</Text>
        
        <Text style={styles.h3}>We Do NOT Collect from Children:</Text>
        <Text style={styles.li}>• Full names, addresses, or phone numbers</Text>
        <Text style={styles.li}>• Photos or videos without explicit consent</Text>
        <Text style={styles.li}>• Location data or device identifiers</Text>
        <Text style={styles.li}>• Personal communications outside school context</Text>

        <Text style={styles.h3}>Parental Rights:</Text>
        <Text style={styles.li}>• Review your child's information</Text>
        <Text style={styles.li}>• Request deletion of your child's data</Text>
        <Text style={styles.li}>• Refuse further collection or use</Text>
        <Text style={styles.li}>• Contact us at support@edudashpro.com to exercise these rights</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>3. Information We Collect</Text>
        
        <Text style={styles.h3}>From Educational Staff (Teachers, Principals):</Text>
        <Text style={styles.li}>• Name, email, and professional role</Text>
        <Text style={styles.li}>• School affiliation and class assignments</Text>
        <Text style={styles.li}>• Lesson plans and educational content created</Text>
        <Text style={styles.li}>• Communication with parents and colleagues</Text>
        
        <Text style={styles.h3}>From Parents/Guardians:</Text>
        <Text style={styles.li}>• Name, email, and relationship to child</Text>
        <Text style={styles.li}>• Communication preferences</Text>
        <Text style={styles.li}>• Messages with teachers and school staff</Text>
        
        <Text style={styles.h3}>Technical Information (All Users):</Text>
        <Text style={styles.li}>• Device type and operating system (for app functionality)</Text>
        <Text style={styles.li}>• Usage analytics (aggregated and anonymized)</Text>
        <Text style={styles.li}>• Error logs (for app improvement)</Text>
        <Text style={styles.li}>• IP addresses (temporarily, for security)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>4. How We Use Information</Text>
        
        <Text style={styles.h3}>Educational Purposes:</Text>
        <Text style={styles.li}>• Provide personalized learning experiences</Text>
        <Text style={styles.li}>• Track student progress and achievements</Text>
        <Text style={styles.li}>• Generate AI-powered lesson suggestions</Text>
        <Text style={styles.li}>• Facilitate parent-teacher communication</Text>
        
        <Text style={styles.h3}>Platform Operation:</Text>
        <Text style={styles.li}>• Maintain user accounts and access control</Text>
        <Text style={styles.li}>• Provide customer support</Text>
        <Text style={styles.li}>• Improve app functionality and user experience</Text>
        <Text style={styles.li}>• Ensure platform security and prevent abuse</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>5. Information Sharing</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>We do NOT sell personal information.</Text> We only share information in these limited circumstances:
        </Text>
        
        <Text style={styles.h3}>Within Educational Context:</Text>
        <Text style={styles.li}>• Teachers can view their students' progress</Text>
        <Text style={styles.li}>• Parents can view their own children's activities</Text>
        <Text style={styles.li}>• School administrators can access school-wide data</Text>
        
        <Text style={styles.h3}>Service Providers (with strict privacy agreements):</Text>
        <Text style={styles.li}>• Supabase (database hosting) - GDPR compliant</Text>
        <Text style={styles.li}>• Sentry (error monitoring) - privacy-focused</Text>
        <Text style={styles.li}>• Google AdMob (family-safe ads only)</Text>
        
        <Text style={styles.h3}>Legal Requirements:</Text>
        <Text style={styles.li}>• When required by law or to protect safety</Text>
        <Text style={styles.li}>• To protect our rights or property</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>6. Data Security</Text>
        <Text style={styles.p}>We implement industry-standard security measures:</Text>
        <Text style={styles.li}>• Encrypted data transmission (SSL/HTTPS)</Text>
        <Text style={styles.li}>• Secure database storage with access controls</Text>
        <Text style={styles.li}>• Regular security audits and updates</Text>
        <Text style={styles.li}>• Staff training on data protection</Text>
        <Text style={styles.li}>• Two-factor authentication for sensitive accounts</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>7. Data Retention</Text>
        <Text style={styles.li}>• Student data: Retained while enrolled, deleted upon request or graduation</Text>
        <Text style={styles.li}>• Educational content: Retained for institutional purposes unless deletion requested</Text>
        <Text style={styles.li}>• Account data: Retained while account is active</Text>
        <Text style={styles.li}>• Technical logs: Automatically deleted after 90 days</Text>
        <Text style={styles.li}>• Billing records: Retained as required by law (typically 7 years)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>8. Your Rights (GDPR Compliance)</Text>
        <Text style={styles.p}>Under GDPR and other privacy laws, you have the right to:</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Access:</Text> Request a copy of your data</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Rectification:</Text> Correct inaccurate information</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Erasure:</Text> Request deletion of your data</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Portability:</Text> Receive your data in a portable format</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Objection:</Text> Object to processing for certain purposes</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Restriction:</Text> Limit how we use your data</Text>
        
        <Text style={styles.p}>
          To exercise these rights, use our in-app deletion tools or contact support@edudashpro.com
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>9. Advertising and Third-Party Services</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Family-Safe Advertising:</Text> We only show age-appropriate, educational advertisements through Google AdMob's family-safe program.
        </Text>
        <Text style={styles.li}>• No personalized ads for users under 13</Text>
        <Text style={styles.li}>• No behavioral tracking for advertising</Text>
        <Text style={styles.li}>• Content reviewed for educational appropriateness</Text>
        <Text style={styles.li}>• Parents can request ad-free experience through premium subscriptions</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>10. International Data Transfers</Text>
        <Text style={styles.p}>
          Our primary servers are located in secure, GDPR-compliant data centers. 
          When data is transferred internationally, we ensure adequate protection through:
        </Text>
        <Text style={styles.li}>• Standard Contractual Clauses (SCCs)</Text>
        <Text style={styles.li}>• Adequacy decisions where available</Text>
        <Text style={styles.li}>• Additional safeguards for children's data</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>11. Updates to This Policy</Text>
        <Text style={styles.p}>
          We may update this privacy policy to reflect changes in our practices or legal requirements. 
          We will notify users of material changes through:
        </Text>
        <Text style={styles.li}>• In-app notifications</Text>
        <Text style={styles.li}>• Email alerts to registered users</Text>
        <Text style={styles.li}>• Posted updates on our website</Text>
        
        <Text style={styles.p}>
          For changes affecting children's privacy, we will seek additional parental consent where required by law.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>12. Data Deletion</Text>
        <Text style={styles.p}>You can request data deletion through:</Text>
        <Text style={styles.li}>• In-app: Settings → Security & Privacy → "Request data deletion"</Text>
        <Text style={styles.li}>• Web: <Text style={styles.link} onPress={() => Linking.openURL('https://www.edudashpro.org.za/marketing/data-deletion')}>Data Deletion Page</Text></Text>
        <Text style={styles.li}>• Email: support@edudashpro.com</Text>
        
        <Text style={styles.p}>
          For account deletion: <Text style={styles.link} onPress={() => Linking.openURL('https://www.edudashpro.org.za/marketing/account-deletion')}>Account Deletion Page</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>13. Contact Us</Text>
        <Text style={styles.p}>
          For privacy-related questions, concerns, or requests:
        </Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Email:</Text> support@edudashpro.com{'\n'}
          <Text style={styles.strong}>Subject Line:</Text> Privacy Inquiry{'\n'}
          <Text style={styles.strong}>Response Time:</Text> Within 48 hours for privacy concerns
        </Text>
        
        <Text style={styles.p}>
          <Text style={styles.strong}>For COPPA-related requests (children under 13):</Text>{'\n'}
          Email: support@edudashpro.com{'\n'}
          Subject: "COPPA Request - [Child's First Name]"
        </Text>
      </View>

      <Text style={styles.footer}>
        © {new Date().getFullYear()} EduDash Pro. This privacy policy is designed to comply with COPPA, GDPR, 
        and other applicable privacy laws. We are committed to protecting your privacy and the safety of children using our platform.
      </Text>
    </ScrollView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme?.background || '#0b1220' },
    content: { padding: 20, paddingBottom: 40 },
    h1: { fontSize: 28, fontWeight: '700', color: theme?.text || '#fff', marginBottom: 8 },
    h2: { fontSize: 20, fontWeight: '600', color: theme?.text || '#fff', marginBottom: 8, marginTop: 8 },
    h3: { fontSize: 16, fontWeight: '600', color: theme?.primary || '#00f5ff', marginTop: 12, marginBottom: 4 },
    lastUpdated: { color: theme?.textSecondary || '#9ca3af', fontSize: 14, marginBottom: 20 },
    p: { color: theme?.text || '#e5e7eb', lineHeight: 22, marginBottom: 8 },
    li: { color: theme?.text || '#e5e7eb', lineHeight: 20, marginBottom: 4, marginLeft: 8 },
    strong: { fontWeight: '700', color: theme?.primary || '#00f5ff' },
    card: {
      backgroundColor: theme?.surface || '#111827',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme?.divider || '#1f2937',
    },
    link: { color: theme?.primary || '#00f5ff', textDecorationLine: 'underline' },
    footer: { 
      color: theme?.textSecondary || '#9ca3af', 
      marginTop: 24, 
      fontSize: 12, 
      lineHeight: 16,
      fontStyle: 'italic' 
    },
  });