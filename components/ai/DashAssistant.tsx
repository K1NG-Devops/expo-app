/**
 * Dash AI Assistant Chat Component
 * 
 * Modern chat interface for the Dash AI Assistant with voice recording,
 * message display, and interactive features.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Vibration,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { DashMessage, DashConversation, DashAttachment } from '@/services/dash-ai/types';
import type { IDashAIAssistant } from '@/services/dash-ai/DashAICompat';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashCommandPalette } from '@/components/ai/DashCommandPalette';
import { TierBadge } from '@/components/ai/TierBadge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useVoiceUI } from '@/components/voice/VoiceUIController';
import { assertSupabase } from '@/lib/supabase';
import { 
  pickDocuments, 
  pickImages,
  takePhoto,
  uploadAttachment,
  getFileIconName,
  formatFileSize 
} from '@/services/AttachmentService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashAssistantProps {
  conversationId?: string;
  onClose?: () => void;
  initialMessage?: string;
}

export const DashAssistant: React.FC<DashAssistantProps> = ({
  conversationId,
  onClose,
  initialMessage
}: DashAssistantProps) => {
  const { theme, isDark } = useTheme();
  const { setLayout } = useDashboardPreferences();
  const [messages, setMessages] = useState<DashMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<DashConversation | null>(null);
  const [dashInstance, setDashInstance] = useState<IDashAIAssistant | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<DashAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { tier, ready: subReady, refresh: refreshTier } = useSubscription();
  const voiceUI = useVoiceUI();

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize Dash AI Assistant
  useEffect(() => {
    const initializeDash = async () => {
      try {
        const module = await import('@/services/dash-ai/DashAICompat');
        const DashClass = (module as any).DashAIAssistant || (module as any).default;
        const dash: IDashAIAssistant | null = DashClass?.getInstance?.() || null;
        if (!dash) throw new Error('DashAIAssistant unavailable');
        await dash.initialize();
        setDashInstance(dash);
        setIsInitialized(true);

        let hasExistingMessages = false;

        // Load existing conversation or create new one
        if (conversationId) {
          const existingConv = await dash.getConversation(conversationId);
          if (existingConv) {
            hasExistingMessages = (existingConv.messages?.length || 0) > 0;
            setConversation(existingConv);
            setMessages(existingConv.messages || []);
            dash.setCurrentConversationId(conversationId);
          }
        } else {
          // Try to resume last active conversation
          const savedConvId = await AsyncStorage.getItem('@dash_ai_current_conversation_id');
          let newConvId = savedConvId || null;
          
          if (newConvId) {
            const existingConv = await dash.getConversation(newConvId);
            if (existingConv) {
              hasExistingMessages = (existingConv.messages?.length || 0) > 0;
              setConversation(existingConv);
              setMessages(existingConv.messages || []);
              dash.setCurrentConversationId(newConvId);
            } else {
              newConvId = null;
            }
          }
          
          if (!newConvId) {
            const createdId = await dash.startNewConversation('Chat with Dash');
            const newConv = await dash.getConversation(createdId);
            if (newConv) {
              setConversation(newConv);
            }
          }
        }

        // Load enterToSend setting
        try {
          const enterToSendSetting = await AsyncStorage.getItem('@dash_ai_enter_to_send');
          if (enterToSendSetting !== null) {
            setEnterToSend(enterToSendSetting === 'true');
          }
        } catch {}

        // Send initial message if provided
        if (initialMessage && initialMessage.trim()) {
          setTimeout(() => {
            sendMessage(initialMessage);
          }, 500);
        } else if (!hasExistingMessages) {
          // Add greeting message only if there are no previous messages
          const greeting: DashMessage = {
            id: `greeting_${Date.now()}`,
            type: 'assistant',
            content: dash.getPersonality().greeting,
            timestamp: Date.now(),
          };
          setMessages([greeting]);
        }
      } catch (error) {
        console.error('Failed to initialize Dash:', error);
        Alert.alert('Error', 'Failed to initialize AI Assistant. Please try again.');
      }
    };

    initializeDash();
  }, [conversationId, initialMessage]);

  // Auto-scroll to bottom when messages change (FlatList with inverted scrolls to index 0)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    }
  }, [messages]);

  // Focus effect to refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh conversation when screen focuses
      if (dashInstance && conversation) {
        dashInstance.getConversation(conversation.id).then((updatedConv: any) => {
          if (updatedConv && updatedConv.messages.length !== messages.length) {
            setMessages(updatedConv.messages);
            setConversation(updatedConv);
          }
        });
      }

      // Return cleanup function that runs when screen loses focus
      return () => {
        if (dashInstance && isSpeaking) {
          setIsSpeaking(false);
          dashInstance.stopSpeaking().catch(() => {
            // Ignore errors during cleanup
          });
        }
      };
    }, [dashInstance, conversation, messages.length, isSpeaking])
  );

  // Cleanup effect to stop speech when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts (page refresh, navigation away, etc.)
      if (dashInstance) {
        dashInstance.stopSpeaking().catch(() => {
          // Ignore errors during cleanup
        });
        dashInstance.cleanup();
      }
    };
  }, [dashInstance]);

  // Handle page refresh/close in web environments
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dashInstance && isSpeaking) {
        dashInstance.stopSpeaking().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };

    // Only add event listener if we're in a web environment with proper DOM API
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [dashInstance, isSpeaking]);

  const wantsLessonGenerator = (t: string, assistantText?: string): boolean => {
    const rx = /(create|plan|generate)\s+(a\s+)?lesson(\s+plan)?|lesson\s+plan|teach\s+.*(about|on)/i
    if (rx.test(t)) return true
    if (assistantText && rx.test(assistantText)) return true
    return false
  }

  const sendMessage = async (text: string = inputText.trim()) => {
    if ((!text && selectedAttachments.length === 0) || !dashInstance || isLoading) return;

    try {
      setIsLoading(true);
      setIsUploading(true);
      setInputText('');

      // Upload attachments first if any
      const uploadedAttachments: DashAttachment[] = [];
      if (selectedAttachments.length > 0 && conversation?.id) {
        for (const attachment of selectedAttachments) {
          try {
            updateAttachmentProgress(attachment.id, 0, 'uploading');
            const uploaded = await uploadAttachment(
              attachment, 
              conversation.id,
              (progress) => updateAttachmentProgress(attachment.id, progress)
            );
            updateAttachmentProgress(attachment.id, 100, 'uploaded');
            uploadedAttachments.push(uploaded);
          } catch (error) {
            console.error(`Failed to upload ${attachment.name}:`, error);
            updateAttachmentProgress(attachment.id, 0, 'failed');
            Alert.alert(
              'Upload Failed', 
              `Failed to upload ${attachment.name}. Please try again.`
            );
          }
        }
      }

      setIsUploading(false);

      const userText = text || 'Attached files';
      const response = await dashInstance.sendMessage(userText, undefined, uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
      
      // Clear selected attachments after successful send
      setSelectedAttachments([]);
      
      // Handle dashboard actions if present
      if (response.metadata?.dashboard_action?.type === 'switch_layout') {
        const newLayout = response.metadata.dashboard_action.layout;
        if (newLayout && (newLayout === 'classic' || newLayout === 'enhanced')) {
          console.log(`[Dash] Switching dashboard layout to: ${newLayout}`);
          setLayout(newLayout);
          
          // Provide haptic feedback
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch { /* Haptics not available */ }
        }
      } else if (response.metadata?.dashboard_action?.type === 'open_screen') {
        const { route, params } = response.metadata.dashboard_action as any;
        console.log(`[Dash] Proposed open_screen: ${route}`, params || {});
        // Require confirmation for AI Lesson Generator to avoid auto-navigation
        if (typeof route === 'string' && route.includes('/screens/ai-lesson-generator')) {
          Alert.alert(
            'Open Lesson Generator?',
            'Dash suggests opening the AI Lesson Generator with prefilled details. Please confirm the fields in the next screen, then press Generate to start.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open', onPress: () => { try { router.push({ pathname: route, params } as any); } catch (e) { console.warn('Failed to navigate:', e); } } },
            ]
          );
        } else {
          try {
            router.push({ pathname: route, params } as any);
          } catch (e) {
            console.warn('Failed to navigate to route from Dash action:', e);
          }
        }
      }
      
      // Update messages from conversation
      const updatedConv = await dashInstance.getConversation(dashInstance.getCurrentConversationId()!);
      if (updatedConv) {
        setMessages(updatedConv.messages);
        setConversation(updatedConv);
      }

      // Offer to open Lesson Generator when intent detected
      try {
        const intentType = response?.metadata?.user_intent?.primary_intent || ''
        const shouldOpen = intentType === 'create_lesson' || wantsLessonGenerator(userText, response?.content)
        if (shouldOpen) {
          // Ask user to proceed
          setTimeout(() => {
            Alert.alert(
              'Open Lesson Generator?',
              'I can open the AI Lesson Generator with the details we discussed. Please confirm the fields are correct in the next screen, then press Generate to create the lesson.',
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open', onPress: () => dashInstance.openLessonGeneratorFromContext(userText, response?.content || '') }
              ]
            )
          }, 200)
        }
      } catch {}

      // Auto-speak response if enabled
      setTimeout(() => {
        speakResponse(response);
      }, 500);

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  // Open voice recording modal with text editing capability
  const handleInputMicPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Get current language for voice recognition
      const storedLang = await AsyncStorage.getItem('@dash_voice_language');
      const activeLang = storedLang ? storedLang.toLowerCase() : 'en';
      
      // Open recording modal via VoiceUIController
      await voiceUI.open({
        language: activeLang,
        tier: String(tier || 'free'),
        forceMode: 'recording',
        onTranscriptReady: (transcript) => {
          // Place the edited transcript in the input field
          setInputText(transcript);
          // Focus the input so user can review/edit before sending
          setTimeout(() => inputRef.current?.focus(), 300);
        },
      });
    } catch (error) {
      console.error('[DashAssistant] Failed to open voice modal:', error);
      Alert.alert('Voice Input', 'Failed to open voice recorder. Please try again.');
    }
  };

  const speakResponse = async (message: DashMessage) => {
    console.log(`[DashAssistant] speakResponse called for message: ${message.id}`);
    console.log(`[DashAssistant] Current state - isSpeaking: ${isSpeaking}, speakingMessageId: ${speakingMessageId}`);
    
    if (!dashInstance || message.type !== 'assistant') {
      console.log(`[DashAssistant] Cannot speak - dashInstance: ${!!dashInstance}, messageType: ${message.type}`);
      return;
    }

    // If already speaking this message, stop it
    if (speakingMessageId === message.id) {
      console.log(`[DashAssistant] Stopping speech for message: ${message.id}`);
      await stopSpeaking();
      return;
    }

    // Stop any current speech
    if (isSpeaking && speakingMessageId) {
      console.log(`[DashAssistant] Stopping previous speech for message: ${speakingMessageId}`);
      await stopSpeaking();
    }

    try {
      console.log(`[DashAssistant] Starting speech for message: ${message.id}`);
      setIsSpeaking(true);
      setSpeakingMessageId(message.id);
      
      await dashInstance.speakResponse(message, {
        onStart: () => {
          console.log(`[DashAssistant] Speech started for message: ${message.id}`);
          // State is already set above
        },
        onDone: () => {
          console.log(`[DashAssistant] Speech finished for message: ${message.id}`);
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        },
        onStopped: () => {
          console.log(`[DashAssistant] Speech stopped for message: ${message.id}`);
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        },
        onError: (error: any) => {
          console.error(`[DashAssistant] Speech error for message ${message.id}:`, error);
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        }
      });
      
      console.log(`[DashAssistant] Speech completed for message: ${message.id}`);
    } catch (error) {
      console.error('Failed to speak response:', error);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const stopSpeaking = async () => {
    console.log(`[DashAssistant] stopSpeaking called - current speakingMessageId: ${speakingMessageId}`);
    
    if (!dashInstance) {
      console.log(`[DashAssistant] Cannot stop speaking - no dashInstance`);
      return;
    }

    try {
      console.log(`[DashAssistant] Calling dashInstance.stopSpeaking()`);
      await dashInstance.stopSpeaking();
      console.log(`[DashAssistant] dashInstance.stopSpeaking() completed`);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      console.log(`[DashAssistant] Speech state cleared`);
    } catch (error) {
      console.error('Failed to stop speaking:', error);
      // Still clear the state even if stopping failed
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const handleAttachFile = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const options = [
        'Documents',
        'Photos',
        'Cancel'
      ];
      
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 2,
            title: 'Select files to attach'
          },
          (buttonIndex) => {
            if (buttonIndex === 0) {
              handlePickDocuments();
            } else if (buttonIndex === 1) {
              handlePickImages();
            }
          }
        );
      } else {
        // For Android, show a simple alert
        Alert.alert(
          'Attach Files',
          'Choose the type of files to attach',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Documents', onPress: handlePickDocuments },
            { text: 'Photos', onPress: handlePickImages }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to show file picker:', error);
    }
  };

  const handlePickDocuments = async () => {
    try {
      const documents = await pickDocuments();
      if (documents.length > 0) {
        setSelectedAttachments(prev => [...prev, ...documents]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to pick documents:', error);
      Alert.alert('Error', 'Failed to select documents. Please try again.');
    }
  };

  const handlePickImages = async () => {
    try {
      const images = await pickImages();
      if (images.length > 0) {
        setSelectedAttachments(prev => [...prev, ...images]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to pick images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photos = await takePhoto();
      if (photos.length > 0) {
        setSelectedAttachments(prev => [...prev, ...photos]);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (error) {
      console.error('Failed to remove attachment:', error);
    }
  };

  const updateAttachmentProgress = (attachmentId: string, progress: number, status?: DashAttachment['status']) => {
    setSelectedAttachments(prev => prev.map(att => 
      att.id === attachmentId 
        ? { ...att, uploadProgress: progress, ...(status && { status }) }
        : att
    ));
  };

  const renderMessage = (message: DashMessage, index: number) => {
    const isUser = message.type === 'user';
    const isLastMessage = index === messages.length - 1;
    // Show retry button for the most recent user message
    const isLastUserMessage = isUser && (() => {
      // Find the most recent user message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          return i === index;
        }
      }
      return false;
    })();
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {/* Avatar for assistant messages */}
        {!isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <Ionicons name="sparkles" size={16} color={theme.onPrimary} />
          </View>
        )}
        
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isUser
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 0.5 },
            // Modern shadow with better depth
            Platform.OS === 'ios' ? {
              shadowColor: isDark ? '#000' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isUser ? 0.25 : 0.12,
              shadowRadius: 4,
            } : {
              elevation: isUser ? 3 : 2,
            }
          ]}
        >
          <View style={styles.messageContentRow}>
            <Text
              style={[
                styles.messageText,
                { color: isUser ? theme.onPrimary : theme.text, flex: 1 },
              ]}
              selectable={true}
            >
              {message.content}
            </Text>
            
            {isUser && isLastUserMessage && !isLoading && (
              <TouchableOpacity
                style={styles.inlineBubbleRetryButton}
                onPress={() => sendMessage(message.content)}
                accessibilityLabel="Try again"
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="refresh" 
                  size={14} 
                  color={theme.onPrimary} 
                />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Voice note indicator */}
          {message.voiceNote && (
            <View style={styles.voiceNoteIndicator}>
              <Ionicons 
                name="mic" 
                size={12} 
                color={isUser ? theme.onPrimary : theme.textSecondary} 
              />
              <Text
                style={[
                  styles.voiceNoteDuration,
                  { color: isUser ? theme.onPrimary : theme.textSecondary },
                ]}
              >
                {Math.round((message.voiceNote.duration || 0) / 1000)}s
              </Text>
            </View>
          )}
          
          {/* Attachments display */}
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.messageAttachmentsContainer}>
              {message.attachments.map((attachment, idx) => (
                <View 
                  key={idx}
                  style={[
                    styles.messageAttachment,
                    { 
                      backgroundColor: isUser 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : theme.surfaceVariant,
                      borderColor: isUser ? 'rgba(255, 255, 255, 0.3)' : theme.border,
                    }
                  ]}
                >
                  <Ionicons 
                    name={getFileIconName(attachment.kind)} 
                    size={14} 
                    color={isUser ? theme.onPrimary : theme.text} 
                  />
                  <Text 
                    style={[
                      styles.messageAttachmentName,
                      { color: isUser ? theme.onPrimary : theme.text }
                    ]}
                    numberOfLines={1}
                  >
                    {attachment.name}
                  </Text>
                  <Text 
                    style={[
                      styles.messageAttachmentSize,
                      { color: isUser ? theme.onPrimary : theme.textSecondary }
                    ]}
                  >
                    {formatFileSize(attachment.size)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Bottom row with speak button (left) and timestamp (right) */}
          <View style={styles.messageBubbleFooter}>
            {!isUser && (
              <TouchableOpacity
                style={[
                  styles.inlineSpeakButton, 
                  { 
                    backgroundColor: speakingMessageId === message.id ? theme.error : theme.accent,
                  }
                ]}
                onPress={() => {
                  console.log(`[DashAssistant] Speak button pressed for message ${message.id}`);
                  console.log(`[DashAssistant] Currently speaking: ${speakingMessageId}`);
                  console.log(`[DashAssistant] Is same message: ${speakingMessageId === message.id}`);
                  speakResponse(message);
                }}
                activeOpacity={0.7}
                accessibilityLabel={speakingMessageId === message.id ? "Stop speaking" : "Speak message"}
              >
                <Ionicons 
                  name={speakingMessageId === message.id ? "stop" : "volume-high"} 
                  size={12} 
                  color={speakingMessageId === message.id ? theme.onError || theme.background : theme.onAccent} 
                />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <Text
              style={[
                styles.messageTime,
                { color: isUser ? theme.onPrimary : theme.textTertiary },
              ]}
            >
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        </View>
        

      </View>
    );
  };

  const handleSuggestedAction = (action: string) => {
    // Map suggested actions to proper commands
    const actionMap: Record<string, string> = {
      'switch_to_enhanced': 'switch to enhanced dashboard',
      'switch_to_classic': 'switch to classic dashboard', 
      'dashboard_help': 'help me with dashboard settings',
      'dashboard_settings': 'show dashboard settings',
      'view_enhanced_features': 'what are enhanced dashboard features',
      'view_classic_features': 'what are classic dashboard features',
      'switch_dashboard_layout': 'help me switch dashboard layout',
      'view_options': 'show me dashboard options',
      // Additional
      'export_pdf': 'export pdf',
      'send_message': 'message parents',
      'view_financial_dashboard': 'open financial dashboard',
      'create_announcement': 'create announcement'
    };
    
    const command = actionMap[action] || action.replace('_', ' ');
    sendMessage(command);
  };

  const getActionDisplayText = (action: string): string => {
    const displayMap: Record<string, string> = {
      'switch_to_enhanced': '✨ Enhanced Dashboard',
      'switch_to_classic': '📊 Classic Dashboard',
      'dashboard_help': '❓ Dashboard Help',
      'dashboard_settings': '⚙️ Settings',
      'view_enhanced_features': '🌟 Enhanced Features',
      'view_classic_features': '📋 Classic Features',
      'switch_dashboard_layout': '🔄 Switch Layout',
      'view_options': '👀 View Options',
      'explore_features': '🔍 Explore Features',
      'lesson_planning': '📚 Lesson Planning',
      'student_management': '👥 Student Management',
    };
    
    return displayMap[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderSuggestedActions = () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.type === 'user' || !lastMessage.metadata?.suggested_actions) {
      return null;
    }

    return (
      <View style={styles.suggestedActionsContainer}>
        <Text style={[styles.suggestedActionsTitle, { color: theme.textSecondary }]}>
          Quick actions:
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedActionsScrollContent}
        >
          {lastMessage.metadata.suggested_actions.map((action: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.suggestedAction, 
                { 
                  backgroundColor: action.includes('dashboard') ? theme.primaryLight : theme.surfaceVariant,
                  borderColor: action.includes('dashboard') ? theme.primary : theme.border,
                  borderWidth: 1
                },
                // Modern shadow for quick actions
                Platform.OS === 'ios' ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                } : {
                  elevation: 2,
                }
              ]}
              onPress={() => handleSuggestedAction(action)}
            >
              <Text style={[
                styles.suggestedActionText, 
                { color: action.includes('dashboard') ? theme.primary : theme.text }
              ]}>
                {getActionDisplayText(action)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAttachmentChips = () => {
    if (selectedAttachments.length === 0) {
      return null;
    }

    return (
      <View style={styles.attachmentChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedAttachments.map((attachment) => (
            <View 
              key={attachment.id} 
              style={[
                styles.attachmentChip,
                { 
                  backgroundColor: theme.surface,
                  borderColor: attachment.status === 'failed' ? theme.error : theme.border
                }
              ]}
            >
              <View style={styles.attachmentChipContent}>
                <Ionicons 
                  name={getFileIconName(attachment.kind)}
                  size={16} 
                  color={attachment.status === 'failed' ? theme.error : theme.text} 
                />
                <View style={styles.attachmentChipText}>
                  <Text 
                    style={[
                      styles.attachmentChipName, 
                      { color: attachment.status === 'failed' ? theme.error : theme.text }
                    ]}
                    numberOfLines={1}
                  >
                    {attachment.name}
                  </Text>
                  <Text style={[styles.attachmentChipSize, { color: theme.textSecondary }]}>
                    {formatFileSize(attachment.size)}
                  </Text>
                </View>
                
                {/* Progress indicator */}
                {attachment.status === 'uploading' && (
                  <View style={styles.attachmentProgressContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
                
                {/* Status indicator */}
                {attachment.status === 'uploaded' && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                )}
                
                {attachment.status === 'failed' && (
                  <Ionicons name="alert-circle" size={16} color={theme.error} />
                )}
                
                {/* Remove button */}
                {attachment.status !== 'uploading' && (
                  <TouchableOpacity
                    style={styles.attachmentChipRemove}
                    onPress={() => handleRemoveAttachment(attachment.id)}
                    accessibilityLabel={`Remove ${attachment.name}`}
                  >
                    <Ionicons name="close" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Progress bar */}
              {attachment.status === 'uploading' && attachment.uploadProgress !== undefined && (
                <View style={[styles.attachmentProgressBar, { backgroundColor: theme.surfaceVariant }]}>
                  <View 
                    style={[
                      styles.attachmentProgressFill,
                      { 
                        backgroundColor: theme.primary,
                        width: `${attachment.uploadProgress}%`
                      }
                    ]} 
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Animated typing indicator
  const [dotAnimations] = useState([
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ]);

  useEffect(() => {
    if (isLoading) {
      // Start the animation when loading begins
      const animateTyping = () => {
        const animations = dotAnimations.map((dot: any, index: number) => 
          Animated.loop(
            Animated.sequence([
              Animated.delay(index * 200), // Stagger the animation
              Animated.timing(dot, {
                toValue: 1,
                duration: 600,
                useNativeDriver: false,
              }),
              Animated.timing(dot, {
                toValue: 0.3,
                duration: 600,
                useNativeDriver: false,
              }),
            ])
          )
        );
        Animated.parallel(animations).start();
      };
      animateTyping();
    } else {
      // Stop animations and reset to default state
      dotAnimations.forEach((dot: any) => {
        dot.stopAnimation();
        dot.setValue(0.3);
      });
    }
  }, [isLoading, dotAnimations]);

  const renderTypingIndicator = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.typingIndicator}>
        <View style={[styles.typingBubble, { backgroundColor: theme.surface }]}>
          <View style={styles.typingDots}>
            {dotAnimations.map((dot: any, index: number) => (
              <Animated.View
                key={index}
                style={[
                  styles.typingDot,
                  {
                    backgroundColor: theme.textTertiary,
                    opacity: dot,
                    transform: [
                      {
                        scale: dot.interpolate({
                          inputRange: [0.3, 1],
                          outputRange: [0.8, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Initializing Dash...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Dash</Text>
              {subReady && tier && (
                <TierBadge tier={tier as any} size="small" showIcon={true} />
              )}
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              AI Teaching Assistant
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Voice (Orb) - Interactive Voice Mode - Always Blue */}
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Interactive Voice Assistant"
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const storedLang = await AsyncStorage.getItem('@dash_voice_language');
                const detectedLang = storedLang ? storedLang.toLowerCase() : 'en';
                await voiceUI.open({ language: detectedLang, tier: String(tier || 'free') });
              } catch (error) {
                console.error('[DashAssistant] Voice UI open failed:', error);
                await voiceUI.open({ language: 'en', tier: 'free' });
              }
            }}
          >
            <Ionicons name="mic" size={screenWidth < 400 ? 18 : 22} color="#007AFF" />
          </TouchableOpacity>
          {isSpeaking && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.error }]}
              accessibilityLabel="Stop speaking"
              onPress={stopSpeaking}
            >
              <Ionicons name="stop" size={screenWidth < 400 ? 18 : 22} color={theme.onError || theme.background} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Conversations"
            onPress={() => router.push('/screens/dash-conversations-history')}
          >
            <Ionicons name="time-outline" size={screenWidth < 400 ? 18 : 22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Settings"
            onPress={() => router.push('/screens/dash-ai-settings')}
          >
            <Ionicons name="settings-outline" size={screenWidth < 400 ? 18 : 22} color={theme.text} />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={async () => {
                // Stop any ongoing speech and update UI state
                if (dashInstance) {
                  setIsSpeaking(false);
                  setSpeakingMessageId(null);
                  await dashInstance.stopSpeaking();
                  dashInstance.cleanup();
                }
                onClose();
              }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={screenWidth < 400 ? 20 : 24} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages - FlatList for better performance */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        renderItem={({ item, index }) => renderMessage(item, index)}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        inverted={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews={Platform.OS === 'android'}
        onScrollToIndexFailed={(info) => {
          // Handle scroll failures gracefully
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        }}
        ListHeaderComponent={
          <>
            {renderTypingIndicator()}
            {renderSuggestedActions()}
          </>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {/* Attachment chips */}
        {renderAttachmentChips()}
        
        <View style={styles.inputRow}>
          {/* Camera button (outside input) */}
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={async () => {
              try {
                await Haptics.selectionAsync();
              } catch {}
              handleTakePhoto();
            }}
            disabled={isLoading || isUploading}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
          >
            <Ionicons 
              name="camera-outline" 
              size={24} 
              color={isLoading || isUploading ? theme.textTertiary : theme.textSecondary} 
            />
          </TouchableOpacity>
          
          {/* Input wrapper with paperclip inside */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
            {/* Paperclip icon (inside left of input) */}
            <TouchableOpacity
              style={styles.inputLeftIcon}
              onPress={async () => {
                try {
                  await Haptics.selectionAsync();
                } catch {}
                handleAttachFile();
              }}
              disabled={isLoading || isUploading}
              accessibilityLabel="Attach files"
              accessibilityRole="button"
            >
              <Ionicons 
                name="attach" 
                size={20} 
                color={selectedAttachments.length > 0 ? theme.primary : theme.textTertiary} 
              />
              {selectedAttachments.length > 0 && (
                <View style={[styles.attachBadgeSmall, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.attachBadgeSmallText, { color: theme.onPrimary }]}>
                    {selectedAttachments.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { 
                  color: theme.inputText,
                  paddingLeft: 36, // Make room for paperclip icon
                }
              ]}
              placeholder={selectedAttachments.length > 0 ? "Add a message (optional)..." : "Ask Dash anything..."}
              placeholderTextColor={theme.inputPlaceholder}
              value={inputText}
              onChangeText={setInputText}
              multiline={!enterToSend}
              maxLength={500}
              editable={!isLoading && !isUploading}
              onSubmitEditing={enterToSend ? () => sendMessage() : undefined}
              returnKeyType={enterToSend ? "send" : "default"}
              blurOnSubmit={enterToSend}
            />
          </View>
          
          {/* Send or Mic button */}
          {(inputText.trim() || selectedAttachments.length > 0) ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                try {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                sendMessage();
              }}
              disabled={isLoading || isUploading}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              {(isLoading || isUploading) ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Ionicons name="send" size={20} color={theme.onPrimary} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.accent }]}
              onPress={handleInputMicPress}
              disabled={isLoading}
              accessibilityLabel="Record voice message"
              accessibilityRole="button"
            >
              <Ionicons 
                name="mic-outline" 
                size={20} 
                color={theme.onAccent} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Command Palette Modal */}
      <DashCommandPalette visible={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </KeyboardAvoidingView>
  );
};

// Helper functions for tier badge
function getTierLabel(tier?: string) {
  const t = String(tier || '').toLowerCase()
  switch (t) {
    case 'starter': return 'Starter'
    case 'basic': return 'Basic'
    case 'premium': return 'Premium'
    case 'pro': return 'Pro'
    case 'enterprise': return 'Enterprise'
    case 'free':
    default: return 'Free'
  }
}
function getTierColor(tier?: string) {
  const t = String(tier || '').toLowerCase()
  switch (t) {
    case 'starter': return '#059669' // green
    case 'premium': return '#7C3AED' // purple
    case 'pro': return '#2563EB' // blue
    case 'enterprise': return '#DC2626' // red
    case 'basic': return '#10B981' // teal/emerald
    case 'free':
    default: return '#6B7280' // gray
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dashAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tierBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: screenWidth < 400 ? 32 : 36,
    height: screenWidth < 400 ? 32 : 36,
    borderRadius: screenWidth < 400 ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: screenWidth < 400 ? 2 : 4,
    minWidth: 32, // Ensure minimum touch target
    minHeight: 32,
  },
  closeButton: {
    width: screenWidth < 400 ? 32 : 36,
    height: screenWidth < 400 ? 32 : 36,
    borderRadius: screenWidth < 400 ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: screenWidth < 400 ? 2 : 4,
    minWidth: 32, // Ensure minimum touch target
    minHeight: 32,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 0, // No horizontal padding for better layout
  },
  userMessage: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4, // Close to screen edge
    marginRight: 8,
    marginTop: 4,
    flexShrink: 0,
    // Subtle shadow for avatar
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    } : {
      elevation: 2,
    }),
  },
  messageBubble: {
    maxWidth: screenWidth < 400 ? screenWidth * 0.75 : screenWidth * 0.72,
    padding: screenWidth < 400 ? 14 : 16,
    minHeight: 48,
    flex: 1,
  },
  // Modern bubble styles with smooth rounded corners
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 6, // Subtle tail effect
  },
  assistantBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 6, // Subtle tail effect
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: 'wrap',
    letterSpacing: 0.3,
  },
  messageContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  inlineBubbleRetryButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inlineAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  voiceNoteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  voiceNoteDuration: {
    fontSize: 10,
    marginLeft: 4,
  },
  messageAttachmentsContainer: {
    marginTop: 8,
    gap: 6,
  },
  messageAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  messageAttachmentName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  messageAttachmentSize: {
    fontSize: 10,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 0,
    alignSelf: 'flex-end',
  },
  speakButton: {
    width: screenWidth < 400 ? 30 : 32,
    height: screenWidth < 400 ? 30 : 32,
    borderRadius: screenWidth < 400 ? 15 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: screenWidth < 400 ? 6 : 8,
    minWidth: 30, // Ensure minimum touch target size
    minHeight: 30,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    padding: 12,
    borderRadius: 18,
    marginLeft: 28,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  suggestedActionsContainer: {
    marginTop: 8,
    marginBottom: 8,
    width: screenWidth,
    marginLeft: -16, // Offset messages container padding
  },
  suggestedActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  suggestedActionsScrollContent: {
    paddingLeft: 16, // Start from left edge
    paddingRight: 16,
    gap: 8,
  },
  suggestedAction: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 0, // Gap handles spacing
  },
  suggestedActionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  cameraButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
    minHeight: 40,
  },
  inputLeftIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 0, // No border, wrapper has border
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBadgeSmallText: {
    fontSize: 8,
    fontWeight: '600',
  },
  messageBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  inlineSpeakButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachmentChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  attachmentChip: {
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 200,
    maxWidth: 250,
    overflow: 'hidden',
  },
  attachmentChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  attachmentChipText: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  attachmentChipName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentChipSize: {
    fontSize: 11,
  },
  attachmentChipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentProgressContainer: {
    marginRight: 8,
  },
  attachmentProgressBar: {
    height: 2,
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 1,
  },
  attachmentProgressFill: {
    height: '100%',
    borderRadius: 1,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    position: 'relative',
  },
  attachBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default DashAssistant;