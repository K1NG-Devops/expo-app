/**
 * MessageBubbleModern Component
 * 
 * Claude/ChatGPT-style message bubbles with markdown support,
 * copy functionality, and smooth animations
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import type { DashMessage } from '@/services/DashAIAssistant';

export interface MessageBubbleModernProps {
  message: DashMessage;
  onCopy?: () => void;
  onRegenerate?: () => void;
  showActions?: boolean;
  showIcon?: boolean;
}

export function MessageBubbleModern({
  message,
  onCopy,
  onRegenerate,
  showActions = true,
  showIcon = false,
}: MessageBubbleModernProps) {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering - can be enhanced with react-native-markdown-display
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <Text key={index} style={[styles.text, styles.h3, { color: theme.text }]}>
            {line.replace('### ', '')}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={[styles.text, styles.h2, { color: theme.text }]}>
            {line.replace('## ', '')}
          </Text>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={[styles.text, styles.h1, { color: theme.text }]}>
            {line.replace('# ', '')}
          </Text>
        );
      }

      // Bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <Text key={index} style={[styles.text, { color: theme.text }]}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <Text key={i} style={styles.bold}>{part}</Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      }

      // List items
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <Text key={index} style={[styles.text, styles.listItem, { color: theme.text }]}>
            • {line.replace(/^[-•]\s*/, '')}
          </Text>
        );
      }

      // Code blocks
      if (line.startsWith('```')) {
        return null; // Skip code fence markers
      }

      // Regular text
      return line ? (
        <Text key={index} style={[styles.text, { color: theme.text }]}>
          {line}
        </Text>
      ) : (
        <View key={index} style={styles.lineBreak} />
      );
    });
  };

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      <View
        style={[
          styles.bubble,
          isUser && styles.bubbleUser,
          isSystem && styles.bubbleSystem,
          {
            backgroundColor: isUser
              ? theme.primary
              : isSystem
              ? theme.surface
              : isDark
              ? '#2d2d2d'
              : '#f3f4f6',
            borderColor: isSystem ? theme.border : 'transparent',
          },
        ]}
      >
        {/* Icon for assistant messages */}
        {showIcon && !isUser && !isSystem && (
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Ionicons name="sparkles" size={16} color={theme.onPrimary || '#fff'} />
          </View>
        )}
        
        {/* Message content */}
        <View style={styles.content}>
          <View style={{ opacity: 1 }}>
            {message.content.split('\n').map((line, index) => {
              // Simple rendering with proper color
              if (line.startsWith('### ')) {
                return (
                  <Text key={index} style={[styles.text, styles.h3, { color: isUser ? '#fff' : theme.text }]}>
                    {line.replace('### ', '')}
                  </Text>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <Text key={index} style={[styles.text, styles.h2, { color: isUser ? '#fff' : theme.text }]}>
                    {line.replace('## ', '')}
                  </Text>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <Text key={index} style={[styles.text, styles.h1, { color: isUser ? '#fff' : theme.text }]}>
                    {line.replace('# ', '')}
                  </Text>
                );
              }
              
              // Bold
              const boldRegex = /\*\*(.*?)\*\*/g;
              if (boldRegex.test(line)) {
                const parts = line.split(boldRegex);
                return (
                  <Text key={index} style={[styles.text, { color: isUser ? '#fff' : theme.text }]}>
                    {parts.map((part, i) =>
                      i % 2 === 1 ? (
                        <Text key={i} style={styles.bold}>{part}</Text>
                      ) : (
                        part
                      )
                    )}
                  </Text>
                );
              }
              
              // List items
              if (line.startsWith('- ') || line.startsWith('• ')) {
                return (
                  <Text key={index} style={[styles.text, styles.listItem, { color: isUser ? '#fff' : theme.text }]}>
                    • {line.replace(/^[-•]\s*/, '')}
                  </Text>
                );
              }
              
              // Code blocks
              if (line.startsWith('```')) {
                return null;
              }
              
              // Regular text
              return line ? (
                <Text key={index} style={[styles.text, { color: isUser ? '#fff' : theme.text }]}>
                  {line}
                </Text>
              ) : (
                <View key={index} style={styles.lineBreak} />
              );
            })}
          </View>
        </View>

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            {
              color: isUser
                ? 'rgba(255,255,255,0.7)'
                : isDark
                ? 'rgba(255,255,255,0.5)'
                : 'rgba(0,0,0,0.4)',
            },
          ]}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {/* Action buttons (only for assistant messages) */}
        {showActions && !isUser && !isSystem && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.surface }]}
              onPress={handleCopy}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={14}
                color={theme.text}
              />
              <Text style={[styles.actionText, { color: theme.text }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>

            {onRegenerate && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.surface }]}
                onPress={onRegenerate}
              >
                <Ionicons name="refresh-outline" size={14} color={theme.text} />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  Regenerate
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '96%',
    minWidth: 140,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bubbleUser: {
    borderTopRightRadius: 4,
  },
  bubbleSystem: {
    borderTopLeftRadius: 4,
  },
  content: {
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 2,
    color: 'inherit',
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  bold: {
    fontWeight: '600',
  },
  listItem: {
    paddingLeft: 8,
    marginVertical: 1,
  },
  lineBreak: {
    height: 8,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
});
