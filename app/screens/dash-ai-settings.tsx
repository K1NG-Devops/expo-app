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
  TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';


export default function DashAISettingsScreen() {
  const { theme } = useTheme();
  const [dashAI] = useState(() => DashAIAssistant.getInstance());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    proactiveHelp: true,
    memoryEnabled: true,
    multilingualSupport: true,
    personality: 'encouraging' as 'professional' | 'casual' | 'encouraging' | 'formal',
    voiceLanguage: 'en-ZA',
    voiceType: 'male',
    voiceRate: 1.0,
    voicePitch: 1.0,
    // Chat Behavior Settings
    enterToSend: true,
    autoVoiceReply: false,
    showTypingIndicator: true,
    readReceiptEnabled: true,
    soundEnabled: true,
    voiceSettings: {
      language: 'en-ZA',
      voice: 'male',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8
    },
    inAppWakeWord: false,
  });
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  // Streaming preference toggle
  const [streamingPref, setStreamingPref] = useState<boolean>(false);
  const toggleStreamingPref = async (v: boolean) => {
    setStreamingPref(v);
    try { await AsyncStorage.setItem('@dash_streaming_enabled', v ? 'true' : 'false'); } catch {}
  };

  useEffect(() => {
    initializeDashAI();
  }, []);

  const initializeDashAI = async () => {
    try {
      setLoading(true);
      await dashAI.initialize();
      
      // Load current settings from DashAI service
      const personality = dashAI.getPersonality();
      const loadedSettings = {
        personality: (personality.response_style === 'professional' ? 'professional' : 
                      personality.response_style === 'casual' ? 'casual' : 
                      personality.response_style === 'formal' ? 'formal' : 'encouraging') as 'professional' | 'casual' | 'encouraging' | 'formal',
        voiceLanguage: personality.voice_settings?.language || 'en-ZA',
        voiceType: 'male',
        voiceRate: personality.voice_settings?.rate || 1.0,
        voicePitch: personality.voice_settings?.pitch || 1.0,
        voiceEnabled: true,
        proactiveHelp: true,
        memoryEnabled: true,
        multilingualSupport: true,
        // Chat Behavior Settings
        enterToSend: true,
        autoVoiceReply: false,
        showTypingIndicator: true,
        readReceiptEnabled: true,
        soundEnabled: true,
        voiceSettings: {
          language: personality.voice_settings?.language || 'en-ZA',
          voice: 'male',
          rate: personality.voice_settings?.rate || 1.0,
          pitch: personality.voice_settings?.pitch || 1.0,
          volume: 0.8
        },
        inAppWakeWord: false,
      };
      
      setSettings(loadedSettings);
      console.log('📋 Loaded settings from DashAI:', loadedSettings);
      
      // Load persisted settings
      await loadSettingsFromPersistentStorage(loadedSettings);
      
      setSettings(loadedSettings);

      // Load available voices for the platform
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        setAvailableVoices(voices);
        console.log('🎤 Available voices:', voices.length);
      } catch (_error) {
        console.warn('Failed to load available voices:', _error);
      }
    } catch (_error) {
      console.error('Failed to initialize Dash AI:', _error);
      Alert.alert('Error', 'Failed to load Dash AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = async (newSettings: any) => {
    try {
      // Update local state immediately
      setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
      
      // Show what changed
      const changedKeys = Object.keys(newSettings);
      console.log('🔄 Settings changed:', changedKeys.join(', '));
      
      // Auto-save all settings types
      await saveSettingsToPersistentStorage(newSettings);
      
      // Auto-save to DashAI service for personality and voice settings
      if (newSettings.voiceLanguage || newSettings.voiceRate || newSettings.voicePitch || newSettings.personality || newSettings.voiceEnabled) {
        const updatedSettings = { ...settings, ...newSettings };
        const dashPersonality = {
          personality_traits: [
            updatedSettings.personality || 'encouraging',
            'educational',
            'supportive'
          ],
          response_style: (updatedSettings.personality === 'professional' ? 'professional' : 
                           updatedSettings.personality === 'casual' ? 'casual' : 
                           updatedSettings.personality === 'formal' ? 'formal' : 'encouraging') as 'professional' | 'casual' | 'encouraging' | 'formal',
          voice_settings: {
            language: updatedSettings.voiceLanguage || updatedSettings.voiceSettings?.language || 'en-ZA',
            rate: updatedSettings.voiceRate || updatedSettings.voiceSettings?.rate || 1.0,
            pitch: updatedSettings.voicePitch || updatedSettings.voiceSettings?.pitch || 1.0,
            enabled: updatedSettings.voiceEnabled !== undefined ? updatedSettings.voiceEnabled : true
          }
        };
        
        await dashAI.savePersonality(dashPersonality);
        console.log('✅ Settings auto-saved to DashAI:', newSettings);
        
        // Show brief success feedback for important changes
        if (newSettings.personality) {
          showSettingsToast(`Personality updated to ${newSettings.personality}`);
        } else if (newSettings.voiceEnabled !== undefined) {
          showSettingsToast(`Voice ${newSettings.voiceEnabled ? 'enabled' : 'disabled'}`);
        }
      }
      
      console.log('Settings updated and synchronized:', newSettings);
    } catch (_error) {
      console.error('Failed to update settings:', _error);
      Alert.alert('Settings Error', 'Settings were updated locally but may not be saved permanently. Please try again.');
    }
  };

  const saveSettingsToPersistentStorage = async (newSettings: any) => {
    const settingsToSave = [
      { key: '@dash_ai_voice_enabled', value: 'voiceEnabled' },
      { key: '@dash_ai_memory_enabled', value: 'memoryEnabled' },
      { key: '@dash_ai_proactive_help', value: 'proactiveHelp' },
      { key: '@dash_ai_in_app_wake_word', value: 'inAppWakeWord' },
      { key: '@dash_ai_enter_to_send', value: 'enterToSend' },
      { key: '@dash_ai_personality', value: 'personality' },
    ];

    for (const { key, value } of settingsToSave) {
      if (newSettings[value] !== undefined) {
        try {
          await AsyncStorage.setItem(key, String(newSettings[value]));
          console.log(`✅ Saved ${key}:`, newSettings[value]);
        } catch (error) {
          console.warn(`Failed to save ${key}:`, error);
        }
      }
    }
  };

  const loadSettingsFromPersistentStorage = async (loadedSettings: any) => {
    const settingsToLoad = [
      { key: '@dash_ai_voice_enabled', value: 'voiceEnabled', default: true },
      { key: '@dash_ai_memory_enabled', value: 'memoryEnabled', default: true },
      { key: '@dash_ai_proactive_help', value: 'proactiveHelp', default: true },
      { key: '@dash_ai_in_app_wake_word', value: 'inAppWakeWord', default: false },
      { key: '@dash_ai_enter_to_send', value: 'enterToSend', default: true },
      { key: '@dash_ai_personality', value: 'personality', default: 'encouraging' },
    ];

    for (const { key, value, default: defaultValue } of settingsToLoad) {
      try {
        const storedValue = await AsyncStorage.getItem(key);
        if (storedValue !== null) {
          if (typeof defaultValue === 'boolean') {
            loadedSettings[value] = storedValue === 'true';
          } else {
            loadedSettings[value] = storedValue;
          }
          console.log(`💾 Loaded ${key}:`, loadedSettings[value]);
        }
      } catch (error) {
        console.warn(`Failed to load ${key}:`, error);
      }
    }
  };

  // Voice chat preferences (dock)
  const [voiceDefaultLock, setVoiceDefaultLock] = useState(false);
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(true);
  const [voiceAutoSilenceMs, setVoiceAutoSilenceMs] = useState('7000');
  const [voiceListenCapMs, setVoiceListenCapMs] = useState('15000');

  useEffect(() => {
    (async () => {
      try {
        const vdl = await AsyncStorage.getItem('@voice_default_lock');
        const vas = await AsyncStorage.getItem('@voice_auto_speak');
        const asMs = await AsyncStorage.getItem('@voice_auto_silence_ms');
        const capMs = await AsyncStorage.getItem('@voice_listen_cap_ms');
        if (vdl !== null) setVoiceDefaultLock(vdl === 'true');
        if (vas !== null) setVoiceAutoSpeak(vas === 'true');
        if (asMs) setVoiceAutoSilenceMs(asMs);
        if (capMs) setVoiceListenCapMs(capMs);
      } catch {}
    })();
  }, []);

  const persistVoicePref = async (key: string, value: string) => {
    try { await AsyncStorage.setItem(key, value); } catch {}
  };

  const showSettingsToast = (message: string) => {
    // Simple alert for now - could be replaced with toast library
    console.log('🔊 Settings feedback:', message);
  };

  // Manual save function with user feedback
  const manualSave = async () => {
    try {
      const settingsData = {
        voiceEnabled: settings.voiceEnabled,
        speechSpeed: settings.voiceSettings?.rate || 1.0,
        speechVolume: settings.voiceSettings?.volume || 0.8,
        preferredLanguage: settings.voiceSettings?.language || 'en-ZA',
        memoryEnabled: settings.memoryEnabled,
        personality: settings.personality,
        proactiveHelp: settings.proactiveHelp,
        enterToSend: settings.enterToSend,
        inAppWakeWord: settings.inAppWakeWord
      };
      
      // Save to persistent storage
      await AsyncStorage.setItem('@dash_ai_settings_backup', JSON.stringify(settingsData));
      
      // Also trigger the regular save process
      await saveSettingsToPersistentStorage(settingsData);
      
      // Save to DashAI service
      const dashPersonality = {
        personality_traits: [
          settings.personality || 'encouraging',
          'educational',
          'supportive'
        ],
        response_style: settings.personality || 'encouraging',
        voice_settings: {
          language: settings.voiceSettings?.language || 'en-ZA',
          rate: settings.voiceSettings?.rate || 1.0,
          pitch: settings.voiceSettings?.pitch || 1.0,
          enabled: settings.voiceEnabled
        }
      };
      
      await dashAI.savePersonality(dashPersonality);
      
      Alert.alert('Settings Saved', 'All settings have been saved successfully!');
      console.log('✅ Manual save completed successfully');
    } catch (error) {
      Alert.alert('Save Error', 'Failed to save settings. Please try again.');
      console.error('❌ Manual save failed:', error);
    }
  };

  const testVoice = async () => {
    try {
      // Voice test only uses TTS, no microphone permissions needed
      console.log('[Voice Test] Testing TTS voice settings');
      
      // Find the best matching voice for the current language
      let selectedVoice = undefined;
      if (availableVoices.length > 0) {
        const languageCode = (settings.voiceSettings?.language || 'en-ZA').substring(0, 2);
        const matchingVoices = availableVoices.filter(voice => 
          voice.language?.startsWith(languageCode)
        );
        
        if (matchingVoices.length > 0) {
          // Prefer male voices if available
          const maleVoice = matchingVoices.find(voice => 
            voice.name?.toLowerCase().includes('male') || 
            voice.name?.toLowerCase().includes('man') ||
            voice.gender === 'male'
          );
          selectedVoice = maleVoice?.identifier || matchingVoices[0]?.identifier;
        }
      }
      
      const personalityGreeting = {
        'professional': 'Good day! I\'m Dash, your AI teaching assistant.',
        'casual': 'Hey there! I\'m Dash, your friendly AI buddy.',
        'encouraging': 'Hello! I\'m Dash, and I\'m here to support your learning journey.',
        'formal': 'Greetings. I am Dash, your educational AI assistant.'
      };
      
      const testMessage = personalityGreeting[settings.personality] || personalityGreeting['encouraging'] + ' This is how I sound with your current voice settings.';
      
      await Speech.speak(testMessage, {
        language: settings.voiceSettings?.language || 'en-ZA',
        pitch: settings.voiceSettings?.pitch || 1.0,
        rate: settings.voiceSettings?.rate || 1.0,
        voice: selectedVoice,
        onStart: () => {
          console.log('[Quick Action Voice Test] Started speaking with voice:', selectedVoice);
        },
        onDone: () => {
          console.log('[Quick Action Voice Test] Finished speaking');
        },
        onError: (error: any) => {
          console.error('[Quick Action Voice Test] Speech error:', error);
          Alert.alert('Voice Test Error', 'Could not test voice settings. Please check device audio.');
        }
      });
    } catch (error) {
      console.error('[Quick Action Voice Test] Failed:', error);
      Alert.alert('Voice Test Failed', 'Could not test voice settings');
    }
  };

  const clearMemory = async () => {
    Alert.alert(
      'Clear Memory',
      'This will delete all of Dash\'s memory about your preferences and conversation history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Memory',
          style: 'destructive',
          onPress: async () => {
            try {
              await dashAI.clearMemory();
              Alert.alert('Success', 'Dash\'s memory has been cleared');
            } catch (_error) {
              Alert.alert('Error', 'Failed to clear memory');
            }
          }
        }
      ]
    );
  };

  const isVoiceLanguageAvailable = (languageCode: string): boolean => {
    if (!availableVoices || availableVoices.length === 0) return true; // Assume available if we can't check
    
    const langCode = languageCode.substring(0, 2);
    return availableVoices.some(voice => 
      voice.language?.startsWith(langCode) || voice.language?.startsWith(languageCode)
    );
  };
  
  const suggestVoiceDownload = (languageCode: string) => {
    const languageName = {
      'en-ZA': 'English (South Africa)',
      'en-US': 'English (US)', 
      'en-GB': 'English (UK)',
      'af': 'Afrikaans',
      'zu': 'Zulu',
      'xh': 'Xhosa'
    }[languageCode] || languageCode;
    
    Alert.alert(
      `${languageName} Voice Not Available`,
      `The ${languageName} voice pack is not installed on this device. You can:\n\n• Install it from device settings\n• Use the default voice instead\n• Try a different language`,
      [
        { text: 'Install Voice Pack', onPress: () => {
          Alert.alert(
            'Install Voice Pack', 
            `To install ${languageName}:\n\n📱 iOS: Settings > Accessibility > Spoken Content > Voices\n\n🤖 Android: Settings > Language & Input > Text-to-Speech > Settings\n\nDownload the ${languageName} voice pack and try again.`,
            [{ text: 'Got it' }]
          );
        }},
        { text: 'Use Default Voice', style: 'cancel' },
        { text: 'Change Language', onPress: () => {
          Alert.alert('Language Options', 'Go to Advanced Settings to change the voice language to one that\'s installed on your device.');
        }}
      ]
    );
  };

  const viewMemory = async () => {
    try {
      const memory = await dashAI.getMemory();
      
      if (!memory || memory.length === 0) {
        Alert.alert(
          'Dash Memory',
          'Dash hasn\'t stored any memories yet. Start using Dash AI features to build up memory!',
          [
            { text: 'View Conversations', onPress: () => router.push('/screens/dash-conversations-history') },
            { text: 'OK' }
          ]
        );
        return;
      }
      
      // Create a more readable memory summary
      const memoryByType = memory.reduce((acc, item) => {
        const type = item.type || 'general';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {} as Record<string, any[]>);
      
      let summaryText = `Dash remembers ${memory.length} items about you:\n\n`;
      
      Object.entries(memoryByType).forEach(([type, items]) => {
        summaryText += `${type.toUpperCase()}: ${items.length} items\n`;
        items.slice(0, 2).forEach(item => {
          const valuePreview = typeof item.value === 'string' 
            ? item.value.substring(0, 50) + (item.value.length > 50 ? '...' : '') 
            : JSON.stringify(item.value).substring(0, 50) + '...';
          summaryText += `  • ${item.key || 'Unnamed'}: ${valuePreview}\n`;
        });
        if (items.length > 2) {
          summaryText += `  ... and ${items.length - 2} more\n`;
        }
        summaryText += '\n';
      });
      
      Alert.alert(
        'Dash Memory',
        summaryText,
        [
          { text: 'View All', onPress: () => router.push('/screens/dash-conversations-history') },
          { text: 'Clear All', style: 'destructive', onPress: clearMemory },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error viewing memory:', error);
      Alert.alert('Error', 'Could not load memory. Try again later.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader 
          title="Dash AI Settings" 
          subtitle="Configure your AI assistant" 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading Dash AI settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader 
        title="Dash AI Settings" 
        subtitle="Configure your AI assistant preferences" 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Save Status and Manual Save */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.saveHeader}>
            <View style={styles.saveStatus}>
              <View style={[styles.saveIndicator, { backgroundColor: theme.success }]} />
              <Text style={[styles.saveStatusText, { color: theme.textSecondary }]}>
                Settings auto-save enabled
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.manualSaveButton, { backgroundColor: theme.primary }]}
              onPress={manualSave}
            >
              <Ionicons name="save-outline" size={16} color={theme.onPrimary} />
              <Text style={[styles.manualSaveText, { color: theme.onPrimary }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Actions</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={viewMemory}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                🧠 View Memory
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.dangerButton, { backgroundColor: theme.surface, borderColor: theme.error, borderWidth: 1 }]}
            onPress={clearMemory}
          >
            <Text style={[styles.dangerButtonText, { color: theme.error }]}>
              🗑️ Clear All Memory
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginTop: 8 }]}
            onPress={() => router.push('/screens/dash-ai-settings-enhanced')}
          >
            <Text style={[styles.actionButtonText, { color: theme.text }]}>
              ⚙️ Advanced Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Settings */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>AI Settings</Text>

          {/* Realtime Streaming (Beta) */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Realtime Streaming (Beta)</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Stream voice input and get live assistant tokens</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary, marginTop: 4 }]}>Requires backend WebSocket at EXPO_PUBLIC_DASH_STREAM_URL</Text>
            </View>
            <Switch
              value={streamingPref}
              onValueChange={toggleStreamingPref}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={streamingPref ? theme.primary : '#f4f3f4'}
            />
          </View>
          
          {/* Personality Setting */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>AI Personality</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Choose how Dash communicates</Text>
            </View>
          </View>
          
          <View style={styles.personalityRow}>
            {['professional', 'casual', 'encouraging', 'formal'].map((personality) => (
              <TouchableOpacity
                key={personality}
                style={[
                  styles.personalityButton,
                  {
                    backgroundColor: settings.personality === personality ? theme.primary : 'transparent',
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleSettingsChange({ personality })}
              >
                <Text
                  style={[
                    styles.personalityButtonText,
                    {
                      color: settings.personality === personality ? theme.onPrimary : theme.text,
                    },
                  ]}
                >
                  {personality.charAt(0).toUpperCase() + personality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Voice Settings */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Voice & Speech</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Configure text-to-speech settings</Text>
            </View>
            <TouchableOpacity 
              style={[styles.testVoiceButton, { backgroundColor: theme.primary, borderRadius: 6 }]}
              onPress={testVoice}
            >
              <Text style={[styles.testVoiceButtonText, { color: theme.onPrimary }]}>
                🔊 Test
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Voice Enabled</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Enable text-to-speech responses</Text>
            </View>
            <Switch
              value={settings.voiceEnabled}
              onValueChange={(voiceEnabled) => handleSettingsChange({ voiceEnabled })}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={settings.voiceEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* Memory Setting */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Memory Enabled</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Remember conversations and preferences</Text>
            </View>
            <Switch
              value={settings.memoryEnabled}
              onValueChange={(memoryEnabled) => handleSettingsChange({ memoryEnabled })}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={settings.memoryEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* In-app Wake Word */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>'Hello Dash' Wake Word (in app)</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Say "Hello Dash" to open the assistant while the app is open.</Text>
              <View style={[styles.warningBox, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary, marginTop: 8 }]}>
                <Text style={[styles.warningText, { color: theme.primary }]}>⚙️ Setup required: Add your Picovoice access key to enable wake word detection.</Text>
              </View>
            </View>
            <Switch
              value={settings.inAppWakeWord}
              onValueChange={(inAppWakeWord) => handleSettingsChange({ inAppWakeWord })}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={settings.inAppWakeWord ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* Proactive Help Setting */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Proactive Help</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Offer suggestions and help automatically</Text>
            </View>
            <Switch
              value={settings.proactiveHelp}
              onValueChange={(proactiveHelp) => handleSettingsChange({ proactiveHelp })}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={settings.proactiveHelp ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* Enter to Send Setting */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Enter is Send</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Press Enter to send messages instead of creating new lines</Text>
            </View>
            <Switch
              value={settings.enterToSend}
              onValueChange={(enterToSend) => handleSettingsChange({ enterToSend })}
              trackColor={{ false: theme.border, true: `${theme.primary}40` }}
              thumbColor={settings.enterToSend ? theme.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Settings Debug Info */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Current Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Personality</Text>
            <Text style={[styles.settingValue, { color: theme.text }]}>
              {settings.personality === 'encouraging' ? 'Encouraging & Warm' : 
               settings.personality === 'professional' ? 'Professional' : 
               settings.personality === 'casual' ? 'Casual & Friendly' :
               settings.personality === 'formal' ? 'Formal' : 'Encouraging'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Voice Type</Text>
            <Text style={[styles.settingValue, { color: theme.text }]}>
              {settings.voiceSettings?.voice === 'female' ? 'Female, Warm' : 'Female, Warm'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Voice Language</Text>
              <Text style={[styles.settingValue, { color: theme.text }]}>
                {settings.voiceSettings?.language === 'en-ZA' ? 'English (South Africa)' : 
                 settings.voiceSettings?.language === 'en-US' ? 'English (US)' : 
                 settings.voiceSettings?.language === 'en-GB' ? 'English (UK)' : 'English (South Africa)'}
              </Text>
              {!isVoiceLanguageAvailable(settings.voiceSettings?.language || 'en-ZA') && (
                <View style={[styles.warningBox, { backgroundColor: `${theme.warning}20`, borderColor: theme.warning, marginTop: 4 }]}>
                  <Text style={[styles.warningText, { color: theme.warning, fontSize: 12 }]}>⚠️ Voice not installed</Text>
                  <TouchableOpacity 
                    style={[styles.warningButton, { borderColor: theme.warning, paddingVertical: 2, paddingHorizontal: 6 }]}
                    onPress={() => suggestVoiceDownload(settings.voiceSettings?.language || 'en-ZA')}
                  >
                    <Text style={[styles.warningButtonText, { color: theme.warning, fontSize: 10 }]}>Download</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Wake Word</Text>
            <Text style={[styles.settingValue, { color: theme.text }]}>
              In-app: {settings.inAppWakeWord ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Memory & Features</Text>
            <Text style={[styles.settingValue, { color: theme.text }]}>
              Memory: {settings.memoryEnabled ? 'Yes' : 'No'}\n
              Voice: {settings.voiceEnabled ? 'Yes' : 'No'}\n
              Proactive Help: {settings.proactiveHelp ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        {/* Information Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>About Dash AI</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Dash is your intelligent AI teaching assistant, designed specifically for South African educators. 
            It can help with lesson planning, homework assistance, grading, and educational insights.
          </Text>
          
          <View style={styles.featureList}>
            <Text style={[styles.featureItem, { color: theme.textSecondary }]}>
              ✓ Multi-language support (11 official SA languages)
            </Text>
            <Text style={[styles.featureItem, { color: theme.textSecondary }]}>
              ✓ Curriculum-aligned content generation
            </Text>
            <Text style={[styles.featureItem, { color: theme.textSecondary }]}>
              ✓ Personalized learning recommendations
            </Text>
            <Text style={[styles.featureItem, { color: theme.textSecondary }]}>
              ✓ Voice interaction and audio feedback
            </Text>
            <Text style={[styles.featureItem, { color: theme.textSecondary }]}>
              ✓ Persistent memory and context awareness
            </Text>
          </View>
        </View>

        {/* Navigation to other AI screens */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>AI Features</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Access different AI-powered tools
          </Text>
          
          <View style={styles.navigationGrid}>
            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => router.push('/screens/ai-lesson-generator')}
            >
              <Text style={styles.navButtonEmoji}>📚</Text>
              <Text style={[styles.navButtonText, { color: theme.text }]}>
                Lesson Generator
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => router.push('/screens/ai-homework-helper')}
            >
              <Text style={styles.navButtonEmoji}>📝</Text>
              <Text style={[styles.navButtonText, { color: theme.text }]}>
                Homework Helper
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => router.push('/screens/ai-homework-grader-live')}
            >
              <Text style={styles.navButtonEmoji}>✅</Text>
              <Text style={[styles.navButtonText, { color: theme.text }]}>
                Grade Homework
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => router.push('/screens/dash-assistant')}
            >
              <Text style={styles.navButtonEmoji}>🤖</Text>
              <Text style={[styles.navButtonText, { color: theme.text }]}>
                Chat with Dash
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    gap: 4,
  },
  featureItem: {
    fontSize: 13,
    lineHeight: 18,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  navButtonEmoji: {
    fontSize: 24,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  warningButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  warningButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  testVoiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testVoiceButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  personalityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  personalityButton: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  personalityButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  saveStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  manualSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  manualSaveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  inputCompact: { minWidth: 110, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'right' }
});
