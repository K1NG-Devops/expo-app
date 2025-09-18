/**
 * Enhanced Announcement Management Modal
 * 
 * Features:
 * - Create and send school-wide announcements
 * - Target specific audiences (teachers, parents, students)
 * - Priority levels and scheduling
 * - Rich text formatting
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface AnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (announcement: AnnouncementData) => void;
}

export interface AnnouncementData {
  title: string;
  message: string;
  audience: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled?: Date;
  requiresResponse?: boolean;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  visible,
  onClose,
  onSend,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<string[]>(['teachers']);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  const audiences = [
    { id: 'teachers', label: 'Teachers', icon: 'school', color: '#4F46E5' },
    { id: 'parents', label: 'Parents', icon: 'people', color: '#059669' },
    { id: 'students', label: 'Students', icon: 'person', color: '#7C3AED' },
    { id: 'admin', label: 'Admin Staff', icon: 'briefcase', color: '#DC2626' },
  ];

  const priorities = [
    { id: 'low', label: 'Low', color: '#6B7280', icon: 'remove-circle' },
    { id: 'normal', label: 'Normal', color: '#4F46E5', icon: 'information-circle' },
    { id: 'high', label: 'High', color: '#F59E0B', icon: 'warning' },
    { id: 'urgent', label: 'Urgent', color: '#DC2626', icon: 'alert-circle' },
  ];

  const handleAudienceToggle = (audienceId: string) => {
    setSelectedAudience(prev => 
      prev.includes(audienceId)
        ? prev.filter(id => id !== audienceId)
        : [...prev, audienceId]
    );
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please provide both title and message');
      return;
    }

    if (selectedAudience.length === 0) {
      Alert.alert('No Audience', 'Please select at least one audience');
      return;
    }

    const announcement: AnnouncementData = {
      title: title.trim(),
      message: message.trim(),
      audience: selectedAudience,
      priority,
      requiresResponse,
    };

    onSend(announcement);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setMessage('');
    setSelectedAudience(['teachers']);
    setPriority('normal');
    setRequiresResponse(false);
    setIsScheduled(false);
    onClose();
  };

  const getAudienceCount = (): string => {
    const counts = {
      teachers: 8,
      parents: 45,
      students: 52,
      admin: 3
    };
    
    const total = selectedAudience.reduce((sum, id) => sum + (counts[id as keyof typeof counts] || 0), 0);
    return `${total} recipients`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme?.text || '#333'} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Announcement</Text>
          <TouchableOpacity 
            onPress={handleSend}
            style={[styles.sendButton, (!title || !message) && styles.sendButtonDisabled]}
            disabled={!title || !message}
          >
            <Text style={[styles.sendButtonText, (!title || !message) && styles.sendButtonTextDisabled]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter announcement title..."
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Message Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your announcement message here..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {message.length}/1000 characters
            </Text>
          </View>

          {/* Audience Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Send To</Text>
              <Text style={styles.audienceCount}>{getAudienceCount()}</Text>
            </View>
            <View style={styles.audienceGrid}>
              {audiences.map((audience) => (
                <TouchableOpacity
                  key={audience.id}
                  style={[
                    styles.audienceOption,
                    selectedAudience.includes(audience.id) && styles.audienceOptionSelected,
                    { borderColor: audience.color }
                  ]}
                  onPress={() => handleAudienceToggle(audience.id)}
                >
                  <Ionicons 
                    name={audience.icon as any} 
                    size={20} 
                    color={selectedAudience.includes(audience.id) ? 'white' : audience.color} 
                  />
                  <Text style={[
                    styles.audienceOptionText,
                    selectedAudience.includes(audience.id) && styles.audienceOptionTextSelected
                  ]}>
                    {audience.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Priority Level</Text>
            <View style={styles.priorityGrid}>
              {priorities.map((priorityOption) => (
                <TouchableOpacity
                  key={priorityOption.id}
                  style={[
                    styles.priorityOption,
                    priority === priorityOption.id && styles.priorityOptionSelected,
                    { borderColor: priorityOption.color }
                  ]}
                  onPress={() => setPriority(priorityOption.id as any)}
                >
                  <Ionicons 
                    name={priorityOption.icon as any} 
                    size={18} 
                    color={priority === priorityOption.id ? 'white' : priorityOption.color} 
                  />
                  <Text style={[
                    styles.priorityOptionText,
                    priority === priorityOption.id && { color: 'white' }
                  ]}>
                    {priorityOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Options */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Options</Text>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Requires Response</Text>
                <Text style={styles.optionDescription}>Recipients must acknowledge this announcement</Text>
              </View>
              <Switch
                value={requiresResponse}
                onValueChange={setRequiresResponse}
                trackColor={{ false: theme?.border || '#D1D5DB', true: (theme?.primary || '#007AFF') + '40' }}
                thumbColor={requiresResponse ? (theme?.primary || '#007AFF') : '#fff'}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Schedule for Later</Text>
                <Text style={styles.optionDescription}>Send at a specific date and time</Text>
              </View>
              <Switch
                value={isScheduled}
                onValueChange={setIsScheduled}
                trackColor={{ false: theme?.border || '#D1D5DB', true: (theme?.primary || '#007AFF') + '40' }}
                thumbColor={isScheduled ? (theme?.primary || '#007AFF') : '#fff'}
              />
            </View>
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewPriority}>
                  <Ionicons 
                    name={priorities.find(p => p.id === priority)?.icon as any} 
                    size={16} 
                    color={priorities.find(p => p.id === priority)?.color} 
                  />
                  <Text style={[styles.previewPriorityText, { color: priorities.find(p => p.id === priority)?.color }]}>
                    {priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.previewDate}>
                  {new Date().toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.previewTitle}>{title || 'Announcement Title'}</Text>
              <Text style={styles.previewMessage}>{message || 'Your announcement message will appear here...'}</Text>
              <Text style={styles.previewFooter}>
                Sent to: {selectedAudience.join(', ') || 'No audience selected'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: theme?.surface || 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
  },
  sendButton: {
    backgroundColor: theme?.primary || '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: theme?.border || '#D1D5DB',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: theme?.textSecondary || '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.text || '#333',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: theme?.surface || 'white',
    borderWidth: 1,
    borderColor: theme?.border || '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme?.text || '#333',
  },
  messageInput: {
    backgroundColor: theme?.surface || 'white',
    borderWidth: 1,
    borderColor: theme?.border || '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme?.text || '#333',
    height: 120,
  },
  characterCount: {
    fontSize: 12,
    color: theme?.textSecondary || '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  audienceCount: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
    fontWeight: '500',
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme?.surface || 'white',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '47%',
  },
  audienceOptionSelected: {
    backgroundColor: theme?.primary || '#007AFF',
    borderColor: theme?.primary || '#007AFF',
  },
  audienceOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme?.text || '#333',
    marginLeft: 8,
  },
  audienceOptionTextSelected: {
    color: 'white',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme?.surface || 'white',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  priorityOptionSelected: {
    backgroundColor: theme?.primary || '#007AFF',
    borderColor: theme?.primary || '#007AFF',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme?.text || '#333',
    marginLeft: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme?.surface || 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme?.text || '#333',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
  },
  previewCard: {
    backgroundColor: theme?.surface || 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E7EB',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewPriority: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewPriorityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  previewDate: {
    fontSize: 12,
    color: theme?.textSecondary || '#6B7280',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
    marginBottom: 8,
  },
  previewMessage: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewFooter: {
    fontSize: 12,
    color: theme?.textTertiary || '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default AnnouncementModal;
