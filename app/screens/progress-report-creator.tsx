import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import emailTemplateService, { ProgressReport } from '@/services/EmailTemplateService';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_email: string;
  parent_name: string;
  date_of_birth?: string;
  age_years?: number;
}

interface OrganizationInfo {
  name: string;
  type?: string;
}

// Get appropriate subjects based on organization type
const getSubjectsForOrganization = (orgType?: string) => {
  // Preschool/ECD subjects (ages 0-6)
  const preschoolSubjects = {
    'Numbers & Counting': { grade: '', comments: '' },
    'Language & Communication': { grade: '', comments: '' },
    'Creative Arts': { grade: '', comments: '' },
    'Physical Development': { grade: '', comments: '' },
  };

  // Primary school subjects (ages 6-13)
  const primarySubjects = {
    'Mathematics': { grade: '', comments: '' },
    'Home Language': { grade: '', comments: '' },
    'First Additional Language': { grade: '', comments: '' },
    'Life Skills': { grade: '', comments: '' },
  };

  // High school subjects (ages 13+)
  const highSchoolSubjects = {
    'Mathematics': { grade: '', comments: '' },
    'Physical Sciences': { grade: '', comments: '' },
    'Life Sciences': { grade: '', comments: '' },
    'English': { grade: '', comments: '' },
  };

  // Map organization types to subject sets
  switch (orgType?.toLowerCase()) {
    case 'preschool':
    case 'ecd':
    case 'daycare':
    case 'nursery':
      return preschoolSubjects;
    case 'k12_school':
    case 'primary':
    case 'primary_school':
    case 'elementary':
      return primarySubjects;
    case 'high':
    case 'high_school':
    case 'secondary':
    case 'university':
      return highSchoolSubjects;
    default:
      // Default to preschool if unknown
      return preschoolSubjects;
  }
};

// Age-appropriate suggestions for progress reports
const getAgeSuggestions = (ageYears: number = 4, category: 'general' | 'school_readiness' = 'general') => {
  if (category === 'school_readiness') {
    return {
      strengths: [
        'Shows enthusiasm for learning new things',
        'Participates actively in group activities',
        'Demonstrates good listening skills during story time',
        'Follows classroom routines independently',
        'Shows kindness and empathy towards peers',
      ],
      improvements: [
        'Continue practicing fine motor skills (cutting, writing)',
        'Work on sitting still during circle time',
        'Build confidence in sharing ideas with the class',
        'Practice counting and number recognition at home',
        'Encourage independence in self-care tasks',
      ],
      recommendations: [
        'Reading together daily will help build vocabulary and listening skills',
        'Practice writing letters and numbers in fun, engaging ways',
        'Encourage playdates to develop social skills',
        'Establish consistent routines at home to support school readiness',
        'Visit the local library to foster a love of learning',
      ],
    };
  }

  // Age-specific general suggestions
  if (ageYears <= 3) {
    return {
      strengths: [
        'Curious and eager to explore the environment',
        'Developing language skills rapidly',
        'Enjoys sensory play and hands-on activities',
        'Beginning to play alongside other children',
        'Shows affection and forms bonds with teachers',
      ],
      improvements: [
        'Continue working on sharing toys with peers',
        'Practice following simple two-step instructions',
        'Develop self-help skills like putting on shoes',
        'Build vocabulary through songs and stories',
        'Work on emotional regulation during transitions',
      ],
    };
  } else if (ageYears <= 4) {
    return {
      strengths: [
        'Demonstrates creativity in art and play',
        'Shows improved attention span during activities',
        'Developing friendships with classmates',
        'Expresses thoughts and feelings clearly',
        'Enjoys helping with classroom tasks',
      ],
      improvements: [
        'Continue practicing taking turns during games',
        'Work on recognizing and writing own name',
        'Build confidence in trying new activities',
        'Practice counting objects up to 10',
        'Develop patience when waiting for teacher attention',
      ],
    };
  } else {
    return {
      strengths: [
        'Shows school readiness skills',
        'Demonstrates independence in self-care',
        'Works well in group settings',
        'Shows interest in letters and numbers',
        'Follows multi-step instructions',
      ],
      improvements: [
        'Continue practicing letter formation and writing',
        'Build confidence in problem-solving',
        'Work on conflict resolution with peers',
        'Develop organizational skills',
        'Practice patience and perseverance',
      ],
    };
  }
};

export default function ProgressReportCreator() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const studentId = params.student_id as string;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  
  // Suggestions modal state
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [currentField, setCurrentField] = useState<'strengths' | 'improvements' | 'recommendations' | 'comments' | null>(null);
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  
  // Report form state
  const [reportCategory, setReportCategory] = useState<'general' | 'school_readiness'>('general');
  const [reportPeriod, setReportPeriod] = useState('Q4 2025');
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [overallGrade, setOverallGrade] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  
  // Subjects (will be set based on organization type)
  const [subjects, setSubjects] = useState<Record<string, { grade: string; comments: string }>>({});
  
  // School readiness specific fields
  const [transitionReadinessLevel, setTransitionReadinessLevel] = useState<'not_ready' | 'developing' | 'ready' | 'exceeds_expectations'>('developing');
  const [readinessNotes, setReadinessNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [readinessIndicators, setReadinessIndicators] = useState<Record<string, { rating: number; notes: string }>>({
    social_skills: { rating: 3, notes: '' },
    emotional_development: { rating: 3, notes: '' },
    gross_motor_skills: { rating: 3, notes: '' },
    fine_motor_skills: { rating: 3, notes: '' },
    cognitive_development: { rating: 3, notes: '' },
    language_development: { rating: 3, notes: '' },
    independence: { rating: 3, notes: '' },
    self_care: { rating: 3, notes: '' },
  });
  const [milestones, setMilestones] = useState<Record<string, boolean>>({
    can_write_name: false,
    can_count_to_20: false,
    recognizes_letters: false,
    follows_instructions: false,
    shares_with_others: false,
    sits_still_in_circle_time: false,
    uses_toilet_independently: false,
    ties_shoelaces: false,
  });

  // UI Enhancement: Progress tracking and collapsed sections
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved');

  // Character count limits
  const CHAR_LIMITS = {
    teacherComments: 1000,
    strengths: 500,
    areasForImprovement: 500,
    readinessNotes: 800,
    recommendations: 800,
  };

  // Calculate completion percentage
  useEffect(() => {
    const calculateCompletion = () => {
      const requiredFields = [
        { filled: !!reportPeriod, weight: 10 },
        { filled: !!overallGrade, weight: 10 },
        { filled: !!teacherComments, weight: 20 },
        { filled: reportCategory === 'school_readiness' ? !!readinessNotes : !!strengths, weight: 15 },
        { filled: reportCategory === 'school_readiness' ? !!recommendations : !!areasForImprovement, weight: 15 },
      ];

      if (reportCategory === 'school_readiness') {
        const indicatorsComplete = Object.values(readinessIndicators).every(ind => ind.rating > 0);
        const milestonesChecked = Object.values(milestones).some(Boolean);
        requiredFields.push(
          { filled: indicatorsComplete, weight: 20 },
          { filled: milestonesChecked, weight: 10 }
        );
      } else {
        const subjectsComplete = Object.values(subjects).some(subj => subj.grade !== '');
        requiredFields.push({ filled: subjectsComplete, weight: 30 });
      }

      const totalWeight = requiredFields.reduce((sum, field) => sum + field.weight, 0);
      const completedWeight = requiredFields
        .filter(field => field.filled)
        .reduce((sum, field) => sum + field.weight, 0);

      setCompletionPercentage(Math.round((completedWeight / totalWeight) * 100));
    };

    calculateCompletion();
  }, [
    reportPeriod,
    overallGrade,
    teacherComments,
    strengths,
    areasForImprovement,
    readinessNotes,
    recommendations,
    readinessIndicators,
    milestones,
    subjects,
    reportCategory,
  ]);

  // Create theme-aware styles (MUST be before any early returns)
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    studentName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    parentInfo: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    section: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    suggestionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
      backgroundColor: theme.primary,
    },
    suggestionButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      marginTop: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 12,
      color: theme.text,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    subjectCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    subjectName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: 12,
    },
    actionsContainer: {
      gap: 12,
      marginTop: 24,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButtonSmall: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 8,
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 10,
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    secondaryButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    secondaryButtonText: {
      color: theme.text,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.error,
      marginTop: 16,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
    },
    suggestionItem: {
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    suggestionText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    previewModal: {
      flex: 1,
      backgroundColor: theme.background,
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    webview: {
      flex: 1,
    },
  }), [theme]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const saveTimer = setInterval(() => {
      if (student && (teacherComments || strengths || areasForImprovement)) {
        saveDraft();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(saveTimer);
  }, [student, teacherComments, strengths, areasForImprovement, readinessNotes, recommendations]);

  useEffect(() => {
    console.log('[ProgressReport] useEffect triggered');
    console.log('[ProgressReport] studentId:', studentId);
    console.log('[ProgressReport] profile:', profile);
    console.log('[ProgressReport] profile.preschool_id:', profile?.preschool_id);
    
    if (profile) {
      loadStudent();
      loadDraft(); // Load any existing draft
    } else {
      console.log('[ProgressReport] Waiting for profile to load...');
    }
  }, [studentId, profile]);

  const loadStudent = async () => {
    const preschoolId = profile?.preschool_id || profile?.organization_id;
    
    console.log('[ProgressReport] Loading student:', studentId);
    console.log('[ProgressReport] Profile organization_id:', profile?.organization_id);
    console.log('[ProgressReport] Using preschool_id:', preschoolId);
    
    if (!studentId || !preschoolId) {
      console.error('[ProgressReport] Missing studentId or preschool_id');
      Alert.alert('Error', 'Missing required information');
      setLoading(false);
      return;
    }

    try {
      // Fetch organization info first to determine subject types
      const { data: orgData } = await supabase
        .from('preschools')
        .select('name, type')
        .eq('id', preschoolId)
        .single();

      if (orgData) {
        setOrganizationInfo(orgData);
        // Set subjects based on organization type
        setSubjects(getSubjectsForOrganization(orgData.type));
      }

      // Simple query without age_groups join to avoid ambiguity issues
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, parent_id, guardian_id, date_of_birth')
        .eq('id', studentId)
        .eq('preschool_id', preschoolId)
        .single();

      console.log('[ProgressReport] Query result:', { data, error });

      if (error) {
        console.error('[ProgressReport] Failed to load student:', error);
        Alert.alert('Error', `Failed to load student: ${error.message}`);
        setLoading(false);
        return;
      }

      // Calculate age from date_of_birth if available
      let ageYears = 4; // Default age
      if (data?.date_of_birth) {
        const birthDate = new Date(data.date_of_birth);
        const today = new Date();
        ageYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          ageYears--;
        }
      }

      if (!data) {
        console.error('[ProgressReport] No student data returned');
        Alert.alert('Error', 'Student not found');
        setLoading(false);
        return;
      }

      console.log('[ProgressReport] Student loaded:', data.first_name, data.last_name);

      // Try to get parent information if parent_id exists
      let parentData = null;
      if (data.parent_id) {
        const { data: parent } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', data.parent_id)
          .maybeSingle();
        
        parentData = parent;
      }

      // If no parent, try guardian
      if (!parentData && data.guardian_id) {
        const { data: guardian } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', data.guardian_id)
          .maybeSingle();
        
        parentData = guardian;
      }

      setStudent({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        parent_email: parentData?.email || '',
        parent_name: parentData ? `${parentData.first_name || ''} ${parentData.last_name || ''}`.trim() : 'Parent',
        date_of_birth: data.date_of_birth,
        age_years: ageYears,
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading student:', err);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
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
  
  const updateReadinessIndicator = (indicator: string, field: 'rating' | 'notes', value: number | string) => {
    setReadinessIndicators((prev) => ({
      ...prev,
      [indicator]: {
        ...prev[indicator],
        [field]: value,
      },
    }));
  };
  
  const toggleMilestone = (milestone: string) => {
    setMilestones((prev) => ({
      ...prev,
      [milestone]: !prev[milestone],
    }));
  };

  // Toggle collapsed sections
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Save draft to AsyncStorage
  const saveDraft = async () => {
    if (!student) return;

    try {
      setAutoSaveStatus('saving');
      const draftKey = `progress_report_draft_${student.id}`;
      const draftData = {
        reportCategory,
        reportPeriod,
        reportType,
        overallGrade,
        teacherComments,
        strengths,
        areasForImprovement,
        subjects,
        transitionReadinessLevel,
        readinessNotes,
        recommendations,
        readinessIndicators,
        milestones,
        savedAt: new Date().toISOString(),
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastAutoSave(new Date());
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('[Draft] Failed to save draft:', error);
      setAutoSaveStatus('unsaved');
    }
  };

  // Load draft from AsyncStorage
  const loadDraft = async () => {
    if (!studentId) return;

    try {
      const draftKey = `progress_report_draft_${studentId}`;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const draftJson = await AsyncStorage.getItem(draftKey);
      
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        // Restore draft data
        setReportCategory(draft.reportCategory || 'general');
        setReportPeriod(draft.reportPeriod || 'Q4 2025');
        setReportType(draft.reportType || 'quarterly');
        setOverallGrade(draft.overallGrade || '');
        setTeacherComments(draft.teacherComments || '');
        setStrengths(draft.strengths || '');
        setAreasForImprovement(draft.areasForImprovement || '');
        if (draft.subjects) setSubjects(draft.subjects);
        if (draft.transitionReadinessLevel) setTransitionReadinessLevel(draft.transitionReadinessLevel);
        setReadinessNotes(draft.readinessNotes || '');
        setRecommendations(draft.recommendations || '');
        if (draft.readinessIndicators) setReadinessIndicators(draft.readinessIndicators);
        if (draft.milestones) setMilestones(draft.milestones);
        setLastAutoSave(new Date(draft.savedAt));
        setAutoSaveStatus('saved');
      }
    } catch (error) {
      console.error('[Draft] Failed to load draft:', error);
    }
  };

  // Clear draft after successful send
  const clearDraft = async () => {
    if (!student) return;
    try {
      const draftKey = `progress_report_draft_${student.id}`;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(draftKey);
    } catch (error) {
      console.error('[Draft] Failed to clear draft:', error);
    }
  };

  // Get character counter component
  const renderCharCounter = (currentLength: number, maxLength: number) => {
    const remaining = maxLength - currentLength;
    const percentage = (currentLength / maxLength) * 100;
    const color = percentage > 90 ? theme.error : percentage > 75 ? '#F59E0B' : theme.textSecondary;
    
    return (
      <Text style={{ fontSize: 11, color, marginTop: 4 }}>
        {remaining} characters remaining
      </Text>
    );
  };

  // Open suggestions modal
  const openSuggestions = (field: 'strengths' | 'improvements' | 'recommendations' | 'comments') => {
    setCurrentField(field);
    setShowSuggestionsModal(true);
  };

  // Insert suggestion into field
  const insertSuggestion = (text: string) => {
    if (!currentField) return;

    switch (currentField) {
      case 'strengths':
        setStrengths(prev => prev ? `${prev}\n• ${text}` : `• ${text}`);
        break;
      case 'improvements':
        setAreasForImprovement(prev => prev ? `${prev}\n• ${text}` : `• ${text}`);
        break;
      case 'recommendations':
        setRecommendations(prev => prev ? `${prev}\n• ${text}` : `• ${text}`);
        break;
      case 'comments':
        setTeacherComments(prev => prev ? `${prev} ${text}` : text);
        break;
    }
  };

  // Get current suggestions based on student age and report category
  const getCurrentSuggestions = () => {
    const ageYears = student?.age_years || 4;
    const suggestions = getAgeSuggestions(ageYears, reportCategory);
    
    if (currentField === 'strengths') {
      return suggestions.strengths || [];
    } else if (currentField === 'improvements') {
      return suggestions.improvements || [];
    } else if (currentField === 'recommendations') {
      return suggestions.recommendations || [];
    }
    return [];
  };

  const handlePreview = async () => {
    if (!student || !profile) return;

    const preschoolId = profile.preschool_id || profile.organization_id;
    if (!preschoolId) {
      Alert.alert('Error', 'No organization/preschool associated with your account');
      return;
    }

    setSending(true);

    try {
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', preschoolId)
        .single();

      const report: ProgressReport = {
        preschool_id: preschoolId,
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
        report_category: reportCategory,
        ...(reportCategory === 'school_readiness' && {
          school_readiness_indicators: readinessIndicators,
          developmental_milestones: milestones,
          transition_readiness_level: transitionReadinessLevel,
          readiness_notes: readinessNotes,
          recommendations,
        }),
      };

      // Generate HTML based on report type
      let html: string;
      if (reportCategory === 'school_readiness') {
        const result = await emailTemplateService.generateSchoolReadinessEmail(
          report,
          `${student.first_name} ${student.last_name}`,
          student.parent_name,
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          preschoolData.data?.name || 'School'
        );
        html = result.html;
      } else {
        const result = await emailTemplateService.generateProgressReportEmail(
          report,
          `${student.first_name} ${student.last_name}`,
          student.parent_name,
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          preschoolData.data?.name || 'School'
        );
        html = result.html;
      }

      // Wrap HTML with additional mobile viewport settings for better WebView rendering
      const mobileOptimizedHtml = html.includes('<!DOCTYPE html>') 
        ? html 
        : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
            <style>
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${html}
          </body>
          </html>
        `;

      // Show preview in modal
      setPreviewHtml(mobileOptimizedHtml);
      setShowPreviewModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendPDF = async () => {
    console.log('[PDF] Starting PDF generation...');
    console.log('[PDF] Student:', student);
    console.log('[PDF] Profile:', profile);
    
    if (!student || !profile) {
      console.error('[PDF] Missing student or profile');
      return;
    }

    const preschoolId = profile.preschool_id || profile.organization_id;
    console.log('[PDF] Using preschool ID:', preschoolId);
    
    if (!preschoolId) {
      Alert.alert('Error', 'No organization/preschool associated with your account');
      return;
    }

    setSending(true);

    try {
      console.log('[PDF] Fetching preschool data...');
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', preschoolId)
        .single();

      const report: ProgressReport = {
        preschool_id: preschoolId,
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
        report_category: reportCategory,
        ...(reportCategory === 'school_readiness' && {
          school_readiness_indicators: readinessIndicators,
          developmental_milestones: milestones,
          transition_readiness_level: transitionReadinessLevel,
          readiness_notes: readinessNotes,
          recommendations,
        }),
      };

      console.log('[PDF] Generating PDF...');
      // Generate PDF
      const pdfResult = await emailTemplateService.generateProgressReportPDF(
        report,
        `${student.first_name} ${student.last_name}`,
        student.parent_name,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        preschoolData.data?.name || 'School'
      );

      console.log('[PDF] PDF Result:', pdfResult);

      if (!pdfResult.success || !pdfResult.uri) {
        throw new Error(pdfResult.error || 'Failed to generate PDF');
      }

      // Check if sharing is available
      console.log('[PDF] Checking if sharing is available...');
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('[PDF] Sharing available:', isAvailable);
      
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the PDF
      console.log('[PDF] Opening share dialog...');
      await Sharing.shareAsync(pdfResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Progress Report',
      });

      console.log('[PDF] Share completed');
      Alert.alert('Success', 'PDF generated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[PDF] Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendViaWhatsApp = async () => {
    console.log('[WhatsApp] Starting WhatsApp share...');
    console.log('[WhatsApp] Student:', student);
    
    if (!student || !profile) {
      console.error('[WhatsApp] Missing student or profile');
      return;
    }

    if (!student.parent_email) {
      console.log('[WhatsApp] No parent contact - will still try to share PDF');
      // Don't return - we can still share the PDF even without contact info
    }

    const preschoolId = profile.preschool_id || profile.organization_id;
    if (!preschoolId) {
      Alert.alert('Error', 'No organization/preschool associated with your account');
      return;
    }

    setSending(true);

    try {
      console.log('[WhatsApp] Generating PDF...');
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', preschoolId)
        .single();

      const report: ProgressReport = {
        preschool_id: preschoolId,
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
        report_category: reportCategory,
        ...(reportCategory === 'school_readiness' && {
          school_readiness_indicators: readinessIndicators,
          developmental_milestones: milestones,
          transition_readiness_level: transitionReadinessLevel,
          readiness_notes: readinessNotes,
          recommendations,
        }),
      };

      // Generate PDF
      const pdfResult = await emailTemplateService.generateProgressReportPDF(
        report,
        `${student.first_name} ${student.last_name}`,
        student.parent_name,
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        preschoolData.data?.name || 'School'
      );

      if (!pdfResult.success || !pdfResult.uri) {
        throw new Error(pdfResult.error || 'Failed to generate PDF');
      }

      // Share via WhatsApp
      const message = `Progress Report for ${student.first_name} ${student.last_name} - ${reportPeriod}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (!canOpen) {
        Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to share via WhatsApp');
        return;
      }

      // Open WhatsApp
      await Linking.openURL(whatsappUrl);
      
      // Share the PDF file
      await Sharing.shareAsync(pdfResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share via WhatsApp',
      });

      Alert.alert('Success', 'Opening WhatsApp...', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleExportCSV = async () => {
    if (!student || !profile) {
      return;
    }

    const preschoolId = profile.preschool_id || profile.organization_id;
    if (!preschoolId) {
      Alert.alert('Error', 'No organization/preschool associated with your account');
      return;
    }

    setSending(true);

    try {
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', preschoolId)
        .single();

      const report: ProgressReport = {
        preschool_id: preschoolId,
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
        report_category: reportCategory,
        ...(reportCategory === 'school_readiness' && {
          school_readiness_indicators: readinessIndicators,
          developmental_milestones: milestones,
          transition_readiness_level: transitionReadinessLevel,
          readiness_notes: readinessNotes,
          recommendations,
        }),
      };

      // Export to CSV
      const csvResult = await emailTemplateService.exportProgressReportCSV(
        report,
        `${student.first_name} ${student.last_name}`,
        preschoolData.data?.name || 'School'
      );

      if (!csvResult.success || !csvResult.uri) {
        throw new Error(csvResult.error || 'Failed to export CSV');
      }

      // Share CSV file
      await Sharing.shareAsync(csvResult.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Progress Report Data',
      });

      Alert.alert('Success', 'CSV exported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    console.log('[Email] Starting email send...');
    console.log('[Email] Student:', student);
    console.log('[Email] Parent email:', student?.parent_email);
    
    if (!student || !profile) {
      console.error('[Email] Missing student or profile');
      return;
    }

    if (!student.parent_email) {
      console.error('[Email] No parent email');
      Alert.alert('Error', 'No parent email found for this student');
      return;
    }

    const preschoolId = profile.preschool_id || profile.organization_id;
    if (!preschoolId) {
      Alert.alert('Error', 'No organization/preschool associated with your account');
      return;
    }

    setSending(true);

    try {
      console.log('[Email] Fetching preschool data...');
      const preschoolData = await supabase
        .from('preschools')
        .select('name')
        .eq('id', preschoolId)
        .single();

      const report: ProgressReport = {
        preschool_id: preschoolId,
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
        report_category: reportCategory,
        ...(reportCategory === 'school_readiness' && {
          school_readiness_indicators: readinessIndicators,
          developmental_milestones: milestones,
          transition_readiness_level: transitionReadinessLevel,
          readiness_notes: readinessNotes,
          recommendations,
        }),
      };

      // Save report
      const savedReport = await emailTemplateService.saveProgressReport(report);

      if (!savedReport) {
        throw new Error('Failed to save progress report');
      }

      // Send email using appropriate template
      let result;
      if (reportCategory === 'school_readiness') {
        const { subject, html } = await emailTemplateService.generateSchoolReadinessEmail(
          { ...savedReport, id: savedReport.id },
          `${student.first_name} ${student.last_name}`,
          student.parent_name,
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          preschoolData.data?.name || 'School'
        );
        
        result = await emailTemplateService.sendEmail({
          to: student.parent_email,
          subject,
          body: html,
          is_html: true,
          confirmed: true,
        });
      } else {
        result = await emailTemplateService.sendProgressReport(
          { ...savedReport, id: savedReport.id },
          student.parent_email,
          `${student.first_name} ${student.last_name}`,
          student.parent_name,
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          preschoolData.data?.name || 'School'
        );
      }

      if (result.success) {
        await clearDraft(); // Clear draft after successful send
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

  // Show loading while profile or student is loading
  if (!profile || loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            {!profile ? 'Loading profile...' : 'Loading student...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={[styles.errorText, { color: theme.error }]}>Student not found</Text>
          <Text style={{ color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
            Student ID: {studentId}
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: theme.background }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Styles already created at top of component (line ~277)
  // Removed duplicate styles definition to fix React Hooks rules violation

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Create Progress Report', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.primary }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Report Progress</Text>
            <View style={styles.autoSaveContainer}>
              {autoSaveStatus === 'saving' && (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
              )}
              {autoSaveStatus === 'saved' && lastAutoSave && (
                <Text style={[styles.autoSaveText, { color: theme.textSecondary }]}>
                  ✓ Auto-saved
                </Text>
              )}
            </View>
          </View>
          <View style={styles.progressBarOuter}>
            <View 
              style={[
                styles.progressBarInner, 
                { 
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#059669' : theme.primary 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressPercentage, { color: theme.textSecondary }]}>
            {completionPercentage}% Complete
          </Text>
        </View>

        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.studentName, { color: theme.text }]}>{student.first_name} {student.last_name}</Text>
          <Text style={[styles.parentInfo, { color: theme.textSecondary }]}>Parent: {student.parent_name} ({student.parent_email})</Text>
        </View>

        {/* Report Category Toggle */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Report Type *</Text>
          <View style={styles.categoryToggle}>
            <TouchableOpacity
              style={[styles.categoryButton, { backgroundColor: theme.surface, borderColor: theme.border }, reportCategory === 'general' && styles.categoryButtonActive]}
              onPress={() => setReportCategory('general')}
            >
              <Text style={[styles.categoryButtonText, { color: theme.textSecondary }, reportCategory === 'general' && styles.categoryButtonTextActive]}>General Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryButton, { backgroundColor: theme.surface, borderColor: theme.border }, reportCategory === 'school_readiness' && styles.categoryButtonActive]}
              onPress={() => setReportCategory('school_readiness')}
            >
              <Text style={[styles.categoryButtonText, { color: theme.textSecondary }, reportCategory === 'school_readiness' && styles.categoryButtonTextActive]}>🎓 School Readiness</Text>
            </TouchableOpacity>
          </View>
          {reportCategory === 'school_readiness' && (
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>For Grade R students transitioning to formal school</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Report Period *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={reportPeriod}
            onChangeText={setReportPeriod}
            placeholder="e.g., Q1 2025, Term 1"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Overall Grade *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={overallGrade}
            onChangeText={setOverallGrade}
            placeholder="e.g., A, B+, Excellent"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>Teacher Comments *</Text>
            <TouchableOpacity 
              style={[styles.suggestionButton, { backgroundColor: theme.primary }]}
              onPress={() => openSuggestions('comments')}
            >
              <Ionicons name="bulb" size={14} color="#fff" />
              <Text style={styles.suggestionButtonText}>Suggestions</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={teacherComments}
            onChangeText={(text) => {
              if (text.length <= CHAR_LIMITS.teacherComments) {
                setTeacherComments(text);
                setAutoSaveStatus('unsaved');
              }
            }}
            placeholder="General comments about the student's progress"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={CHAR_LIMITS.teacherComments}
          />
          {renderCharCounter(teacherComments.length, CHAR_LIMITS.teacherComments)}
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>Strengths</Text>
            <TouchableOpacity 
              style={[styles.suggestionButton, { backgroundColor: theme.primary }]}
              onPress={() => openSuggestions('strengths')}
            >
              <Ionicons name="bulb" size={14} color="#fff" />
              <Text style={styles.suggestionButtonText}>Suggestions</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={strengths}
            onChangeText={(text) => {
              if (text.length <= CHAR_LIMITS.strengths) {
                setStrengths(text);
                setAutoSaveStatus('unsaved');
              }
            }}
            placeholder="What the student excels at"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={CHAR_LIMITS.strengths}
          />
          {renderCharCounter(strengths.length, CHAR_LIMITS.strengths)}
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>Areas for Improvement</Text>
            <TouchableOpacity 
              style={[styles.suggestionButton, { backgroundColor: theme.primary }]}
              onPress={() => openSuggestions('improvements')}
            >
              <Ionicons name="bulb" size={14} color="#fff" />
              <Text style={styles.suggestionButtonText}>Suggestions</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={areasForImprovement}
            onChangeText={(text) => {
              if (text.length <= CHAR_LIMITS.areasForImprovement) {
                setAreasForImprovement(text);
                setAutoSaveStatus('unsaved');
              }
            }}
            placeholder="What the student can work on"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={CHAR_LIMITS.areasForImprovement}
          />
          {renderCharCounter(areasForImprovement.length, CHAR_LIMITS.areasForImprovement)}
        </View>

        {/* School Readiness Specific Sections */}
        {reportCategory === 'school_readiness' && (
          <>
            {/* Transition Readiness Level */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Overall School Readiness *</Text>
              <View style={styles.readinessLevelContainer}>
                {(['not_ready', 'developing', 'ready', 'exceeds_expectations'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.readinessLevelButton, { backgroundColor: theme.surface, borderColor: theme.border }, transitionReadinessLevel === level && styles.readinessLevelButtonActive]}
                    onPress={() => setTransitionReadinessLevel(level)}
                  >
                    <Text style={[styles.readinessLevelText, { color: theme.textSecondary }, transitionReadinessLevel === level && styles.readinessLevelTextActive]}>
                      {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Development Areas */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Development Areas (Rate 1-5)</Text>
            {Object.entries(readinessIndicators).map(([indicator, data]) => (
              <View key={indicator} style={[styles.indicatorCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.indicatorName, { color: theme.primary }]}>{indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.starButton, data.rating >= rating && styles.starButtonActive]}
                      onPress={() => updateReadinessIndicator(indicator, 'rating', rating)}
                    >
                      <Text style={styles.starText}>{data.rating >= rating ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, styles.textArea, { marginTop: 8, backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={data.notes}
                  onChangeText={(value) => updateReadinessIndicator(indicator, 'notes', value)}
                  placeholder="Notes for this development area"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            {/* Developmental Milestones */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Developmental Milestones</Text>
            <View style={[styles.milestonesContainer, { backgroundColor: theme.surface }]}>
              {Object.entries(milestones).map(([milestone, achieved]) => (
                <TouchableOpacity
                  key={milestone}
                  style={[styles.milestoneItem, { borderBottomColor: theme.border }]}
                  onPress={() => toggleMilestone(milestone)}
                >
                  <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: theme.background }, achieved && styles.checkboxChecked]}>
                    {achieved && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.milestoneText, { color: theme.text }]}>{milestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Readiness Notes */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Readiness Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={readinessNotes}
                onChangeText={setReadinessNotes}
                placeholder="Additional notes about school readiness"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.text }]}>Recommendations for Parents/School</Text>
                <TouchableOpacity 
                  style={[styles.suggestionButton, { backgroundColor: theme.primary }]}
                  onPress={() => openSuggestions('recommendations')}
                >
                  <Ionicons name="bulb" size={14} color="#fff" />
                  <Text style={styles.suggestionButtonText}>Suggestions</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={recommendations}
                onChangeText={setRecommendations}
                placeholder="Recommendations for supporting transition to formal school"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        )}

        {/* Subject Performance - Only show for general reports */}
        {reportCategory === 'general' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Subject Performance</Text>
            {Object.entries(subjects).map(([subject, data]) => (
              <View key={subject} style={[styles.subjectCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.subjectName, { color: theme.primary }]}>{subject}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={data.grade}
                  onChangeText={(value) => updateSubject(subject, 'grade', value)}
                  placeholder="Grade (A, B, C, etc.)"
                  placeholderTextColor={theme.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.textArea, { marginTop: 8, backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={data.comments}
                  onChangeText={(value) => updateSubject(subject, 'comments', value)}
                  placeholder="Comments for this subject"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}
          </>
        )}

        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButtonSmall, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={handlePreview}
              disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="eye-outline" size={18} color={theme.primary} />
                  <Text style={[styles.actionButtonTextSmall, { color: theme.text }]}>Preview</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonSmall, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleExportCSV}
              disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="stats-chart-outline" size={18} color={theme.primary} />
                  <Text style={[styles.actionButtonTextSmall, { color: theme.text }]}>CSV</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSendPDF}
            disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={theme.onPrimary} />
                <Text style={styles.actionButtonText}>Save as PDF</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#25D366' }]}
            onPress={handleSendViaWhatsApp}
            disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>WhatsApp</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.accent || '#8B5CF6' }]}
            onPress={handleSend}
            disabled={sending || !reportPeriod || !overallGrade || !teacherComments || !student.parent_email}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview Modal */}
        <Modal
          visible={showPreviewModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Report Preview</Text>
              <View style={{ width: 28 }} />
            </View>
            <WebView
              originWhitelist={['*']}
              source={{ 
                html: previewHtml,
                baseUrl: '' 
              }}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              scalesPageToFit={false}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              mixedContentMode="always"
              allowFileAccess={true}
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            />
          </SafeAreaView>
        </Modal>

        {/* Suggestions Modal */}
        <Modal
          visible={showSuggestionsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSuggestionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Age-Appropriate Suggestions
                  {student?.age_years && ` (Age ${student.age_years})`}
                </Text>
                <TouchableOpacity onPress={() => setShowSuggestionsModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSubtitle}>
                  Tap a suggestion to add it to your report:
                </Text>
                {getCurrentSuggestions().map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => {
                      insertSuggestion(suggestion);
                      setShowSuggestionsModal(false);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSuggestionsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
