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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAIAssistant, DashMessage, DashConversation } from '@/services/DashAIAssistant';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}) => {
  const { theme, isDark } = useTheme();
  const { setLayout } = useDashboardPreferences();
  const [messages, setMessages] = useState<DashMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState<DashConversation | null>(null);
  const [dashInstance, setDashInstance] = useState<DashAIAssistant | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording, pulseAnimation]);

  // Focus effect to refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh conversation when screen focuses
      if (dashInstance && conversation) {
        dashInstance.getConversation(conversation.id).then((updatedConv) => {
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

    // Only add event listener if we're in a web environment
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [dashInstance, isSpeaking]);

  const sendMessage = async (text: string = inputText.trim()) => {
    if (!text || !dashInstance || isLoading) return;

    try {
      setIsLoading(true);
      setInputText('');

      const response = await dashInstance.sendMessage(text);
      
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
        console.log(`[Dash] Opening screen: ${route}`, params || {});
        try {
          router.push({ pathname: route, params } as any);
        } catch (e) {
          console.warn('Failed to navigate to route from Dash action:', e);
        }
      }
      
      // Update messages from conversation
      const updatedConv = await dashInstance.getConversation(dashInstance.getCurrentConversationId()!);
      if (updatedConv) {
        setMessages(updatedConv.messages);
        setConversation(updatedConv);
      }

      // Auto-speak response if enabled
      setTimeout(() => {
        speakResponse(response);
      }, 500);

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if (!dashInstance || isRecording) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      await dashInstance.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!dashInstance || !isRecording) return;

    try {
      setIsRecording(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const audioUri = await dashInstance.stopRecording();
      if (audioUri) {
        setIsLoading(true);
        const response = await dashInstance.sendVoiceMessage(audioUri);
        
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
        }

        if (response.metadata?.dashboard_action?.type === 'open_screen') {
          const { route, params } = response.metadata.dashboard_action as any;
          console.log(`[Dash] Opening screen: ${route}`, params || {});
          try { router.push({ pathname: route, params } as any); } catch (e) { console.warn('Failed to navigate to route from Dash action:', e); }
        }
        
        // Update messages from conversation
        const updatedConv = await dashInstance.getConversation(dashInstance.getCurrentConversationId()!);
        if (updatedConv) {
          setMessages(updatedConv.messages);
          setConversation(updatedConv);
        }

        // Auto-speak response
        setTimeout(() => {
          speakResponse(response);
        }, 500);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process voice message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = async (message: DashMessage) => {
    if (!dashInstance || isSpeaking || message.type !== 'assistant') return;

    try {
      setIsSpeaking(true);
      await dashInstance.speakResponse(message);
    } catch (error) {
      console.error('Failed to speak response:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    if (!dashInstance || !isSpeaking) return;

    try {
      await dashInstance.stopSpeaking();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Failed to stop speaking:', error);
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
        
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: theme.primary, marginLeft: screenWidth * 0.15 }
              : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, marginRight: screenWidth * 0.25 },
          ]}
        >
          {!isUser && (
            <View style={styles.bubbleHeaderRow}>
              <View style={[styles.inlineAvatar, { backgroundColor: theme.primary }]}>
                <Ionicons name="sparkles" size={14} color={theme.onPrimary} />
              </View>
            </View>
          )}
          <View style={styles.messageContentRow}>
            <Text
              style={[
                styles.messageText,
                { color: isUser ? theme.onPrimary : theme.text, flex: 1 },
              ]}
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
        
        {!isUser && isLastMessage && !isLoading && (
          <TouchableOpacity
            style={[styles.speakButton, { backgroundColor: theme.accent }]}
            onPress={() => isSpeaking ? stopSpeaking() : speakResponse(message)}
          >
            <Ionicons 
              name={isSpeaking ? "stop" : "volume-high"} 
              size={16} 
              color={theme.onAccent} 
            />
          </TouchableOpacity>
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
          {lastMessage.metadata.suggested_actions.map((action, index) => (
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
        const animations = dotAnimations.map((dot, index) => 
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
      dotAnimations.forEach((dot) => {
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
            {dotAnimations.map((dot, index) => (
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Dash</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              AI Teaching Assistant
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Conversations"
            onPress={() => router.push('/screens/dash-conversations-history')}
          >
            <Ionicons name="time-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityLabel="Settings"
            onPress={() => router.push('/screens/dash-ai-settings')}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={async () => {
                // Stop any ongoing speech and update UI state
                if (dashInstance) {
                  setIsSpeaking(false);
                  await dashInstance.stopSpeaking();
                  dashInstance.cleanup();
                }
                onClose();
              }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => renderMessage(message, index))}
        
        {renderTypingIndicator()}

        {renderSuggestedActions()}
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.inputBorder,
                color: theme.inputText 
              }
            ]}
            placeholder="Ask Dash anything..."
            placeholderTextColor={theme.inputPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline={!enterToSend}
            maxLength={500}
            editable={!isLoading && !isRecording}
            onSubmitEditing={enterToSend ? () => sendMessage() : undefined}
            returnKeyType={enterToSend ? "send" : "default"}
            blurOnSubmit={enterToSend}
          />
          
          {inputText.trim() ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={() => sendMessage()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Ionicons name="send" size={20} color={theme.onPrimary} />
              )}
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnimation : 1 }] }}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  { 
                    backgroundColor: isRecording ? theme.error : theme.accent 
                  }
                ]}
                onLongPress={startRecording}
                onPressOut={stopRecording}
                disabled={isLoading}
              >
                <Ionicons 
                  name={isRecording ? "stop" : "mic"} 
                  size={20} 
                  color={theme.onAccent} 
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
            <Text style={[styles.recordingText, { color: theme.error }]}>
              Recording... Release to send
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: screenWidth < 400 ? screenWidth * 0.8 : screenWidth * 0.75,
    padding: screenWidth < 400 ? 10 : 12,
    borderRadius: 18,
    minHeight: 44,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
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
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  speakButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    paddingLeft: 28,
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
});

export default DashAssistant;