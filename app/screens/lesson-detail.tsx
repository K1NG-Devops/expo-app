/**
 * Lesson Detail Screen (Stub)
 * 
 * Placeholder screen to prevent routing errors.
 * This will be built out later with full lesson viewing capabilities.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';

export default function LessonDetailScreen() {
  const { theme } = useTheme();
  const { lessonId } = useLocalSearchParams();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Lesson Details
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lesson ID Info (for debugging/development) */}
        {lessonId && (
          <View style={styles.lessonInfo}>
            <Text style={[styles.lessonInfoTitle, { color: theme.text }]}>
              Lesson Information
            </Text>
            <Text style={[styles.lessonInfoItem, { color: theme.textSecondary }]}>
              Lesson ID: {lessonId}
            </Text>
          </View>
        )}

        {/* Coming Soon Content */}
        <View style={styles.comingSoonContainer}>
          <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
            Coming Soon
          </Text>
          <Text style={[styles.comingSoonDescription, { color: theme.textSecondary }]}>
            Detailed lesson viewing with content, activities, and interactive features 
            is currently under development. For now, you can browse lessons from the Lessons Hub.
          </Text>
          
          <TouchableOpacity
            style={[styles.backToHubButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Ionicons name="library-outline" size={20} color={theme.onPrimary} />
            <Text style={[styles.backToHubText, { color: theme.onPrimary }]}>
              Back to Lessons Hub
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  lessonInfo: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  lessonInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  lessonInfoItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  backToHubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  backToHubText: {
    fontSize: 16,
    fontWeight: '600',
  },
});