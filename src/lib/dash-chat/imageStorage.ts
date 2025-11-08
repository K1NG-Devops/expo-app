/**
 * Dash Chat Image Storage
 * 
 * Handles uploading images to Supabase Storage instead of embedding base64 in messages
 * Provides deduplication by hash to save storage costs
 */

import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'dash-chat-images';
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB

export interface UploadedImage {
  url: string;
  hash: string;
  media_type: string;
  size: number;
}

/**
 * Calculate SHA-256 hash of image data for deduplication
 */
async function hashImage(base64Data: string): Promise<string> {
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert base64 to Blob for upload
 */
function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Check if image with hash already exists
 */
async function checkImageExists(hash: string): Promise<UploadedImage | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chat_images')
    .select('public_url, hash, size_bytes')
    .eq('hash', hash)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    url: data.public_url,
    hash: data.hash,
    media_type: 'image/jpeg',
    size: data.size_bytes || 0
  };
}

/**
 * Upload image to Supabase Storage
 * Returns URL for permanent storage, with deduplication
 */
export async function uploadChatImage(
  imageData: string,  // base64
  mediaType: string = 'image/jpeg'
): Promise<UploadedImage> {
  const supabase = createClient();
  
  // Get user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  try {
    // 1. Calculate hash for deduplication
    const hash = await hashImage(imageData);
    
    // 2. Check if already exists
    const existing = await checkImageExists(hash);
    if (existing) {
      console.log('[ImageStorage] Image already exists, reusing:', hash.substring(0, 8));
      return existing;
    }
    
    // 3. Convert to blob
    const blob = base64ToBlob(imageData, mediaType);
    
    // Check size
    if (blob.size > MAX_IMAGE_SIZE * 2) {
      console.warn('[ImageStorage] Image larger than recommended:', blob.size, 'bytes');
    }
    
    // 4. Upload to storage
    const fileName = `${hash}.jpg`;
    const filePath = `${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: mediaType,
        upsert: true,  // Allow overwrite if exists
      });
    
    if (uploadError) {
      console.error('[ImageStorage] Upload failed:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // 5. Get signed URL (valid for 1 year) instead of public URL for better security and persistence
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000); // 1 year expiration
    
    if (urlError || !urlData?.signedUrl) {
      console.error('[ImageStorage] Failed to create signed URL:', urlError);
      // Fallback to public URL
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      const fallbackUrl = publicData.publicUrl;
      
      // Save metadata with public URL
      try {
        await supabase.from('chat_images').insert({
          hash,
          storage_path: filePath,
          public_url: fallbackUrl,
          uploaded_by: user.id,
          size_bytes: blob.size,
        });
      } catch (error) {
        console.warn('[ImageStorage] Could not save metadata:', error);
      }
      
      return {
        url: fallbackUrl,
        hash,
        media_type: mediaType,
        size: blob.size
      };
    }
    
    const signedUrl = urlData.signedUrl;
    
    // 6. Save metadata to database for deduplication
    try {
      await supabase.from('chat_images').insert({
        hash,
        storage_path: filePath,
        public_url: signedUrl,
        uploaded_by: user.id,
        size_bytes: blob.size,
      });
    } catch (error) {
      // Non-fatal if table doesn't exist yet
      console.warn('[ImageStorage] Could not save metadata:', error);
    }
    
    console.log('[ImageStorage] Upload successful:', hash.substring(0, 8), blob.size, 'bytes');
    
    return {
      url: signedUrl,
      hash,
      media_type: mediaType,
      size: blob.size
    };
    
  } catch (error) {
    console.error('[ImageStorage] Error:', error);
    throw error;
  }
}

/**
 * Upload multiple images in parallel
 */
export async function uploadChatImages(
  images: Array<{ data: string; media_type: string }>
): Promise<UploadedImage[]> {
  console.log('[ImageStorage] Uploading', images.length, 'images');
  
  const uploads = images.map(img => 
    uploadChatImage(img.data, img.media_type)
  );
  
  const results = await Promise.all(uploads);
  
  console.log('[ImageStorage] All uploads complete');
  return results;
}

/**
 * Delete image from storage (admin only)
 */
export async function deleteChatImage(hash: string): Promise<boolean> {
  const supabase = createClient();
  
  try {
    // Get image metadata
    const { data: image } = await supabase
      .from('chat_images')
      .select('storage_path')
      .eq('hash', hash)
      .single();
    
    if (!image) return false;
    
    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.storage_path]);
    
    if (deleteError) throw deleteError;
    
    // Delete metadata
    await supabase
      .from('chat_images')
      .delete()
      .eq('hash', hash);
    
    return true;
  } catch (error) {
    console.error('[ImageStorage] Delete failed:', error);
    return false;
  }
}

/**
 * Get storage usage stats for user
 */
export async function getStorageStats(userId: string): Promise<{
  imageCount: number;
  totalSize: number;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chat_images')
    .select('size_bytes')
    .eq('uploaded_by', userId);
  
  if (error || !data) {
    return { imageCount: 0, totalSize: 0 };
  }
  
  return {
    imageCount: data.length,
    totalSize: data.reduce((sum, img) => sum + (img.size_bytes || 0), 0)
  };
}

/**
 * Initialize storage bucket (run once on setup)
 */
export async function initializeImageStorage(): Promise<boolean> {
  const supabase = createClient();
  
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (exists) {
      console.log('[ImageStorage] Bucket already exists');
      return true;
    }
    
    // Create bucket
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 1024 * 1024, // 1MB max per file
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (error) throw error;
    
    console.log('[ImageStorage] Bucket created successfully');
    return true;
    
  } catch (error) {
    console.error('[ImageStorage] Initialization failed:', error);
    return false;
  }
}
