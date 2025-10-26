# Progress Report Creator - Signature Workflow Implementation Guide

**Status**: Implementation Required  
**File**: `app/screens/progress-report-creator.tsx` (1570 lines - too large to modify safely)  
**Date**: 2025-10-25

## Overview

This document provides step-by-step instructions for adding the teacher signature and approval workflow to the existing progress report creator screen.

## Required Changes

### 1. Add Imports (Top of File)

```typescript
import { ProgressReportService } from '@/services/ProgressReportService';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { ApprovalStatusBadge } from '@/components/progress-report/ApprovalStatusBadge';
```

### 2. Add State Variables (After line 200)

```typescript
// Signature workflow state
const [reportStatus, setReportStatus] = useState<'draft' | 'pending_review' | 'approved' | 'rejected' | 'sent'>('draft');
const [teacherSignature, setTeacherSignature] = useState<string>('');
const [showSignaturePad, setShowSignaturePad] = useState(false);
const [rejectionReason, setRejectionReason] = useState('');
const [submissionCount, setSubmissionCount] = useState(0);
```

### 3. Add Workflow Gating Logic (After organization load)

```typescript
// Determine if approval workflow is required
const requiresApproval = useMemo(() => {
  return ProgressReportService.requiresApprovalWorkflow(
    reportType,
    reportCategory,
    reportPeriod
  );
}, [reportType, reportCategory, reportPeriod]);
```

### 4. Add Rejection Banner (Before form fields, around line 400)

```typescript
{reportStatus === 'rejected' && rejectionReason && (
  <View style={[styles.rejectionBanner, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]}>
    <Ionicons name="alert-circle" size={24} color="#DC2626" />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={[styles.rejectionTitle, { color: '#DC2626' }]}>
        Report Rejected
      </Text>
      <Text style={[styles.rejectionText, { color: '#7F1D1D' }]}>
        {rejectionReason}
      </Text>
      {submissionCount > 0 && (
        <Text style={[styles.rejectionCount, { color: '#B91C1C' }]}>
          Resubmission #{submissionCount}
        </Text>
      )}
    </View>
  </View>
)}
```

### 5. Add Status Badge (Near header, around line 350)

```typescript
{requiresApproval && (
  <View style={{ marginTop: 12 }}>
    <ApprovalStatusBadge status={reportStatus} size="medium" />
    {reportStatus === 'draft' || reportStatus === 'rejected' ? (
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        Principal sign-off required for Term 2 and School Readiness reports
      </Text>
    ) : null}
  </View>
)}
```

### 6. Replace Action Buttons (Around line 1440-1516)

Replace the existing action buttons section with:

```typescript
<View style={styles.actionsContainer}>
  {/* Preview and CSV remain the same */}
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

  {/* Conditional rendering based on workflow */}
  {requiresApproval ? (
    <>
      {reportStatus === 'draft' || reportStatus === 'rejected' ? (
        // Show Submit for Review button
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent || '#8B5CF6' }]}
          onPress={handleSubmitForReview}
          disabled={sending || !reportPeriod || !overallGrade || !teacherComments}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                Submit for Principal Review
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : reportStatus === 'approved' ? (
        // Show Send to Parent buttons (PDF, WhatsApp, Email)
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSendPDF}
            disabled={sending}
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
            disabled={sending}
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
            onPress={handleSendToParent}
            disabled={sending || !student.parent_email}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Send to Parent</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : (
        // Pending review or sent - show status message
        <View style={[styles.statusMessage, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statusMessageText, { color: theme.text }]}>
            {reportStatus === 'pending_review' && 'Report submitted for principal review'}
            {reportStatus === 'sent' && 'Report has been sent to parent'}
          </Text>
        </View>
      )}
    </>
  ) : (
    // No approval required - show original buttons
    <>
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
    </>
  )}
</View>
```

### 7. Add Handler Functions (After existing handlers)

```typescript
const handleSubmitForReview = async () => {
  if (!profile?.preschool_id || !profile?.id || !studentId) {
    Alert.alert('Error', 'Missing required information');
    return;
  }

  // Show signature pad
  setShowSignaturePad(true);
};

const handleSignatureSaved = async (signature: string) => {
  setTeacherSignature(signature);
  setShowSignaturePad(false);
  
  // Submit report for review
  setSending(true);
  try {
    // First, save the report to database
    const reportId = await saveReportToDatabase(); // You'll need to implement this
    
    if (!reportId) {
      throw new Error('Failed to save report');
    }

    // Submit for review
    const success = await ProgressReportService.submitReportForReview(
      reportId,
      profile.preschool_id,
      profile.id,
      signature
    );

    if (success) {
      setReportStatus('pending_review');
      Alert.alert(
        'Success',
        'Report submitted for principal review. You will be notified once approved.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      throw new Error('Failed to submit for review');
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    Alert.alert('Error', 'Failed to submit report for review');
  } finally {
    setSending(false);
  }
};

const handleSendToParent = async () => {
  // This replaces the old handleSend for approved reports
  // Use existing email sending logic but mark as sent
  await handleSend(); // Call existing function
  
  // Mark as sent in database
  if (reportStatus === 'approved') {
    // Update status to sent
    setReportStatus('sent');
  }
};
```

### 8. Add Signature Pad Modal (Before closing return)

```typescript
{/* Signature Pad */}
<SignaturePad
  visible={showSignaturePad}
  signerName={profile?.first_name + ' ' + profile?.last_name || 'Teacher'}
  signerRole="teacher"
  onSave={handleSignatureSaved}
  onCancel={() => setShowSignaturePad(false)}
/>
```

### 9. Add Styles (In styles file)

```typescript
rejectionBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 16,
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: 16,
},
rejectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 4,
},
rejectionText: {
  fontSize: 14,
  marginBottom: 4,
},
rejectionCount: {
  fontSize: 12,
  fontWeight: '600',
  marginTop: 4,
},
helperText: {
  fontSize: 12,
  marginTop: 8,
  fontStyle: 'italic',
},
statusMessage: {
  padding: 16,
  borderRadius: 8,
  alignItems: 'center',
},
statusMessageText: {
  fontSize: 14,
  fontWeight: '500',
},
```

##Implementation Notes

1. **Database Integration**: You'll need to add a `saveReportToDatabase()` function that creates the progress_reports record if it doesn't exist
2. **Load Existing Report**: On screen load, check if a report already exists for this student and load its status/signatures
3. **Disable Editing**: When status is 'pending_review', 'approved', or 'sent', disable all form fields
4. **Auto-Save**: Respect existing auto-save but don't persist signatures

## Testing Checklist

- [ ] Term 2 reports show approval workflow
- [ ] School Readiness reports show approval workflow
- [ ] Other report types bypass approval workflow
- [ ] Signature pad opens on submit
- [ ] Report saves with signature
- [ ] Status updates correctly
- [ ] Rejection banner shows when rejected
- [ ] Resubmission counter increments
- [ ] Approved reports can be sent
- [ ] Form disabled when not editable

## References

- ProgressReportService: `/services/ProgressReportService.ts`
- SignaturePad: `/components/signature/SignaturePad.tsx`
- ApprovalStatusBadge: `/components/progress-report/ApprovalStatusBadge.tsx`
