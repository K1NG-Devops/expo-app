import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';


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
    voiceType: 'female_warm',
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
      voice: 'female',
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8
    }
  });
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

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
        voiceType: 'female_warm',
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
          voice: 'female',
          rate: personality.voice_settings?.rate || 1.0,
          pitch: personality.voice_settings?.pitch || 1.0,
          volume: 0.8
        }
      };
      
      setSettings(loadedSettings);
      console.log('📋 Loaded settings from DashAI:', loadedSettings);
      
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
      
      // Auto-save to DashAI service
      if (newSettings.voiceLanguage || newSettings.voiceRate || newSettings.voicePitch || newSettings.personality) {
        const dashPersonality = {
          personality_traits: [
            newSettings.personality || 'encouraging',
            'educational',
            'supportive'
          ],
          response_style: (newSettings.personality === 'professional' ? 'professional' : 
                           newSettings.personality === 'casual' ? 'casual' : 
                           newSettings.personality === 'formal' ? 'formal' : 'encouraging') as 'professional' | 'casual' | 'encouraging' | 'formal',
          voice_settings: {
            language: newSettings.voiceLanguage || 'en-ZA',
            rate: newSettings.voiceRate || 1.0,
            pitch: newSettings.voicePitch || 1.0,
          }
        };
        
        await dashAI.savePersonality(dashPersonality);
        console.log('✅ Settings auto-saved to DashAI:', newSettings);
        
        // Show brief success feedback for personality/voice changes
        if (newSettings.personality) {
          Alert.alert('Personality Updated', `Dash is now using the ${newSettings.personality} personality style.`, [{ text: 'OK' }]);
        }
      }
      
      console.log('Settings updated and synchronized:', newSettings);
    } catch (_error) {
      console.error('Failed to update settings:', _error);
      Alert.alert('Settings Error', 'Settings were updated locally but may not be saved permanently. Please try again.');
    }
  };

  const testVoice = async () => {
    try {
      // Voice test only uses TTS, no microphone permissions needed
      console.log('[Voice Test] Testing TTS voice settings');
      
      // Find the best matching voice for the current language
      let selectedVoice = undefined;
      if (availableVoices.length > 0) {
        const languageCode = (settings.voiceLanguage || 'en-ZA').substring(0, 2);
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
      
      const testMessage = `Hello! This is Dash speaking with a speech rate of ${settings.voiceRate || 1.0} and pitch of ${settings.voicePitch || 1.0}. Voice recording is ${settings.voiceEnabled ? 'enabled' : 'disabled'}.`;
      
      await Speech.speak(testMessage, {
        language: settings.voiceLanguage || 'en-ZA',
        pitch: settings.voicePitch || 1.0,
        rate: settings.voiceRate || 1.0,
        voice: selectedVoice,
        onStart: () => {
          console.log('[Quick Action Voice Test] Started speaking with voice:', selectedVoice);
        },
        onDone: () => {
          console.log('[Quick Action Voice Test] Finished speaking');
        },
        onError: (error: any) => {
          console.error('[Quick Action Voice Test] Speech error:', _error);
          Alert.alert('Voice Test Error', 'Could not test voice settings. Please check device audio.');
        }
      });
    } catch (_error) {
      console.error('[Quick Action Voice Test] Failed:', _error);
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

  const viewMemory = async () => {
    try {
      const memory = dashAI.getMemory();
      
      if (!memory || memory.length === 0) {
        Alert.alert(
          'Dash Memory',
          'Dash hasn\'t stored any memories yet. Start using Dash AI features to build up memory!',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Create a more readable memory summary
      const memoryByType = memory.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, { /* TODO: Implement */ } as Record<string, any[]>);
      
      let summaryText = `Dash remembers ${memory.length} items about you:\n\n`;
      
      Object.entries(memoryByType).forEach(([type, items]) => {
        summaryText += `${type.toUpperCase()}: ${items.length} items\n`;
        items.slice(0, 2).forEach(item => {
          const valuePreview = typeof item.value === 'string' 
            ? item.value.substring(0, 50) + '...' 
            : JSON.stringify(item.value).substring(0, 50) + '...';
          summaryText += `  • ${item.key}: ${valuePreview}\n`;
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
          { text: 'Clear All', style: 'destructive', onPress: clearMemory },
          { text: 'OK' }
        ]
      );
    } catch (_error) {
      console.error('Error viewing memory:', _error);
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
        
        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Actions</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#2196F3' }]}
              onPress={testVoice}
            >
              <Text style={[styles.actionButtonText, { color: '#1976D2' }]}>
                🔊 Test Voice
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#E8F5E8', borderWidth: 1, borderColor: '#4CAF50' }]}
              onPress={viewMemory}
            >
              <Text style={[styles.actionButtonText, { color: '#388E3C' }]}>
                🧠 View Memory
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.dangerButton, { backgroundColor: '#FFEBEE', borderColor: '#F44336', borderWidth: 1 }]}
            onPress={clearMemory}
          >
            <Text style={[styles.dangerButtonText, { color: '#D32F2F' }]}>
              🗑️ Clear All Memory
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#9C27B0', marginTop: 8 }]}
            onPress={() => router.push('/screens/dash-ai-settings-enhanced')}
          >
            <Text style={[styles.actionButtonText, { color: '#7B1FA2' }]}>
              ⚙️ Advanced Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Settings */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>AI Settings</Text>
          
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
        </View>

        {/* Settings Debug Info */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Current Settings</Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            Personality: {settings.personality}\n
            Voice Type: {settings.voiceType || 'Default'}\n
            Voice Language: {settings.voiceLanguage}\n
            Voice Rate: {settings.voiceRate}x\n
            Voice Pitch: {settings.voicePitch}\n
            Voice Enabled: {settings.voiceEnabled ? 'Yes' : 'No'}\n
            Proactive Help: {settings.proactiveHelp ? 'Yes' : 'No'}\n
            Memory: {settings.memoryEnabled ? 'Yes' : 'No'}\n
            Multilingual: {settings.multilingualSupport ? 'Yes' : 'No'}\n
            \n            CHAT BEHAVIOR:\n
            Enter to Send: {settings.enterToSend ? 'Yes' : 'No'}\n
            Auto Voice Reply: {settings.autoVoiceReply ? 'Yes' : 'No'}\n
            Typing Indicator: {settings.showTypingIndicator ? 'Yes' : 'No'}\n
            Read Receipts: {settings.readReceiptEnabled ? 'Yes' : 'No'}\n
            Sound Effects: {settings.soundEnabled ? 'Yes' : 'No'}
          </Text>
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
              style={[styles.navButton, { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#2196F3' }]}
              onPress={() => router.push('/screens/ai-lesson-generator')}
            >
              <Text style={styles.navButtonEmoji}>📚</Text>
              <Text style={[styles.navButtonText, { color: '#1976D2' }]}>
                Lesson Generator
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#E8F5E8', borderWidth: 1, borderColor: '#4CAF50' }]}
              onPress={() => router.push('/screens/ai-homework-helper')}
            >
              <Text style={styles.navButtonEmoji}>📝</Text>
              <Text style={[styles.navButtonText, { color: '#388E3C' }]}>
                Homework Helper
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FF9800' }]}
              onPress={() => router.push('/screens/ai-homework-grader-live')}
            >
              <Text style={styles.navButtonEmoji}>✅</Text>
              <Text style={[styles.navButtonText, { color: '#F57C00' }]}>
                Grade Homework
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, { backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#9C27B0' }]}
              onPress={() => router.push('/screens/dash-assistant')}
            >
              <Text style={styles.navButtonEmoji}>🤖</Text>
              <Text style={[styles.navButtonText, { color: '#7B1FA2' }]}>
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
});
