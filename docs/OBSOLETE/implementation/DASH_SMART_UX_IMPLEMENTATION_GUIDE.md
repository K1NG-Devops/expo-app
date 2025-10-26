# Dash AI - Smart UX Implementation Guide

**Date**: 2025-10-14  
**Status**: 🚧 **IN PROGRESS**  
**Goal**: Load last conversation on app start + smart, non-repetitive responses

---

## ✅ **Completed So Far**

### **1. Response Templates** ✅
**File**: `lib/constants/aiResponses.ts`

**Features**:
- Varied greeting templates (only for new sessions)
- Short acknowledgments for follow-ups
- Context-aware responses (thanks, confirm, clarify)
- Speech-specific short variants
- Intent detection (greeting, thanks, confirm, question, request)
- Disclaimer stripping for speech mode
- First name extraction

### **2. Conversation Persistence** ✅
**File**: `services/conversationPersistence.ts`

**Features**:
- Get/set last active conversation ID
- Save/load conversation snapshots (last 20-50 messages)
- Session state management (30-minute TTL)
- Automatic session expiration
- Corruption recovery
- User-scoped storage keys

---

## 🔨 **Remaining Implementation**

### **Step 1: Add ResponseCoordinator to DashAIAssistant.ts**

Add this class to `services/DashAIAssistant.ts`:

```typescript
import { 
  responses, 
  interpolate, 
  getTimeOfDay, 
  simpleHash, 
  detectIntent,
  stripDisclaimers,
  extractFirstName,
  type UserIntent 
} from '@/lib/constants/aiResponses';
import { 
  getSessionState, 
  saveSessionState, 
  updateLastActivity,
  type SessionState 
} from '@/services/conversationPersistence';

/**
 * ResponseCoordinator
 * 
 * Manages smart, context-aware responses with:
 * - Session awareness (new vs continuing)
 * - Response variation (no repetition)
 * - Personalization (first name only)
 * - Speech optimization
 */
class ResponseCoordinator {
  private userId: string | null = null;
  private firstName: string | null = null;
  private sessionState: SessionState | null = null;
  private templateIndices: Map<string, number> = new Map();
  
  /**
   * Initialize coordinator with user context
   */
  async init(userId: string, fullName?: string): Promise<void> {
    this.userId = userId;
    this.firstName = extractFirstName(fullName);
    this.sessionState = await getSessionState(userId);
  }
  
  /**
   * Called before AI generates response
   * Returns immediate acknowledgment if appropriate
   */
  async beforeAIResponds(
    userMessage: string, 
    mode: 'text' | 'speech'
  ): Promise<{ preAck?: string; ackType?: string }> {
    if (!this.userId || !this.sessionState) {
      return {};
    }
    
    const intent = detectIntent(userMessage);
    const messageHash = simpleHash(userMessage);
    
    // Update activity timestamp
    await updateLastActivity(this.userId);
    
    // Handle different intents
    switch (intent) {
      case 'greeting':
        // Only greet once per session
        if (!this.sessionState.greeted) {
          this.sessionState.greeted = true;
          await saveSessionState(this.userId, this.sessionState);
          
          const greeting = this.selectTemplate('greetNewSession');
          const personalized = interpolate(greeting, {
            firstName: this.firstName || 'there',
            timeOfDay: getTimeOfDay(),
          });
          
          return { 
            preAck: mode === 'speech' ? this.selectTemplate('shortSpeechVariants') : personalized, 
            ackType: 'greet' 
          };
        } else {
          // Already greeted, use short ack
          return { 
            preAck: this.selectTemplate(mode === 'speech' ? 'shortSpeechVariants' : 'ackFollowUp'),
            ackType: 'followup' 
          };
        }
      
      case 'thanks':
        return { 
          preAck: this.selectTemplate('thanks'), 
          ackType: 'thanks' 
        };
      
      case 'confirm':
        return { 
          preAck: this.selectTemplate('confirm'), 
          ackType: 'confirm' 
        };
      
      default:
        // For other intents, provide short ack in speech mode only
        if (mode === 'speech') {
          return { 
            preAck: this.selectTemplate('shortSpeechVariants'), 
            ackType: 'short' 
          };
        }
        return {};
    }
  }
  
  /**
   * Called after AI generates response
   * Shapes the response for better UX
   */
  async afterAIResponds(
    aiText: string, 
    mode: 'text' | 'speech'
  ): Promise<{ finalText: string }> {
    if (!this.userId || !this.sessionState) {
      return { finalText: aiText };
    }
    
    let finalText = aiText;
    
    // For speech mode, strip disclaimers and shorten
    if (mode === 'speech') {
      finalText = stripDisclaimers(finalText);
      
      // If response is very long, add summarization hint
      if (finalText.length > 300) {
        const sentences = finalText.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 5) {
          finalText = "Here's a quick summary: " + sentences.slice(0, 3).join('. ') + '.';
        }
      }
    }
    
    // Avoid full name repetition - only use first name
    if (this.firstName) {
      // Replace any full name patterns with just first name
      finalText = finalText.replace(
        new RegExp(`\\b${this.firstName}\\s+\\w+\\b`, 'gi'),
        this.firstName
      );
    }
    
    // Check for repetition
    const responseHash = simpleHash(finalText);
    if (this.sessionState.lastUserHash === responseHash) {
      console.log('[ResponseCoordinator] Detected repetition, shortening');
      finalText = this.selectTemplate('transition') + ' ' + finalText;
    }
    
    // Save hash for deduplication
    this.sessionState.lastUserHash = responseHash;
    this.sessionState.recentPhrases.push(finalText.substring(0, 50));
    if (this.sessionState.recentPhrases.length > 10) {
      this.sessionState.recentPhrases.shift();
    }
    
    await saveSessionState(this.userId, this.sessionState);
    
    return { finalText };
  }
  
  /**
   * Reset session for new conversation
   */
  async resetSession(): Promise<void> {
    if (!this.userId) return;
    
    this.sessionState = {
      isNewSession: true,
      greeted: false,
      lastAckType: undefined,
      lastUserHash: undefined,
      recentPhrases: [],
      lastActivityAt: Date.now(),
    };
    
    await saveSessionState(this.userId, this.sessionState);
    this.templateIndices.clear();
  }
  
  /**
   * Select template with variation (no immediate repeats)
   */
  private selectTemplate(category: keyof typeof responses): string {
    const templates = responses[category];
    if (!templates || templates.length === 0) {
      return '';
    }
    
    if (templates.length === 1) {
      return templates[0];
    }
    
    // Get last index used, default to -1
    const lastIndex = this.templateIndices.get(category) ?? -1;
    
    // Select next index (rotate through all before repeating)
    let nextIndex = (lastIndex + 1) % templates.length;
    
    this.templateIndices.set(category, nextIndex);
    return templates[nextIndex];
  }
}

// Export singleton instance
export const responseCoordinator = new ResponseCoordinator();
```

---

### **Step 2: Modify DashAssistant.tsx for Conversation Hydration**

**Location**: `components/ai/DashAssistant.tsx`

**Add at the top**:
```typescript
import { 
  getLastActiveConversationId,
  setLastActiveConversationId,
  getConversationSnapshot,
  saveConversationSnapshot,
  type PersistedMessage 
} from '@/services/conversationPersistence';
import { responseCoordinator } from '@/services/DashAIAssistant';
```

**Add state**:
```typescript
const [isHydrating, setIsHydrating] = useState(true);
const [isExistingConversation, setIsExistingConversation] = useState(false);
const [userId, setUserId] = useState<string | null>(null);
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**Add hydration effect (replace or augment existing useEffect)**:
```typescript
useEffect(() => {
  const initializeDash = async () => {
    try {
      const dash = DashAIAssistant.getInstance();
      await dash.initialize();
      setDashInstance(dash);
      setIsInitialized(true);

      // Get user ID for persistence
      const { data: { user } } = await assertSupabase().auth.getUser();
      const currentUserId = user?.id || null;
      setUserId(currentUserId);
      
      if (currentUserId) {
        // Initialize response coordinator
        const fullName = (user?.user_metadata as any)?.full_name;
        await responseCoordinator.init(currentUserId, fullName);
        
        // Try to hydrate last conversation
        setIsHydrating(true);
        const lastConvId = await getLastActiveConversationId(currentUserId);
        
        if (lastConvId && !conversationId) {
          // Load snapshot
          const snapshot = await getConversationSnapshot(currentUserId, lastConvId, 20);
          
          if (snapshot && snapshot.messages.length > 0) {
            console.log(`[Dash] Hydrating ${snapshot.messages.length} messages from last conversation`);
            
            // Convert persisted messages to DashMessage format
            const hydratedMessages: DashMessage[] = snapshot.messages.map((m: PersistedMessage) => ({
              id: m.id,
              type: m.type,
              content: m.content,
              timestamp: m.timestamp,
              metadata: m.meta,
            }));
            
            setMessages(hydratedMessages);
            setConversation({ 
              id: lastConvId, 
              title: 'Previous conversation', 
              messages: hydratedMessages,
              created_at: snapshot.updatedAt,
              updated_at: snapshot.updatedAt,
            });
            setIsExistingConversation(true);
            dash.setCurrentConversationId(lastConvId);
            
            // Scroll to bottom after hydration
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }
        
        setIsHydrating(false);
      }

      // Load existing conversation or create new
      if (conversationId) {
        const existingConv = await dash.getConversation(conversationId);
        if (existingConv) {
          setConversation(existingConv);
          setMessages(existingConv.messages || []);
          dash.setCurrentConversationId(conversationId);
          setIsExistingConversation((existingConv.messages?.length || 0) > 0);
        }
      } else if (!lastConvId) {
        // Create new conversation only if no hydration happened
        const createdId = await dash.startNewConversation('Chat with Dash');
        const newConv = await dash.getConversation(createdId);
        if (newConv) {
          setConversation(newConv);
        }
        if (currentUserId) {
          await setLastActiveConversationId(currentUserId, createdId);
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
      } else if (!isExistingConversation) {
        // Only show greeting for NEW conversations
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
      setIsHydrating(false);
    }
  };

  initializeDash();
}, [conversationId, initialMessage]);
```

**Add persistence on message changes**:
```typescript
// Debounced save effect
useEffect(() => {
  if (!userId || !conversation?.id || messages.length === 0) return;
  
  // Clear existing timeout
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  
  // Debounce save (300ms)
  saveTimeoutRef.current = setTimeout(async () => {
    const persistedMessages: PersistedMessage[] = messages.map(m => ({
      id: m.id,
      type: m.type,
      content: m.content,
      timestamp: m.timestamp,
      meta: m.metadata,
    }));
    
    await saveConversationSnapshot(userId, conversation.id, persistedMessages, 50);
  }, 300);
  
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [messages, userId, conversation?.id]);
```

**Add skeleton loader while hydrating**:
```typescript
{isHydrating && (
  <View style={styles.skeletonContainer}>
    {[...Array(8)].map((_, i) => (
      <View 
        key={`skeleton-${i}`}
        style={[
          styles.skeletonBubble,
          { 
            alignSelf: i % 3 === 0 ? 'flex-end' : 'flex-start',
            backgroundColor: theme.border,
            opacity: 0.3,
          }
        ]}
      />
    ))}
  </View>
)}
```

**Add skeleton styles**:
```typescript
skeletonContainer: {
  flex: 1,
  padding: 16,
  gap: 12,
},
skeletonBubble: {
  height: 60,
  width: '70%',
  borderRadius: 16,
},
```

---

### **Step 3: Integrate Smart Responses in sendMessage**

**Modify the sendMessage function**:
```typescript
const sendMessage = async (content: string) => {
  if (!dashInstance || !content.trim()) return;
  
  try {
    setIsLoading(true);
    
    // Get pre-acknowledgment if appropriate
    const { preAck, ackType } = await responseCoordinator.beforeAIResponds(
      content,
      'text' // or 'speech' if voice mode
    );
    
    // If we have a pre-ack for simple intents (thanks, confirm), show it immediately
    if (preAck && (ackType === 'thanks' || ackType === 'confirm')) {
      const ackMessage: DashMessage = {
        id: `ack_${Date.now()}`,
        type: 'assistant',
        content: preAck,
        timestamp: Date.now(),
        metadata: { ackType },
      };
      setMessages(prev => [...prev, ackMessage]);
      setIsLoading(false);
      return; // Don't call AI for simple acknowledgments
    }
    
    // Send message to AI
    const response = await dashInstance.sendMessage(content, conversation?.id);
    
    // Shape the response
    const { finalText } = await responseCoordinator.afterAIResponds(
      response.content,
      'text'
    );
    
    // Update message with shaped response
    const shapedResponse: DashMessage = {
      ...response,
      content: finalText,
    };
    
    setMessages(prev => [...prev, shapedResponse]);
    
  } catch (error) {
    console.error('Failed to send message:', error);
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

---

### **Step 4: Testing Checklist**

**Fresh Install Test**:
- [ ] App shows greeting on first launch
- [ ] Send a message, reload app
- [ ] **Expected**: Last conversation loads immediately, no greeting shown

**Continuing Session Test**:
- [ ] Send "hi" → should greet once
- [ ] Send "hello" again → should NOT greet again, short ack
- [ ] Send "thanks" → responds with "You're welcome!" or variant
- [ ] Send "ok" → responds with "Done." or variant

**Repetition Test**:
- [ ] Ask same question twice
- [ ] **Expected**: Second response is shorter or prefixed with transition

**First Name Test**:
- [ ] Greeting uses first name only, not full name
- [ ] Subsequent messages don't overuse name

**Speech Mode Test**:
- [ ] Voice responses are concise
- [ ] No "As an AI..." disclaimers
- [ ] Short acks like "On it." instead of long sentences

**Persistence Test**:
- [ ] Force close app
- [ ] Reopen
- [ ] **Expected**: Last 20 messages appear instantly
- [ ] Scroll position at bottom

**Storage Corruption Test**:
- [ ] Manually corrupt AsyncStorage key
- [ ] App recovers gracefully, shows empty state

---

### **Step 5: Performance Optimization**

**Use FlashList** (if not already):
```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={messages}
  renderItem={({ item }) => <MessageBubble message={item} />}
  estimatedItemSize={100}
  keyExtractor={(item) => item.id}
  onContentSizeChange={() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }}
/>
```

---

## 📚 **Documentation**

Add to `docs/features/DASH_SMART_UX.md`:

```markdown
# Dash AI - Smart UX Features

## Conversation Persistence
- Last 20 messages load instantly on app start
- No network required for hydration
- Stored per-user in AsyncStorage

## Smart Responses
- First greeting only (no repetition)
- Context-aware acknowledgments
- First name usage (never full name)
- Speech mode: concise, no disclaimers
- Variation: templates rotate without repetition

## Session Management
- 30-minute inactivity timeout
- Session state tracks greeting status
- Deduplication prevents identical responses

## Storage Keys
- `dash:last-active:{userId}` - Last conversation ID
- `dash:conv:{userId}:{convId}:messages` - Conversation snapshot
- `dash:session:{userId}` - Session state
```

---

## 🎯 **Success Criteria**

✅ App opens to last conversation instantly  
✅ No initial greeting if conversation exists  
✅ Responses are varied and context-aware  
✅ First name only (no full name repetition)  
✅ Speech mode is concise  
✅ No repeated greetings after first  
✅ Thanks/confirm/greeting handled smartly  
✅ Persistence works offline  
✅ Corrupted storage recovers gracefully  

---

**Implementation complete when all criteria met! 🚀**
