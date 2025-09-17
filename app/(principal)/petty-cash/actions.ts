// NOTE: Server-only Next.js actions are not supported in Expo Router app. Placeholder removed to avoid EAS Update export errors.

// Removed server-only Next imports to keep Expo bundler happy
import { z } from 'zod';

import * as pettyCashDb from '../../../lib/db/pettyCash';
import { getActiveSchoolIdServer } from '../../../lib/tenant/server';

// Result type for consistent error handling
type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

// Input schemas
const CreateTransactionSchema = z.object({
  amount: z.number().positive().max(999999.99),
  type: z.enum(['expense', 'replenishment', 'adjustment']),
  category: z.string().optional(),
  description: z.string().optional(),
  occurred_at: z.string().datetime().optional(),
});

const ApprovalSchema = z.object({
  transactionId: z.string().uuid(),
  reason: z.string().optional(),
});

const ReceiptUploadSchema = z.object({
  transactionId: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|jpg|png|webp|gif)$/i),
  sizeBytes: z.number().positive().max(10 * 1024 * 1024), // 10MB limit
});

const AttachReceiptSchema = z.object({
  transactionId: z.string().uuid(),
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string(),
  sizeBytes: z.number().positive(),
});

/**
 * Helper to create a standardized server action client
 */
function createSupabaseClient() {
  // For Expo app, use client-side supabase directly where needed
  // Kept for type compatibility; not used in OTA build path
  return null as any;
}

/**
 * Helper to get school context and validate access
 */
async function validateSchoolAccess() {
  try {
    const schoolId = await getActiveSchoolIdServer();
    if (!schoolId) {
      throw new Error('No active school found');
    }
    
    const supabase = createSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    
    return { schoolId, userId: user.id, supabase };
  } catch (error) {
    console.error('School access validation failed:', error);
    return null;
  }
}

/**
 * Helper to revalidate petty cash related cache tags
 */
function revalidatePettyCash(_schoolId: string) {
  // No-op in Expo OTA environment
}

/**
 * Create a new petty cash transaction
 */
export async function createPettyCashTransaction(
  formData: FormData
): Promise<ActionResult<{ transactionId: string }>> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId, userId } = context;
  
  try {
    // Parse and validate input
    const rawData = {
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as string,
      category: formData.get('category') as string || undefined,
      description: formData.get('description') as string || undefined,
      occurred_at: formData.get('occurred_at') as string || undefined,
    };
    
    const validated = CreateTransactionSchema.parse(rawData);
    
    // Create transaction
    const result = await pettyCashDb.createTransaction(schoolId, {
      ...validated,
      created_by: userId,
      occurred_at: validated.occurred_at ? new Date(validated.occurred_at) : new Date(),
    });
    
    // Revalidate cache
    revalidatePettyCash(schoolId);
    
    return {
      success: true,
      data: { transactionId: result.id },
    };
  } catch (error) {
    console.error('Create transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
      code: 'CREATE_FAILED',
    };
  }
}

/**
 * Approve a pending transaction
 */
export async function approvePettyCashTransaction(
  formData: FormData
): Promise<ActionResult> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId, userId } = context;
  
  try {
    const validated = ApprovalSchema.parse({
      transactionId: formData.get('transactionId') as string,
      reason: formData.get('reason') as string || undefined,
    });
    
    await pettyCashDb.approveTransaction(schoolId, validated.transactionId, userId);
    
    revalidatePettyCash(schoolId);
    
    return { success: true };
  } catch (error) {
    console.error('Approve transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve transaction',
      code: 'APPROVAL_FAILED',
    };
  }
}

/**
 * Reject a pending transaction
 */
export async function rejectPettyCashTransaction(
  formData: FormData
): Promise<ActionResult> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId, userId } = context;
  
  try {
    const validated = ApprovalSchema.parse({
      transactionId: formData.get('transactionId') as string,
      reason: formData.get('reason') as string || undefined,
    });
    
    await pettyCashDb.rejectTransaction(
      schoolId,
      validated.transactionId,
      userId,
      validated.reason
    );
    
    revalidatePettyCash(schoolId);
    
    return { success: true };
  } catch (error) {
    console.error('Reject transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject transaction',
      code: 'REJECTION_FAILED',
    };
  }
}

/**
 * Get current petty cash balance for the school
 */
export async function getPettyCashBalance(): Promise<ActionResult<number>> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId } = context;
  
  try {
    const balance = await pettyCashDb.getBalance(schoolId);
    return { success: true, data: balance };
  } catch (error) {
    console.error('Get balance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance',
      code: 'FETCH_FAILED',
    };
  }
}

/**
 * Get petty cash summary with date range and grouping
 */
export async function getPettyCashSummary(
  startDate?: string,
  endDate?: string,
  groupBy?: 'day' | 'week' | 'month'
): Promise<ActionResult<any>> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId } = context;
  
  try {
    const filters: any = {};
    
    if (startDate) {
      filters.from = new Date(startDate);
    }
    if (endDate) {
      filters.to = new Date(endDate);
    }
    if (groupBy) {
      filters.groupBy = groupBy;
    }
    
    const summary = await pettyCashDb.getSummary(schoolId, filters);
    return { success: true, data: summary };
  } catch (error) {
    console.error('Get summary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
      code: 'FETCH_FAILED',
    };
  }
}

/**
 * Create signed URL for receipt upload
 */
export async function createPettyCashReceiptUpload(
  formData: FormData
): Promise<ActionResult<{ uploadUrl: string; storagePath: string }>> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId } = context;
  
  try {
    const validated = ReceiptUploadSchema.parse({
      transactionId: formData.get('transactionId') as string,
      fileName: formData.get('fileName') as string,
      contentType: formData.get('contentType') as string,
      sizeBytes: parseInt(formData.get('sizeBytes') as string),
    });
    
    const result = await pettyCashDb.createReceiptUpload(schoolId, validated.transactionId, {
      fileName: validated.fileName,
      contentType: validated.contentType,
      sizeBytes: validated.sizeBytes,
    });
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Create receipt upload error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid upload parameters',
        code: 'VALIDATION_ERROR',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create upload URL',
      code: 'UPLOAD_FAILED',
    };
  }
}

/**
 * Attach receipt record after successful upload
 */
export async function attachPettyCashReceipt(
  formData: FormData
): Promise<ActionResult<{ receiptId: string }>> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId, userId } = context;
  
  try {
    const validated = AttachReceiptSchema.parse({
      transactionId: formData.get('transactionId') as string,
      storagePath: formData.get('storagePath') as string,
      fileName: formData.get('fileName') as string,
      contentType: formData.get('contentType') as string,
      sizeBytes: parseInt(formData.get('sizeBytes') as string),
    });
    
    const result = await pettyCashDb.attachReceiptRecord(
      schoolId,
      validated.transactionId,
      validated.storagePath,
      {
        fileName: validated.fileName,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        created_by: userId,
      }
    );
    
    revalidatePettyCash(schoolId);
    
    return {
      success: true,
      data: { receiptId: result.id },
    };
  } catch (error) {
    console.error('Attach receipt error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid receipt data',
        code: 'VALIDATION_ERROR',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to attach receipt',
      code: 'ATTACH_FAILED',
    };
  }
}

/**
 * Delete a receipt (removes both DB record and storage file)
 */
export async function deletePettyCashReceipt(
  receiptId: string
): Promise<ActionResult> {
  const context = await validateSchoolAccess();
  if (!context) {
    return { success: false, error: 'Access denied', code: 'UNAUTHORIZED' };
  }
  
  const { schoolId } = context;
  
  try {
    if (!receiptId || typeof receiptId !== 'string') {
      return {
        success: false,
        error: 'Invalid receipt ID',
        code: 'VALIDATION_ERROR',
      };
    }
    
    await pettyCashDb.deleteReceipt(schoolId, receiptId);
    
    revalidatePettyCash(schoolId);
    
    return { success: true };
  } catch (error) {
    console.error('Delete receipt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete receipt',
      code: 'DELETE_FAILED',
    };
  }
}

/**
 * Handle form submission errors and redirect appropriately
 */
export async function handleActionError(error: ActionResult) {
  if (error.code === 'UNAUTHORIZED') {
    redirect('/auth/sign-in');
  }
  
  // For other errors, let the component handle them
  return error;
}