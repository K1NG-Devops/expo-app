import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useAuth } from '@/contexts/AuthContext'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export type TierBadgeProps = {
  tier?: string | null
  showManageButton?: boolean
  containerStyle?: ViewStyle
  size?: 'sm' | 'md'
}

function getTierMeta(t?: string) {
  const tt = String(t || 'free').toLowerCase()
  switch (tt) {
    case 'starter': return { label: 'Starter', color: '#059669' }
    case 'basic': return { label: 'Basic', color: '#10B981' }
    case 'premium': return { label: 'Premium', color: '#7C3AED' }
    case 'pro': return { label: 'Pro', color: '#2563EB' }
    case 'enterprise': return { label: 'Enterprise', color: '#DC2626' }
    case 'free':
    default: return { label: 'Free', color: '#6B7280' }
  }
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, showManageButton = false, containerStyle, size = 'md' }) => {
  const { tier: ctxTier } = useSubscription()
  const { profile } = useAuth()
  const effectiveTier = tier || ctxTier || 'free'
  const meta = useMemo(() => getTierMeta(effectiveTier), [effectiveTier])

  const canManage = profile?.role === 'principal' || profile?.role === 'principal_admin' || profile?.role === 'super_admin'

  const height = size === 'sm' ? 22 : 24
  const fontSize = size === 'sm' ? 11 : 12

  return (
    <View style={[styles.row, containerStyle]}>
      <View style={[styles.chip, { borderColor: meta.color, backgroundColor: meta.color + '20', height }] }>
        <Text style={[styles.chipText, { color: meta.color, fontSize }]}>{meta.label}</Text>
      </View>
      {showManageButton && canManage && (
        <TouchableOpacity
          style={[styles.manageBtn, { borderColor: meta.color, height }]}
          onPress={() => {
            if (profile?.role === 'super_admin') router.push('/screens/super-admin-subscriptions')
            else router.push('/pricing')
          }}
          accessibilityLabel="Manage subscription plan"
        >
          <Ionicons name="pricetags-outline" size={12} color={meta.color} />
          <Text style={[styles.manageText, { color: meta.color, fontSize: fontSize - 1 }]}>Manage plan</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontWeight: '600',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
    gap: 4,
  },
  manageText: {
    fontWeight: '600',
  },
})

export default TierBadge
