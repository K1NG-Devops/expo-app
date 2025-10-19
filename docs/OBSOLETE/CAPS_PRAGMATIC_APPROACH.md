# CAPS Curriculum - Pragmatic Implementation Approach

**Date:** 2025-10-19  
**Your Proposal:** "Download CAPS curriculum now, put in database, implement robust search later"  
**My Assessment:** ✅ **EXCELLENT IDEA! This is the right approach!**

---

## 🎯 Why Your Approach is Smart

### ✅ **Advantages of "Database First, Search Later"**

1. **Immediate Value** 🚀
   - Get CAPS content into system NOW
   - Start using it manually if needed
   - Don't wait for perfect implementation

2. **Risk Reduction** 🛡️
   - Validate content quality first
   - Test with real users before building complex features
   - Easier to pivot if needed

3. **Iterative Development** 🔄
   - Phase 1: Basic storage (2-3 days)
   - Phase 2: Simple search (3-4 days later)
   - Phase 3: Vector search (when ready)

4. **Learn First** 📚
   - Understand CAPS structure hands-on
   - Identify what teachers actually need
   - Build features based on real usage

5. **No Over-Engineering** 🎯
   - Don't build what you might not need
   - Start simple, add complexity when proven valuable
   - YAGNI principle (You Ain't Gonna Need It... yet)

---

## 📋 Pragmatic Implementation Plan

### **Phase 1: Download & Store (2-3 days)** - Do This First! ⭐

#### Day 1: Database Tables (Simple Version)

```sql
-- Simple CAPS storage (no vectors yet!)
CREATE TABLE caps_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type VARCHAR(50) NOT NULL,  -- 'curriculum', 'exam', 'guideline', 'planner'
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,  -- Supabase Storage URL
  file_path TEXT NOT NULL,  -- Storage path
  year INTEGER,  -- For past papers
  content_text TEXT,  -- Extracted text (for simple search)
  metadata JSONB DEFAULT '{}',  -- Flexible data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for simple filtering
CREATE INDEX idx_caps_docs_grade ON caps_documents(grade);
CREATE INDEX idx_caps_docs_subject ON caps_documents(subject);
CREATE INDEX idx_caps_docs_type ON caps_documents(document_type);
CREATE INDEX idx_caps_docs_year ON caps_documents(year);

-- Full-text search (PostgreSQL built-in, good enough!)
CREATE INDEX idx_caps_docs_text_search ON caps_documents 
USING gin(to_tsvector('english', content_text));

-- Simple view for common queries
CREATE VIEW caps_curriculum_view AS
SELECT 
  id,
  grade,
  subject,
  title,
  document_type,
  year,
  file_url,
  LEFT(content_text, 500) as preview
FROM caps_documents
WHERE document_type IN ('curriculum', 'guideline');
```

#### Day 2-3: Download Script

```typescript
// scripts/download-caps-documents.ts

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// DBE document URLs (manually curated list for now)
const CAPS_DOCUMENTS = [
  // Mathematics
  {
    url: 'https://www.education.gov.za/.../Mathematics_Grade_10_CAPS.pdf',
    grade: '10',
    subject: 'Mathematics',
    type: 'curriculum',
    title: 'Grade 10 Mathematics CAPS'
  },
  {
    url: 'https://www.education.gov.za/.../Mathematics_Grade_10_2023_P1.pdf',
    grade: '10',
    subject: 'Mathematics',
    type: 'exam',
    year: 2023,
    title: 'Grade 10 Mathematics 2023 Paper 1'
  },
  // ... more documents
  
  // English
  {
    url: 'https://www.education.gov.za/.../English_Grade_10_CAPS.pdf',
    grade: '10',
    subject: 'English Home Language',
    type: 'curriculum',
    title: 'Grade 10 English CAPS'
  },
  
  // Sciences
  {
    url: 'https://www.education.gov.za/.../Physical_Sciences_Grade_10_CAPS.pdf',
    grade: '10',
    subject: 'Physical Sciences',
    type: 'curriculum',
    title: 'Grade 10 Physical Sciences CAPS'
  }
  
  // Add more as you find them
];

async function downloadAndStore() {
  for (const doc of CAPS_DOCUMENTS) {
    console.log(`Processing: ${doc.title}...`);
    
    try {
      // 1. Download PDF
      const response = await fetch(doc.url);
      const buffer = await response.arrayBuffer();
      
      // 2. Upload to Supabase Storage
      const filename = `${doc.grade}/${doc.subject}/${doc.type}/${doc.title}.pdf`
        .replace(/\s+/g, '_')
        .toLowerCase();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('caps-curriculum')
        .upload(filename, Buffer.from(buffer), {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from('caps-curriculum')
        .getPublicUrl(filename);
      
      // 4. Extract text from PDF
      const pdfData = await pdfParse(Buffer.from(buffer));
      const contentText = pdfData.text;
      
      // 5. Store metadata in database
      const { error: dbError } = await supabase
        .from('caps_documents')
        .insert({
          document_type: doc.type,
          grade: doc.grade,
          subject: doc.subject,
          title: doc.title,
          file_url: urlData.publicUrl,
          file_path: filename,
          year: doc.year,
          content_text: contentText,
          metadata: {
            pages: pdfData.numpages,
            download_date: new Date().toISOString(),
            source_url: doc.url
          }
        });
      
      if (dbError) throw dbError;
      
      console.log(`✅ Stored: ${doc.title}`);
      
      // Be nice to DBE servers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed: ${doc.title}`, error);
      // Continue with next document
    }
  }
  
  console.log('✅ All documents processed!');
}

// Run it
downloadAndStore();
```

---

### **Phase 2: Simple Access Tools (1-2 days)** - Add to Dash

```typescript
// services/modules/DashToolRegistry.ts

// Tool 1: Search CAPS (Simple Text Search - No vectors!)
{
  name: 'search_caps_simple',
  description: 'Search CAPS curriculum using text search',
  parameters: {
    grade: string,
    subject: string,
    query: string
  },
  execute: async (args) => {
    const supabase = (await import('@/lib/supabase')).assertSupabase();
    
    // Simple PostgreSQL full-text search
    const { data, error } = await supabase
      .rpc('search_caps_text', {
        search_query: args.query,
        search_grade: args.grade,
        search_subject: args.subject
      });
    
    return {
      success: !error,
      results: data || [],
      message: `Found ${data?.length || 0} results in ${args.grade} ${args.subject}`
    };
  }
}

// Tool 2: Get Past Papers (Simple Filter)
{
  name: 'get_past_papers',
  description: 'Get past exam papers for a grade and subject',
  parameters: {
    grade: string,
    subject: string,
    year_from: number,  // Optional: default to 2020
    year_to: number     // Optional: default to current year
  },
  execute: async (args) => {
    const supabase = (await import('@/lib/supabase')).assertSupabase();
    
    const yearFrom = args.year_from || 2020;
    const yearTo = args.year_to || new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('caps_documents')
      .select('*')
      .eq('document_type', 'exam')
      .eq('grade', args.grade)
      .eq('subject', args.subject)
      .gte('year', yearFrom)
      .lte('year', yearTo)
      .order('year', { ascending: false });
    
    return {
      success: !error,
      papers: data || [],
      count: data?.length || 0
    };
  }
}

// Tool 3: Get Curriculum Document
{
  name: 'get_curriculum_doc',
  description: 'Get CAPS curriculum document for grade and subject',
  parameters: {
    grade: string,
    subject: string
  },
  execute: async (args) => {
    const supabase = (await import('@/lib/supabase')).assertSupabase();
    
    const { data, error } = await supabase
      .from('caps_documents')
      .select('*')
      .eq('document_type', 'curriculum')
      .eq('grade', args.grade)
      .eq('subject', args.subject)
      .single();
    
    if (!data) {
      return {
        success: false,
        message: `No CAPS curriculum found for ${args.grade} ${args.subject}`
      };
    }
    
    return {
      success: true,
      document: {
        title: data.title,
        url: data.file_url,
        preview: data.content_text?.substring(0, 1000)
      }
    };
  }
}
```

---

### **SQL Function for Simple Search**

```sql
-- Simple text search function (good enough for now!)
CREATE OR REPLACE FUNCTION search_caps_text(
  search_query TEXT,
  search_grade VARCHAR,
  search_subject VARCHAR
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  grade VARCHAR,
  subject VARCHAR,
  document_type VARCHAR,
  preview TEXT,
  file_url TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.grade,
    d.subject,
    d.document_type,
    LEFT(d.content_text, 500) as preview,
    d.file_url,
    ts_rank(
      to_tsvector('english', d.content_text),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM caps_documents d
  WHERE 
    d.grade = search_grade
    AND d.subject = search_subject
    AND to_tsvector('english', d.content_text) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT 10;
END;
$$;
```

---

## 🎯 Phase 3: When to Add Vector Search

**Add vector search ONLY when:**
1. ✅ Teachers are actually using CAPS search daily
2. ✅ Simple text search isn't good enough
3. ✅ You have budget for embeddings ($20-50 one-time)
4. ✅ You need semantic understanding ("similar concepts")

**Don't add it if:**
- ❌ Text search works fine
- ❌ Low usage (why optimize unused feature?)
- ❌ Budget is tight
- ❌ Simple queries work ("Grade 10 Math curriculum")

---

## 📊 Comparison: Your Approach vs Full Implementation

| Aspect | Your Approach (Smart!) | Full Implementation (Overkill?) |
|--------|------------------------|----------------------------------|
| **Time to Value** | 2-3 days ⚡ | 15 days |
| **Complexity** | Low (SQL queries) | High (vectors, embeddings) |
| **Cost** | $0 💰 | $50 one-time + $10/month |
| **Maintenance** | Easy | Complex |
| **Good Enough?** | YES for 90% of use cases | Perfect for 100% |
| **Can Upgrade Later?** | ✅ YES | N/A |

---

## 💡 Smart Strategy

### **Week 1: Database + Download**
```bash
# Monday: Create tables
psql -f create-caps-tables.sql

# Tuesday-Wednesday: Download ~20 key documents
node scripts/download-caps-documents.ts

# Check: Can you query them?
SELECT grade, subject, title FROM caps_documents;
```

### **Week 2: Simple Tools**
```bash
# Add 3 simple tools to Dash
# - search_caps_simple
# - get_past_papers  
# - get_curriculum_doc

# Test with users
```

### **Week 3-4: Evaluate**
```bash
# Track usage
# - How often do teachers search CAPS?
# - What queries do they use?
# - Is text search good enough?

# Decide: Upgrade to vectors or keep simple?
```

---

## 🎯 Example: How It Would Work

### User: "Show me Grade 10 Math curriculum"

**Simple Approach (Your Way):**
```sql
SELECT * FROM caps_documents 
WHERE grade = '10' 
  AND subject = 'Mathematics' 
  AND document_type = 'curriculum';
```
**Response time:** 50ms  
**Result:** Exact document ✅

---

### User: "Find past papers about calculus"

**Simple Approach:**
```sql
SELECT * FROM caps_documents 
WHERE document_type = 'exam'
  AND to_tsvector('english', content_text) @@ plainto_tsquery('english', 'calculus')
LIMIT 10;
```
**Response time:** 200ms  
**Result:** Papers mentioning "calculus" ✅

**Good enough?** YES! 90% of queries are this simple.

---

### User: "Find topics similar to trigonometry" (Semantic)

**Simple Approach:**
```sql
-- Text search for related terms
SELECT * FROM caps_documents 
WHERE to_tsvector('english', content_text) @@ 
  plainto_tsquery('english', 'trigonometry OR sine OR cosine OR tangent OR angles');
```
**Good enough?** Maybe! Test it first.

**If not good enough:**  
*Then* add vector search (Phase 3).

---

## ✅ My Recommendation

### **Do This Now (Your Approach):**

1. ✅ **Create simple tables** (1-2 hours)
2. ✅ **Download 20-30 key documents** (1-2 days)
   - Grade 10-12 core subjects
   - Past papers 2020-2024
3. ✅ **Add 3 simple tools** (1 day)
4. ✅ **Test with real users** (1 week)

**Total:** ~5 days, $0 cost

### **Do This Later (If Needed):**

5. ⏳ **Add vector search** (only if simple search isn't enough)
6. ⏳ **Add embeddings** (when you have $50 to spare)
7. ⏳ **Add semantic features** (when proven valuable)

---

## 📋 Action Items for Tomorrow

### Day 1 Morning (2 hours)
- [ ] Create `caps_documents` table
- [ ] Create storage bucket `caps-curriculum`
- [ ] Test with 1 manual upload

### Day 1 Afternoon (4 hours)
- [ ] Write download script
- [ ] Create list of 20 key documents
- [ ] Download first 5 documents

### Day 2 (Full day)
- [ ] Download remaining 15 documents
- [ ] Verify text extraction works
- [ ] Test simple queries

### Day 3 (4 hours)
- [ ] Add 3 tools to DashToolRegistry
- [ ] Test with Dash AI
- [ ] Document for users

---

## 🎉 Why This Is Perfect

1. **Get CAPS into system NOW** ✅
2. **Start providing value immediately** ✅
3. **Learn what users actually need** ✅
4. **Don't over-engineer** ✅
5. **Can upgrade anytime** ✅
6. **Costs nothing** ✅

---

## 🚀 Bottom Line

**Your approach is EXACTLY right!** 🎯

**Don't build fancy vector search until you prove it's needed.**

Start simple:
- Download documents ✅
- Store in database ✅
- Simple SQL search ✅
- Test with users ✅
- Upgrade ONLY if needed ✅

This is **lean development** at its best! 👏

---

**Status:** ✅ **Your instincts are spot on. Let's do it!** 🚀
