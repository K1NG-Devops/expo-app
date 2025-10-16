/**
 * TierBadge Component
 * 
 * Displays user's subscription tier with color-coded badge
 * Used in chat header, settings, and upgrade prompts
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTierInfo, type Tier } from '@/lib/ai/capabilities';

export interface TierBadgeProps {
  tier: Tier;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export function TierBadge({ tier, size = 'medium', showIcon = true }: TierBadgeProps) {
  const tierInfo = getTierInfo(tier);
  
  const sizeStyles = {
    small: styles.containerSmall,
    medium: styles.containerMedium,
    large: styles.containerLarge,
  };
  
  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  return (
    <View style={[styles.container, sizeStyles[size], { backgroundColor: tierInfo.color }]}>
      {showIcon && (
        <View style={styles.icon}>
          <Text style={[styles.iconText, textSizeStyles[size]]}>
            {getIconForTier(tier)}
          </Text>
        </View>
      )}
      <Text style={[styles.text, textSizeStyles[size]]}>{tierInfo.name}</Text>
    </View>
  );
}

function getIconForTier(tier: Tier): string {
  const icons: Record<Tier, string> = {
    free: '🆓',
    starter: '🌱',
    premium: '⭐',
    enterprise: '🏢',
  };
  return icons[tier];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerSmall: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  containerMedium: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerLarge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 4,
  },
  iconText: {
    color: '#fff',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
});
