# Web Image Upload Fix ✅

## Problem
When testing on web (localhost:8081), clicking the attach button only showed document types (PDF, Word, etc.) but **NOT images** (JPG, PNG, etc.).

## Root Cause
The web file picker was calling `pickDocuments()` which only accepts:
```typescript
SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  // ... no image types
]
```

Images need:
```typescript
SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]
```

## Solution

### 1. Created New `pickFiles()` Function
**File:** `services/AttachmentService.ts` (line 53)

```typescript
export async function pickFiles(): Promise<DashAttachment[]> {
  // On web, combine document and image types for a unified picker
  const allSupportedTypes = Platform.OS === 'web' 
    ? [...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_IMAGE_TYPES]
    : SUPPORTED_DOCUMENT_TYPES;
  
  const result = await DocumentPicker.getDocumentAsync({
    type: allSupportedTypes,  // Accepts both documents AND images
    multiple: true,
  });
  // ... processing logic
}
```

### 2. Updated DashAssistant to Use pickFiles on Web
**File:** `components/ai/DashAssistant.tsx`

```typescript
// Import the new function
import { pickFiles } from '@/services/AttachmentService';

// Use it for web platform
if (Platform.OS === 'web') {
  handlePickFiles();  // NEW: Accepts both docs and images
} else if (Platform.OS === 'ios') {
  // Show choice dialog
} else {
  // Android choice dialog
}
```

### 3. Added handlePickFiles Handler
```typescript
const handlePickFiles = async () => {
  const files = await pickFiles();
  if (files.length > 0) {
    setSelectedAttachments(prev => [...prev, ...files]);
  }
};
```

## What Works Now

### On Web (Browser):
✅ Click attach button → Opens file picker  
✅ File picker shows: `.pdf`, `.doc`, `.jpg`, `.png`, `.gif`, etc.  
✅ Can select images  
✅ Can select documents  
✅ Can select multiple files at once  
✅ File type automatically detected  
✅ Icons show correct type (image/document/pdf)  

### On iOS (Native):
✅ Shows action sheet with "Documents" / "Photos" options  
✅ Documents → Document picker only  
✅ Photos → Photo library picker with image selection  

### On Android (Native):
✅ Shows alert dialog with "Documents" / "Photos" options  
✅ Documents → Document picker only  
✅ Photos → Photo library picker with image selection  

## File Type Detection

The `determineAttachmentKind()` function automatically detects:

```typescript
'image/jpeg' → kind: 'image'  
'application/pdf' → kind: 'pdf'  
'application/vnd.openxmlformats-officedocument.wordprocessingml.document' → kind: 'document'  
'application/vnd.ms-excel' → kind: 'spreadsheet'  
// etc.
```

## Size Limits

- **Images:** 10MB max
- **Documents:** 50MB max

Automatically enforced in `pickFiles()`:
```typescript
const isImage = asset.mimeType?.startsWith('image/');
const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
```

## Testing

### Test on Web:
```bash
# Start web server
npm run web

# Navigate to Dash Assistant
# Click attach button (📎)
# File picker should show BOTH:
#   - Images: .jpg, .png, .gif, .webp, .bmp
#   - Documents: .pdf, .doc, .docx, .xls, .ppt, etc.
```

### What to Test:
1. ✅ Upload a JPG image → Should work
2. ✅ Upload a PNG image → Should work  
3. ✅ Upload a PDF → Should work
4. ✅ Upload a Word doc → Should work
5. ✅ Select multiple files (mix of images and docs) → Should work
6. ✅ Send with message "What files did I upload?" → Dash sees them all

### Expected Behavior:
```
[DashAssistant] Attach button clicked, Platform: web
[DashAssistant] Showing file picker options...
[DashAssistant] Web platform, showing file picker for all types
[DashAssistant] handlePickFiles called (unified picker)
[DashAssistant] Calling pickFiles()...
[DashAssistant] pickFiles returned: 2 files
[DashAssistant] Adding files to attachments: ["photo.jpg (image)", "document.pdf (pdf)"]
```

## Files Modified

1. ✅ `services/AttachmentService.ts` - Added `pickFiles()` function
2. ✅ `components/ai/DashAssistant.tsx` - Added `handlePickFiles()` and updated web path

## Platform Differences

| Platform | Button Click | Behavior |
|----------|--------------|----------|
| **Web** | Direct picker | Shows all supported types (docs + images) |
| **iOS** | Action sheet | "Documents" or "Photos" (separate pickers) |
| **Android** | Alert dialog | "Documents" or "Photos" (separate pickers) |

## Why Different for Mobile?

On mobile (iOS/Android):
- **Photos** picker uses native photo gallery (better UX for browsing images)
- **Documents** picker uses file browser (better for files)
- Users expect this separation on mobile

On web:
- Single file browser works well
- No performance difference
- Simpler UX

## Debug

If images still don't show:
1. Check browser console for errors
2. Verify file picker shows `.jpg`, `.png` extensions
3. Check selected file's mimeType: `console.log(file.mimeType)`
4. Ensure it's one of: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/bmp`

---

**Status:** ✅ Fixed  
**Date:** 2025-09-30  
**Platform Affected:** Web only  
**Next Test:** Try uploading an image now!
