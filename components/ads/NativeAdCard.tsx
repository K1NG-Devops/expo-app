import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Linking, 
  Platform,
  Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { track } from '../../lib/analytics'

interface NativeAdProps {
  placement: 'quick-actions' | 'activity-feed' | 'children-list'
  onClose?: () => void
  style?: any
}

// Mock ad data - in production this would come from an ad network
const MOCK_ADS = {
  'quick-actions': [
    {
      id: 'tutoring-1',
      title: 'Need Extra Math Help?',
      description: 'Connect with qualified SA teachers for 1-on-1 tutoring sessions',
      sponsor: 'EduConnect Tutoring',
      cta: 'Book Session',
      url: 'https://example.com/tutoring',
      icon: 'calculator',
      color: ['#4F46E5', '#7C3AED']
    },
    {
      id: 'supplies-1', 
      title: 'School Supplies Delivered',
      description: 'Get all your stationery needs delivered to your door',
      sponsor: 'Staples South Africa',
      cta: 'Shop Now',
      url: 'https://example.com/supplies',
      icon: 'pencil',
      color: ['#059669', '#10B981']
    }
  ],
  'activity-feed': [
    {
      id: 'app-1',
      title: 'Educational Games for Kids',
      description: 'Fun learning games aligned with CAPS curriculum',
      sponsor: 'LearnPlay SA',
      cta: 'Download Free',
      url: 'https://example.com/games',
      icon: 'game-controller',
      color: ['#F59E0B', '#D97706']
    }
  ],
  'children-list': [
    {
      id: 'aftercare-1',
      title: 'After School Care Program',
      description: 'Safe, educational after-school care in your area',
      sponsor: 'KidZone After Care',
      cta: 'Find Locations',
      url: 'https://example.com/aftercare',
      icon: 'school',
      color: ['#DC2626', '#B91C1C']
    }
  ]
}

export const NativeAdCard: React.FC<NativeAdProps> = ({ 
  placement, 
  onClose, 
  style 
}) => {
  const { theme, isDark } = useTheme()
  const [ad, setAd] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Simulate ad loading
    const ads = MOCK_ADS[placement]
    if (ads && ads.length > 0) {
      const randomAd = ads[Math.floor(Math.random() * ads.length)]
      setAd(randomAd)
      
      // Track ad impression
      track('edudash.ad.impression', {
        ad_id: randomAd.id,
        placement,
        sponsor: randomAd.sponsor,
        platform: Platform.OS
      })
    }
  }, [placement])

  if (!ad || dismissed) return null

  const handleAdPress = async () => {
    track('edudash.ad.clicked', {
      ad_id: ad.id,
      placement,
      sponsor: ad.sponsor,
      platform: Platform.OS
    })

    try {
      const canOpen = await Linking.canOpenURL(ad.url)
      if (canOpen) {
        await Linking.openURL(ad.url)
      }
    } catch (error) {
      console.error('Failed to open ad URL:', error)
    }
  }

  const handleDismiss = () => {
    track('edudash.ad.dismissed', {
      ad_id: ad.id,
      placement,
      sponsor: ad.sponsor,
      platform: Platform.OS
    })

    setDismissed(true)
    onClose?.()
  }

  const { width } = Dimensions.get('window')
  const isFullWidth = placement === 'activity-feed'
  const cardWidth = isFullWidth ? width - 32 : (width - 48) / 2

  return (
    <View style={[styles.container, { width: cardWidth }, style]}>
      <TouchableOpacity 
        style={styles.adCard}
        onPress={handleAdPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={ad.color}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Sponsored Label */}
          <View style={styles.sponsoredLabel}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>

          {/* Ad Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name={ad.icon as any} size={24} color="#FFFFFF" />
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {ad.title}
            </Text>

            <Text style={styles.description} numberOfLines={isFullWidth ? 2 : 3}>
              {ad.description}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.sponsor}>
                by {ad.sponsor}
              </Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>{ad.cta}</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Ad Disclosure */}
      <Text style={[styles.disclosure, { color: theme.textTertiary }]}>
        Educational content from our partners
      </Text>
    </View>
  )
}

export default NativeAdCard

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  adCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    padding: 16,
    minHeight: 140,
    position: 'relative',
  },
  sponsoredLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sponsor: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  disclosure: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
})