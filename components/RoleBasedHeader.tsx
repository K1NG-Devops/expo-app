import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Image } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/AuthContext';
import { signOutAndRedirect } from '@/lib/authActions';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { assertSupabase } from '@/lib/supabase';
import { navigateBack, shouldShowBackButton } from '@/lib/navigation';
import { isSuperAdmin } from '@/lib/roleUtils';
import ProfileImageService from '@/services/ProfileImageService';

// Helper function to get the appropriate settings route based on user role
function getSettingsRoute(role?: string | null): string {
  if (!role) return '/screens/settings';
  
  if (isSuperAdmin(role)) {
    return '/screens/super-admin-settings';
  }
  
  // For other roles, use the general settings
  return '/screens/settings';
}

interface RoleBasedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean; // Manual override
  backgroundColor?: string;
  textColor?: string;
  onBackPress?: () => void;
  onSubtitleTap?: () => void; // Tap handler for subtitle
  canCycleChildren?: boolean; // Shows visual indicator for cycling
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
  backgroundColor,
  textColor,
  onBackPress,
  onSubtitleTap,
  canCycleChildren = false,
}: RoleBasedHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { theme, mode, toggleTheme } = useTheme();

  // Load avatar URL from user metadata or profiles table
  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (!user?.id) {
        setAvatarUrl(null);
        return;
      }

      // First, try user metadata (fastest)
      let url = user.user_metadata?.avatar_url;
      
      // If not in metadata, try profiles table
      if (!url) {
        try {
          const { data: profileData } = await assertSupabase()
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileData?.avatar_url) {
            url = profileData.avatar_url;
          }
        } catch (error) {
          console.debug('Failed to load avatar from profiles:', error);
        }
      }
      
      // Check if URL is a local file:// URI on web platform - don't use these
      if (Platform.OS === 'web' && url && url.startsWith('file://')) {
        console.debug('Skipping local file:// URI on web platform:', url);
        url = null;
      }
      
      setAvatarUrl(url || null);
    };

    loadAvatarUrl();
  }, [user?.id, user?.user_metadata?.avatar_url]);

  // Convert avatar URL to data URI for web compatibility
  useEffect(() => {
    const convertAvatarUri = async () => {
      if (avatarUrl) {
        try {
          // Only convert for web platform and local URIs
          if (Platform.OS === 'web' && (avatarUrl.startsWith('blob:') || avatarUrl.startsWith('file:'))) {
            const dataUri = await ProfileImageService.convertToDataUri(avatarUrl);
            setDisplayUri(dataUri);
          } else {
            // For mobile or remote URIs, use the original URI
            setDisplayUri(avatarUrl);
          }
        } catch (error) {
          console.error('Failed to convert avatar URI in header:', error);
          setDisplayUri(null); // Fallback to initials
        }
      } else {
        setDisplayUri(null);
      }
    };
    
    convertAvatarUri();
  }, [avatarUrl]);

  // Use centralized navigation logic - explicit false prop overrides, otherwise defer to shouldShowBackButton
  const shouldShowBack = (showBackButton !== false) && shouldShowBackButton(route.name, !!user);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigateBack();
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
  const showBack = shouldShowBack;
  
  // Use theme colors if not explicitly provided
  const headerBgColor = backgroundColor || theme.headerBackground;
  const headerTextColor = textColor || theme.headerText;

  const profileInitials = useMemo(() => {
    const name = (user?.user_metadata?.first_name || '') + ' ' + (user?.user_metadata?.last_name || '');
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }, [user?.user_metadata]);

  const roleChip = permissions?.enhancedProfile?.role ? (
    <View style={[styles.roleChip, { backgroundColor: theme.surfaceVariant }]}>
      <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
      <Text style={[styles.roleChipText, { color: theme.primary }]}>
        {String(permissions.enhancedProfile.role).replace('_', ' ')}
      </Text>
    </View>
  ) : null;

  return (
    <View style={[
      styles.container,
      { 
        paddingTop: insets.top,
        backgroundColor: headerBgColor,
        borderBottomColor: theme.divider,
      }
    ]}>
      <View style={styles.content}>
        {/* Left Section - Profile Picture */}
        <View style={styles.leftSection}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                size={24} 
                color={headerTextColor} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.avatarButton, { 
                backgroundColor: theme.surfaceVariant,
                borderWidth: 2,
                borderColor: theme.primary + '40'
              }]} 
              onPress={() => router.push('/screens/account')}
              accessibilityLabel="Go to account settings"
            >
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { 
                  backgroundColor: theme.primary, 
                  borderColor: theme.primaryLight 
                }]}>
                  <Text style={[styles.avatarFallbackText, { color: theme.onPrimary }]}>
                    {profileInitials}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: headerTextColor }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          {displaySubtitle && (
            canCycleChildren && onSubtitleTap ? (
              <TouchableOpacity onPress={onSubtitleTap} activeOpacity={0.7}>
                <View style={styles.subtitleTouchable}>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                    {displaySubtitle}
                  </Text>
                  <Ionicons 
                    name="swap-horizontal" 
                    size={12} 
                    color={theme.textSecondary} 
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {displaySubtitle}
              </Text>
            )
          )}
        </View>

        {/* Right Section - Theme Toggle & Settings */}
        <View style={styles.rightSection}>
          {/* Theme Toggle Button */}
          <TouchableOpacity 
            style={[styles.themeButton, { marginRight: 8 }]} 
            onPress={toggleTheme}
            accessibilityLabel="Toggle theme"
          >
            <Ionicons 
              name={mode === 'dark' ? 'sunny' : 'moon'} 
              size={20} 
              color={headerTextColor} 
            />
          </TouchableOpacity>
          
          {/* Settings Button */}
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="Open settings menu"
          >
            <Ionicons 
              name="settings-outline" 
              size={20} 
              color={headerTextColor} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={[styles.menuOverlay, { backgroundColor: theme.modalOverlay }]} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={[styles.menuContainer, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>{user?.user_metadata?.first_name || 'Account'}</Text>
                {roleChip}
              </View>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push(getSettingsRoute(permissions?.enhancedProfile?.role)); }}>
                <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/screens/account'); }}>
                <Ionicons name="person-circle-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Account Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setLanguageVisible(true); }}>
                <Ionicons name="language" size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Language</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); toggleTheme(); }}>
                <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Theme</Text>
                <Text style={[styles.themeIndicator, { color: theme.textTertiary }]}>
                  {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/(auth)/sign-in?switch=1'); }}>
                <Ionicons name="swap-horizontal" size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Switch account</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => signOutAndRedirect({ clearBiometrics: false, redirectTo: '/(auth)/sign-in' })}>
                <Ionicons name="log-out-outline" size={18} color={theme.error} />
                <Text style={[styles.menuItemText, { color: theme.error }]}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Language Selector Modal */}
      {languageVisible && (
        <Modal visible animationType="slide" onRequestClose={() => setLanguageVisible(false)}>
          <View style={[styles.langModalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.langModalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
              <Text style={[styles.langModalTitle, { color: theme.text }]}>Language Settings</Text>
              <TouchableOpacity onPress={() => setLanguageVisible(false)} style={styles.langCloseButton}>
                <Ionicons name="close" size={22} color={theme.text} />
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
  subtitleTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  rightSection: {
    width: 88, // Increased width to fit both buttons
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  themeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  settingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    width: 36, // Larger for better visibility
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14, // Larger text for bigger avatar
    fontWeight: '700',
  },
  themeIndicator: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Darker overlay for better contrast
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 80, // Adjust for larger avatar
    marginRight: 16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    width: 240, // Slightly wider for theme indicator
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
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
