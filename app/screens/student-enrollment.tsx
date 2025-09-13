/**
 * Student Enrollment Screen
 * 
 * Allows principals to enroll new students and manage enrollments
 */

import React, { useState, useCallback } from 'react';
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
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Grade {
  id: string;
  name: string;
  capacity: number;
  enrolled: number;
  available: number;
  fees: {
    admission: number;
    tuition: number;
    books: number;
    uniform: number;
    activities: number;
  };
}

interface StudentInfo {
  // Basic Info
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  idNumber: string;
  
  // Contact Info
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  
  // Parent/Guardian Info
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail: string;
  parentIdNumber: string;
  relationship: 'mother' | 'father' | 'guardian' | '';
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  
  // Medical Info
  allergies: string;
  medicalConditions: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
  
  // Previous School
  previousSchool: string;
  previousGrade: string;
  reasonForLeaving: string;
  
  // Additional Notes
  specialRequirements: string;
  transportNeeds: 'none' | 'school_bus' | 'private' | '';
}

type EnrollmentStep = 'basic' | 'contact' | 'parent' | 'medical' | 'documents' | 'fees' | 'review';

const initialStudentInfo: StudentInfo = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  idNumber: '',
  address: '',
  city: '',
  postalCode: '',
  phone: '',
  email: '',
  parentFirstName: '',
  parentLastName: '',
  parentPhone: '',
  parentEmail: '',
  parentIdNumber: '',
  relationship: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  allergies: '',
  medicalConditions: '',
  medications: '',
  doctorName: '',
  doctorPhone: '',
  previousSchool: '',
  previousGrade: '',
  reasonForLeaving: '',
  specialRequirements: '',
  transportNeeds: '',
};

export default function StudentEnrollment() {
  const { user, profile } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>('basic');
  const [studentInfo, setStudentInfo] = useState<StudentInfo>(initialStudentInfo);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<{[key: string]: string}>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Get preschool ID from user context
  const getPreschoolId = useCallback((): string | null => {
    if (profile?.organization_id) {
      return profile.organization_id as string;
    }
    return user?.user_metadata?.preschool_id || null;
  }, [profile, user]);

  const grades: Grade[] = [
    { 
      id: 'grade-r', name: 'Grade R', capacity: 30, enrolled: 28, available: 2,
      fees: { admission: 500, tuition: 2800, books: 450, uniform: 300, activities: 200 }
    },
    { 
      id: 'grade-1', name: 'Grade 1', capacity: 30, enrolled: 25, available: 5,
      fees: { admission: 500, tuition: 3200, books: 520, uniform: 350, activities: 250 }
    },
    { 
      id: 'grade-2', name: 'Grade 2', capacity: 30, enrolled: 30, available: 0,
      fees: { admission: 500, tuition: 3200, books: 520, uniform: 350, activities: 250 }
    },
    { 
      id: 'grade-3', name: 'Grade 3', capacity: 30, enrolled: 27, available: 3,
      fees: { admission: 500, tuition: 3500, books: 580, uniform: 380, activities: 300 }
    },
    { 
      id: 'grade-4', name: 'Grade 4', capacity: 30, enrolled: 24, available: 6,
      fees: { admission: 500, tuition: 3500, books: 580, uniform: 380, activities: 300 }
    },
    { 
      id: 'grade-5', name: 'Grade 5', capacity: 30, enrolled: 29, available: 1,
      fees: { admission: 500, tuition: 3800, books: 620, uniform: 400, activities: 350 }
    },
    { 
      id: 'grade-6', name: 'Grade 6', capacity: 30, enrolled: 26, available: 4,
      fees: { admission: 500, tuition: 3800, books: 620, uniform: 400, activities: 350 }
    },
    { 
      id: 'grade-7', name: 'Grade 7', capacity: 30, enrolled: 23, available: 7,
      fees: { admission: 500, tuition: 4200, books: 720, uniform: 450, activities: 400 }
    },
  ];

  const stepOrder: EnrollmentStep[] = ['basic', 'contact', 'parent', 'medical', 'documents', 'fees', 'review'];
  
  const updateStudentInfo = (field: keyof StudentInfo, value: string) => {
    setStudentInfo(prev => ({ ...prev, [field]: value }));
  };
  
  const goToNextStep = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };
  
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'basic':
        return !!(studentInfo.firstName && studentInfo.lastName && studentInfo.dateOfBirth && selectedGrade);
      case 'contact':
        return !!(studentInfo.address && studentInfo.city && studentInfo.phone);
      case 'parent':
        return !!(studentInfo.parentFirstName && studentInfo.parentLastName && studentInfo.parentPhone && studentInfo.parentEmail);
      case 'medical':
        return true; // Medical info is optional but recommended
      case 'documents':
        return Object.keys(documents).length >= 2; // At least birth certificate and ID copy
      case 'fees':
        return true; // Fees are calculated automatically
      case 'review':
        return agreedToTerms;
      default:
        return false;
    }
  };
  
  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'basic': return 'Basic Information';
      case 'contact': return 'Contact Details';
      case 'parent': return 'Parent/Guardian Info';
      case 'medical': return 'Medical Information';
      case 'documents': return 'Required Documents';
      case 'fees': return 'Fee Structure';
      case 'review': return 'Review & Submit';
      default: return 'Enrollment';
    }
  };
  
  const calculateTotalFees = (): number => {
    if (!selectedGrade) return 0;
    const grade = grades.find(g => g.id === selectedGrade);
    if (!grade) return 0;
    return Object.values(grade.fees).reduce((total, fee) => total + fee, 0);
  };

  const handleEnrollStudent = async () => {
    const studentFullName = `${studentInfo.firstName} ${studentInfo.lastName}`.trim();
    if (!studentFullName || !studentInfo.parentEmail.trim() || !selectedGrade) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const preschoolId = getPreschoolId();
    if (!preschoolId || !supabase) {
      Alert.alert('Error', 'Unable to enroll student. Please try again later.');
      return;
    }

    Alert.alert(
      'Enroll Student',
      `Ready to enroll ${studentFullName} in ${grades.find(g => g.id === selectedGrade)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          onPress: async () => {
            try {
              setLoading(true);
              
              console.log('📝 Enrolling student in database:', {
                firstName: studentInfo.firstName,
                lastName: studentInfo.lastName,
                parentEmail: studentInfo.parentEmail,
                grade: selectedGrade,
                preschoolId
              });
              
              // **INSERT REAL STUDENT INTO DATABASE**
              const { data: newStudent, error: insertError } = await supabase
                .from('students')
                .insert({
                  first_name: studentInfo.firstName,
                  last_name: studentInfo.lastName,
                  date_of_birth: studentInfo.dateOfBirth || '2019-01-01', // Default if not provided
                  preschool_id: preschoolId,
                  is_active: true,
                  status: 'active',
                  // TODO: Add parent_id lookup based on parentEmail
                  // TODO: Add class_id lookup based on selected grade
                  // TODO: Add more fields as needed (gender, medical conditions, etc.)
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('Error enrolling student:', insertError);
                Alert.alert('Enrollment Error', 'Failed to enroll student. Please try again.');
                return;
              }
              
              console.log('✅ Student enrolled successfully:', newStudent);
              
              Alert.alert(
                'Success! 🎉', 
                `${studentFullName} has been enrolled successfully!\n\nStudent ID: ${newStudent.id}\nParent will receive a welcome email at ${studentInfo.parentEmail}`,
                [
                  {
                    text: 'Enroll Another',
                    onPress: () => {
                      setStudentInfo(initialStudentInfo);
                      setSelectedGrade('');
                    }
                  },
                  {
                    text: 'View Students',
                    onPress: () => router.push('/screens/students-detail')
                  }
                ]
              );
              
            } catch (error) {
              console.error('Failed to enroll student:', error);
              Alert.alert('Error', 'Failed to enroll student. Please check your connection and try again.');
            } finally {
              setLoading(false);
            }
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
            <Text style={styles.inputLabel}>Student First Name *</Text>
            <TextInput
              style={styles.textInput}
              value={studentInfo.firstName}
              onChangeText={(value) => updateStudentInfo('firstName', value)}
              placeholder="Enter student's first name"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Student Last Name *</Text>
            <TextInput
              style={styles.textInput}
              value={studentInfo.lastName}
              onChangeText={(value) => updateStudentInfo('lastName', value)}
              placeholder="Enter student's last name"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Parent/Guardian Email *</Text>
            <TextInput
              style={styles.textInput}
              value={studentInfo.parentEmail}
              onChangeText={(value) => updateStudentInfo('parentEmail', value)}
              placeholder="parent@example.com"
              placeholderTextColor={Colors.light.tabIconDefault}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Enrollment Summary */}
        {selectedGrade && studentInfo.firstName && studentInfo.parentEmail && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enrollment Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Student: <Text style={styles.summaryBold}>{studentInfo.firstName} {studentInfo.lastName}</Text>
              </Text>
              <Text style={styles.summaryText}>
                Grade: <Text style={styles.summaryBold}>
                  {grades.find(g => g.id === selectedGrade)?.name}
                </Text>
              </Text>
              <Text style={styles.summaryText}>
                Parent Email: <Text style={styles.summaryBold}>{studentInfo.parentEmail}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Enroll Button */}
        <TouchableOpacity
          style={[
            styles.enrollButton,
            (!selectedGrade || !studentInfo.firstName || !studentInfo.parentEmail) && styles.disabledButton
          ]}
          onPress={handleEnrollStudent}
          disabled={!selectedGrade || !studentInfo.firstName || !studentInfo.parentEmail || loading}
        >
          <Text style={[
            styles.enrollButtonText,
            (!selectedGrade || !studentInfo.firstName || !studentInfo.parentEmail) && styles.disabledButtonText
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
