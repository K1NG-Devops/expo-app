# Dash Agentic Activation - Integration Guide

## Overview

This guide explains how to wire the new agentic services into the existing Dash AI Assistant components.

## Services Created

### 1. Knowledge Foundation
- **`lib/constants/edudash-features.ts`** - Platform knowledge constants
- **`services/DashEduDashKnowledge.ts`** - Knowledge query and discovery API

### 2. Capability Discovery
- **`services/DashCapabilityDiscovery.ts`** - Feature discovery and availability checking

### 3. Autonomy Management
- **`services/DashAutonomyManager.ts`** - Action approval and autonomy levels

### 4. Telemetry & Improvement
- **`services/DashTelemetry.ts`** - Performance tracking and insights

### 5. Conversation State
- **`services/DashConversationState.ts`** - Context-aware conversations, no repeat greetings

## Integration Steps

### Step 1: Initialize Conversation State

In your Dash AI component (e.g., `components/ai/DashAssistant.tsx`):

```typescript
import { DashConversationState } from '@/services/DashConversationState';

// On component mount or when user opens Dash
useEffect(() => {
  const initConversation = async () => {
    await DashConversationState.initializeSession(
      user.id,
      profile // Pass user profile with first_name or full_name
    );
  };
  
  initConversation();
}, [user.id, profile]);
```

### Step 2: Update System Prompt Generation

Replace or enhance your existing system prompt builder:

```typescript
import { DashEduDashKnowledge } from '@/services/DashEduDashKnowledge';
import { DashConversationState } from '@/services/DashConversationState';

const buildSystemPrompt = () => {
  // Get conversation context
  const conversationContext = DashConversationState.getConversationContext();
  
  // Get language and voice context
  const languageContext = DashConversationState.getLanguageAndVoiceContext(
    profile?.preferred_language
  );
  
  // Build full platform knowledge context
  const platformContext = DashEduDashKnowledge.buildPromptContext(
    profile,
    awareness,
    tier,
    conversationContext,
    languageContext
  );
  
  return `You are Dash, the intelligent AI assistant for EduDash Pro.
  
${platformContext}

Remember:
- You are a MALE AI assistant named Dash
- Use the user's first name naturally in conversation
- Never repeat greetings in the same session
- Distinguish between "minus" (math) and "dash/hyphen" (punctuation)
- Use proper pronunciation for the current language
`;
};
```

### Step 3: Mark Greeting After First Response

```typescript
const handleSendMessage = async (message: string) => {
  // ... existing logic ...
  
  // After first AI response, mark as greeted
  if (DashConversationState.shouldGreet()) {
    await DashConversationState.markGreeted();
  }
  
  // Update session activity
  await DashConversationState.touchSession();
};
```

### Step 4: Track Actions and Topics

```typescript
// When executing an action
const executeAction = async (action: string, params: any) => {
  await DashConversationState.recordAction(action);
  
  // ... execute action ...
};

// When discussing a topic
const handleTopicDiscussion = async (topic: string) => {
  await DashConversationState.recordTopic(topic);
};
```

### Step 5: Integrate Capability Discovery

```typescript
import { DashCapabilityDiscovery } from '@/services/DashCapabilityDiscovery';

// When user asks "what can you do?"
const discoverCapabilities = async () => {
  const capabilities = DashCapabilityDiscovery.discoverCapabilities(
    profile.role,
    tier
  );
  
  const summary = DashCapabilityDiscovery.getCapabilitySummary(
    profile.role,
    tier
  );
  
  return summary;
};

// For intent-based discovery
const discoverForIntent = async (userQuery: string) => {
  const { primaryMatch, relatedMatches } = 
    DashCapabilityDiscovery.discoverForIntent(userQuery, {
      role: profile.role,
      tier,
      currentScreen: router.pathname,
      recentActions: DashConversationState.getRecentActions()
    });
  
  if (primaryMatch) {
    // Present the primary feature match
    // Suggest related features
  }
};
```

### Step 6: Implement Autonomy Management

```typescript
import { DashAutonomyManager } from '@/services/DashAutonomyManager';

// Initialize autonomy settings
useEffect(() => {
  DashAutonomyManager.initialize();
}, []);

// Before executing an action
const checkAndExecuteAction = async (action: any) => {
  const { canAutoExecute, reason, riskLevel } = 
    await DashAutonomyManager.canAutoExecute(action);
  
  if (canAutoExecute) {
    // Auto-execute the action
    await executeAction(action);
    
    // Record in history
    await DashAutonomyManager.recordAction(
      action.type,
      riskLevel,
      true, // auto-executed
      true  // success
    );
  } else {
    // Request user approval
    const actionId = await DashAutonomyManager.requestApproval({
      type: action.type,
      description: action.description,
      parameters: action.parameters
    });
    
    // Show approval UI
    showApprovalDialog(actionId, reason);
  }
};

// Handle approval
const handleApproval = async (actionId: string, approved: boolean) => {
  if (approved) {
    const action = DashAutonomyManager.approvePendingAction(actionId);
    if (action) {
      await executeAction(action);
      await DashAutonomyManager.recordAction(
        action.type,
        action.riskLevel,
        false, // manual approval
        true   // success
      );
    }
  } else {
    DashAutonomyManager.rejectPendingAction(actionId);
  }
};
```

### Step 7: Enable Telemetry

```typescript
import { DashTelemetry } from '@/services/DashTelemetry';

// Initialize telemetry
useEffect(() => {
  DashTelemetry.initialize();
}, []);

// Track interactions
const handleAIResponse = async (success: boolean, responseTime: number) => {
  await DashTelemetry.trackInteraction({
    success,
    responseTime,
    intent: userIntent,
    featureUsed: featureId
  });
};

// Track errors
const handleError = async (error: Error, context: any) => {
  await DashTelemetry.logError(error.message, context);
};

// Get insights for improvement
const getInsights = async () => {
  const insights = await DashTelemetry.getInsights();
  console.log('Dash Performance:', insights);
};
```

### Step 8: Voice Settings

For text-to-speech configuration:

```typescript
// Configure voice for male Dash
const configureVoice = async () => {
  const voices = await Speech.getAvailableVoicesAsync();
  
  // Prefer male voices
  const maleVoice = voices.find(v => 
    v.identifier.includes('male') || 
    v.identifier.includes('Male') ||
    v.name.toLowerCase().includes('male')
  );
  
  if (maleVoice) {
    await Speech.speak(text, {
      voice: maleVoice.identifier,
      language: profile.preferred_language || 'en-ZA',
      pitch: 1.0,
      rate: 0.9
    });
  }
};
```

## Example: Complete Integration

Here's a complete example of integrating all services:

```typescript
import { DashEduDashKnowledge } from '@/services/DashEduDashKnowledge';
import { DashConversationState } from '@/services/DashConversationState';
import { DashCapabilityDiscovery } from '@/services/DashCapabilityDiscovery';
import { DashAutonomyManager } from '@/services/DashAutonomyManager';
import { DashTelemetry } from '@/services/DashTelemetry';

export const EnhancedDashAssistant = () => {
  const { user, profile } = useAuth();
  const { tier } = useSubscription();
  
  // Initialize all services
  useEffect(() => {
    const init = async () => {
      await DashConversationState.initializeSession(user.id, profile);
      await DashAutonomyManager.initialize();
      await DashTelemetry.initialize();
    };
    init();
  }, [user.id, profile]);
  
  // Build enhanced system prompt
  const buildSystemPrompt = useCallback(() => {
    const conversationContext = DashConversationState.getConversationContext();
    const languageContext = DashConversationState.getLanguageAndVoiceContext();
    
    return DashEduDashKnowledge.buildPromptContext(
      profile,
      awareness,
      tier,
      conversationContext,
      languageContext
    );
  }, [profile, tier, awareness]);
  
  // Handle user message
  const handleMessage = async (message: string) => {
    const startTime = Date.now();
    
    try {
      // Discover intent
      const { primaryMatch } = DashCapabilityDiscovery.discoverForIntent(
        message,
        {
          role: profile.role,
          tier,
          currentScreen: router.pathname
        }
      );
      
      // Get AI response with enhanced context
      const response = await getAIResponse(message, buildSystemPrompt());
      
      // Mark greeted if first interaction
      if (DashConversationState.shouldGreet()) {
        await DashConversationState.markGreeted();
      }
      
      // Track success
      const responseTime = Date.now() - startTime;
      await DashTelemetry.trackInteraction({
        success: true,
        responseTime,
        intent: message,
        featureUsed: primaryMatch?.id
      });
      
      return response;
    } catch (error) {
      // Track failure
      await DashTelemetry.logError(error.message, { message });
      await DashTelemetry.trackInteraction({
        success: false,
        responseTime: Date.now() - startTime
      });
      
      throw error;
    }
  };
  
  // ... rest of component
};
```

## Testing Checklist

- [ ] Dash greets user only once per session
- [ ] User's first name is used naturally in conversation
- [ ] Male voice is used for TTS
- [ ] "Minus" vs "dash/hyphen" is distinguished correctly
- [ ] Proper accent/pronunciation for selected language
- [ ] Capabilities are discovered correctly
- [ ] Autonomy levels work (assistant vs copilot mode)
- [ ] Telemetry tracks interactions
- [ ] Session state persists across app restarts (within timeout)
- [ ] Conversation context flows naturally

## Troubleshooting

### Dash keeps greeting repeatedly
- Check that `DashConversationState.markGreeted()` is called after first response
- Verify session is being persisted to AsyncStorage
- Check session timeout (default 30 minutes)

### Voice sounds female
- Verify male voice selection logic
- Check device available voices with `Speech.getAvailableVoicesAsync()`
- Set explicit voice identifier for known male voices

### Punctuation confusion
- Check that language context is included in system prompt
- Verify the punctuation awareness guidelines are in prompt
- Test with explicit examples

### Session not resuming
- Check AsyncStorage permissions
- Verify SESSION_TIMEOUT constant
- Look for initialization errors in logs

## Next Steps

1. Test integration in development
2. Monitor telemetry insights
3. Adjust autonomy levels based on user feedback
4. Expand feature catalog as new capabilities are added
5. Fine-tune conversation state management
