# Dash UI/UX Critical Fixes

**Date**: 2025-01-14  
**Priority**: 🔴 CRITICAL  
**Status**: 🔨 IN PROGRESS  

---

## 🚨 Critical Issues Identified

### 1. **Conversation Loading from Top (Performance Issue)**
**Problem**: Dash loads hundreds of messages from the top, causing:
- Slow initial load time
- Poor user experience (user has to scroll down)
- Unnecessary memory usage
- Not WhatsApp-like behavior

**Current Behavior**:
```typescript
// DashAssistant.tsx line 1253-1260
<FlatList
  ref={flatListRef}
  data={data}  // Loads ALL messages at once
  renderItem={({ item, index }) => renderMessage(item, index)}
  // ...
/>
```

**Solution**:
- **Use `inverted` prop** on FlatList to render from bottom-up
- **Implement lazy loading** (paginated loading)
- **Load only last 20-30 messages** initially
- **Load more on scroll to top** (infinite scroll upwards)

---

### 2. **Missing TTS Speak Button**
**Problem**: MessageBubbleModern component has NO speak button

**Current Code** (lines 227-255):
```typescript
{showActions && !isUser && !isSystem && (
  <View style={styles.actions}>
    <TouchableOpacity onPress={handleCopy}>...</TouchableOpacity>
    {onRegenerate && <TouchableOpacity>...</TouchableOpacity>}
    {/* NO SPEAK BUTTON! */}
  </View>
)}
```

**Solution**: Add speak button with TTS callback prop

---

### 3. **Text Not Selectable**
**Problem**: Message text is not selectable for copy/paste

**Current Code** (line 197-199):
```typescript
<Text key={index} style={[styles.text, { color: isUser ? '#fff' : theme.text }]}>
  {line}
</Text>
```

**Solution**: Add `selectable` prop to Text components

---

### 4. **No Transcription Editing**
**Problem**: Voice transcription is sent immediately to AI without user review

**Current Flow**:
```
Voice Recording → Transcription → Immediate Send to AI
```

**Desired Flow**:
```
Voice Recording → Transcription → Show in Editable Field → User Reviews/Edits → Send
```

**Solution**: Add intermediate editing step with cancel option

---

### 5. **Recording Modal Instability**
**Problem**: Voice recording UI changes/becomes unstable during recording

**Issues**:
- Modal appearance inconsistent
- No clear waveform visualization
- Doesn't match WhatsApp style
- Timer might jump or reset

---

### 6. **No WhatsApp-Style Voice UX**
**Problem**: Recording experience is not intuitive like WhatsApp

**WhatsApp Voice Recording UX**:
- **Hold to record** (default)
- **Slide up to lock** recording
- **Slide left to cancel** (with visual feedback)
- **Waveform visualization** while recording
- **Timer visible** prominently
- **Release to send** (when not locked)
- **Tap to stop** (when locked)

---

## ✅ Implementation Plan

### Fix 1: Conversation Loading (Load from Bottom)

**File**: `components/ai/DashAssistant.tsx`

**Changes**:

```typescript
// Add pagination state
const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
const MESSAGE_PAGE_SIZE = 30;

// Modified FlatList setup
<FlatList
  ref={flatListRef}
  data={messages}
  keyExtractor={(item, idx) => `${item.id}_${idx}`}
  renderItem={({ item, index }) => renderMessage(item, index)}
  contentContainerStyle={styles.messagesContent}
  style={styles.messagesContainer}
  
  // CRITICAL: Inverted for bottom-up rendering
  inverted={true}  // This makes it WhatsApp-like!
  
  // Lazy loading
  onEndReached={loadMoreMessages}
  onEndReachedThreshold={0.5}
  
  ListFooterComponent={loadingMoreMessages ? (
    <ActivityIndicator size="small" color={theme.primary} />
  ) : null}
  
  // Performance optimizations
  initialNumToRender={20}
  maxToRenderPerBatch={10}
  windowSize={21}
  removeClippedSubviews={Platform.OS === 'android'}
  
  showsVerticalScrollIndicator={false}
/>

// Load more messages function
const loadMoreMessages = async () => {
  if (loadingMoreMessages || allMessagesLoaded || !dashInstance) return;
  
  setLoadingMoreMessages(true);
  try {
    const currentOffset = messages.length;
    // Load older messages from storage
    const olderMessages = await dashInstance.getMessagesRange(
      conversation?.id,
      currentOffset,
      MESSAGE_PAGE_SIZE
    );
    
    if (olderMessages.length === 0) {
      setAllMessagesLoaded(true);
    } else {
      setMessages(prev => [...prev, ...olderMessages]);
    }
  } catch (error) {
    console.error('Failed to load more messages:', error);
  } finally {
    setLoadingMoreMessages(false);
  }
};
```

**Benefits**:
- ✅ Starts at bottom (most recent)
- ✅ Loads only 20-30 messages initially
- ✅ Lazy loads older messages on scroll
- ✅ Better performance with hundreds of messages

---

### Fix 2: Add TTS Speak Button

**File**: `components/ai/MessageBubbleModern.tsx`

**Changes**:

```typescript
// Add new prop
export interface MessageBubbleModernProps {
  message: DashMessage;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onSpeak?: (message: DashMessage) => void;  // NEW!
  isSpeaking?: boolean;  // NEW!
  showActions?: boolean;
  showIcon?: boolean;
}

export function MessageBubbleModern({
  message,
  onCopy,
  onRegenerate,
  onSpeak,      // NEW!
  isSpeaking,   // NEW!
  showActions = true,
  showIcon = false,
}: MessageBubbleModernProps) {
  // ... existing code ...
  
  {/* Action buttons */}
  {showActions && !isUser && !isSystem && (
    <View style={styles.actions}>
      {/* Speak button - NEW! */}
      {onSpeak && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isSpeaking
                ? theme.primary
                : theme.surface,
            },
          ]}
          onPress={() => onSpeak(message)}
        >
          <Ionicons
            name={isSpeaking ? 'stop' : 'volume-high-outline'}
            size={14}
            color={isSpeaking ? theme.onPrimary || '#fff' : theme.text}
          />
          <Text
            style={[
              styles.actionText,
              {
                color: isSpeaking
                  ? theme.onPrimary || '#fff'
                  : theme.text,
              },
            ]}
          >
            {isSpeaking ? 'Stop' : 'Speak'}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Existing Copy button */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.surface }]}
        onPress={handleCopy}
      >
        {/* ... existing code ... */}
      </TouchableOpacity>
      
      {/* Existing Regenerate button */}
      {onRegenerate && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={onRegenerate}
        >
          {/* ... existing code ... */}
        </TouchableOpacity>
      )}
    </View>
  )}
}
```

**Update in DashAssistant.tsx**:

```typescript
// Line 638
<MessageBubbleModern
  message={message}
  showIcon={!isUser}
  onSpeak={!isUser ? speakResponse : undefined}  // Pass speak handler
  isSpeaking={speakingMessageId === message.id}  // Pass speaking state
  onRegenerate={!isUser ? () => {
    const prev = messages[index - 1];
    const retryText = prev && prev.type === 'user' ? prev.content : message.content;
    sendMessage(retryText);
  } : undefined}
/>
```

---

### Fix 3: Make Text Selectable

**File**: `components/ai/MessageBubbleModern.tsx`

**Changes**:

```typescript
// Add selectable prop to ALL Text components
<Text
  selectable={true}  // ADD THIS!
  key={index}
  style={[styles.text, { color: isUser ? '#fff' : theme.text }]}
>
  {line}
</Text>
```

**Apply to**:
- All message text (line 197-199)
- Headers (h1, h2, h3)
- List items
- Bold text

---

### Fix 4: Add Transcription Editing

**New Component**: `components/ai/TranscriptionEditModal.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface TranscriptionEditModalProps {
  visible: boolean;
  transcription: string;
  duration: number;
  onSend: (editedText: string) => void;
  onCancel: () => void;
}

export function TranscriptionEditModal({
  visible,
  transcription,
  duration,
  onSend,
  onCancel,
}: TranscriptionEditModalProps) {
  const { theme } = useTheme();
  const [editedText, setEditedText] = useState(transcription);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setEditedText(transcription);
      // Auto-focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, transcription]);

  const handleSend = () => {
    if (editedText.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSend(editedText);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />
        
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Ionicons name="mic" size={20} color={theme.primary} />
              <Text style={[styles.headerText, { color: theme.text }]}>
                Voice Message ({duration}s)
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Review and edit your transcription
            </Text>
          </View>

          {/* Transcription Editor */}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={editedText}
            onChangeText={setEditedText}
            multiline
            placeholder="Your message..."
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="sentences"
            autoCorrect={true}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.text} />
              <Text style={[styles.buttonText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                { backgroundColor: theme.primary },
                !editedText.trim() && styles.buttonDisabled,
              ]}
              onPress={handleSend}
              disabled={!editedText.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={theme.onPrimary || '#fff'}
              />
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.onPrimary || '#fff' },
                ]}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    marginHorizontal: 20,
    minHeight: 120,
    maxHeight: 240,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    borderWidth: 1,
  },
  sendButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Integrate into DashAssistant.tsx**:

```typescript
// Add state
const [showTranscriptionEdit, setShowTranscriptionEdit] = useState(false);
const [pendingTranscription, setPendingTranscription] = useState<{
  text: string;
  duration: number;
} | null>(null);

// Import component
import { TranscriptionEditModal } from '@/components/ai/TranscriptionEditModal';

// Modify voice controller callback
const vc = useVoiceController({
  onTranscribed: async (text: string, durationMs: number) => {
    console.log(`[Voice] Transcribed: "${text}" (${Math.floor(durationMs/1000)}s)`);
    setShowVoiceSending(false);
    
    // SHOW EDIT MODAL INSTEAD OF IMMEDIATE SEND!
    setPendingTranscription({
      text,
      duration: Math.floor(durationMs / 1000),
    });
    setShowTranscriptionEdit(true);
  },
  // ... rest of callbacks
});

// Add modal to render
<TranscriptionEditModal
  visible={showTranscriptionEdit}
  transcription={pendingTranscription?.text || ''}
  duration={pendingTranscription?.duration || 0}
  onSend={(editedText) => {
    setShowTranscriptionEdit(false);
    sendMessage(editedText);
    setPendingTranscription(null);
  }}
  onCancel={() => {
    setShowTranscriptionEdit(false);
    setPendingTranscription(null);
  }}
/>
```

---

### Fix 5 & 6: WhatsApp-Style Voice Recording

**Create New Component**: `components/ai/WhatsAppVoiceRecorder.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_CANCEL_THRESHOLD = -120;
const SLIDE_LOCK_THRESHOLD = -80;

interface WhatsAppVoiceRecorderProps {
  isRecording: boolean;
  timerMs: number;
  isLocked: boolean;
  onLock: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

export function WhatsAppVoiceRecorder({
  isRecording,
  timerMs,
  isLocked,
  onLock,
  onCancel,
  onComplete,
}: WhatsAppVoiceRecorderProps) {
  const { theme } = useTheme();
  const slideX = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [waveAmplitudes, setWaveAmplitudes] = useState([0.3, 0.5, 0.7, 0.5, 0.3]);

  // Waveform animation
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setWaveAmplitudes(
        Array.from({ length: 5 }, () => 0.2 + Math.random() * 0.8)
      );
    }, 150);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Pulse animation
  useEffect(() => {
    if (!isRecording) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulseAnim.setValue(1);
    };
  }, [isRecording]);

  // Pan responder for slide gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (isLocked) return;

        // Horizontal slide (cancel)
        if (gesture.dx < 0) {
          slideX.setValue(gesture.dx);
          
          // Haptic feedback at cancel threshold
          if (gesture.dx < SLIDE_CANCEL_THRESHOLD && gesture.dx > SLIDE_CANCEL_THRESHOLD - 10) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }

        // Vertical slide (lock)
        if (gesture.dy < 0) {
          slideY.setValue(gesture.dy);
          
          // Haptic feedback at lock threshold
          if (gesture.dy < SLIDE_LOCK_THRESHOLD && gesture.dy > SLIDE_LOCK_THRESHOLD - 10) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isLocked) return;

        // Cancel if slid far enough left
        if (gesture.dx < SLIDE_CANCEL_THRESHOLD) {
          onCancel();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        // Lock if slid far enough up
        else if (gesture.dy < SLIDE_LOCK_THRESHOLD) {
          onLock();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Complete recording on release (if not locked)
        else {
          onComplete();
        }

        // Reset slide position
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).useCallback();

  if (!isRecording) return null;

  const formattedTime = `${Math.floor(timerMs / 60000)
    .toString()
    .padStart(2, '0')}:${Math.floor((timerMs % 60000) / 1000)
    .toString()
    .padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Cancel hint */}
      <Animated.View
        style={[
          styles.cancelHint,
          {
            opacity: slideX.interpolate({
              inputRange: [SLIDE_CANCEL_THRESHOLD, 0],
              outputRange: [1, 0.3],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={theme.error} />
        <Text style={[styles.cancelText, { color: theme.error }]}>
          Slide to cancel
        </Text>
      </Animated.View>

      {/* Main recording UI */}
      <Animated.View
        {...(isLocked ? {} : panResponder.current.panHandlers)}
        style={[
          styles.recordingContent,
          {
            transform: [
              { translateX: slideX },
              { translateY: slideY },
            ],
          },
        ]}
      >
        {/* Mic icon with pulse */}
        <Animated.View
          style={[
            styles.micContainer,
            {
              backgroundColor: theme.error,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </Animated.View>

        {/* Waveform */}
        <View style={styles.waveform}>
          {waveAmplitudes.map((amplitude, index) => (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  backgroundColor: theme.primary,
                  height: amplitude * 30,
                },
              ]}
            />
          ))}
        </View>

        {/* Timer */}
        <Text style={[styles.timer, { color: theme.text }]}>
          {formattedTime}
        </Text>

        {/* Lock indicator */}
        {!isLocked && (
          <Animated.View
            style={[
              styles.lockHint,
              {
                opacity: slideY.interpolate({
                  inputRange: [SLIDE_LOCK_THRESHOLD, 0],
                  outputRange: [1, 0.3],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
          </Animated.View>
        )}

        {/* Locked indicator */}
        {isLocked && (
          <View style={[styles.lockedBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </Animated.View>

      {/* Instructions */}
      {!isLocked && (
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          ← Cancel | ↑ Lock | Release to send
        </Text>
      )}
      {isLocked && (
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Tap mic to stop recording
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  micContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  wave: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 8,
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
  },
  lockHint: {
    padding: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
```

---

## 📊 Impact Analysis

| Issue | Severity | User Impact | Fix Complexity |
|-------|----------|-------------|----------------|
| Loading from top | 🔴 High | Slow load, bad UX | 🟢 Easy |
| Missing speak button | 🟠 Medium | Can't replay responses | 🟢 Easy |
| Text not selectable | 🟠 Medium | Can't copy text | 🟢 Easy |
| No transcription edit | 🔴 High | Mistakes sent to AI | 🟡 Medium |
| Recording instability | 🟠 Medium | Confusing UX | 🔴 Hard |
| Not WhatsApp-like | 🟠 Medium | Poor familiarity | 🟡 Medium |

---

## 🚀 Deployment Priority

### Phase 1 (Quick Wins - Do First)
1. ✅ Fix `capabilities` error (DONE)
2. 🔥 Make text selectable
3. 🔥 Add speak button
4. 🔥 Invert FlatList (load from bottom)

### Phase 2 (Medium Effort)
5. Add transcription editing modal
6. Implement lazy loading for messages

### Phase 3 (Polish)
7. WhatsApp-style voice recorder
8. Fix recording modal stability

---

## 📚 Testing Checklist

After implementing fixes:

- [ ] Conversation loads from bottom (most recent first)
- [ ] Can scroll up to load older messages
- [ ] Speak button appears on assistant messages
- [ ] Can select and copy message text
- [ ] Voice transcription shows in editable modal
- [ ] Can edit transcription before sending
- [ ] Can cancel transcription
- [ ] Voice recording UI is stable
- [ ] Waveform animates smoothly
- [ ] Slide to cancel works
- [ ] Slide to lock works
- [ ] Timer shows correctly

---

**Next Steps**: Implement Phase 1 fixes immediately (high priority, low complexity)

*This document will be updated as fixes are implemented.*