import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { router } from 'expo-router';

interface AdBannerWithUpgradeProps {
  /** Screen identifier for tracking */
  screen: string;
  /** Show upgrade CTA button */
  showUpgradeCTA?: boolean;
  /** Margin around the banner */
  margin?: number;
  /** Custom height */
  height?: number;
}

/**
 * AdBannerWithUpgrade - Shows ad banner or upgrade prompt
 * Displays actual ads for free users, upgrade prompt for others
 */
const AdBannerWithUpgrade: React.FC<AdBannerWithUpgradeProps> = ({
  screen,
  showUpgradeCTA = false,
  margin = 0,
  height = 60,
}) => {
  const { theme } = useTheme();
  const { tier, ready: subscriptionReady } = useSubscription();

  const handleUpgrade = () => {
    try {
      router.push('/screens/subscription-upgrade-post?reason=remove_ads');
    } catch {
      console.warn('Failed to navigate to upgrade screen');
    }
  };

  const styles = StyleSheet.create({
    container: {
      margin,
      height,
      borderRadius: 8,
      overflow: 'hidden',
    },
    adPlaceholder: {
      flex: 1,
      backgroundColor: '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderStyle: 'dashed',
    },
    adText: {
      color: '#666',
      fontSize: 12,
      textAlign: 'center',
    },
    upgradePrompt: {
      flex: 1,
      backgroundColor: theme.primaryLight || '#e6f3ff',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 8,
    },
    upgradeText: {
      color: theme.primary || '#0066cc',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    upgradeButton: {
      backgroundColor: theme.primary || '#0066cc',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 4,
      marginTop: 4,
    },
    upgradeButtonText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
  });

  if (!subscriptionReady) {
    return null;
  }

  // For free tier users, show ad placeholder (replace with actual ad)
  if (tier === 'free') {
    return (
      <View style={styles.container}>
        <View style={styles.adPlaceholder}>
          <Text style={styles.adText}>Advertisement</Text>
          <Text style={[styles.adText, { fontSize: 10, marginTop: 2 }]}>
            {screen}
          </Text>
        </View>
      </View>
    );
  }

  // For paid users, optionally show upgrade-related message
  if (showUpgradeCTA) {
    return (
      <View style={styles.container}>
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradeText}>
            🎉 Ad-free experience active
          </Text>
          {tier !== 'enterprise' && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade More</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // For paid users without CTA, don't show anything
  return null;
};

export default AdBannerWithUpgrade;