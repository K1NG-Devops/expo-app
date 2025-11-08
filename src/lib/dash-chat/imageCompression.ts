/**
 * Enhanced Image Compression for Dash Chat
 * 
 * Provides better compression with quality preservation
 * Targets 500KB per image with smart algorithms
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export interface CompressedImage {
  dataUrl: string;
  sizeKB: number;
  width: number;
  height: number;
  quality: number;
}

/**
 * Calculate size of base64 string in bytes
 */
function getBase64Size(base64: string): number {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Math.floor((base64Data.length * 3) / 4);
}

/**
 * Load image from File or Blob
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;
  
  // Scale down if needed
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;
    
    if (width > height) {
      width = Math.min(width, maxWidth);
      height = Math.round(width / aspectRatio);
    } else {
      height = Math.min(height, maxHeight);
      width = Math.round(height * aspectRatio);
    }
  }
  
  return { width, height };
}

/**
 * Compress image with progressive quality reduction
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    targetSizeKB = 500,
    quality: initialQuality = 0.85,
    format = 'jpeg'
  } = options;
  
  console.log('[ImageCompression] Starting compression:', {
    originalSize: Math.round(file.size / 1024) + 'KB',
    targetSize: targetSizeKB + 'KB'
  });
  
  // Load image
  const img = await loadImage(file);
  
  // Calculate optimal dimensions
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    maxWidth,
    maxHeight
  );
  
  console.log('[ImageCompression] Dimensions:', {
    original: `${img.width}x${img.height}`,
    scaled: `${width}x${height}`
  });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d', {
    alpha: false,  // No transparency for JPEG
    desynchronized: true,  // Performance hint
  });
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Progressive compression
  let quality = initialQuality;
  let output = canvas.toDataURL(`image/${format}`, quality);
  let sizeKB = getBase64Size(output) / 1024;
  
  console.log('[ImageCompression] Initial:', { quality, sizeKB: Math.round(sizeKB) + 'KB' });
  
  // Reduce quality until target size reached
  let attempts = 0;
  const maxAttempts = 10;
  
  while (sizeKB > targetSizeKB && quality > 0.5 && attempts < maxAttempts) {
    quality -= 0.05;
    output = canvas.toDataURL(`image/${format}`, quality);
    sizeKB = getBase64Size(output) / 1024;
    attempts++;
  }
  
  // If still too large, scale down further
  if (sizeKB > targetSizeKB && width > 800) {
    console.log('[ImageCompression] Still too large, scaling down further');
    
    const scaleFactor = Math.sqrt(targetSizeKB / sizeKB);
    const newWidth = Math.floor(width * scaleFactor * 0.9); // 10% buffer
    const newHeight = Math.floor(height * scaleFactor * 0.9);
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    output = canvas.toDataURL(`image/${format}`, 0.8);
    sizeKB = getBase64Size(output) / 1024;
  }
  
  console.log('[ImageCompression] Final:', {
    quality: Math.round(quality * 100) + '%',
    sizeKB: Math.round(sizeKB) + 'KB',
    reduction: Math.round((1 - (sizeKB * 1024) / file.size) * 100) + '%'
  });
  
  return {
    dataUrl: output,
    sizeKB,
    width: canvas.width,
    height: canvas.height,
    quality
  };
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressedImage[]> {
  console.log('[ImageCompression] Compressing', files.length, 'images');
  
  const compressed = await Promise.all(
    files.map(file => compressImage(file, options))
  );
  
  const totalOriginal = files.reduce((sum, f) => sum + f.size, 0);
  const totalCompressed = compressed.reduce((sum, c) => sum + c.sizeKB * 1024, 0);
  const reduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  
  console.log('[ImageCompression] Complete:', {
    count: files.length,
    originalTotal: Math.round(totalOriginal / 1024) + 'KB',
    compressedTotal: Math.round(totalCompressed / 1024) + 'KB',
    reduction: reduction + '%'
  });
  
  return compressed;
}

/**
 * Validate image before compression
 */
export function validateImage(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image too large (max 10MB)' };
  }
  
  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedFormats.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format' };
  }
  
  return { valid: true };
}

/**
 * Get image metadata without loading full image
 */
export async function getImageMetadata(file: File): Promise<{
  width: number;
  height: number;
  sizeKB: number;
  type: string;
}> {
  const img = await loadImage(file);
  
  return {
    width: img.width,
    height: img.height,
    sizeKB: Math.round(file.size / 1024),
    type: file.type
  };
}
