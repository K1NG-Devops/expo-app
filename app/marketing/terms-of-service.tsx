import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function TermsOfServicePage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Terms of Service</Text>
      <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
      
      <View style={styles.card}>
        <Text style={styles.h2}>1. Acceptance of Terms</Text>
        <Text style={styles.p}>
          By accessing or using EduDash Pro ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
          If you disagree with any part of these terms, you may not access the Service.
        </Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>For Educational Institutions:</Text> By using this Service, you represent that you have 
          the authority to bind your institution to these Terms and have obtained any necessary permissions to use the Service 
          with students under 13 years of age in compliance with COPPA.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>2. Description of Service</Text>
        <Text style={styles.p}>
          EduDash Pro is an AI-powered educational platform designed for preschools, providing:
        </Text>
        <Text style={styles.li}>• Learning management and progress tracking</Text>
        <Text style={styles.li}>• AI-generated educational content and lesson plans</Text>
        <Text style={styles.li}>• Parent-teacher communication tools</Text>
        <Text style={styles.li}>• Student activity and assignment management</Text>
        <Text style={styles.li}>• Educational analytics and reporting</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>3. User Accounts and Roles</Text>
        
        <Text style={styles.h3}>Account Types:</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Educational Staff:</Text> Teachers, principals, administrators</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Parents/Guardians:</Text> Legal guardians of enrolled students</Text>
        <Text style={styles.li}>• <Text style={styles.strong}>Students:</Text> Children enrolled in participating schools (under adult supervision)</Text>
        
        <Text style={styles.h3}>Account Requirements:</Text>
        <Text style={styles.li}>• Accurate information required for all accounts</Text>
        <Text style={styles.li}>• One account per person (no shared accounts)</Text>
        <Text style={styles.li}>• Adults must supervise children's use of the platform</Text>
        <Text style={styles.li}>• School verification required for institutional accounts</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>4. Children's Use and COPPA Compliance</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Children Under 13:</Text> We comply with the Children's Online Privacy Protection Act (COPPA).
        </Text>
        <Text style={styles.li}>• Parental or school consent required for children under 13</Text>
        <Text style={styles.li}>• Children's accounts must be created and supervised by authorized adults</Text>
        <Text style={styles.li}>• Limited data collection focused on educational purposes only</Text>
        <Text style={styles.li}>• No direct marketing to children</Text>
        <Text style={styles.li}>• Parents retain rights to review, modify, or delete their child's information</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>5. Acceptable Use Policy</Text>
        
        <Text style={styles.h3}>You MAY:</Text>
        <Text style={styles.li}>• Use the Service for educational purposes</Text>
        <Text style={styles.li}>• Share educational content within your school community</Text>
        <Text style={styles.li}>• Communicate with other users for educational collaboration</Text>
        <Text style={styles.li}>• Upload educational materials you own or have permission to use</Text>
        
        <Text style={styles.h3}>You MAY NOT:</Text>
        <Text style={styles.li}>• Post inappropriate, offensive, or harmful content</Text>
        <Text style={styles.li}>• Harass, bully, or threaten other users</Text>
        <Text style={styles.li}>• Share personal information of children without proper consent</Text>
        <Text style={styles.li}>• Attempt to gain unauthorized access to other accounts</Text>
        <Text style={styles.li}>• Use the Service for commercial purposes without permission</Text>
        <Text style={styles.li}>• Upload copyrighted material without proper authorization</Text>
        <Text style={styles.li}>• Interfere with or disrupt the Service's functionality</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>6. Content and Intellectual Property</Text>
        
        <Text style={styles.h3}>Your Content:</Text>
        <Text style={styles.li}>• You retain ownership of original content you create</Text>
        <Text style={styles.li}>• You grant us license to use your content within the Service</Text>
        <Text style={styles.li}>• You are responsible for ensuring you have rights to content you upload</Text>
        
        <Text style={styles.h3}>Our Content:</Text>
        <Text style={styles.li}>• EduDash Pro platform and AI-generated content belong to us</Text>
        <Text style={styles.li}>• Educational templates and resources are licensed for educational use</Text>
        <Text style={styles.li}>• You may not reproduce or redistribute our proprietary content</Text>
        
        <Text style={styles.h3}>AI-Generated Content:</Text>
        <Text style={styles.li}>• AI-generated lesson plans and suggestions are provided as educational tools</Text>
        <Text style={styles.li}>• Educators should review and adapt AI content for their specific needs</Text>
        <Text style={styles.li}>• We do not guarantee accuracy of AI-generated educational content</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>7. Privacy and Data Protection</Text>
        <Text style={styles.p}>
          Your privacy is important to us. Our data handling practices are detailed in our 
          <Text style={styles.link} onPress={() => Linking.openURL('https://www.edudashpro.org.za/marketing/privacy-policy')}> Privacy Policy</Text>.
        </Text>
        <Text style={styles.li}>• We collect minimal data necessary for educational purposes</Text>
        <Text style={styles.li}>• Student data is protected with enhanced security measures</Text>
        <Text style={styles.li}>• You can request data deletion at any time</Text>
        <Text style={styles.li}>• We comply with FERPA, COPPA, and GDPR requirements</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>8. Subscription and Payment Terms</Text>
        
        <Text style={styles.h3}>Free and Paid Plans:</Text>
        <Text style={styles.li}>• Basic educational features available in free plan</Text>
        <Text style={styles.li}>• Premium features require paid subscription</Text>
        <Text style={styles.li}>• Institutional discounts available for schools</Text>
        
        <Text style={styles.h3}>Billing:</Text>
        <Text style={styles.li}>• Subscriptions billed monthly or annually in advance</Text>
        <Text style={styles.li}>• Automatic renewal unless cancelled</Text>
        <Text style={styles.li}>• Refunds available within 30 days of payment</Text>
        <Text style={styles.li}>• Price changes require 30 days advance notice</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>9. Safety and Moderation</Text>
        <Text style={styles.p}>
          We maintain a safe environment for all users, especially children:
        </Text>
        <Text style={styles.li}>• Content moderation and filtering systems in place</Text>
        <Text style={styles.li}>• User blocking and reporting features available</Text>
        <Text style={styles.li}>• Communication limited to educational contexts</Text>
        <Text style={styles.li}>• Adult supervision required for children's activities</Text>
        <Text style={styles.li}>• Zero tolerance for inappropriate behavior toward children</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>10. Termination</Text>
        
        <Text style={styles.h3}>You may terminate your account:</Text>
        <Text style={styles.li}>• At any time through account settings</Text>
        <Text style={styles.li}>• By requesting account deletion</Text>
        <Text style={styles.li}>• By contacting our support team</Text>
        
        <Text style={styles.h3}>We may terminate accounts for:</Text>
        <Text style={styles.li}>• Violation of these Terms</Text>
        <Text style={styles.li}>• Inappropriate behavior or content</Text>
        <Text style={styles.li}>• Non-payment of subscription fees</Text>
        <Text style={styles.li}>• Prolonged inactivity</Text>
        
        <Text style={styles.p}>
          Upon termination, your access to the Service will cease, and your data will be deleted 
          according to our data retention policies.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>11. Disclaimers and Limitations</Text>
        
        <Text style={styles.h3}>Educational Content:</Text>
        <Text style={styles.li}>• Content provided for educational purposes only</Text>
        <Text style={styles.li}>• Not a substitute for professional educational assessment</Text>
        <Text style={styles.li}>• AI-generated content should be reviewed by qualified educators</Text>
        
        <Text style={styles.h3}>Service Availability:</Text>
        <Text style={styles.li}>• Service provided "as is" without warranties</Text>
        <Text style={styles.li}>• No guarantee of uninterrupted access</Text>
        <Text style={styles.li}>• Not liable for technical issues or data loss</Text>
        
        <Text style={styles.h3}>Limitation of Liability:</Text>
        <Text style={styles.p}>
          To the maximum extent permitted by law, EduDash Pro shall not be liable for any indirect, 
          incidental, special, consequential, or punitive damages resulting from your use of the Service.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>12. Indemnification</Text>
        <Text style={styles.p}>
          You agree to indemnify and hold harmless EduDash Pro from any claims, damages, or expenses 
          arising from your use of the Service, violation of these Terms, or infringement of any rights 
          of another person or entity.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>13. Governing Law</Text>
        <Text style={styles.p}>
          These Terms shall be governed by and construed in accordance with applicable laws, including 
          but not limited to COPPA (United States), GDPR (European Union), and local privacy and 
          educational regulations where the Service is used.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>14. Changes to Terms</Text>
        <Text style={styles.p}>
          We may modify these Terms at any time. Material changes will be communicated through:
        </Text>
        <Text style={styles.li}>• Email notifications to registered users</Text>
        <Text style={styles.li}>• In-app announcements</Text>
        <Text style={styles.li}>• Posted updates on our website</Text>
        
        <Text style={styles.p}>
          Continued use of the Service after changes constitutes acceptance of the new Terms.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>15. Contact Information</Text>
        <Text style={styles.p}>
          For questions about these Terms of Service:
        </Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Email:</Text> support@edudashpro.com{'\n'}
          <Text style={styles.strong}>Subject:</Text> Terms of Service Inquiry{'\n'}
          <Text style={styles.strong}>Website:</Text> https://www.edudashpro.org.za
        </Text>
        
        <Text style={styles.p}>
          <Text style={styles.strong}>For legal or compliance questions:</Text>{'\n'}
          Email: support@edudashpro.com{'\n'}
          Subject: "Legal Inquiry - Terms of Service"
        </Text>
      </View>

      <Text style={styles.footer}>
        © {new Date().getFullYear()} EduDash Pro. These Terms of Service are designed to ensure a safe, 
        educational environment that complies with applicable laws including COPPA, FERPA, and GDPR. 
        We are committed to protecting children and supporting quality education.
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