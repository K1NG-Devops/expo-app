# Dash Claude Enhancement - Quick Start Guide
## Get Started Today! 🚀

This guide provides **immediate actionable steps** to begin transforming Dash into a Claude-like AI agent.

---

## 🎯 Phase 1 - Week 1 Goals

### Day 1-2: Tier Gating Infrastructure

#### 1. Create Feature Flag Matrix

```typescript
// lib/ai/capabilities.ts
export type DashCapability =
  | 'chat.basic'
  | 'chat.streaming'
  | 'chat.thinking'
  | 'memory.lite'
  | 'memory.advanced'
  | 'multimodal.vision'
  | 'homework.assign'
  | 'homework.grade.basic'
  | 'homework.grade.advanced'
  | 'lessons.adaptive'
  | 'insights.proactive'
  | 'agent.workflows'
  | 'export.pdf.basic'
  | 'export.pdf.advanced';

export type Tier = 'free' | 'starter' | 'basic' | 'premium' | 'pro' | 'enterprise';

export const CAPABILITY_MATRIX: Record<Tier, DashCapability[]> = {
  free: ['chat.basic', 'memory.lite'],
  starter: ['chat.basic', 'memory.lite'],
  basic: [
    'chat.basic',
    'chat.streaming',
    'memory.lite',
    'homework.assign',
    'homework.grade.basic',
    'export.pdf.basic',
  ],
  premium: [
    'chat.basic',
    'chat.streaming',
    'chat.thinking',
    'memory.advanced',
    'multimodal.vision',
    'homework.assign',
    'homework.grade.advanced',
    'lessons.adaptive',
    'insights.proactive',
    'agent.workflows',
    'export.pdf.advanced',
  ],
  pro: [
    'chat.basic',
    'chat.streaming',
    'chat.thinking',
    'memory.advanced',
    'multimodal.vision',
    'homework.assign',
    'homework.grade.advanced',
    'lessons.adaptive',
    'insights.proactive',
    'agent.workflows',
    'export.pdf.advanced',
  ],
  enterprise: [
    'chat.basic',
    'chat.streaming',
    'chat.thinking',
    'memory.advanced',
    'multimodal.vision',
    'homework.assign',
    'homework.grade.advanced',
    'lessons.adaptive',
    'insights.proactive',
    'agent.workflows',
    'export.pdf.advanced',
  ],
};

/**
 * Check if a capability is available for a tier
 */
export function hasCapability(tier: Tier, capability: DashCapability): boolean {
  return CAPABILITY_MATRIX[tier].includes(capability);
}

/**
 * Get all available capabilities for a tier
 */
export function getCapabilities(tier: Tier): DashCapability[] {
  return CAPABILITY_MATRIX[tier];
}

/**
 * Feature gating error
 */
export class FeatureGatedError extends Error {
  constructor(
    message: string,
    public capability: DashCapability,
    public requiredTier: Tier
  ) {
    super(message);
    this.name = 'FeatureGatedError';
  }
}
```

#### 2. Enhance SubscriptionContext

```typescript
// contexts/SubscriptionContext.tsx - Add to existing context
export function useCapabilities() {
  const { tier } = useSubscription();
  
  return {
    hasCapability: (capability: DashCapability) => hasCapability(tier, capability),
    getCapabilities: () => getCapabilities(tier),
    tier,
  };
}
```

---

### Day 3-4: DashAIAssistant Refactor

#### 3. Add Tier-Aware Methods to DashAIAssistant

```typescript
// services/DashAIAssistant.ts
import { hasCapability, FeatureGatedError } from '@/lib/ai/capabilities';
import type { Tier } from '@/lib/ai/capabilities';

export class DashAIAssistant {
  // ... existing code ...
  
  /**
   * Get user's subscription tier
   */
  public async getUserTier(): Promise<Tier> {
    try {
      const session = await getCurrentSession();
      const tier = session?.user?.user_metadata?.subscription_tier;
      return (tier as Tier) || 'free';
    } catch {
      return 'free';
    }
  }
  
  /**
   * Check if user has a capability
   */
  public async hasCapability(capability: DashCapability): Promise<boolean> {
    const tier = await this.getUserTier();
    return hasCapability(tier, capability);
  }
  
  /**
   * Throw error if capability is not available
   */
  private async requireCapability(
    capability: DashCapability,
    requiredTier: Tier = 'premium'
  ): Promise<void> {
    if (!(await this.hasCapability(capability))) {
      throw new FeatureGatedError(
        `This feature requires ${requiredTier} tier`,
        capability,
        requiredTier
      );
    }
  }
  
  /**
   * Enhanced send message with capability checks
   */
  public async sendMessageEnhanced(
    content: string,
    options?: {
      enableStreaming?: boolean;
      showThinking?: boolean;
      attachments?: DashAttachment[];
    }
  ): Promise<DashMessage> {
    const tier = await this.getUserTier();
    
    // Check streaming capability
    if (options?.enableStreaming && !hasCapability(tier, 'chat.streaming')) {
      // Gracefully fall back to non-streaming
      options.enableStreaming = false;
    }
    
    // Check thinking capability
    if (options?.showThinking && !hasCapability(tier, 'chat.thinking')) {
      options.showThinking = false;
    }
    
    // Check multimodal capability
    if (options?.attachments?.some(a => a.kind === 'image')) {
      await this.requireCapability('multimodal.vision', 'premium');
    }
    
    // Track analytics
    this.trackFeatureUsage('chat.message', tier);
    
    // Existing message sending logic...
    return this.sendMessage(content);
  }
  
  /**
   * Analyze image (Premium+)
   */
  public async analyzeImage(
    imageUri: string,
    context: string
  ): Promise<ImageAnalysis> {
    await this.requireCapability('multimodal.vision', 'premium');
    
    const tier = await this.getUserTier();
    this.trackFeatureUsage('multimodal.vision', tier);
    
    // TODO: Implement in Phase 2
    throw new Error('Not implemented yet - Phase 2');
  }
  
  /**
   * Assign homework (Basic+)
   */
  public async assignHomework(params: HomeworkParams): Promise<Assignment> {
    await this.requireCapability('homework.assign', 'basic');
    
    const tier = await this.getUserTier();
    this.trackFeatureUsage('homework.assign', tier);
    
    // TODO: Implement in Phase 2
    throw new Error('Not implemented yet - Phase 2');
  }
  
  /**
   * Grade homework (Basic+)
   */
  public async gradeHomework(
    submission: Submission,
    rubric?: GradingRubric
  ): Promise<GradingResult> {
    const tier = await this.getUserTier();
    const isAdvanced = hasCapability(tier, 'homework.grade.advanced');
    
    await this.requireCapability(
      isAdvanced ? 'homework.grade.advanced' : 'homework.grade.basic',
      isAdvanced ? 'premium' : 'basic'
    );
    
    this.trackFeatureUsage(
      isAdvanced ? 'homework.grade.advanced' : 'homework.grade.basic',
      tier
    );
    
    // TODO: Implement in Phase 2
    throw new Error('Not implemented yet - Phase 2');
  }
  
  /**
   * Generate adaptive lesson (Premium+)
   */
  public async generateAdaptiveLesson(
    topic: string,
    studentProfile: any
  ): Promise<AdaptiveLessonSession> {
    await this.requireCapability('lessons.adaptive', 'premium');
    
    const tier = await this.getUserTier();
    this.trackFeatureUsage('lessons.adaptive', tier);
    
    // TODO: Implement in Phase 3
    throw new Error('Not implemented yet - Phase 3');
  }
  
  /**
   * Track feature usage for analytics
   */
  private trackFeatureUsage(feature: string, tier: Tier): void {
    // TODO: Integrate with analytics service
    console.log(`[Analytics] Feature: ${feature}, Tier: ${tier}`);
  }
}
```

---

### Day 5: Modern Chat UI Components

#### 4. Create MessageBubbleModern Component

```tsx
// components/ai/MessageBubbleModern.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { DashMessage } from '@/services/DashAIAssistant';

interface MessageBubbleModernProps {
  message: DashMessage;
  showThinking?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onReaction?: (reaction: 'helpful' | 'not_helpful') => void;
}

export function MessageBubbleModern({
  message,
  showThinking = false,
  onCopy,
  onRegenerate,
  onReaction,
}: MessageBubbleModernProps) {
  const { theme } = useTheme();
  const isUser = message.type === 'user';
  
  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.assistantContainer,
    ]}>
      {/* Avatar for assistant */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={20} color={theme.onPrimary} />
        </View>
      )}
      
      <View style={styles.content}>
        {/* Message bubble */}
        <View style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.primary }
            : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        ]}>
          {/* Thinking indicator (Premium+) */}
          {showThinking && !isUser && (
            <View style={styles.thinkingContainer}>
              <Ionicons name="bulb" size={14} color={theme.accent} />
              <Text style={[styles.thinkingText, { color: theme.textSecondary }]}>
                Thinking...
              </Text>
            </View>
          )}
          
          {/* Message content */}
          <Text style={[
            styles.text,
            { color: isUser ? theme.onPrimary : theme.text },
          ]}>
            {message.content}
          </Text>
          
          {/* Timestamp */}
          <Text style={[
            styles.timestamp,
            { color: isUser ? theme.onPrimary : theme.textTertiary },
          ]}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        
        {/* Action bar for assistant messages */}
        {!isUser && (
          <View style={styles.actions}>
            {onCopy && (
              <TouchableOpacity style={styles.actionButton} onPress={onCopy}>
                <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            
            {onRegenerate && (
              <TouchableOpacity style={styles.actionButton} onPress={onRegenerate}>
                <Ionicons name="refresh-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            
            {onReaction && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onReaction('helpful')}
                >
                  <Ionicons name="thumbs-up-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onReaction('not_helpful')}
                >
                  <Ionicons name="thumbs-down-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thinkingText: {
    fontSize: 12,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
});
```

---

### Day 6: Tier Badges & Upgrade Prompts

#### 5. Create TierBadge Component

```tsx
// components/ui/TierBadgeDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Tier } from '@/lib/ai/capabilities';

interface TierBadgeDisplayProps {
  tier: Tier;
  size?: 'small' | 'medium' | 'large';
}

export function TierBadgeDisplay({ tier, size = 'medium' }: TierBadgeDisplayProps) {
  const config = getTierConfig(tier);
  
  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.color + '20', borderColor: config.color },
      size === 'small' && styles.badgeSmall,
      size === 'large' && styles.badgeLarge,
    ]}>
      <Text style={[
        styles.text,
        { color: config.color },
        size === 'small' && styles.textSmall,
        size === 'large' && styles.textLarge,
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

function getTierConfig(tier: Tier) {
  const configs = {
    free: { label: 'Free', color: '#8E8E93' },
    starter: { label: 'Starter', color: '#8E8E93' },
    basic: { label: 'Basic', color: '#34C759' },
    premium: { label: 'Premium', color: '#FF9500' },
    pro: { label: 'Pro', color: '#AF52DE' },
    enterprise: { label: 'Enterprise', color: '#007AFF' },
  };
  return configs[tier];
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 14,
  },
});
```

#### 6. Create Upgrade Prompt Component

```tsx
// components/ui/UpgradePrompt.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

interface UpgradePromptProps {
  feature: string;
  description: string;
  requiredTier: 'basic' | 'premium' | 'enterprise';
  onDismiss?: () => void;
}

export function UpgradePrompt({
  feature,
  description,
  requiredTier,
  onDismiss,
}: UpgradePromptProps) {
  const { theme } = useTheme();
  
  const handleUpgrade = () => {
    router.push({
      pathname: '/premium-feature-modal',
      params: { featureName: feature, description, tier: requiredTier },
    });
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceVariant }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="lock-closed" size={20} color={theme.primary} />
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>
            {feature}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {description}
          </Text>
        </View>
        
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
        onPress={handleUpgrade}
      >
        <Text style={[styles.upgradeText, { color: theme.onPrimary }]}>
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={theme.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  upgradeText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
```

---

### Day 7: Update DashAssistant to Use New Components

#### 7. Integrate Modern Components

```tsx
// components/ai/DashAssistant.tsx - Modify existing component
import { MessageBubbleModern } from './MessageBubbleModern';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { TierBadgeDisplay } from '@/components/ui/TierBadgeDisplay';
import { useCapabilities } from '@/contexts/SubscriptionContext';
import { FeatureGatedError } from '@/lib/ai/capabilities';

export const DashAssistant: React.FC<DashAssistantProps> = ({
  conversationId,
  onClose,
  initialMessage
}) => {
  // ... existing code ...
  const { tier, hasCapability } = useCapabilities();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<{ feature: string; description: string; tier: string } | null>(null);
  
  // Handle feature gating errors
  const handleFeatureError = (error: any) => {
    if (error instanceof FeatureGatedError) {
      setGatedFeature({
        feature: error.capability,
        description: error.message,
        tier: error.requiredTier,
      });
      setShowUpgradePrompt(true);
    } else {
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };
  
  // Modified sendMessage with error handling
  const sendMessage = async (text: string = inputText.trim()) => {
    if (!text || !dashInstance || isLoading) return;
    
    try {
      setIsLoading(true);
      setInputText('');
      
      // Use enhanced send message
      const response = await dashInstance.sendMessageEnhanced(text, {
        enableStreaming: hasCapability('chat.streaming'),
        showThinking: hasCapability('chat.thinking'),
      });
      
      // Update messages
      const updatedConv = await dashInstance.getConversation(
        dashInstance.getCurrentConversationId()!
      );
      if (updatedConv) {
        setMessages(updatedConv.messages);
      }
    } catch (error) {
      handleFeatureError(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render messages with modern components
  const renderMessage = (message: DashMessage, index: number) => {
    return (
      <MessageBubbleModern
        key={message.id}
        message={message}
        showThinking={hasCapability('chat.thinking')}
        onCopy={() => copyMessageToClipboard(message.content)}
        onRegenerate={message.type === 'assistant' ? () => regenerateMessage(message.id) : undefined}
        onReaction={(reaction) => trackMessageReaction(message.id, reaction)}
      />
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with tier badge */}
      <View style={styles.header}>
        <Text style={styles.title}>Dash</Text>
        <TierBadgeDisplay tier={tier} size="small" />
      </View>
      
      {/* Upgrade prompt */}
      {showUpgradePrompt && gatedFeature && (
        <UpgradePrompt
          feature={gatedFeature.feature}
          description={gatedFeature.description}
          requiredTier={gatedFeature.tier as any}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}
      
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item, index }) => renderMessage(item, index)}
        keyExtractor={(item) => item.id}
      />
      
      {/* Rest of component... */}
    </View>
  );
};
```

---

## 🎯 Week 1 Success Criteria

By end of Week 1, you should have:

✅ **Feature flag matrix** defined and tested  
✅ **SubscriptionContext** providing tier info  
✅ **DashAIAssistant** with tier-aware methods  
✅ **MessageBubbleModern** rendering messages  
✅ **TierBadgeDisplay** showing user tier  
✅ **UpgradePrompt** for gated features  
✅ **DashAssistant** using new modern components  

---

## 📊 Testing Checklist

- [ ] Free user sees basic chat only
- [ ] Basic user can access streaming
- [ ] Premium user sees "Thinking..." indicator
- [ ] Upgrade prompts appear when accessing gated features
- [ ] Tier badge displays correctly
- [ ] Modern message bubbles render properly
- [ ] Copy, regenerate, reaction buttons work

---

## 🚀 Next Week Preview - Week 2

**Week 2 will focus on:**
- Enhanced input area with multimodal support
- Response streaming implementation
- Conversation sidebar for organization
- Analytics integration
- Performance optimization

---

## 💡 Pro Tips

1. **Start Small**: Get one feature working perfectly before moving to the next
2. **Test Continuously**: Test each tier after every change
3. **Use TypeScript**: Leverage types to catch errors early
4. **Document Changes**: Update comments as you refactor
5. **Commit Often**: Small, focused commits make rollback easier

---

## 📞 Need Help?

If you encounter issues:
1. Check the main plan: `DASH_CLAUDE_ENHANCEMENT_PLAN.md`
2. Review existing implementations in the codebase
3. Test with different tiers in your dev environment
4. Use console.log for debugging tier checks

---

**Let's get started! 🎉**

Tomorrow, you'll have a solid foundation for building the most advanced educational AI assistant! 🚀
