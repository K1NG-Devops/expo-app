# Dash AI - CAPS Curriculum Integration Plan

**Date:** 2025-10-19  
**Status:** 🎯 High Priority Implementation Plan

## 🎓 Overview

Transform Dash from a **generic AI assistant** to a **CAPS-aligned educational expert** that provides curriculum-specific, exam-focused, and grade-appropriate guidance.

---

## 🎯 Goals

1. **Curriculum Alignment:** All lessons/homework follow CAPS exactly
2. **Past Exam Access:** Fetch and analyze past papers for all grades
3. **Exam Prediction:** Predict likely exam questions based on patterns
4. **Real Resources:** Use actual DBE materials, not generic content
5. **Preparation Tools:** Help students prepare with real exam patterns

---

## 📚 CAPS Resources Available

### Department of Basic Education (DBE) Resources

#### 1. **Official CAPS Documents**
- **URL:** https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx
- **Content:** Full curriculum per grade and subject
- **Format:** PDF documents
- **Grades:** R-12

#### 2. **Past Examination Papers**
- **URL:** https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx
- **Content:** Grade 10-12 past papers (all subjects)
- **Format:** PDF
- **Years:** 2014-2024 available

#### 3. **Exemplar Papers**
- **Content:** Sample papers with marking guidelines
- **Format:** PDF
- **Purpose:** Show expected format and standards

#### 4. **Assessment Guidelines**
- **Content:** Formal assessment requirements
- **Format:** PDF
- **Details:** Assessment types, weighting, requirements

#### 5. **Teaching Plans (CAPS Planners)**
- **Content:** Week-by-week teaching schedules
- **Format:** PDF/Excel
- **Alignment:** Links topics to assessment

---

## 🏗️ Technical Architecture

### Phase 1: CAPS Knowledge Base (RAG System)

```
┌─────────────────────────────────────┐
│   CAPS Document Repository          │
│   (Supabase Storage)                │
│                                     │
│   - Curriculum PDFs                 │
│   - Past Papers (2014-2024)        │
│   - Exemplar Papers                 │
│   - Assessment Guidelines           │
│   - Teaching Plans                  │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│   Document Processing Pipeline      │
│                                     │
│   1. PDF Text Extraction           │
│   2. Chunk into sections           │
│   3. Generate embeddings           │
│   4. Store in Vector DB            │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│   CAPS Vector Database              │
│   (Supabase pgvector)              │
│                                     │
│   Table: caps_curriculum_chunks     │
│   - id                              │
│   - grade                           │
│   - subject                         │
│   - topic                           │
│   - content                         │
│   - embedding (vector)              │
│   - source_document                 │
│   - page_number                     │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│   Dash AI with CAPS Context         │
│                                     │
│   User Query                        │
│     ↓                               │
│   Semantic Search (vector search)   │
│     ↓                               │
│   Top 5 relevant chunks             │
│     ↓                               │
│   AI + CAPS Context                 │
│     ↓                               │
│   Curriculum-aligned Response       │
└─────────────────────────────────────┘
```

---

## 🛠️ Implementation Plan

### **Step 1: Database Schema (1 day)**

```sql
-- CAPS curriculum knowledge base
CREATE TABLE caps_curriculum_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade VARCHAR(10) NOT NULL,  -- 'R', '1'-'12'
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  section VARCHAR(255),
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI ada-002 dimension
  source_document VARCHAR(255),
  page_number INTEGER,
  year INTEGER,  -- For past papers
  document_type VARCHAR(50),  -- 'curriculum', 'exam', 'exemplar', 'guideline'
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB  -- Additional context
);

-- Create vector similarity search index
CREATE INDEX ON caps_curriculum_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indexes for filtering
CREATE INDEX idx_caps_grade ON caps_curriculum_chunks(grade);
CREATE INDEX idx_caps_subject ON caps_curriculum_chunks(subject);
CREATE INDEX idx_caps_topic ON caps_curriculum_chunks(topic);
CREATE INDEX idx_caps_doc_type ON caps_curriculum_chunks(document_type);

-- Past exam questions table
CREATE TABLE caps_past_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  paper_number INTEGER,  -- 1, 2, etc.
  question_number VARCHAR(20),
  question_text TEXT NOT NULL,
  marks INTEGER,
  topic VARCHAR(255),
  difficulty VARCHAR(20),  -- 'easy', 'medium', 'hard'
  question_type VARCHAR(50),  -- 'multiple_choice', 'short_answer', 'essay', etc.
  embedding VECTOR(1536),
  marking_guideline TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exam pattern analysis
CREATE TABLE caps_exam_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  frequency_score FLOAT,  -- How often this topic appears
  difficulty_score FLOAT,
  mark_allocation_avg FLOAT,
  last_appeared_year INTEGER,
  years_analyzed INTEGER[],
  pattern_notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Step 2: Document Ingestion Pipeline (3-4 days)**

```typescript
// services/CAPSDocumentProcessor.ts

export class CAPSDocumentProcessor {
  
  /**
   * Download CAPS documents from DBE website
   */
  async downloadCAPSDocuments(): Promise<void> {
    const documents = [
      // Curriculum documents
      { url: 'https://...', type: 'curriculum', grade: '10', subject: 'Mathematics' },
      // Past papers
      { url: 'https://...', type: 'exam', grade: '12', subject: 'Mathematics', year: 2023 },
      // ... more documents
    ];
    
    for (const doc of documents) {
      await this.downloadAndStore(doc);
    }
  }
  
  /**
   * Extract text from CAPS PDFs
   */
  async extractTextFromPDF(pdfUrl: string): Promise<string> {
    // Use pdf-parse library
    const response = await fetch(pdfUrl);
    const buffer = await response.arrayBuffer();
    const data = await pdfParse(buffer);
    return data.text;
  }
  
  /**
   * Chunk text into meaningful sections
   */
  chunkText(text: string, metadata: any): Chunk[] {
    // Smart chunking:
    // - By section headings
    // - By topics
    // - Keep context together
    // - Max 500 words per chunk
    
    return chunks;
  }
  
  /**
   * Generate embeddings for chunks
   */
  async generateEmbeddings(chunks: Chunk[]): Promise<void> {
    const supabase = assertSupabase();
    
    for (const chunk of chunks) {
      // Call OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: chunk.content
        })
      });
      
      const { data } = await response.json();
      const embedding = data[0].embedding;
      
      // Store in database
      await supabase.from('caps_curriculum_chunks').insert({
        grade: chunk.grade,
        subject: chunk.subject,
        topic: chunk.topic,
        content: chunk.content,
        embedding: embedding,
        source_document: chunk.source,
        page_number: chunk.page
      });
    }
  }
  
  /**
   * Process past exam papers
   */
  async processExamPaper(pdfUrl: string, metadata: any): Promise<void> {
    const text = await this.extractTextFromPDF(pdfUrl);
    
    // Parse questions using regex/AI
    const questions = await this.parseExamQuestions(text);
    
    // Store each question
    for (const question of questions) {
      await this.storeQuestion(question, metadata);
    }
  }
  
  /**
   * Analyze exam patterns
   */
  async analyzeExamPatterns(grade: string, subject: string): Promise<void> {
    const supabase = assertSupabase();
    
    // Get all past questions for this grade/subject
    const { data: questions } = await supabase
      .from('caps_past_questions')
      .select('*')
      .eq('grade', grade)
      .eq('subject', subject);
    
    // Analyze frequency by topic
    const topicFrequency = this.calculateTopicFrequency(questions);
    
    // Store patterns
    await supabase.from('caps_exam_patterns').upsert({
      grade,
      subject,
      ...topicFrequency
    });
  }
}
```

---

### **Step 3: CAPS-Aware Tools (2-3 days)**

Add these tools to `DashToolRegistry.ts`:

```typescript
// Tool 1: Search CAPS Curriculum
{
  name: 'search_caps_curriculum',
  description: 'Search CAPS curriculum for specific topic',
  parameters: {
    grade: string,  // 'R', '1'-'12'
    subject: string,
    query: string,
    limit: number
  },
  execute: async (args) => {
    const embedding = await generateEmbedding(args.query);
    
    // Vector similarity search
    const { data } = await supabase.rpc('search_caps_curriculum', {
      query_embedding: embedding,
      match_grade: args.grade,
      match_subject: args.subject,
      match_threshold: 0.7,
      match_count: args.limit || 5
    });
    
    return {
      success: true,
      results: data,
      curriculum_aligned: true
    };
  }
}

// Tool 2: Get Past Exam Questions
{
  name: 'get_past_exam_questions',
  description: 'Fetch past exam questions for specific topic',
  parameters: {
    grade: string,
    subject: string,
    topic: string,
    years: number[],  // Optional: specific years
    difficulty: string  // Optional: 'easy', 'medium', 'hard'
  },
  execute: async (args) => {
    let query = supabase
      .from('caps_past_questions')
      .select('*')
      .eq('grade', args.grade)
      .eq('subject', args.subject);
    
    if (args.topic) {
      query = query.ilike('topic', `%${args.topic}%`);
    }
    
    if (args.years && args.years.length > 0) {
      query = query.in('year', args.years);
    }
    
    if (args.difficulty) {
      query = query.eq('difficulty', args.difficulty);
    }
    
    const { data, error } = await query.limit(20);
    
    return {
      success: !error,
      questions: data || [],
      count: data?.length || 0
    };
  }
}

// Tool 3: Predict Exam Questions
{
  name: 'predict_exam_questions',
  description: 'Predict likely exam questions based on patterns',
  parameters: {
    grade: string,
    subject: string,
    year: number,  // Year to predict for
    paper_number: number  // Which paper (1, 2, etc.)
  },
  execute: async (args) => {
    // Get exam patterns
    const { data: patterns } = await supabase
      .from('caps_exam_patterns')
      .select('*')
      .eq('grade', args.grade)
      .eq('subject', args.subject)
      .order('frequency_score', { ascending: false });
    
    // Get recent questions
    const recentYears = [args.year - 1, args.year - 2, args.year - 3];
    const { data: recentQuestions } = await supabase
      .from('caps_past_questions')
      .select('*')
      .eq('grade', args.grade)
      .eq('subject', args.subject)
      .in('year', recentYears);
    
    // AI-powered prediction
    const prediction = await this.generateExamPrediction({
      patterns,
      recentQuestions,
      grade: args.grade,
      subject: args.subject
    });
    
    return {
      success: true,
      predicted_questions: prediction.questions,
      topics_to_focus: prediction.topics,
      difficulty_distribution: prediction.difficulty,
      confidence_score: prediction.confidence
    };
  }
}

// Tool 4: Generate CAPS-Aligned Lesson
{
  name: 'generate_caps_lesson',
  description: 'Generate lesson plan aligned with CAPS curriculum',
  parameters: {
    grade: string,
    subject: string,
    topic: string,
    duration: number  // minutes
  },
  execute: async (args) => {
    // Search CAPS curriculum for this topic
    const capsContext = await this.searchCAPSCurriculum(args);
    
    // Get assessment requirements
    const assessmentGuidelines = await this.getAssessmentGuidelines(args);
    
    // Generate lesson with CAPS context
    const lesson = await dashAIService.generateLesson({
      ...args,
      capsContext,
      assessmentGuidelines,
      curriculum_aligned: true
    });
    
    return {
      success: true,
      lesson,
      curriculum_references: capsContext,
      assessment_alignment: assessmentGuidelines
    };
  }
}

// Tool 5: Generate Practice Test
{
  name: 'generate_practice_test',
  description: 'Generate practice test from past exam questions',
  parameters: {
    grade: string,
    subject: string,
    topics: string[],
    difficulty: string,
    duration: number,  // minutes
    mark_allocation: number
  },
  execute: async (args) => {
    // Get relevant past questions
    const questions = await this.getPastQuestions(args);
    
    // Select questions based on criteria
    const selectedQuestions = this.selectQuestions({
      questions,
      duration: args.duration,
      markAllocation: args.mark_allocation,
      difficulty: args.difficulty
    });
    
    // Generate test document
    const test = await this.generateTestDocument({
      questions: selectedQuestions,
      grade: args.grade,
      subject: args.subject,
      duration: args.duration
    });
    
    return {
      success: true,
      test_url: test.url,
      marking_guideline_url: test.marking_guideline_url,
      questions: selectedQuestions,
      total_marks: test.total_marks
    };
  }
}
```

---

### **Step 4: Enhanced AI Context (1 day)**

Update `ai-gateway` to include CAPS context:

```typescript
// supabase/functions/ai-gateway/index.ts

async function buildCAPSContext(params: any): Promise<string> {
  // If grade and subject provided, fetch CAPS context
  if (params.grade && params.subject) {
    const capsResults = await searchCAPSCurriculum({
      query: params.query || params.topic,
      grade: params.grade,
      subject: params.subject
    });
    
    return `
CAPS CURRICULUM CONTEXT:
Grade: ${params.grade}
Subject: ${params.subject}

Relevant Curriculum Content:
${capsResults.map(r => r.content).join('\n\n')}

IMPORTANT: Your response MUST align with the CAPS curriculum above.
Use exact terminology, follow prescribed sequence, and reference curriculum requirements.
    `;
  }
  
  return '';
}

// Modify system prompt for CAPS alignment
function toSystemPrompt(kind: string): string {
  if (kind === "lesson_generation") {
    return (
      "You are a CAPS curriculum expert for South African schools.\n" +
      "CRITICAL: All lessons MUST align with CAPS curriculum requirements.\n" +
      "Use exact CAPS terminology, follow prescribed topics, and reference curriculum documents.\n" +
      "Include specific learning outcomes, assessment standards, and teaching requirements from CAPS.\n" +
      "\n\n" + smartStyle()
    );
  }
  // ... other prompts updated similarly
}
```

---

### **Step 5: Supabase Edge Functions (1 day)**

```typescript
// supabase/functions/caps-search/index.ts

serve(async (req) => {
  const { query, grade, subject, limit = 5 } = await req.json();
  
  // Generate embedding for query
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: query
    })
  });
  
  const { data } = await embeddingResponse.json();
  const embedding = data[0].embedding;
  
  // Vector similarity search
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data: results, error } = await supabase.rpc('search_caps_curriculum', {
    query_embedding: embedding,
    match_grade: grade,
    match_subject: subject,
    match_threshold: 0.7,
    match_count: limit
  });
  
  return json({ results, error });
});

// SQL function for vector search
/*
CREATE OR REPLACE FUNCTION search_caps_curriculum(
  query_embedding VECTOR(1536),
  match_grade TEXT,
  match_subject TEXT,
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  grade VARCHAR,
  subject VARCHAR,
  topic VARCHAR,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.grade,
    c.subject,
    c.topic,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM caps_curriculum_chunks c
  WHERE 
    c.grade = match_grade
    AND c.subject = match_subject
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/
```

---

## 📊 Implementation Timeline

### **Phase 1: Foundation (Week 1 - 5 days)**
1. ✅ Database schema setup (1 day)
2. ✅ Download initial CAPS documents (1 day)
   - Grade 10-12 curriculum (Math, English, Sciences)
   - Past papers 2020-2024
3. ✅ Document processing pipeline (3 days)
   - PDF text extraction
   - Chunking algorithm
   - Embedding generation

### **Phase 2: Tools & Integration (Week 2 - 5 days)**
4. ✅ CAPS search tool (1 day)
5. ✅ Past questions tool (1 day)
6. ✅ Exam prediction tool (2 days)
7. ✅ Enhanced AI context (1 day)

### **Phase 3: Testing & Refinement (Week 3 - 5 days)**
8. ✅ Test with real queries (2 days)
9. ✅ Refine chunking strategy (1 day)
10. ✅ Optimize vector search (1 day)
11. ✅ Add more subjects/grades (1 day)

**Total:** 15 days (3 weeks)

---

## 💰 Costs

### One-Time Setup
- **Document storage:** Free (Supabase Storage)
- **Initial embedding generation:** ~$20-50 (one-time)
- **Database setup:** Free (pgvector in Supabase)

### Ongoing Monthly Costs (100 active users)
- **OpenAI Embeddings:** ~$5-10/month (for new queries)
- **Storage:** ~$2/month (PDFs and vectors)
- **Edge Function calls:** Free tier sufficient

**Total Monthly:** ~$7-12/month

---

## 🎯 Example User Interactions

### Before (Generic)
**User:** "Help me create a lesson on fractions for Grade 5"  
**Dash:** *Generic lesson about fractions*

### After (CAPS-Aligned)
**User:** "Help me create a lesson on fractions for Grade 5"  
**Dash:** "I'll create a CAPS-aligned lesson for Grade 5 Mathematics.

According to CAPS, fractions in Grade 5 should cover:
- Common fractions (halves, thirds, quarters, fifths, tenths)
- Comparing and ordering fractions
- Equivalent fractions
- Adding and subtracting fractions with same denominators

This aligns with Term 2, Week 3-5 of the CAPS annual teaching plan.

**Learning Outcomes (CAPS):**
- Solve problems in contexts involving fractions
- Recognize and represent fractions
- Compare and order fractions

*[Generates detailed lesson with exact CAPS references]*"

---

### Example 2: Past Papers

**User:** "What questions appeared in Grade 12 Math Paper 2 about calculus?"  
**Dash:** "Analyzing Grade 12 Mathematics Paper 2 past questions on Calculus:

**2023:** 
- Question 6.1: First derivative (gradient at a point) - 4 marks
- Question 6.2: Optimization problem - 8 marks

**2022:**
- Question 5: Rate of change application - 6 marks
- Question 7.2: Cubic function analysis - 10 marks

**Pattern:** Calculus appears in Section B (40-50 marks total), typically:
- 1 optimization question (8-10 marks)
- 1 rate of change question (4-6 marks)
- 1 curve sketching with derivatives (8-12 marks)

**Prediction for 2025:**
High probability topics:
1. Optimization (area/volume) - 85% likely
2. Motion/rate problems - 75% likely
3. Cubic function analysis - 90% likely

Would you like practice questions on these topics?"

---

### Example 3: Exam Preparation

**User:** "Generate a practice test for Grade 11 Physical Sciences"  
**Dash:** "Creating CAPS-aligned practice test:

**Grade 11 Physical Sciences - Practice Test**
Duration: 90 minutes | Total: 100 marks

**Section A: Multiple Choice (20 marks)**
*Based on 2022-2024 Paper 1 patterns*
1. Newton's Laws application (appeared 3/3 years)
2. Energy calculations (appeared 3/3 years)
...

**Section B: Structured Questions (50 marks)**
Question 1: Momentum and impulse (12 marks)
- From 2023 Paper 1, Q3
- Aligned with CAPS Topic: Momentum

Question 2: Electricity and magnetism (14 marks)
- Similar to 2022 Paper 2, Q5
- CAPS: Electrostatics and current

**Section C: Long Questions (30 marks)**
Question 3: Mechanics problem (15 marks)
- Combines projectile motion + energy
- High frequency topic (appeared 5/5 years)

*[Includes marking guideline]*

**Difficulty Distribution:**
- Easy: 30% (CAPS baseline)
- Medium: 50% (CAPS core)
- Hard: 20% (CAPS extension)

Download: [practice-test.pdf] [marking-guideline.pdf]"

---

## 📈 Success Metrics

### Curriculum Alignment
- ✅ 100% of lessons reference CAPS documents
- ✅ All topics match CAPS sequence
- ✅ Assessment aligned with CAPS requirements

### Exam Preparation
- ✅ 90%+ accuracy in question prediction
- ✅ All past papers 2014-2024 available
- ✅ Students report better preparedness

### User Satisfaction
- ✅ Teachers prefer CAPS-specific advice over generic
- ✅ Time saved creating curriculum-aligned materials
- ✅ Student performance improvement

---

## 🚀 Getting Started

### Immediate Next Steps

1. **Approve implementation** (Decision needed)
2. **Set up OpenAI API key** (for embeddings)
3. **Enable pgvector** in Supabase
4. **Download initial CAPS documents**
5. **Start Week 1 implementation**

### Resources Needed
- ✅ OpenAI API access (for embeddings)
- ✅ Supabase with pgvector enabled
- ✅ 15 development days
- ✅ ~$50 one-time + $10/month ongoing

---

## ✅ This Changes Everything

With CAPS integration, Dash becomes:

🎯 **Not just an AI** → **A CAPS curriculum expert**  
📚 **Not generic content** → **DBE-aligned materials**  
📝 **Not guessing exams** → **Pattern-based predictions**  
🏆 **Not just helpful** → **Exam preparation partner**

This is **exactly what schools need** - an AI that understands **their curriculum**! 🇿🇦

---

**Ready to implement? This will be a game-changer!** 🚀
