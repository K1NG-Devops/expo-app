import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/AuthContext';
import type { Role } from '@/lib/rbac';

interface RoleBasedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean; // Manual override
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  onBackPress?: () => void;
}

/**
 * Enhanced header component that follows role-based navigation rules
 * - Hides back arrow when user is signed in (per rule)
 * - Shows contextual information based on user role and permissions
 * - Provides consistent navigation experience across roles
 */
export function RoleBasedHeader({
  title,
  subtitle,
  showBackButton = true, // Default to true, will be overridden by rules
  rightComponent,
  backgroundColor = '#ffffff',
  textColor = '#000000',
  onBackPress,
}: RoleBasedHeaderProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const permissions = usePermissions();

  // Apply rule: "When the user is signed in, the back arrow button should not be visible in the UI"
  const shouldShowBackButton = () => {
    // If user is signed in, hide back button (per rule)
    if (user) {
      return false;
    }
    
    // If not signed in, respect the showBackButton prop
    return showBackButton && navigation.canGoBack();
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Get contextual title based on route and role
  const getContextualTitle = (): string => {
    if (title) return title;
    
    // Default titles based on route name
    const routeName = route.name;
    if (routeName.includes('dashboard')) {
      const role = permissions?.enhancedProfile?.role;
      switch (role) {
        case 'super_admin':
          return 'SuperAdmin Dashboard';
        case 'principal_admin':
          return 'Principal Hub';
        case 'teacher':
          return 'Teacher Dashboard';
        case 'parent':
          return 'Parent Dashboard';
        default:
          return 'Dashboard';
      }
    }
    
    // Convert route name to readable title
    return routeName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get role-based subtitle
  const getContextualSubtitle = (): string | undefined => {
    if (subtitle) return subtitle;
    
    const profile = permissions?.enhancedProfile;
    if (!profile) return undefined;

    // Show organization name for school-based roles
    if (profile.organization_membership?.organization_name) {
      return profile.organization_membership.organization_name;
    }

    // Show seat status for teachers
    if (profile.role === 'teacher' && profile.seat_status) {
      const statusText = profile.seat_status === 'active' ? 'Active' : 
                        profile.seat_status === 'pending' ? 'Pending Activation' :
                        'Inactive';
      return `Seat Status: ${statusText}`;
    }

    return undefined;
  };

  const displayTitle = getContextualTitle();
  const displaySubtitle = getContextualSubtitle();
  const showBack = shouldShowBackButton();

  return (
    <View style={[
      styles.container,
      { 
        paddingTop: insets.top,
        backgroundColor 
      }
    ]}>
      <View style={styles.content}>
        {/* Back Button Area */}
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                size={24} 
                color={textColor} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          {displaySubtitle && (
            <Text style={[styles.subtitle, { color: textColor + '80' }]} numberOfLines={1}>
              {displaySubtitle}
            </Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e1e1',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  rightSection: {
    width: 44,
    alignItems: 'flex-end',
  },
});

/**
 * Hook to get header configuration for current screen and user role
 */
export function useRoleBasedHeader() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const route = useRoute();

  return {
    shouldShowBackButton: !user, // Hide when signed in per rule
    canAccessScreen: permissions?.enhancedProfile?.hasCapability('access_mobile_app') ?? false,
    userRole: permissions?.enhancedProfile?.role,
    organizationName: permissions?.enhancedProfile?.organization_membership?.organization_name,
    seatStatus: permissions?.enhancedProfile?.seat_status,
  };
}
