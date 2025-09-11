/**
 * Student Enrollment Screen
 * 
 * Allows principals to enroll new students and manage enrollments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

interface Grade {
  id: string;
  name: string;
  capacity: number;
  enrolled: number;
  available: number;
}

export default function StudentEnrollment() {
  const { t } = useTranslation();
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const grades: Grade[] = [
    { id: 'grade-r', name: 'Grade R', capacity: 30, enrolled: 28, available: 2 },
    { id: 'grade-1', name: 'Grade 1', capacity: 30, enrolled: 25, available: 5 },
    { id: 'grade-2', name: 'Grade 2', capacity: 30, enrolled: 30, available: 0 },
    { id: 'grade-3', name: 'Grade 3', capacity: 30, enrolled: 27, available: 3 },
    { id: 'grade-4', name: 'Grade 4', capacity: 30, enrolled: 24, available: 6 },
    { id: 'grade-5', name: 'Grade 5', capacity: 30, enrolled: 29, available: 1 },
    { id: 'grade-6', name: 'Grade 6', capacity: 30, enrolled: 26, available: 4 },
    { id: 'grade-7', name: 'Grade 7', capacity: 30, enrolled: 23, available: 7 },
  ];

  const handleEnrollStudent = () => {
    if (!studentName.trim() || !parentEmail.trim() || !selectedGrade) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Enroll Student',
      `Ready to enroll ${studentName} in ${grades.find(g => g.id === selectedGrade)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          onPress: () => {
            Alert.alert('Success', 'Student enrolled successfully! Parent will receive a welcome email.');
            setStudentName('');
            setParentEmail('');
            setSelectedGrade('');
          }
        }
      ]
    );
  };

  const renderGradeCard = (grade: Grade) => {
    const isSelected = selectedGrade === grade.id;
    const isAvailable = grade.available > 0;

    return (
      <TouchableOpacity
        key={grade.id}
        style={[
          styles.gradeCard,
          isSelected && styles.selectedGradeCard,
          !isAvailable && styles.disabledGradeCard
        ]}
        onPress={() => isAvailable ? setSelectedGrade(grade.id) : null}
        disabled={!isAvailable}
      >
        <View style={styles.gradeHeader}>
          <Text style={[
            styles.gradeName,
            isSelected && styles.selectedGradeText,
            !isAvailable && styles.disabledText
          ]}>
            {grade.name}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={Colors.light.tint} />
          )}
        </View>
        
        <View style={styles.gradeStats}>
          <Text style={[styles.statText, !isAvailable && styles.disabledText]}>
            {grade.enrolled}/{grade.capacity} enrolled
          </Text>
          <Text style={[
            styles.availableText,
            !isAvailable ? styles.fullText : styles.availableTextGreen
          ]}>
            {isAvailable ? `${grade.available} spaces available` : 'Full'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Student Enrollment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Grade Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Grade</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the grade for the new student
          </Text>
          
          <View style={styles.gradesGrid}>
            {grades.map(renderGradeCard)}
          </View>
        </View>

        {/* Student Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Student Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={studentName}
              onChangeText={setStudentName}
              placeholder="Enter student's full name"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parent/Guardian Email *</Text>
            <TextInput
              style={styles.textInput}
              value={parentEmail}
              onChangeText={setParentEmail}
              placeholder="parent@example.com"
              placeholderTextColor={Colors.light.tabIconDefault}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Enrollment Summary */}
        {selectedGrade && studentName && parentEmail && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enrollment Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Student: <Text style={styles.summaryBold}>{studentName}</Text>
              </Text>
              <Text style={styles.summaryText}>
                Grade: <Text style={styles.summaryBold}>
                  {grades.find(g => g.id === selectedGrade)?.name}
                </Text>
              </Text>
              <Text style={styles.summaryText}>
                Parent Email: <Text style={styles.summaryBold}>{parentEmail}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Enroll Button */}
        <TouchableOpacity
          style={[
            styles.enrollButton,
            (!selectedGrade || !studentName || !parentEmail) && styles.disabledButton
          ]}
          onPress={handleEnrollStudent}
          disabled={!selectedGrade || !studentName || !parentEmail || loading}
        >
          <Text style={[
            styles.enrollButtonText,
            (!selectedGrade || !studentName || !parentEmail) && styles.disabledButtonText
          ]}>
            {loading ? 'Enrolling...' : 'Enroll Student'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 16,
  },
  gradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gradeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  selectedGradeCard: {
    borderColor: Colors.light.tint,
    backgroundColor: '#f0f9ff',
  },
  disabledGradeCard: {
    opacity: 0.5,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectedGradeText: {
    color: Colors.light.tint,
  },
  disabledText: {
    color: Colors.light.tabIconDefault,
  },
  gradeStats: {
    gap: 2,
  },
  statText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  availableText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availableTextGreen: {
    color: '#059669',
  },
  fullText: {
    color: '#dc2626',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: Colors.light.text,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  summaryBold: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  enrollButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  enrollButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
});
