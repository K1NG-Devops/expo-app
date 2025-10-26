# Archived Code: DashAssistant Old Input UI

This file contains the old input UI code that was replaced by the EnhancedInputArea component during Week 2 Modern Chat UI integration.

Archived on: 2025-10-01

## Old Input Area Code

```tsx
{/* Attachment chips */}
{renderAttachmentChips()}

<View style={styles.inputRow}>
  {/* Attach button */}
  <TouchableOpacity
    style={[
      styles.attachButton,
      { 
        backgroundColor: selectedAttachments.length > 0 ? theme.primaryLight : 'transparent',
        borderColor: theme.border
      }
    ]}
    onPress={handleAttachFile}
    disabled={isLoading || isUploading || vc.state === 'listening'}
    accessibilityLabel="Attach files"
  >
    <Ionicons 
      name="attach" 
      size={20} 
      color={selectedAttachments.length > 0 ? theme.primary : theme.textSecondary} 
    />
    {selectedAttachments.length > 0 && (
      <View style={[styles.attachBadge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.attachBadgeText, { color: theme.onPrimary }]}>
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
        backgroundColor: theme.inputBackground, 
        borderColor: theme.inputBorder,
        color: theme.inputText 
      }
    ]}
    placeholder={selectedAttachments.length > 0 ? "Add a message (optional)..." : "Ask Dash anything..."}
    placeholderTextColor={theme.inputPlaceholder}
    value={inputText}
    onChangeText={setInputText}
    multiline={!enterToSend}
    maxLength={500}
    editable={!isLoading && vc.state !== 'listening' && !isUploading}
    onSubmitEditing={enterToSend ? () => sendMessage() : undefined}
    returnKeyType={enterToSend ? "send" : "default"}
    blurOnSubmit={enterToSend}
  />
  
  {(inputText.trim() || selectedAttachments.length > 0) ? (
    <TouchableOpacity
      style={[styles.sendButton, { backgroundColor: theme.primary }]}
      onPress={() => sendMessage()}
      disabled={isLoading || isUploading}
    >
      {(isLoading || isUploading) ? (
        <ActivityIndicator size="small" color={theme.onPrimary} />
      ) : (
        <Ionicons name="send" size={20} color={theme.onPrimary} />
      )}
    </TouchableOpacity>
  ) : (
    <Animated.View style={{ transform: [{ scale: vc.state === 'listening' ? pulseAnimation : 1 }] }}>
      <TouchableOpacity
        style={[
          styles.recordButton,
          { 
            backgroundColor: vc.state === 'listening' ? theme.error : theme.accent 
          }
        ]}
        onPress={async () => {
          try {
            if (vc.state === 'listening') await vc.release();
            else await vc.startPress();
          } catch {}
        }}
        onLongPress={async () => { try { if (vc.state !== 'listening') { await vc.startPress(); } vc.lock(); } catch {} }}
        delayLongPress={150}
        disabled={isLoading}
      >
        <Ionicons 
          name={"mic"} 
          size={20} 
          color={theme.onAccent} 
        />
      </TouchableOpacity>
    </Animated.View>
  )}
</View>

{vc.state === 'listening' && (
  <View style={styles.recordingIndicator}>
    <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
    <Text style={[styles.recordingText, { color: theme.error }]}>
      Listening... Release to send
    </Text>
  </View>
)}
```

## Old External Avatar Code

```tsx
{!isUser && (
  <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
    <Ionicons name="sparkles" size={16} color={theme.onPrimary} />
  </View>
)}
<View style={{ flex: 1 }}>
  <MessageBubbleModern ... />
</View>
```

## Replaced By

- **EnhancedInputArea component** (`components/ai/EnhancedInputArea.tsx`)
  - Modern multi-line input with auto-expand
  - Built-in attachment picker buttons
  - Tier-aware gating with upgrade prompts
  - Cleaner UI with toolbar icons

- **MessageBubbleModern with showIcon prop**
  - Icon now rendered inside the bubble instead of external container
  - Wider, more consistent bubble design
  - Better alignment and spacing

## Related Components

- `components/ai/EnhancedInputArea.tsx`
- `components/ai/MessageBubbleModern.tsx`
- `components/ai/UpgradePromptModal.tsx`

## Migration Notes

The old input UI had several issues:
1. Duplicate UI elements showing simultaneously
2. External avatar container made bubbles narrower
3. Less modern appearance compared to ChatGPT/Claude
4. Attachment handling was separate from input area

The new EnhancedInputArea addresses all these issues with a unified, modern interface.
