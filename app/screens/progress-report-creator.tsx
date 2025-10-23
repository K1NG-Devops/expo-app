import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import emailTemplateService, { ProgressReport } from '@/services/EmailTemplateService';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_email: string;
  parent_name: string;
}

export default function ProgressReportCreator() {
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const studentId = params.student_id as string;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  
  // Report form state
  const [reportPeriod, setReportPeriod] = useState('Q4 2025');
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [overallGrade, setOverallGrade] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  
  // Subjects (hardcoded for now, could be dynamic)
  const [subjects, setSubjects] = useState<Record<string, { grade: string; comments: string }>>({
    'Math': { grade: '', comments: '' },
    'Language': { grade: '', comments: '' },
    'Science': { grade: '', comments: '' },
    'Art': { grade: '', comments: '' },
  });

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    if (!studentId || !profile?.preschool_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', studentId)
      .eq('preschool_id', profile.preschool_id)
      .single();

    if (error) {
      console.error('Failed to load student:', error);
      Alert.alert('Error', 'Failed to load student information');
      setLoading(false);
      return;
    }

    // Get parent email
    const { data: parentData } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('role', 'parent')
      .limit(1)
      .single();

    setStudent({
      ...data,
      parent_email: parentData?.email || '',
      parent_name: `${parentData?.first_name || ''} ${parentData?.last_name || ''}`.trim() || 'Parent',
    });

    setLoading(false);
  };

  const updateSubject = (subject: string, field: 'grade' | 'comments', value: string) => {
    setSubjects((prev) => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: value,
      },
    }));
  };

  const handlePreview = async () => {
    if (!student || !profile) return;

    const report: ProgressReport = {
      preschool_id: profile.preschool_id!,
      student_id: studentId,
      teacher_id: profile.id,
      report_period: reportPeriod,
      report_type: reportType,
      overall_comments: teacherComments,
      teacher_comments: teacherComments,
      strengths,
      areas_for_improvement: areasForImprovement,
      subjects_performance: subjects,
      overall_grade: overallGrade,
    };

    try {
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', profile.preschool_id)
        .single();

      const { html } = await emailTemplateService.generateProgressReportEmail(
        report,
        `${student.first_name} ${student.last_name}`,
        student.parent_name,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        preschoolData.data?.name || 'School'
      );

      // Show preview modal or navigate to preview screen
      Alert.alert('Preview', 'Email preview would show here', [
        { text: 'OK' },
        { text: 'Send Now', onPress: handleSend },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSend = async () => {
    if (!student || !profile) return;

    if (!student.parent_email) {
      Alert.alert('Error', 'No parent email found for this student');
      return;
    }

    setSending(true);

    try {
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', profile.preschool_id)
        .single();

      const report: ProgressReport = {
        preschool_id: profile.preschool_id!,
        student_id: studentId,
        teacher_id: profile.id,
        report_period: reportPeriod,
        report_type: reportType,
        overall_comments: teacherComments,
        teacher_comments: teacherComments,
        strengths,
        areas_for_improvement: areasForImprovement,
        subjects_performance: subjects,
        overall_grade: overallGrade,
      };

      // Save report
      const savedReport = await emailTemplateService.saveProgressReport(report);

      if (!savedReport) {
        throw new Error('Failed to save progress report');
      }

      // Send email
      const result = await emailTemplateService.sendProgressReport(
        { ...savedReport, id: savedReport.id },
        student.parent_email,
        `${student.first_name} ${student.last_name}`,
        student.parent_name,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        preschoolData.data?.name || 'School'
      );

      if (result.success) {
        Alert.alert('Success', 'Progress report sent successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to send progress report');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <ActivityIndicator size="large" color="#00f5ff" />
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <Text style={styles.errorText}>Student not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <Stack.Screen options={{ title: 'Create Progress Report', headerStyle: { backgroundColor: '#0b1220' }, headerTintColor: '#00f5ff' }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
          <Text style={styles.parentInfo}>Parent: {student.parent_name} ({student.parent_email})</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Report Period *</Text>
          <TextInput
            style={styles.input}
            value={reportPeriod}
            onChangeText={setReportPeriod}
            placeholder="e.g., Q1 2025, Term 1"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Overall Grade *</Text>
          <TextInput
            style={styles.input}
            value={overallGrade}
            onChangeText={setOverallGrade}
            placeholder="e.g., A, B+, Excellent"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Teacher Comments *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={teacherComments}
            onChangeText={setTeacherComments}
            placeholder="General comments about the student's progress"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Strengths</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={strengths}
            onChangeText={setStrengths}
            placeholder="What the student excels at"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Areas for Improvement</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={areasForImprovement}
            onChangeText={setAreasForImprovement}
            placeholder="What the student can work on"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        <Text style={styles.sectionTitle}>Subject Performance</Text>
        
        {Object.entries(subjects).map(([subject, data]) => (
          <View key={subject} style={styles.subjectCard}>
            <Text style={styles.subjectName}>{subject}</Text>
            <TextInput
              style={styles.input}
              value={data.grade}
              onChangeText={(value) => updateSubject(subject, 'grade', value)}
              placeholder="Grade (A, B, C, etc.)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[styles.input, styles.textArea, { marginTop: 8 }]}
              value={data.comments}
              onChangeText={(value) => updateSubject(subject, 'comments', value)}
              placeholder="Comments for this subject"
              placeholderTextColor="#666"
              multiline
              numberOfLines={2}
            />
          </View>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.previewButton]} onPress={handlePreview}>
            <Text style={styles.buttonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.sendButton]}
            onPress={handleSend}
            disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[styles.buttonText, { color: '#000' }]}>Send Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1a2332',
    borderRadius: 12,
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  parentInfo: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a2332',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a3442',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  subjectCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00f5ff',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#2a3442',
  },
  sendButton: {
    backgroundColor: '#00f5ff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 40,
  },
});
