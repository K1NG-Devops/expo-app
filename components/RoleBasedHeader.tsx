import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/AuthContext';
import { signOutAndRedirect } from '@/lib/authActions';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import type { Role } from '@/lib/rbac';

interface RoleBasedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean; // Manual override
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
  backgroundColor = '#ffffff',
  textColor = '#000000',
  onBackPress,
}: RoleBasedHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
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

  const profileInitials = useMemo(() => {
    const name = (user?.user_metadata?.first_name || '') + ' ' + (user?.user_metadata?.last_name || '');
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }, [user?.user_metadata]);

  const roleChip = permissions?.enhancedProfile?.role ? (
    <View style={styles.roleChip}>
      <Ionicons name="shield-checkmark" size={12} color={textColor} />
      <Text style={[styles.roleChipText, { color: textColor }]}>
        {String(permissions.enhancedProfile.role).replace('_', ' ')}
      </Text>
    </View>
  ) : null;

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

        {/* Right Section - Avatar Menu */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.avatarButton} onPress={() => setMenuVisible(true)}>
            {/* If user has avatar url, show it; else show initials */}
            {user?.user_metadata?.avatar_url ? (
              <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { borderColor: textColor + '40' }]}>
                <Text style={[styles.avatarFallbackText, { color: textColor }]}>{profileInitials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>{user?.user_metadata?.first_name || 'Account'}</Text>
                {roleChip}
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); /* future: navigate profile */ }}>
                <Ionicons name="person-circle-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setLanguageVisible(true); }}>
                <Ionicons name="language" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Language</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); /* future: settings */ }}>
                <Ionicons name="settings-outline" size={18} color="#374151" />
                <Text style={styles.menuItemText}>Settings</Text>
                <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>Soon</Text></View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={signOutAndRedirect}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Language Selector Modal */}
      {languageVisible && (
        <Modal visible animationType="slide" onRequestClose={() => setLanguageVisible(false)}>
          <View style={styles.langModalContainer}>
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>Language Settings</Text>
              <TouchableOpacity onPress={() => setLanguageVisible(false)} style={styles.langCloseButton}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <LanguageSelector onLanguageSelect={() => setLanguageVisible(false)} showComingSoon={true} />
          </View>
        </Modal>
      )}
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
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff20',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff10',
  },
  avatarFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 72,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  menuHeader: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
  },
  comingSoonBadge: {
    backgroundColor: '#FFE4B5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '700',
  },
  langModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  langModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  langCloseButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
});

/**
 * Hook to get header configuration for current screen and user role
 */
export function useRoleBasedHeader() {
  const { user } = useAuth();
  const permissions = usePermissions();

  return {
    shouldShowBackButton: !user, // Hide when signed in per rule
    canAccessScreen: permissions?.enhancedProfile?.hasCapability('access_mobile_app') ?? false,
    userRole: permissions?.enhancedProfile?.role,
    organizationName: permissions?.enhancedProfile?.organization_membership?.organization_name,
    seatStatus: permissions?.enhancedProfile?.seat_status,
  };
}
