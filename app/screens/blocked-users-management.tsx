import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserBlocking, BlockedUser } from '@/hooks/useUserBlocking';

export default function BlockedUsersManagementScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { 
    blockedUsers, 
    isLoading, 
    error, 
    unblockUser, 
    refetchBlockedUsers 
  } = useUserBlocking();
  
  const [refreshing, setRefreshing] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.error,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    blockedUserCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.error + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    userRole: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    blockInfo: {
      marginBottom: 12,
    },
    blockType: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    blockReason: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 4,
    },
    blockDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    blockActions: {
      flexDirection: 'row',
      gap: 12,
    },
    unblockButton: {
      flex: 1,
      backgroundColor: theme.success + '10',
      borderColor: theme.success,
      borderWidth: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    unblockButtonText: {
      color: theme.success,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    infoButton: {
      backgroundColor: theme.primary + '10',
      borderColor: theme.primary,
      borderWidth: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
    },
    summaryCard: {
      backgroundColor: theme.primary + '10',
      borderColor: theme.primary,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: 8,
    },
    summaryText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 8,
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchBlockedUsers();
    } catch (error) {
      console.error('Error refreshing blocked users:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnblockUser = (blockedUser: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blockedUser.blocked_user_name}? You will be able to see their messages and content again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(blockedUser.blocked_user_id, blockedUser.block_type);
              Alert.alert('Success', `${blockedUser.blocked_user_name} has been unblocked.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleShowBlockInfo = (blockedUser: BlockedUser) => {
    const blockDate = new Date(blockedUser.created_at).toLocaleDateString();
    const expireDate = blockedUser.expires_at 
      ? new Date(blockedUser.expires_at).toLocaleDateString() 
      : 'Never';

    Alert.alert(
      'Block Information',
      `User: ${blockedUser.blocked_user_name}\n` +
      `Block Type: ${blockedUser.block_type}\n` +
      `Reason: ${blockedUser.reason || 'No reason provided'}\n` +
      `Blocked On: ${blockDate}\n` +
      `Expires: ${expireDate}\n` +
      `School: ${blockedUser.school_name || 'Unknown'}`,
      [{ text: 'OK' }]
    );
  };

  const formatBlockType = (type: string): string => {
    switch (type) {
      case 'user': return 'Full Block';
      case 'communication': return 'Communication';
      case 'content': return 'Content Only';
      default: return type;
    }
  };

  const formatBlockReason = (reason?: string): string => {
    if (!reason) return 'No reason provided';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Blocked Users', 
            headerShown: false 
          }} 
        />
        <StatusBar style="light" />
        
        <SafeAreaView style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Blocked Users</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Blocked Users', 
            headerShown: false 
          }} 
        />
        <StatusBar style="light" />
        
        <SafeAreaView style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Blocked Users</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>

        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={theme.error} />
          <Text style={styles.errorTitle}>Error Loading Blocked Users</Text>
          <Text style={styles.errorText}>There was an error loading your blocked users list.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Blocked Users', 
          headerShown: false 
        }} 
      />
      <StatusBar style="light" />
      
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Blocked Users</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {blockedUsers.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Blocked Users Summary</Text>
            <Text style={styles.summaryText}>
              You have blocked {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''}. 
              Blocked users cannot send you messages or see your content based on the block type.
            </Text>
          </View>
        )}

        {blockedUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="shield-checkmark" 
              size={64} 
              color={theme.textSecondary} 
              style={styles.emptyIcon} 
            />
            <Text style={styles.emptyTitle}>No Blocked Users</Text>
            <Text style={styles.emptySubtitle}>
              You haven't blocked any users yet. When you block someone, they'll appear here 
              and you can manage or unblock them.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="ban" size={20} color={theme.text} />
              <Text style={styles.sectionTitle}>
                Blocked Users ({blockedUsers.length})
              </Text>
            </View>

            {blockedUsers.map((blockedUser) => (
              <View key={blockedUser.id} style={styles.blockedUserCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Ionicons 
                      name={blockedUser.blocked_user_role === 'principal' ? 'school' : 'person'} 
                      size={24} 
                      color={theme.error} 
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{blockedUser.blocked_user_name}</Text>
                    <Text style={styles.userRole}>{blockedUser.blocked_user_role}</Text>
                  </View>
                </View>

                <View style={styles.blockInfo}>
                  <Text style={styles.blockType}>{formatBlockType(blockedUser.block_type)}</Text>
                  <Text style={styles.blockReason}>{formatBlockReason(blockedUser.reason)}</Text>
                  <Text style={styles.blockDate}>
                    Blocked {new Date(blockedUser.created_at).toLocaleDateString()}
                    {blockedUser.expires_at && (
                      ` • Expires ${new Date(blockedUser.expires_at).toLocaleDateString()}`
                    )}
                  </Text>
                </View>

                <View style={styles.blockActions}>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => handleUnblockUser(blockedUser)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => handleShowBlockInfo(blockedUser)}
                  >
                    <Ionicons name="information-circle" size={16} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}