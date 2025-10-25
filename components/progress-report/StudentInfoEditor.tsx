import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { differenceInYears, parse, format, isValid } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { createProgressReportStyles } from '@/app/screens/progress-report-creator.styles';

/**
 * StudentInfoEditor Component
 * 
 * Collapsible, editable student information section with validation and Supabase persistence.
 * Follows React Native 0.79.5 and Supabase v2 patterns.
 * 
 * References:
 * - React Native TextInput: https://reactnative.dev/docs/0.79/textinput
 * - Zod validation: https://zod.dev/
 * - date-fns: https://date-fns.org/docs/Getting-Started
 * - Supabase JS v2: https://supabase.com/docs/reference/javascript/update
 * - TanStack Query v5: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
 * 
 * @component
 */

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  parent_name: string;
  parent_email: string;
  parent_phone?: string;
  age_years?: number;
}

interface StudentInfoEditorProps {
  student: Student;
  preschoolId: string;
  onSaved: (updatedStudent: Student) => void;
  collapsedInitially?: boolean;
}

/**
 * Zod Schema for Student Info Validation
 * 
 * Reference: https://zod.dev/
 */
const StudentEditorSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  parent_name: z.string().min(1, 'Parent/Guardian name is required').max(200),
  parent_email: z.string().email('Invalid email address'),
  parent_phone: z.string()
    .regex(/^(\+27|0)\d{9}$/, 'Invalid South African phone number (format: +27XXXXXXXXX or 0XXXXXXXXX)')
    .or(z.literal(''))
    .optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
});

type StudentEditForm = z.infer<typeof StudentEditorSchema>;

export const StudentInfoEditor: React.FC<StudentInfoEditorProps> = ({
  student,
  preschoolId,
  onSaved,
  collapsedInitially = true,
}) => {
  const { theme } = useTheme();
  const styles = createProgressReportStyles(theme);
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(!collapsedInitially);
  const [saving, setSaving] = useState(false);
  
  // Initialize form with student data
  const [editedStudent, setEditedStudent] = useState<StudentEditForm>({
    first_name: student.first_name || '',
    last_name: student.last_name || '',
    parent_name: student.parent_name || '',
    parent_email: student.parent_email || '',
    parent_phone: student.parent_phone || '',
    date_of_birth: student.date_of_birth || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StudentEditForm, string>>>({});

  /**
   * Compute age from date of birth
   * Reference: https://date-fns.org/v4.1.0/docs/differenceInYears
   */
  const computedAge = useMemo(() => {
    if (!editedStudent.date_of_birth) return null;
    
    try {
      const birthDate = new Date(editedStudent.date_of_birth);
      if (!isValid(birthDate)) return null;
      
      const age = differenceInYears(new Date(), birthDate);
      return age >= 0 && age < 100 ? age : null;
    } catch {
      return null;
    }
  }, [editedStudent.date_of_birth]);

  /**
   * Check if form has been modified (dirty state)
   * Reference: https://react.dev/reference/react/useMemo
   */
  const isDirty = useMemo(() => {
    const normalize = (val?: string) => val?.trim() || '';
    
    return (
      normalize(editedStudent.first_name) !== normalize(student.first_name) ||
      normalize(editedStudent.last_name) !== normalize(student.last_name) ||
      normalize(editedStudent.parent_name) !== normalize(student.parent_name) ||
      normalize(editedStudent.parent_email) !== normalize(student.parent_email) ||
      normalize(editedStudent.parent_phone) !== normalize(student.parent_phone) ||
      normalize(editedStudent.date_of_birth) !== normalize(student.date_of_birth)
    );
  }, [editedStudent, student]);

  /**
   * Handle saving student info to Supabase
   * Reference: https://supabase.com/docs/reference/javascript/update
   */
  const handleSave = useCallback(async () => {
    // Validate with Zod
    const validation = StudentEditorSchema.safeParse(editedStudent);
    
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setErrors(fieldErrors as any);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      if (__DEV__) {
        console.log('[StudentInfo] Saving student:', student.id);
      }

      // Prepare payload
      const payload = {
        first_name: editedStudent.first_name.trim(),
        last_name: editedStudent.last_name.trim(),
        date_of_birth: editedStudent.date_of_birth,
        parent_name: editedStudent.parent_name.trim(),
        parent_email: editedStudent.parent_email.trim(),
        parent_phone: editedStudent.parent_phone?.trim() || null,
      };

      // Update in Supabase with RLS filter
      // Reference: https://supabase.com/docs/reference/javascript/update
      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', student.id)
        .eq('preschool_id', preschoolId) // RLS enforcement
        .select()
        .single();

      if (error) throw error;

      if (__DEV__) {
        console.log('[StudentInfo] Student saved successfully:', data);
      }

      // Invalidate TanStack Query caches
      // Reference: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
      queryClient.invalidateQueries({ queryKey: ['student', preschoolId, student.id] });
      queryClient.invalidateQueries({ queryKey: ['students', preschoolId] });

      // Notify parent component
      onSaved(data as Student);

      // Collapse editor
      setExpanded(false);

      Alert.alert('Success', 'Student information updated successfully');
    } catch (error: any) {
      console.error('[StudentInfo] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save student information');
    } finally {
      setSaving(false);
    }
  }, [editedStudent, student.id, preschoolId, onSaved, queryClient]);

  /**
   * Cancel editing and revert changes
   */
  const handleCancel = useCallback(() => {
    setEditedStudent({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      parent_name: student.parent_name || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
      date_of_birth: student.date_of_birth || '',
    });
    setErrors({});
    setExpanded(false);
  }, [student]);

  /**
   * Render collapsed view
   */
  if (!expanded) {
    return (
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>
              {student.first_name} {student.last_name}
            </Text>
            {student.age_years !== undefined && (
              <Text style={styles.parentInfo}>Age: {student.age_years} years</Text>
            )}
            <Text style={styles.parentInfo}>
              Parent/Guardian: {student.parent_name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: theme.primary,
              minHeight: 36,
            }}
            accessibilityLabel="Edit student information"
            accessibilityRole="button"
          >
            <Text style={{ color: theme.onPrimary, fontSize: 13, fontWeight: '600' }}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Render expanded edit form
   */
  return (
    <View style={[styles.header, { gap: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.label, { marginBottom: 0 }]}>Student Information</Text>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.closeButton}
          accessibilityLabel="Cancel editing"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* First Name */}
      <View>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.first_name && { borderColor: theme.error }]}
          value={editedStudent.first_name}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, first_name: text }))}
          placeholder="Enter first name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
        {errors.first_name && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.first_name}</Text>
        )}
      </View>

      {/* Last Name */}
      <View>
        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={[styles.input, errors.last_name && { borderColor: theme.error }]}
          value={editedStudent.last_name}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, last_name: text }))}
          placeholder="Enter last name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
        {errors.last_name && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.last_name}</Text>
        )}
      </View>

      {/* Date of Birth */}
      <View>
        <Text style={styles.label}>Date of Birth * {computedAge !== null && `(Age: ${computedAge})`}</Text>
        <TextInput
          style={[styles.input, errors.date_of_birth && { borderColor: theme.error }]}
          value={editedStudent.date_of_birth}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, date_of_birth: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
        />
        {errors.date_of_birth && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.date_of_birth}</Text>
        )}
        <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2020-05-15)</Text>
      </View>

      {/* Parent/Guardian Name */}
      <View>
        <Text style={styles.label}>Parent/Guardian Name *</Text>
        <TextInput
          style={[styles.input, errors.parent_name && { borderColor: theme.error }]}
          value={editedStudent.parent_name}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, parent_name: text }))}
          placeholder="Enter parent/guardian name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
        {errors.parent_name && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.parent_name}</Text>
        )}
      </View>

      {/* Parent Email */}
      <View>
        <Text style={styles.label}>Parent Email *</Text>
        <TextInput
          style={[styles.input, errors.parent_email && { borderColor: theme.error }]}
          value={editedStudent.parent_email}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, parent_email: text }))}
          placeholder="parent@example.com"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.parent_email && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.parent_email}</Text>
        )}
      </View>

      {/* Parent Phone */}
      <View>
        <Text style={styles.label}>Parent Phone (Optional)</Text>
        <TextInput
          style={[styles.input, errors.parent_phone && { borderColor: theme.error }]}
          value={editedStudent.parent_phone}
          onChangeText={(text) => setEditedStudent((prev) => ({ ...prev, parent_phone: text }))}
          placeholder="+27XXXXXXXXX or 0XXXXXXXXX"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
        />
        {errors.parent_phone && (
          <Text style={[styles.helperText, { color: theme.error }]}>{errors.parent_phone}</Text>
        )}
        <Text style={styles.helperText}>South African format: +27 or 0 followed by 9 digits</Text>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.actionButton, { flex: 1 }]}
          onPress={handleSave}
          disabled={!isDirty || saving || Object.keys(errors).length > 0}
          accessibilityLabel="Save changes"
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.onPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.onPrimary} />
              <Text style={styles.actionButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { flex: 1 }]}
          onPress={handleCancel}
          disabled={saving}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle-outline" size={20} color={theme.text} />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
