/**
 * CAPS Curriculum Downloader
 * 
 * Downloads CAPS curriculum documents from DBE website and stores in database
 * Extracts text and creates searchable knowledge base for Dash AI
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
// @ts-ignore - pdf-parse types
import pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';

// Supabase client with service role (admin access)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// =====================================================
// CAPS Document URLs (Curated List)
// =====================================================

interface CAPSDocument {
  url: string;
  grade: string;
  subject: string;
  type: 'curriculum' | 'exam' | 'exemplar' | 'guideline' | 'teaching_plan';
  title: string;
  year?: number;
  term?: number;
}

const CAPS_DOCUMENTS: CAPSDocument[] = [
  // ===== MATHEMATICS =====
  
  // Curriculum Documents
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20MATHEMATICS%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'Mathematics',
    type: 'curriculum',
    title: 'Mathematics CAPS Grades 10-12'
  },
  
  // Past Papers - Grade 10
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/Grade10_Nov2023/Mathematics_P1_Grade10_Nov2023_Eng.pdf',
    grade: '10',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 10 Mathematics November 2023 Paper 1'
  },
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/Grade10_Nov2023/Mathematics_P2_Grade10_Nov2023_Eng.pdf',
    grade: '10',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 10 Mathematics November 2023 Paper 2'
  },
  
  // Past Papers - Grade 11
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/Grade11_Nov2023/Mathematics_P1_Grade11_Nov2023_Eng.pdf',
    grade: '11',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 11 Mathematics November 2023 Paper 1'
  },
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/Grade11_Nov2023/Mathematics_P2_Grade11_Nov2023_Eng.pdf',
    grade: '11',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 11 Mathematics November 2023 Paper 2'
  },
  
  // Past Papers - Grade 12 (NSC)
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/NSC/Mathematics_P1_Nov2023_Eng.pdf',
    grade: '12',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 12 Mathematics November 2023 Paper 1'
  },
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/NSC/Mathematics_P2_Nov2023_Eng.pdf',
    grade: '12',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 12 Mathematics November 2023 Paper 2'
  },
  
  // ===== ENGLISH HOME LANGUAGE =====
  
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20ENGLISH%20HOME%20LANGUAGE%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'English Home Language',
    type: 'curriculum',
    title: 'English Home Language CAPS Grades 10-12'
  },
  
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/NSC/English_HL_P1_Nov2023_Eng.pdf',
    grade: '12',
    subject: 'English Home Language',
    type: 'exam',
    year: 2023,
    title: 'Grade 12 English HL November 2023 Paper 1'
  },
  
  // ===== PHYSICAL SCIENCES =====
  
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20PHYSICAL%20SCIENCES%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'Physical Sciences',
    type: 'curriculum',
    title: 'Physical Sciences CAPS Grades 10-12'
  },
  
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/NSC/Physical_Sciences_P1_Nov2023_Eng.pdf',
    grade: '12',
    subject: 'Physical Sciences',
    type: 'exam',
    year: 2023,
    title: 'Grade 12 Physical Sciences November 2023 Paper 1'
  },
  
  // ===== LIFE SCIENCES =====
  
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20LIFE%20SCIENCES%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'Life Sciences',
    type: 'curriculum',
    title: 'Life Sciences CAPS Grades 10-12'
  },
  
  {
    url: 'https://www.education.gov.za/Portals/0/Documents/Exams/2023/NSC/Life_Sciences_P1_Nov2023_Eng.pdf',
    grade: '12',
    subject: 'Life Sciences',
    type: 'exam',
    year: 2023,
    title: 'Grade 12 Life Sciences November 2023 Paper 1'
  },
  
  // ===== ACCOUNTING =====
  
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20ACCOUNTING%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'Accounting',
    type: 'curriculum',
    title: 'Accounting CAPS Grades 10-12'
  },
  
  // ===== AFRIKAANS =====
  
  {
    url: 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20AFRIKAANS%20HUISTAAL%20_%20GR%2010-12%20_%20Web.pdf',
    grade: '10-12',
    subject: 'Afrikaans Huistaal',
    type: 'curriculum',
    title: 'Afrikaans Huistaal CAPS Grades 10-12'
  },
  
  // Add more documents as URLs are discovered
];

// =====================================================
// Download and Process Functions
// =====================================================

async function downloadPDF(url: string): Promise<Buffer> {
  console.log(`  📥 Downloading from: ${url.substring(0, 80)}...`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
  console.log(`  📄 Extracting text from PDF...`);
  
  const data = await pdfParse(buffer);
  
  return {
    text: data.text,
    pages: data.numpages
  };
}

async function uploadToStorage(
  buffer: Buffer,
  doc: CAPSDocument
): Promise<{ url: string; path: string }> {
  // Generate storage path
  const filename = `${doc.grade}/${doc.subject.replace(/\s+/g, '_')}/${doc.type}/${doc.title.replace(/\s+/g, '_')}.pdf`
    .toLowerCase();
  
  console.log(`  ☁️  Uploading to storage: ${filename}`);
  
  // Create bucket if it doesn't exist
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === 'caps-curriculum');
  
  if (!bucketExists) {
    console.log('  📦 Creating caps-curriculum bucket...');
    await supabase.storage.createBucket('caps-curriculum', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf']
    });
  }
  
  // Upload file
  const { data, error } = await supabase.storage
    .from('caps-curriculum')
    .upload(filename, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('caps-curriculum')
    .getPublicUrl(filename);
  
  return {
    url: urlData.publicUrl,
    path: filename
  };
}

async function storeInDatabase(
  doc: CAPSDocument,
  storage: { url: string; path: string },
  extracted: { text: string; pages: number }
): Promise<void> {
  console.log(`  💾 Storing in database...`);
  
  const { error } = await supabase
    .from('caps_documents')
    .insert({
      document_type: doc.type,
      grade: doc.grade,
      subject: doc.subject,
      title: doc.title,
      year: doc.year,
      term: doc.term,
      content_text: extracted.text,
      file_url: storage.url,
      file_path: storage.path,
      file_size_bytes: extracted.text.length,
      page_count: extracted.pages,
      source_url: doc.url,
      language: 'en',
      metadata: {
        downloaded_at: new Date().toISOString(),
        source: 'dbe_website',
        word_count: extracted.text.split(/\s+/).length
      }
    });
  
  if (error) throw error;
}

// =====================================================
// Main Download Process
// =====================================================

async function downloadAllDocuments() {
  console.log('🚀 CAPS Curriculum Download Started\n');
  console.log(`📚 Total documents to process: ${CAPS_DOCUMENTS.length}\n`);
  
  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ doc: string; error: string }> = [];
  
  for (let i = 0; i < CAPS_DOCUMENTS.length; i++) {
    const doc = CAPS_DOCUMENTS[i];
    
    console.log(`\n[${i + 1}/${CAPS_DOCUMENTS.length}] Processing: ${doc.title}`);
    console.log(`  📖 ${doc.grade} ${doc.subject} (${doc.type})`);
    
    try {
      // Step 1: Download PDF
      const buffer = await downloadPDF(doc.url);
      console.log(`  ✅ Downloaded (${(buffer.length / 1024).toFixed(1)} KB)`);
      
      // Step 2: Extract text
      const extracted = await extractTextFromPDF(buffer);
      console.log(`  ✅ Extracted ${extracted.pages} pages, ${extracted.text.split(/\s+/).length} words`);
      
      // Step 3: Upload to storage
      const storage = await uploadToStorage(buffer, doc);
      console.log(`  ✅ Uploaded to storage`);
      
      // Step 4: Store metadata in database
      await storeInDatabase(doc, storage, extracted);
      console.log(`  ✅ Stored in database`);
      
      successCount++;
      console.log(`  🎉 SUCCESS!`);
      
      // Be nice to DBE servers (rate limiting)
      if (i < CAPS_DOCUMENTS.length - 1) {
        console.log(`  ⏳ Waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      failureCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ FAILED: ${errorMsg}`);
      errors.push({ doc: doc.title, error: errorMsg });
      
      // Continue with next document
      continue;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📚 Total: ${CAPS_DOCUMENTS.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ doc, error }) => {
      console.log(`  - ${doc}: ${error}`);
    });
  }
  
  console.log('\n🎉 CAPS curriculum download complete!');
  console.log('💡 Dash can now access CAPS curriculum documents!');
}

// =====================================================
// Run
// =====================================================

if (require.main === module) {
  downloadAllDocuments()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { downloadAllDocuments, CAPS_DOCUMENTS };
