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
import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAIAssistant, DashMessage, DashConversation, DashAttachment } from '@/services/DashAIAssistant';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashCommandPalette } from '@/components/ai/DashCommandPalette';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useVoiceController } from '@/hooks/useVoiceController';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
// VoiceRecordingModal removed - using inline mic button only
import { MessageBubbleModern } from '@/components/ai/MessageBubbleModern';
import { StreamingIndicator } from '@/components/ai/StreamingIndicator';
import { EnhancedInputArea } from '@/components/ai/EnhancedInputArea';
import { assertSupabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { 
  pickDocuments, 
  pickImages, 
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
  const insets = useSafeAreaInsets();
  const { setLayout } = useDashboardPreferences();
  const [messages, setMessages] = useState<DashMessage[]>([]);
  const [conversation, setConversation] = useState<DashConversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  // Modal removed - using inline mic only
  const [voiceTimerMs, setVoiceTimerMs] = useState(0);
  const [dashInstance, setDashInstance] = useState<DashAIAssistant | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<DashAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { tier, ready: subReady, refresh: refreshTier } = useSubscription();
  // Voice send UX placeholder
  const [showVoiceSending, setShowVoiceSending] = useState(false);
  const [pendingVoiceMs, setPendingVoiceMs] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList<DashMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  // Track the last synced conversation state to avoid redundant updates that can cause loops
  const lastSyncRef = useRef<{ convId?: string; lastId?: string; length: number } | null>(null);

  // Initialize Dash AI Assistant
  useEffect(() => {
    const initializeDash = async () => {
      try {
        const dash = DashAIAssistant.getInstance();
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

  // Pre-warm recorder after initialization for faster start
  useEffect(() => {
    if (dashInstance && isInitialized) {
      try { dashInstance.preWarmRecorder(); } catch {}
    }
  }, [dashInstance, isInitialized]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      try {
        (flatListRef.current as any)?.scrollToEnd?.({ animated: true });
      } catch {}
    }, 100);
  }, [messages]);


  // Focus effect to refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refreshConversation = async () => {
        try {
          if (!dashInstance || !conversation?.id) return;
          const updatedConv = await dashInstance.getConversation(conversation.id);
          if (!updatedConv || cancelled) return;

          const msgs: DashMessage[] = updatedConv.messages || [];
          const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 'none';
          const prev = lastSyncRef.current;

          const changed =
            !prev ||
            prev.convId !== updatedConv.id ||
            prev.length !== msgs.length ||
            prev.lastId !== lastId;

          if (changed) {
            setConversation(updatedConv);
            setMessages(msgs);
            lastSyncRef.current = { convId: updatedConv.id, lastId, length: msgs.length };
          }
        } catch {
          // ignore
        }
      };

      refreshConversation();

      // Return cleanup function that runs when screen loses focus
      return () => {
        cancelled = true;
        if (dashInstance && isSpeaking) {
          setIsSpeaking(false);
          dashInstance.stopSpeaking().catch(() => {
            // Ignore errors during cleanup
          });
        }
      };
    }, [dashInstance, conversation?.id])
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

const sendMessage = async (text: string = inputText.trim(), attachmentsOverride?: DashAttachment[]) => {
const attachmentsToUpload = attachmentsOverride ?? selectedAttachments;
if ((!text && attachmentsToUpload.length === 0) || !dashInstance || isLoading) return;

    try {
      setIsLoading(true);
      setIsUploading(true);
      setInputText('');

      // Upload attachments first if any
      const uploadedAttachments: DashAttachment[] = [];
if (attachmentsToUpload.length > 0 && conversation?.id) {
for (const attachment of attachmentsToUpload) {
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
      const response = await dashInstance.sendMessage(userText);
      
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
        try {
          if (autoSpeak) speakResponse(response);
        } catch {}
      }, 500);

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
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

  // Download a PDF proposed by Dash (web: browser download; native: share sheet)
  const handleDownloadPdf = async (title: string, content: string) => {
    try {
      if (!dashInstance) return;
      const res = await dashInstance.exportTextAsPDFForDownload(title || 'Dash Export', content || '');
      if (!res.success || !res.uri) {
        Alert.alert('PDF Export', 'Failed to generate PDF');
        return;
      }
      if (Platform.OS === 'web') {
        try {
          const a = document.createElement('a');
          a.href = res.uri;
          a.download = res.filename || 'dash-export.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch {
          Alert.alert('PDF Ready', 'Your PDF is ready. If download did not start, long-press the link to save.');
        }
      } else {
        try {
          await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf' });
        } catch {
          Alert.alert('PDF Ready', `Saved as ${res.filename || 'export.pdf'}`);
        }
      }
    } catch (e) {
      console.error('handleDownloadPdf error', e);
      Alert.alert('PDF Export', 'Failed to generate PDF');
    }
  };

  // Open or share an attachment chip inside a message
  const handleOpenAttachment = async (att: DashAttachment) => {
    try {
      if (att.previewUri) {
        if (Platform.OS === 'web') {
          const a = document.createElement('a');
          a.href = att.previewUri;
          a.download = att.name || 'attachment';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          await Sharing.shareAsync(att.previewUri, { mimeType: att.mimeType || 'application/octet-stream' });
        }
        return;
      }
      Alert.alert('Attachment', 'This attachment is not immediately downloadable in this build.');
    } catch (e) {
      Alert.alert('Error', 'Unable to open attachment');
    }
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
        <MessageBubbleModern
          message={message}
          showIcon={!isUser}
          onRegenerate={!isUser ? () => {
            const prev = messages[index - 1];
            const retryText = prev && prev.type === 'user' ? prev.content : message.content;
            sendMessage(retryText);
          } : undefined}
        />

        {Array.isArray((message as any).attachments) && (message as any).attachments.length > 0 && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {(message as any).attachments.map((att: DashAttachment) => (
              <TouchableOpacity key={att.id}
                onPress={() => handleOpenAttachment(att)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10,
                         backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
                <Ionicons name="document" size={16} color={theme.text} />
                <Text numberOfLines={1} style={{ marginLeft: 8, color: theme.text, flex: 1 }}>{att.name}</Text>
                <Ionicons name="download" size={16} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Export PDF action when suggested by Dash */}
        {String(message.metadata?.dashboard_action?.type) === 'export_pdf' && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => handleDownloadPdf(
                (message.metadata?.dashboard_action as any)?.title || 'Dash Export',
                (message.metadata?.dashboard_action as any)?.content || message.content
              )}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                gap: 8,
              }}
            >
              <Ionicons name="download-outline" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {lastMessage.metadata.suggested_actions.map((action: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.suggestedAction, 
                { 
                  backgroundColor: action.includes('dashboard') ? theme.primaryLight : theme.surfaceVariant,
                  borderColor: action.includes('dashboard') ? theme.primary : 'transparent',
                  borderWidth: action.includes('dashboard') ? 1 : 0
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

  // Voice Dock controller (initialized even if dashInstance is null; it will no-op)
  const vc = useVoiceController(dashInstance, {
    onResponse: async (response) => {
      try {
        const updatedConv = await dashInstance?.getConversation(dashInstance?.getCurrentConversationId()!);
        if (updatedConv) {
          setMessages(updatedConv.messages);
          setConversation(updatedConv);
        }
      } catch {}
      try { setShowVoiceSending(false); } catch {}
      setTimeout(() => { try { if (autoSpeak) speakResponse(response); } catch {} }, 400);
    }
  });

  // Voice timer effect (tracks duration during prewarm/listening)
  useEffect(() => {
    if (vc.state === 'prewarm' || vc.state === 'listening') {
      const start = Date.now();
      const interval = setInterval(() => {
        setVoiceTimerMs(Date.now() - start);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setVoiceTimerMs(0);
    }
    if (vc.state === 'idle' || vc.state === 'error') {
      try { setShowVoiceSending(false); } catch {}
    }
  }, [vc.state]);

  // Notify on voice errors (e.g., permission denied)
  useEffect(() => {
    if (vc.state === 'error') {
      try {
        Alert.alert(
          'Microphone Permission',
          'Microphone access is required for voice messages. Please enable it in your device settings and try again.'
        );
      } catch {}
    }
  }, [vc.state]);

  // Voice Dock controller + auto speak preference
  const [autoSpeak, setAutoSpeak] = React.useState(true);
  React.useEffect(() => { (async () => { try { const AS = (await import('@react-native-async-storage/async-storage')).default; const v = await AS.getItem('@voice_auto_speak'); if (v !== null) setAutoSpeak(v === 'true'); } catch {} })(); }, []);

  // Waveform animation for non-streaming sending placeholder
  const [waveVals] = useState([
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.6)).current,
    useRef(new Animated.Value(0.5)).current,
  ]);
  useEffect(() => {
    if (!streamingEnabled && showVoiceSending) {
      const loops = waveVals.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1.0, duration: 250 + i * 60, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0.4, duration: 250 + i * 60, useNativeDriver: true }),
          ])
        )
      );
      loops.forEach(l => l.start());
      return () => loops.forEach(l => l.stop());
    } else {
      // reset
      waveVals.forEach(v => v.setValue(0.5));
    }
  }, [streamingEnabled, showVoiceSending]);

  // Realtime streaming enabled if env true OR user preference '@dash_streaming_enabled' is 'true'
  const [streamingPrefEnabled, setStreamingPrefEnabled] = React.useState(false);
  React.useEffect(() => { (async () => { try { const AS = (await import('@react-native-async-storage/async-storage')).default; const v = await AS.getItem('@dash_streaming_enabled'); if (v !== null) setStreamingPrefEnabled(v === 'true'); } catch {} })(); }, []);
  const streamingEnabled = String(process.env.EXPO_PUBLIC_DASH_STREAMING || '').toLowerCase() === 'true' || streamingPrefEnabled;
  const [streamUserPartial, setStreamUserPartial] = React.useState('');
  const [streamAssistant, setStreamAssistant] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const streamSpokenRef = React.useRef(false);
  const streamFinalizedRef = React.useRef(false);
  const realtime = useRealtimeVoice({
    enabled: streamingEnabled,
    // Provide token from Supabase session for authenticated WSS
    tokenProvider: async () => {
      try {
        const supa = assertSupabase();
        const { data: { session } } = await supa.auth.getSession();
        return session?.access_token || null;
      } catch {
        return null;
      }
    },
    onPartialTranscript: (t) => setStreamUserPartial(t || ''),
    onFinalTranscript: (t) => setStreamUserPartial(t || ''),
    onAssistantToken: (tok) => setStreamAssistant((p) => (p + String(tok || ''))),
    onStatusChange: (s) => setIsStreaming(s === 'streaming'),
  });

  // Speak streamed assistant buffer when streaming finishes (scaffolding)
  React.useEffect(() => {
    try {
      if (!streamingEnabled) return;
      if (isStreaming) {
        streamSpokenRef.current = false;
        streamFinalizedRef.current = false;
        return;
      }
      // Not streaming; if buffer exists and not spoken yet, speak once
      if (!isStreaming && streamAssistant && streamAssistant.length > 0 && autoSpeak && !streamSpokenRef.current) {
        streamSpokenRef.current = true;
        speakResponse({ id: `streamed_${Date.now()}`, type: 'assistant', content: streamAssistant, timestamp: Date.now() } as any);
      }
    } catch {}
  }, [isStreaming, streamingEnabled, streamAssistant, autoSpeak]);

  // Finalize streamed user/assistant content into conversation when streaming ends
  React.useEffect(() => {
    (async () => {
      try {
        if (!streamingEnabled) return;
        if (isStreaming) return; // still streaming
        if (!dashInstance) return;
        const hasUser = (streamUserPartial || '').trim().length > 0;
        const hasAssistant = (streamAssistant || '').trim().length > 0;
        if (!hasUser && !hasAssistant) return;
        if (streamFinalizedRef.current) return;
        streamFinalizedRef.current = true;

        if (hasUser) {
          await dashInstance.appendUserMessage((streamUserPartial || '').trim());
        }
        if (hasAssistant) {
          await dashInstance.appendAssistantMessage((streamAssistant || '').trim());
        }
        setStreamUserPartial('');
        setStreamAssistant('');
        const convId = dashInstance.getCurrentConversationId();
        if (convId) {
          const updatedConv = await dashInstance.getConversation(convId);
          if (updatedConv) {
            setConversation(updatedConv);
            setMessages(updatedConv.messages || []);
          }
        }
      } catch (e) {
        console.warn('Finalize streaming messages failed:', e);
      }
    })();
  }, [isStreaming, streamingEnabled, dashInstance]);


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
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.surface, 
          borderBottomColor: theme.border,
          // Ensure the header sits below the status bar / camera notch on all devices
          paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 16 : 8) + 8,
        }
      ]}>
        <View style={styles.headerLeft}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Dash</Text>
              {/* Tier badge */}
              {subReady && (
                <View style={[styles.tierBadge, { borderColor: theme.border, backgroundColor: getTierColor(tier) + '20' }]}>
                  <Text style={[styles.tierBadgeText, { color: getTierColor(tier) }]}>{getTierLabel(tier)}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              AI Teaching Assistant
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streaming status indicator */}
          {streamingEnabled && (
            <TouchableOpacity
              onPress={() => {
                try {
                  Alert.alert('Realtime Streaming', isStreaming ? 'Connected' : 'Idle', [
                    { text: 'OK' },
                    { text: 'Open Settings', onPress: () => router.push('/screens/dash-ai-settings') }
                  ]);
                } catch {}
              }}
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}
            >
              <View style={[styles.streamStatusDot, { backgroundColor: isStreaming ? theme.success : theme.border }]} />
            </TouchableOpacity>
          )}
          {/* Verify tier button */}
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Verify subscription tier"
            onPress={async () => {
              try {
                const supa = assertSupabase();
                const { data: { user } } = await supa.auth.getUser();
                let metaTier = (user?.user_metadata as any)?.subscription_tier || 'unknown';
                let profileTier = 'unknown';
                let planTier = 'unknown';
                let schoolId: string | undefined = (user?.user_metadata as any)?.preschool_id;
                if (!schoolId && user?.id) {
                  const { data: profile } = await supa
                    .from('profiles')
                    .select('preschool_id')
                    .eq('id', user.id)
                    .maybeSingle();
                  schoolId = profile?.preschool_id;
                }
                if (schoolId) {
                  const { data: sub } = await supa
                    .from('subscriptions')
                    .select('plan_id, status')
                    .eq('school_id', schoolId)
                    .eq('status', 'active')
                    .maybeSingle();
                  if (sub?.plan_id) {
                    const { data: plan } = await supa
                      .from('subscription_plans')
                      .select('tier')
                      .eq('id', sub.plan_id)
                      .maybeSingle();
                    planTier = String(plan?.tier || 'unknown');
                  }
                }
                // The SubscriptionContext tier
                profileTier = tier;
                const msg = `Tier verification:\n- Context tier: ${profileTier}\n- Metadata tier: ${metaTier}\n- Plan tier: ${planTier}\n- School: ${schoolId || 'none'}`;
                Alert.alert('Subscription Tier', msg, [{ text: 'OK' }]);
              } catch (e) {
                Alert.alert('Subscription Tier', 'Failed to verify tier');
              }
            }}
          >
            <Ionicons name="ribbon-outline" size={screenWidth < 400 ? 18 : 22} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Command Palette"
            onPress={() => setShowCommandPalette(true)}
          >
            <Ionicons name="compass-outline" size={screenWidth < 400 ? 18 : 22} color={theme.text} />
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

      {/* Messages */}
      {(() => {
        const ephemeral: DashMessage[] = [] as any;
        if (streamingEnabled && isStreaming && streamUserPartial.length > 0) {
          ephemeral.push({ id: 'ephemeral_user', type: 'user', content: streamUserPartial, timestamp: Date.now() } as any);
        }
        if (streamingEnabled && isStreaming && streamAssistant.length > 0) {
          ephemeral.push({ id: 'ephemeral_assistant', type: 'assistant', content: streamAssistant, timestamp: Date.now(), metadata: { live: true } } as any);
        }
        const data = [...messages, ...ephemeral];
        return (
          <FlatList
            ref={flatListRef}
            data={data}
            keyExtractor={(item: any, idx) => `${item.id}_${idx}`}
            renderItem={({ item, index }: any) => renderMessage(item, index)}
            contentContainerStyle={styles.messagesContent}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={(
              <>
                {/* Non-streaming voice send placeholder */}
                {!streamingEnabled && showVoiceSending && (
                  <View style={[styles.messageContainer, styles.userMessage]}>
                    <View style={[styles.messageBubble, { backgroundColor: theme.primary }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Waveform animation */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                          <Animated.View style={[styles.waveBar, { backgroundColor: '#fff', transform: [{ scaleY: waveVals[0] }] }]} />
                          <Animated.View style={[styles.waveBar, { backgroundColor: '#fff', transform: [{ scaleY: waveVals[1] }] }]} />
                          <Animated.View style={[styles.waveBar, { backgroundColor: '#fff', transform: [{ scaleY: waveVals[2] }] }]} />
                        </View>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                          Sending voice... {Math.max(1, Math.floor((pendingVoiceMs || 0) / 1000))}s
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {/* Thinking indicator only when not streaming */}
                {!isStreaming && (isLoading || vc.state === 'transcribing' || vc.state === 'thinking') && (
                  <StreamingIndicator showThinking thinkingText={vc.state === 'transcribing' ? 'Transcribing...' : 'Thinking...'} />
                )}
                {renderSuggestedActions()}
              </>
            )}
            onContentSizeChange={() => { try { (flatListRef.current as any)?.scrollToEnd?.({ animated: true }); } catch {} }}
            onLayout={() => { try { (flatListRef.current as any)?.scrollToEnd?.({ animated: false }); } catch {} }}
          />
        );
      })()}

      {/* Input Area */}
      <EnhancedInputArea
        sending={isLoading || isUploading}
        onSend={async (text, atts) => {
          try {
            setSelectedAttachments(atts || []);
            await sendMessage(text, atts || []);
          } catch {}
        }}
        onAttachmentsChange={(atts) => setSelectedAttachments(atts)}
        voiceState={vc.state}
        isVoiceLocked={vc.isLocked}
        voiceTimerMs={voiceTimerMs}
        onVoiceStart={() => {
          try {
            if (streamingEnabled) {
              // Clear any previous streamed buffers and start realtime stream
              setStreamUserPartial('');
              setStreamAssistant('');
              streamSpokenRef.current = false;
              streamFinalizedRef.current = false;
              realtime.startStream().catch((e: any) => console.error('Realtime start error:', e));
            } else {
              vc.startPress().catch((e) => console.error('Voice start error:', e));
            }
          } catch (e) {
            console.error('Voice start error:', e);
          }
        }}
        onVoiceEnd={() => {
          try {
            if (streamingEnabled) {
              // Stop realtime stream; footer will show streaming assistant content if any
              realtime.stopStream().catch((e: any) => console.error('Realtime stop error:', e));
            } else {
              // Immediate UX: show sending placeholder using local timer estimate
              setShowVoiceSending(true);
              setPendingVoiceMs(voiceTimerMs);
              // Release voice recording (send)
              vc.release().catch((e) => console.error('Voice end error:', e));
            }
          } catch (e) {
            console.error('Voice end error:', e);
          }
        }}
        onVoiceLock={() => {
          try {
            vc.lock();
          } catch (e) {
            console.error('Voice lock error:', e);
          }
        }}
        onVoiceCancel={() => {
          try {
            if (streamingEnabled) {
              realtime.cancel().catch((e: any) => console.error('Realtime cancel error:', e));
              setStreamUserPartial('');
              setStreamAssistant('');
              streamSpokenRef.current = false;
              streamFinalizedRef.current = false;
            } else {
              vc.cancel().catch((e) => console.error('Voice cancel error:', e));
            }
          } catch (e) {
            console.error('Voice cancel error:', e);
          }
        }}
      />

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
    width: '100%',
    alignSelf: 'stretch',
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
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 64,
  },
  hintOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 88,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    paddingHorizontal: 2,
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
    marginRight: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: screenWidth < 400 ? screenWidth * 0.85 : screenWidth * 0.82,
    padding: screenWidth < 400 ? 12 : 16,
    borderRadius: 20,
    minHeight: 48,
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    flexWrap: 'wrap',
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
    paddingHorizontal: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  suggestedActionsTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestedAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestedActionText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
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
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 12,
  },
  waveBar: {
    width: 3,
    height: 12,
    borderRadius: 2,
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
  inlineActionButton: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  streamStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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