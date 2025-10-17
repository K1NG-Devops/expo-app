/**
 * Voice Mode Selector Component
 * 
 * Allows users to choose between different voice interaction modes:
 * - Simple Voice Modal (basic recording)
 * - Original Voice Mode (orb with streaming)
 * - ChatGPT Voice Mode (continuous conversation)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type VoiceModeType = 'simple' | 'original' | 'chatgpt';

interface VoiceModeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onModeSelected: (mode: VoiceModeType) => void;
  currentMode?: VoiceModeType;
}

const VOICE_MODE_KEY = '@dash_preferred_voice_mode';

export const VoiceModeSelector: React.FC<VoiceModeSelectorProps> = ({
  visible,
  onClose,
  onModeSelected,
  currentMode = 'chatgpt',
}) => {
  const { theme, isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<VoiceModeType>(currentMode);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(VOICE_MODE_KEY).then(saved => {
      if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
        setSelectedMode(saved as VoiceModeType);
      }
    });
  }, []);

  const handleModeSelect = async (mode: VoiceModeType) => {
    try {
      setSelectedMode(mode);
      await AsyncStorage.setItem(VOICE_MODE_KEY, mode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeSelected(mode);
      onClose();
    } catch (error) {
      console.error('Failed to save voice mode preference:', error);
    }
  };

  const modes = [
    {
      id: 'chatgpt' as VoiceModeType,
      title: 'ChatGPT Voice',
      description: 'Continuous conversation with natural turn-taking',
      icon: 'chatbubbles',
      features: ['Auto-listening', 'Voice interruption', 'Natural flow'],
      recommended: true,
    },
    {
      id: 'original' as VoiceModeType,
      title: 'Voice Orb',
      description: 'Elegant orb interface with streaming',
      icon: 'radio-button-on',
      features: ['Real-time streaming', 'Visual feedback', 'Manual control'],
      recommended: false,
    },
    {
      id: 'simple' as VoiceModeType,
      title: 'Simple Recording',
      description: 'Basic voice recording and transcription',
      icon: 'mic',
      features: ['Reliable recording', 'Offline support', 'Simple UI'],
      recommended: false,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Choose Voice Mode
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Options */}
          <View style={styles.modesContainer}>
            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  {
                    backgroundColor: selectedMode === mode.id ? theme.primaryLight : theme.background,
                    borderColor: selectedMode === mode.id ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleModeSelect(mode.id)}
                activeOpacity={0.8}
              >
                {/* Header Row */}
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconContainer}>
                    <Ionicons
                      name={mode.icon as any}
                      size={24}
                      color={selectedMode === mode.id ? theme.primary : theme.text}
                    />
                    {mode.recommended && (
                      <View style={[styles.recommendedBadge, { backgroundColor: theme.success }]}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  {selectedMode === mode.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </View>

                {/* Mode Info */}
                <Text style={[styles.modeTitle, { color: selectedMode === mode.id ? theme.primary : theme.text }]}>
                  {mode.title}
                </Text>
                <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                  {mode.description}
                </Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {mode.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={selectedMode === mode.id ? theme.primary : theme.success}
                      />
                      <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Text */}
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            You can change this anytime in settings. ChatGPT Voice provides the most natural conversation experience.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  modeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresContainer: {
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default VoiceModeSelector;