import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

interface EnhancedQuickActionProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  gradientColors: [string, string]
  onPress: () => void
  disabled?: boolean
}

const EnhancedQuickAction: React.FC<EnhancedQuickActionProps> = ({
  icon,
  title,
  description,
  gradientColors,
  onPress,
  disabled = false
}) => {
  const { width } = Dimensions.get('window')
  const cardWidth = (width - 48) / 2

  return (
    <TouchableOpacity
      style={[styles.quickActionCard, { width: cardWidth }, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient 
        colors={disabled ? ['#6B7280', '#9CA3AF'] : gradientColors} 
        style={styles.quickActionGradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.quickActionTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        <Text style={styles.quickActionDescription} numberOfLines={2} ellipsizeMode="tail">{description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

interface EnhancedQuickActionsProps {
  aiHelpUsage: number
  aiHelpLimit: number | 'unlimited'
  onHomeworkPress: () => void
  onWhatsAppPress: () => void
  onUpgradePress: () => void
}

export const EnhancedQuickActions: React.FC<EnhancedQuickActionsProps> = ({
  aiHelpUsage,
  aiHelpLimit,
  onHomeworkPress,
  onWhatsAppPress,
  onUpgradePress
}) => {
  const remaining = aiHelpLimit === 'unlimited' ? 'unlimited' : Number(aiHelpLimit) - aiHelpUsage
  const isHomeworkDisabled = aiHelpLimit !== 'unlimited' && aiHelpUsage >= Number(aiHelpLimit)

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <EnhancedQuickAction
          icon="help-circle"
          title="AI Homework Helper"
          description={isHomeworkDisabled ? 'Limit reached' : `${remaining} requests left`}
          gradientColors={['#00f5ff', '#0080ff']}
          onPress={onHomeworkPress}
          disabled={isHomeworkDisabled}
        />
        
        <EnhancedQuickAction
          icon="logo-whatsapp"
          title="WhatsApp Connect"
          description="Connect with teachers"
          gradientColors={['#25D366', '#128C7E']}
          onPress={onWhatsAppPress}
        />
        
        {/* Upgrade action removed for OTA preview test */}
        
        <EnhancedQuickAction
          icon="library"
          title="Learning Resources"
          description="Access study materials"
          gradientColors={['#8B5CF6', '#7C3AED']}
          onPress={() => console.log('Learning resources')}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // Use margins for RN Android consistency; gap support can vary across platforms
    marginHorizontal: -6,
  },
  quickActionCard: {
    borderRadius: 16,
    // Do not use overflow: 'hidden' on Android when using elevation; it will clip shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
    marginHorizontal: 6,
  },
  disabledCard: {
    opacity: 0.6,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    height: 150,
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  quickActionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  quickActionDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
})

export default EnhancedQuickActions