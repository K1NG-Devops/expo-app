/**
 * DashVoiceStatus - Status and Transcript display for voice mode
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export interface DashVoiceStatusProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  partialTranscript?: string;
  finalTranscript?: string;
  language?: string; // e.g., en-ZA, af-ZA, zu-ZA
  errorMessage?: string;
}

export const DashVoiceStatus: React.FC<DashVoiceStatusProps> = ({
  status,
  partialTranscript,
  finalTranscript,
  language,
  errorMessage,
}) => {
  const statusText = {
    idle: 'Ready',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    error: 'Error',
  }[status];

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{statusText}{language ? ` · ${language}` : ''}</Text>

      {!!partialTranscript && (
        <Text style={styles.partial} numberOfLines={2}>
          {partialTranscript}
        </Text>
      )}

      {!!finalTranscript && (
        <Text style={styles.final} numberOfLines={3}>
          {finalTranscript}
        </Text>
      )}

      {status === 'error' && !!errorMessage && (
        <Text style={styles.error} numberOfLines={3}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 8,
  },
  status: {
    color: '#B0C4DE',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  partial: {
    color: '#ffffff',
    fontSize: 18,
  },
  final: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.8,
  },
  error: {
    color: '#ffb4b4',
    fontSize: 14,
  },
});
