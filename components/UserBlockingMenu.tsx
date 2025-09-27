import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserBlocking, BlockUserParams } from '@/hooks/useUserBlocking';
import { useTranslation } from 'react-i18next';

interface UserBlockingMenuProps {
  userId: string;
  userName: string;
  userRole: string;
  visible: boolean;
  onClose: () => void;
  onBlock?: (userId: string) => void;
  onUnblock?: (userId: string) => void;
  isBlocked?: boolean;
  style?: any;
}

interface BlockReasonOption {
  key: string;
  label: string;
  description: string;
}

const BLOCK_REASONS: BlockReasonOption[] = [
  {
    key: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'User shares inappropriate content'
  },
  {
    key: 'spam',
    label: 'Spam or Unwanted Messages',
    description: 'User sends spam or unwanted messages'
  },
  {
    key: 'harassment',
    label: 'Harassment or Bullying',
    description: 'User engages in harassment or bullying'
  },
  {
    key: 'privacy_concerns',
    label: 'Privacy Concerns',
    description: 'Concerns about privacy or data sharing'
  },
  {
    key: 'inappropriate_behavior',
    label: 'Inappropriate Behavior',
    description: 'User exhibits inappropriate behavior'
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Other reason (please specify)'
  },
];

export default function UserBlockingMenu({
  userId,
  userName,
  userRole,
  visible,
  onClose,
  onBlock,
  onUnblock,
  isBlocked = false,
  style,
}: UserBlockingMenuProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { blockUser, unblockUser, isLoading } = useUserBlocking();
  
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [blockType, setBlockType] = useState<'user' | 'communication'>('communication');
  const [additionalDetails, setAdditionalDetails] = useState('');

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 34, // Account for safe area
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      padding: 16,
      backgroundColor: theme.background,
      borderRadius: 12,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    userDetails: {
      flex: 1,
    },
    userNameText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    userRoleText: {
      fontSize: 14,
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    blockButton: {
      backgroundColor: theme.error + '10',
      borderColor: theme.error,
      borderWidth: 1,
    },
    unblockButton: {
      backgroundColor: theme.success + '10',
      borderColor: theme.success,
      borderWidth: 1,
    },
    reportButton: {
      backgroundColor: theme.warning + '10',
      borderColor: theme.warning,
      borderWidth: 1,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    blockButtonText: {
      color: theme.error,
    },
    unblockButtonText: {
      color: theme.success,
    },
    reportButtonText: {
      color: theme.warning,
    },
    formSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    reasonOption: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.outline,
      marginBottom: 8,
    },
    reasonOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    reasonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    reasonDescription: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.outline,
      borderRadius: 12,
      padding: 12,
      color: theme.text,
      backgroundColor: theme.background,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    blockTypeContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    blockTypeOption: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.outline,
      alignItems: 'center',
    },
    blockTypeSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    blockTypeText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    blockTypeTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: theme.error,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
    },
    submitButtonText: {
      color: theme.onError,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    disabledButton: {
      backgroundColor: theme.outline,
    },
    disabledButtonText: {
      color: theme.textSecondary,
    },
    warningText: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
      marginTop: 12,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

  const handleBlockUser = () => {
    if (isBlocked) {
      // Show unblock confirmation
      Alert.alert(
        'Unblock User',
        `Are you sure you want to unblock ${userName}? You will be able to see their messages and content again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            style: 'default',
            onPress: async () => {
              try {
                await unblockUser(userId);
                onUnblock?.(userId);
                onClose();
                Alert.alert('Success', `${userName} has been unblocked.`);
              } catch (error) {
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              }
            },
          },
        ]
      );
    } else {
      setShowBlockForm(true);
    }
  };

  const handleReportUser = () => {
    // Navigate to report functionality (if implemented)
    Alert.alert(
      'Report User',
      `Report ${userName} for inappropriate behavior. This will notify administrators.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement user reporting
            Alert.alert('Reported', `Thank you for reporting ${userName}. Administrators will review this report.`);
            onClose();
          },
        },
      ]
    );
  };

  const handleSubmitBlock = async () => {
    if (!selectedReason) {
      Alert.alert('Select Reason', 'Please select a reason for blocking this user.');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      Alert.alert('Specify Reason', 'Please specify the reason for blocking.');
      return;
    }

    const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
    const details = additionalDetails.trim();

    const blockParams: BlockUserParams = {
      userId,
      blockType,
      reason,
      details: details || undefined,
    };

    try {
      await blockUser(blockParams);
      onBlock?.(userId);
      onClose();
      
      Alert.alert(
        'User Blocked',
        blockType === 'communication' 
          ? `You will no longer receive messages from ${userName}.`
          : `${userName} has been blocked. You will not see their content or messages.`
      );
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
      setBlockType('communication');
      setAdditionalDetails('');
      setShowBlockForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, style]}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {showBlockForm ? 'Block User' : 'User Actions'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {!showBlockForm ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons 
                    name={userRole === 'principal' ? 'school' : 'person'} 
                    size={24} 
                    color={theme.primary} 
                  />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userNameText}>{userName}</Text>
                  <Text style={styles.userRoleText}>{userRole}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isBlocked ? styles.unblockButton : styles.blockButton,
                ]}
                onPress={handleBlockUser}
                disabled={isLoading}
              >
                <Ionicons
                  name={isBlocked ? 'checkmark-circle' : 'ban'}
                  size={20}
                  color={isBlocked ? theme.success : theme.error}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    isBlocked ? styles.unblockButtonText : styles.blockButtonText,
                  ]}
                >
                  {isBlocked ? 'Unblock User' : 'Block User'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.reportButton]}
                onPress={handleReportUser}
                disabled={isLoading}
              >
                <Ionicons name="flag" size={20} color={theme.warning} />
                <Text style={[styles.actionButtonText, styles.reportButtonText]}>
                  Report User
                </Text>
              </TouchableOpacity>

              <Text style={styles.warningText}>
                Blocking prevents communication and hides content. Reporting notifies administrators of inappropriate behavior.
              </Text>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Block Type</Text>
                <View style={styles.blockTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.blockTypeOption,
                      blockType === 'communication' && styles.blockTypeSelected,
                    ]}
                    onPress={() => setBlockType('communication')}
                  >
                    <Text
                      style={[
                        styles.blockTypeText,
                        blockType === 'communication' && styles.blockTypeTextSelected,
                      ]}
                    >
                      Communication
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.blockTypeOption,
                      blockType === 'user' && styles.blockTypeSelected,
                    ]}
                    onPress={() => setBlockType('user')}
                  >
                    <Text
                      style={[
                        styles.blockTypeText,
                        blockType === 'user' && styles.blockTypeTextSelected,
                      ]}
                    >
                      Full Block
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Reason for Blocking</Text>
                {BLOCK_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.key}
                    style={[
                      styles.reasonOption,
                      selectedReason === reason.key && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedReason(reason.key)}
                  >
                    <Text style={styles.reasonLabel}>{reason.label}</Text>
                    <Text style={styles.reasonDescription}>{reason.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedReason === 'other' && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Please Specify</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Describe the reason for blocking..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    maxLength={200}
                  />
                </View>
              )}

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={additionalDetails}
                  onChangeText={setAdditionalDetails}
                  placeholder="Any additional context or details..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  maxLength={300}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || isLoading) && styles.disabledButton,
                ]}
                onPress={handleSubmitBlock}
                disabled={!selectedReason || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.onError} />
                ) : (
                  <Ionicons name="ban" size={20} color={theme.onError} />
                )}
                <Text
                  style={[
                    styles.submitButtonText,
                    (!selectedReason || isLoading) && styles.disabledButtonText,
                  ]}
                >
                  Block User
                </Text>
              </TouchableOpacity>

              <Text style={styles.warningText}>
                This action will prevent {userName} from contacting you. You can unblock them later if needed.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}