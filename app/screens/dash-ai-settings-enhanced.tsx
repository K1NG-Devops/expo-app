import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashAISettingsEnhancedScreen() {
  const { theme } = useTheme();
  const [dashAI] = useState(() => DashAIAssistant.getInstance());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Core AI Settings
    voiceEnabled: true,
    proactiveHelp: true,
    memoryEnabled: true,
    multilingualSupport: true,
    
    // Personality Settings
    personality: 'encouraging' as 'professional' | 'casual' | 'encouraging' | 'formal',
    personalityCustom: '',
    adaptiveTone: true,
    emotionalIntelligence: true,
    
    // Voice Settings
    voiceLanguage: 'en-ZA',
    voiceType: 'female_warm',
    voiceRate: 1.0,
    voicePitch: 1.0,
    voiceVolume: 0.8,
    autoReadResponses: false,
    voiceActivation: false,
    
    // Chat Behavior Settings
    enterToSend: true,
    autoVoiceReply: false,
    showTypingIndicator: true,
    readReceiptEnabled: true,
    soundEnabled: true,
    autoSuggestQuestions: true,
    contextualHelp: true,
    
    // Learning & Memory Settings
    rememberPreferences: true,
    learnFromInteractions: true,
    personalizedRecommendations: true,
    crossSessionMemory: true,
    memoryRetentionDays: 30,
    
    // Advanced Features
    predictiveText: true,
    smartNotifications: true,
    offlineMode: false,
    dataSync: true,
    experimentalFeatures: false,
    
    // Privacy Settings
    dataCollection: true,
    anonymousUsage: false,
    shareAnalytics: true,
    localProcessing: Platform.OS === 'ios',
    
    // Custom Instructions
    customInstructions: '',
    userContext: '',
    teachingStyle: 'adaptive' as 'direct' | 'guided' | 'socratic' | 'adaptive',
    
    // Accessibility
    highContrast: false,
    largeFonts: false,
    screenReader: false,
    reducedMotion: false
  });
  
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [streamingPref, setStreamingPref] = useState<boolean>(false);
  useEffect(() => { (async () => { try { const v = await AsyncStorage.getItem('@dash_streaming_enabled'); if (v !== null) setStreamingPref(v === 'true'); } catch {} })(); }, []);
  const toggleStreamingPref = async (v: boolean) => { setStreamingPref(v); try { await AsyncStorage.setItem('@dash_streaming_enabled', v ? 'true' : 'false'); } catch {} };
  const [expandedSections, setExpandedSections] = useState({
    personality: false,
    voice: false,
    chat: false,
    learning: false,
    advanced: false,
    privacy: false,
    custom: false,
    accessibility: false
  });

  useEffect(() => {
    initializeDashAI();
  }, []);

  const initializeDashAI = async () => {
    try {
      setLoading(true);
      await dashAI.initialize();
      
      // Load current settings from DashAI service
      const personality = dashAI.getPersonality();
      const memory = dashAI.getMemory();
      
      const loadedSettings = {
        // Start from current state to preserve unspecified settings
        ...settings,
        // Map DashAI personality to our settings, overriding current state
        personality: (personality.response_style === 'professional' ? 'professional' : 
                      personality.response_style === 'casual' ? 'casual' : 
                      personality.response_style === 'formal' ? 'formal' : 'encouraging') as 'professional' | 'casual' | 'encouraging' | 'formal',
        voiceLanguage: personality.voice_settings?.language || 'en-ZA',
        voiceType: 'female_warm',
        voiceRate: personality.voice_settings?.rate || 1.0,
        voicePitch: personality.voice_settings?.pitch || 1.0,
        memoryEnabled: memory && memory.length > 0,
        customInstructions: personality.personality_traits?.join(', ') || '',
      };
      
      setSettings(loadedSettings);
      console.log('📋 Enhanced settings loaded from DashAI:', loadedSettings);
      
      // Load available voices for the platform
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        setAvailableVoices(voices);
        console.log('🎤 Available voices:', voices.length);
      } catch (error) {
        console.warn('Failed to load available voices:', error);
      }
    } catch (error) {
      console.error('Failed to initialize Dash AI:', error);
      Alert.alert('Error', 'Failed to load enhanced Dash AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Build personality object for DashAI
      const dashPersonality = {
        personality_traits: [
          settings.personality,
          'educational',
          'supportive',
          ...(settings.customInstructions ? settings.customInstructions.split(',').map(s => s.trim()) : [])
        ].filter(Boolean),
        response_style: settings.personality,
        voice_settings: {
          language: settings.voiceLanguage,
          rate: settings.voiceRate,
          pitch: settings.voicePitch,
          volume: settings.voiceVolume
        },
        user_context: settings.userContext,
        teaching_style: settings.teachingStyle
      };
      
      await dashAI.savePersonality(dashPersonality);
      console.log('✅ Enhanced settings saved to DashAI');
      
      Alert.alert(
        'Settings Saved',
        'Your enhanced Dash AI settings have been saved successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save enhanced settings:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save some settings. Please try again or contact support if the problem persists.'
      );
    } finally {
      setSaving(false);
    }
  };

  const testVoiceAdvanced = async () => {
    try {
      // Sync with basic settings voice test logic
      console.log('[Enhanced Voice Test] Testing advanced TTS voice settings');
      
      // Find the best matching voice for the current language
      let selectedVoice = undefined;
      if (availableVoices.length > 0) {
        const languageCode = settings.voiceLanguage.substring(0, 2);
        const matchingVoices = availableVoices.filter(voice => 
          voice.language?.startsWith(languageCode)
        );
        
        if (matchingVoices.length > 0) {
          // Prefer female voices if available
          const femaleVoice = matchingVoices.find(voice => 
            voice.name?.toLowerCase().includes('female') || 
            voice.name?.toLowerCase().includes('woman') ||
            voice.gender === 'female'
          );
          selectedVoice = femaleVoice?.identifier || matchingVoices[0]?.identifier;
        }
      }
      
      const personalityMessages = {
        'professional': 'Good day. I\'m Dash, your professional AI teaching assistant. I\'m ready to help with your educational needs.',
        'casual': 'Hey there! I\'m Dash, your friendly AI buddy. Ready to learn something awesome together?',
        'encouraging': 'Hello! I\'m Dash, and I\'m here to support you every step of the way. You\'re doing great!',
        'formal': 'Greetings. I am Dash, your dedicated educational assistant. I am prepared to assist with your academic endeavors.'
      };
      
      const testMessage = personalityMessages[settings.personality] || personalityMessages['encouraging'];
      
      await Speech.speak(testMessage, {
        language: settings.voiceLanguage,
        pitch: settings.voicePitch,
        rate: settings.voiceRate,
        volume: settings.voiceVolume,
        voice: selectedVoice,
        onStart: () => {
          console.log('[Enhanced Voice Test] Started speaking with voice:', selectedVoice);
        },
        onDone: () => {
          console.log('[Enhanced Voice Test] Finished speaking');
          Alert.alert('Voice Test', 'Voice test completed successfully!');
        },
        onError: (error: any) => {
          console.error('[Enhanced Voice Test] Speech error:', error);
          Alert.alert('Voice Test Error', 'Could not test voice settings. Please check device audio.');
        }
      });
    } catch (error) {
      console.error('[Enhanced Voice Test] Failed:', error);
      Alert.alert('Voice Test Failed', 'Could not test advanced voice settings');
    }
  };

  const resetToDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all enhanced settings to their default values. Your saved conversations and memory will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              // Reset to default enhanced settings
              voiceEnabled: true,
              proactiveHelp: true,
              memoryEnabled: true,
              multilingualSupport: true,
              personality: 'encouraging',
              personalityCustom: '',
              adaptiveTone: true,
              emotionalIntelligence: true,
              voiceLanguage: 'en-ZA',
              voiceType: 'female_warm',
              voiceRate: 1.0,
              voicePitch: 1.0,
              voiceVolume: 0.8,
              autoReadResponses: false,
              voiceActivation: false,
              enterToSend: true,
              autoVoiceReply: false,
              showTypingIndicator: true,
              readReceiptEnabled: true,
              soundEnabled: true,
              autoSuggestQuestions: true,
              contextualHelp: true,
              rememberPreferences: true,
              learnFromInteractions: true,
              personalizedRecommendations: true,
              crossSessionMemory: true,
              memoryRetentionDays: 30,
              predictiveText: true,
              smartNotifications: true,
              offlineMode: false,
              dataSync: true,
              experimentalFeatures: false,
              dataCollection: true,
              anonymousUsage: false,
              shareAnalytics: true,
              localProcessing: Platform.OS === 'ios',
              customInstructions: '',
              userContext: '',
              teachingStyle: 'adaptive',
              highContrast: false,
              largeFonts: false,
              screenReader: false,
              reducedMotion: false
            });
            Alert.alert('Settings Reset', 'All settings have been reset to defaults');
          }
        }
      ]
    );
  };

  const exportSettings = async () => {
    try {
      const settingsJSON = JSON.stringify(settings, null, 2);
      
      // In a real app, you'd use a sharing library or file system API
      Alert.alert(
        'Export Settings',
        'Settings exported to clipboard (in a real app, this would save to a file)',
        [
          { text: 'Copy to Clipboard', onPress: () => {
            // Clipboard.setString(settingsJSON);
            console.log('Settings JSON:', settingsJSON);
          }},
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export settings');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSectionHeader = (title: string, section: keyof typeof expandedSections, icon: string) => (
    <TouchableOpacity
      style={[styles.sectionHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
        {expandedSections[section] ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>
  );

  const renderToggleSetting = (
    key: string,
    title: string, 
    subtitle: string,
    value: boolean
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleSettingsChange(key, newValue)}
        trackColor={{ false: theme.border, true: `${theme.primary}40` }}
        thumbColor={value ? theme.primary : '#f4f3f4'}
      />
    </View>
  );

  const renderSliderSetting = (
    key: string,
    title: string,
    subtitle: string,
    value: number,
    min: number,
    max: number,
    step: number
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        <Text style={[styles.sliderValue, { color: theme.primary }]}>
          Current: {value.toFixed(1)}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={(newValue) => handleSettingsChange(key, newValue)}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
    </View>
  );

  const renderPickerSetting = (
    key: string,
    title: string,
    subtitle: string,
    value: string,
    options: { label: string; value: string }[]
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      <View style={styles.pickerContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              { 
                backgroundColor: value === option.value ? theme.primary : 'transparent',
                borderColor: theme.border
              }
            ]}
            onPress={() => handleSettingsChange(key, option.value)}
          >
            <Text style={[
              styles.pickerOptionText,
              { 
                color: value === option.value ? 'white' : theme.text
              }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader 
          title="Enhanced Dash AI Settings" 
          subtitle="Advanced AI assistant configuration" 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading enhanced settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader 
        title="Enhanced Dash AI Settings" 
        subtitle="Advanced configuration options" 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Actions</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={testVoiceAdvanced}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                🎤 Test Voice
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary, borderWidth: 1, borderColor: theme.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={saveSettings}
              disabled={saving}
            >
              <Text style={[styles.actionButtonText, { color: theme.onPrimary }]}>
                {saving ? '💾 Saving...' : '💾 Save All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={exportSettings}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                📤 Export
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.error }]}
              onPress={resetToDefaults}
            >
              <Text style={[styles.actionButtonText, { color: theme.error }]}>
                🔄 Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personality Settings */}
        {renderSectionHeader('Personality & Behavior', 'personality', '🎭')}
        {expandedSections.personality && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderPickerSetting(
              'personality',
              'AI Personality',
              'Choose how Dash communicates',
              settings.personality,
              [
                { label: 'Professional', value: 'professional' },
                { label: 'Casual', value: 'casual' },
                { label: 'Encouraging', value: 'encouraging' },
                { label: 'Formal', value: 'formal' }
              ]
            )}
            
            {renderToggleSetting(
              'adaptiveTone',
              'Adaptive Tone',
              'Adjusts communication style based on context',
              settings.adaptiveTone
            )}
            
            {renderToggleSetting(
              'emotionalIntelligence',
              'Emotional Intelligence',
              'Recognizes and responds to emotional cues',
              settings.emotionalIntelligence
            )}

            <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Custom Instructions</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                  Additional personality traits (comma-separated)
                </Text>
              </View>
              <TextInput
                style={[styles.textInput, { 
                  color: theme.text, 
                  borderColor: theme.border,
                  backgroundColor: theme.background 
                }]}
                value={settings.customInstructions}
                onChangeText={(text) => handleSettingsChange('customInstructions', text)}
                placeholder="e.g., humorous, patient, creative"
                placeholderTextColor={theme.textSecondary}
                multiline
              />
            </View>
          </View>
        )}

        {/* Voice Settings */}
        {renderSectionHeader('Voice & Speech', 'voice', '🗣️')}
        {expandedSections.voice && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Realtime Streaming (Beta) toggle */}
            <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Realtime Streaming (Beta)</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Stream voice input and receive live assistant tokens</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary, marginTop: 4 }]}>Requires EXPO_PUBLIC_DASH_STREAM_URL</Text>
              </View>
              <Switch
                value={streamingPref}
                onValueChange={toggleStreamingPref}
                trackColor={{ false: theme.border, true: `${theme.primary}40` }}
                thumbColor={streamingPref ? theme.primary : '#f4f3f4'}
              />
            </View>

            {renderToggleSetting(
              'voiceEnabled',
              'Voice Responses',
              'Enable text-to-speech for Dash responses',
              settings.voiceEnabled
            )}
            
            {renderPickerSetting(
              'voiceLanguage',
              'Voice Language',
              'Primary language for voice output',
              settings.voiceLanguage,
              [
                { label: 'English (SA)', value: 'en-ZA' },
                { label: 'English (US)', value: 'en-US' },
                { label: 'Afrikaans', value: 'af' },
                { label: 'Zulu', value: 'zu' }
              ]
            )}

            {renderSliderSetting(
              'voiceRate',
              'Speech Rate',
              'How fast Dash speaks',
              settings.voiceRate,
              0.5,
              2.0,
              0.1
            )}

            {renderSliderSetting(
              'voicePitch',
              'Voice Pitch',
              'Voice pitch level',
              settings.voicePitch,
              0.5,
              2.0,
              0.1
            )}

            {renderSliderSetting(
              'voiceVolume',
              'Voice Volume',
              'Audio output volume',
              settings.voiceVolume,
              0.1,
              1.0,
              0.1
            )}

            {renderToggleSetting(
              'autoReadResponses',
              'Auto-Read Responses',
              'Automatically speak Dash responses',
              settings.autoReadResponses
            )}

            {renderToggleSetting(
              'voiceActivation',
              'Voice Activation',
              'Wake Dash with voice commands',
              settings.voiceActivation
            )}
          </View>
        )}

        {/* Chat Behavior */}
        {renderSectionHeader('Chat & Interaction', 'chat', '💬')}
        {expandedSections.chat && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderToggleSetting(
              'enterToSend',
              'Enter to Send',
              'Send messages by pressing Enter',
              settings.enterToSend
            )}
            
            {renderToggleSetting(
              'autoVoiceReply',
              'Auto Voice Reply',
              'Automatically respond with voice',
              settings.autoVoiceReply
            )}

            {renderToggleSetting(
              'showTypingIndicator',
              'Typing Indicator',
              'Show when Dash is thinking',
              settings.showTypingIndicator
            )}

            {renderToggleSetting(
              'readReceiptEnabled',
              'Read Receipts',
              'Show when messages are read',
              settings.readReceiptEnabled
            )}

            {renderToggleSetting(
              'soundEnabled',
              'Sound Effects',
              'Play notification sounds',
              settings.soundEnabled
            )}

            {renderToggleSetting(
              'autoSuggestQuestions',
              'Question Suggestions',
              'Suggest follow-up questions',
              settings.autoSuggestQuestions
            )}

            {renderToggleSetting(
              'contextualHelp',
              'Contextual Help',
              'Offer help based on current topic',
              settings.contextualHelp
            )}
          </View>
        )}

        {/* Learning & Memory */}
        {renderSectionHeader('Learning & Memory', 'learning', '🧠')}
        {expandedSections.learning && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderToggleSetting(
              'rememberPreferences',
              'Remember Preferences',
              'Save your settings and preferences',
              settings.rememberPreferences
            )}

            {renderToggleSetting(
              'learnFromInteractions',
              'Learn from Interactions',
              'Improve responses based on conversations',
              settings.learnFromInteractions
            )}

            {renderToggleSetting(
              'personalizedRecommendations',
              'Personalized Recommendations',
              'Tailor suggestions to your needs',
              settings.personalizedRecommendations
            )}

            {renderToggleSetting(
              'crossSessionMemory',
              'Cross-Session Memory',
              'Remember context between sessions',
              settings.crossSessionMemory
            )}

            {renderSliderSetting(
              'memoryRetentionDays',
              'Memory Retention',
              'Days to keep conversation history',
              settings.memoryRetentionDays,
              1,
              365,
              1
            )}
          </View>
        )}

        {/* Advanced Features */}
        {renderSectionHeader('Advanced Features', 'advanced', '⚙️')}
        {expandedSections.advanced && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderToggleSetting(
              'predictiveText',
              'Predictive Text',
              'Suggest completions while typing',
              settings.predictiveText
            )}

            {renderToggleSetting(
              'smartNotifications',
              'Smart Notifications',
              'Intelligent notification timing',
              settings.smartNotifications
            )}

            {renderToggleSetting(
              'offlineMode',
              'Offline Mode',
              'Limited functionality without internet',
              settings.offlineMode
            )}

            {renderToggleSetting(
              'dataSync',
              'Data Synchronization',
              'Sync settings across devices',
              settings.dataSync
            )}

            {renderToggleSetting(
              'experimentalFeatures',
              'Experimental Features',
              'Enable beta features (may be unstable)',
              settings.experimentalFeatures
            )}
          </View>
        )}

        {/* Privacy & Data */}
        {renderSectionHeader('Privacy & Data', 'privacy', '🔒')}
        {expandedSections.privacy && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderToggleSetting(
              'dataCollection',
              'Data Collection',
              'Allow data collection for improvements',
              settings.dataCollection
            )}

            {renderToggleSetting(
              'anonymousUsage',
              'Anonymous Usage Stats',
              'Share anonymous usage statistics',
              settings.anonymousUsage
            )}

            {renderToggleSetting(
              'shareAnalytics',
              'Share Analytics',
              'Help improve Dash with usage data',
              settings.shareAnalytics
            )}

            {renderToggleSetting(
              'localProcessing',
              'Local Processing',
              'Process data on device when possible',
              settings.localProcessing
            )}
          </View>
        )}

        {/* Custom Instructions */}
        {renderSectionHeader('Customization', 'custom', '🎨')}
        {expandedSections.custom && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderPickerSetting(
              'teachingStyle',
              'Teaching Style',
              'How Dash explains concepts',
              settings.teachingStyle,
              [
                { label: 'Direct', value: 'direct' },
                { label: 'Guided', value: 'guided' },
                { label: 'Socratic', value: 'socratic' },
                { label: 'Adaptive', value: 'adaptive' }
              ]
            )}

            <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>User Context</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                  Tell Dash about yourself for better assistance
                </Text>
              </View>
              <TextInput
                style={[styles.textInput, { 
                  color: theme.text, 
                  borderColor: theme.border,
                  backgroundColor: theme.background 
                }]}
                value={settings.userContext}
                onChangeText={(text) => handleSettingsChange('userContext', text)}
                placeholder="e.g., Grade 5 teacher, Math specialist, New to teaching"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* Accessibility */}
        {renderSectionHeader('Accessibility', 'accessibility', '♿')}
        {expandedSections.accessibility && (
          <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderToggleSetting(
              'highContrast',
              'High Contrast',
              'Increase color contrast for better visibility',
              settings.highContrast
            )}

            {renderToggleSetting(
              'largeFonts',
              'Large Fonts',
              'Use larger text throughout the app',
              settings.largeFonts
            )}

            {renderToggleSetting(
              'screenReader',
              'Screen Reader Support',
              'Optimize for screen reader users',
              settings.screenReader
            )}

            {renderToggleSetting(
              'reducedMotion',
              'Reduced Motion',
              'Minimize animations and effects',
              settings.reducedMotion
            )}
          </View>
        )}

        {/* Back to Basic Settings */}
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: theme.primary }]}>
            ← Back to Basic Settings
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingRow: {
    padding: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  backButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});