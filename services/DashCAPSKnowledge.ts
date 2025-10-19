/**
 * DashCAPSKnowledge Service
 * 
 * Provides access to South African CAPS curriculum documents and exam resources.
 * Integrates with Supabase database containing official DBE materials.
 */

import { supabase } from '../lib/supabase';

export interface CAPSDocument {
  id: string;
  document_type: 'curriculum' | 'exam' | 'exemplar' | 'guideline';
  grade: string;
  subject: string;
  title: string;
  file_url: string;
  source_url?: string;
  year?: number;
  metadata?: Record<string, any>;
}

export interface CAPSSearchResult {
  document: CAPSDocument;
  relevance_score?: number;
  excerpt?: string;
}

export interface CAPSSearchOptions {
  grade?: string;
  subject?: string;
  document_type?: string;
  limit?: number;
}

/**
 * Search CAPS curriculum documents by query and filters
 * 
 * @param query - Search query (topic, concept, learning outcome)
 * @param options - Filter options (grade, subject, type)
 * @returns Array of matching documents with relevance
 */
export async function searchCurriculum(
  query: string,
  options: CAPSSearchOptions = {}
): Promise<CAPSSearchResult[]> {
  const { grade, subject, document_type, limit = 10 } = options;

  try {
    // Build query
    let queryBuilder = supabase
      .from('caps_curriculum_latest')
      .select('*');

    // Apply filters
    if (grade) {
      queryBuilder = queryBuilder.eq('grade', grade);
    }
    if (subject) {
      queryBuilder = queryBuilder.ilike('subject', `%${subject}%`);
    }
    if (document_type) {
      queryBuilder = queryBuilder.eq('document_type', document_type);
    }

    // For now, use basic text search on title/subject
    // TODO: Use full-text search on content_text once extracted
    if (query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,subject.ilike.%${query}%`
      );
    }

    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[DashCAPSKnowledge] Search error:', error);
      throw error;
    }

    return (data || []).map(doc => ({
      document: {
        id: doc.id,
        document_type: doc.document_type,
        grade: doc.grade,
        subject: doc.subject,
        title: doc.title,
        file_url: doc.file_url,
        source_url: doc.source_url,
        year: doc.year,
        metadata: doc.metadata,
      },
      relevance_score: 1.0, // Placeholder until semantic search
      excerpt: doc.preview || undefined,
    }));
  } catch (error) {
    console.error('[DashCAPSKnowledge] searchCurriculum failed:', error);
    return [];
  }
}

/**
 * Get CAPS documents by grade and subject
 */
export async function getDocumentsByGradeAndSubject(
  grade: string,
  subject: string
): Promise<CAPSDocument[]> {
  try {
    const { data, error } = await supabase
      .from('caps_curriculum_latest')
      .select('*')
      .eq('grade', grade)
      .ilike('subject', `%${subject}%`);

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.id,
      document_type: doc.document_type,
      grade: doc.grade,
      subject: doc.subject,
      title: doc.title,
      file_url: doc.file_url,
      source_url: doc.source_url,
      year: doc.year,
      metadata: doc.metadata,
    }));
  } catch (error) {
    console.error('[DashCAPSKnowledge] getDocumentsByGradeAndSubject failed:', error);
    return [];
  }
}

/**
 * Get all available subjects for a grade
 */
export async function getSubjectsByGrade(grade: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('caps_curriculum_latest')
      .select('subject')
      .eq('grade', grade);

    if (error) throw error;

    // Deduplicate subjects
    const subjects = [...new Set((data || []).map(d => d.subject).filter(Boolean))];
    return subjects.sort();
  } catch (error) {
    console.error('[DashCAPSKnowledge] getSubjectsByGrade failed:', error);
    return [];
  }
}

/**
 * Get CAPS context for a user message
 * Detects curriculum-related intent and returns relevant documents
 */
export async function getCAPSContext(userMessage: string): Promise<{
  relevant: boolean;
  documents: CAPSSearchResult[];
  detected_grade?: string;
  detected_subject?: string;
}> {
  // Simple intent detection patterns
  const gradePatterns = [
    /grade\s*(r|[1-9]|1[0-2])/i,
    /\b([1-9]|1[0-2])th\s+grade/i,
    /year\s*([1-9]|1[0-2])/i,
  ];

  const subjectPatterns = {
    mathematics: /math|maths|mathematics|algebra|geometry|calculus/i,
    english: /english|language|reading|writing/i,
    science: /science|physics|chemistry|biology|life\s+science/i,
    afrikaans: /afrikaans/i,
    'social sciences': /history|geography|social\s+science/i,
  };

  const curriculumKeywords = /caps|curriculum|syllabus|lesson|learning\s+outcome|assessment|exam|test/i;

  // Detect grade
  let detectedGrade: string | undefined;
  for (const pattern of gradePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      detectedGrade = match[1].toUpperCase();
      break;
    }
  }

  // Detect subject
  let detectedSubject: string | undefined;
  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (pattern.test(userMessage)) {
      detectedSubject = subject;
      break;
    }
  }

  // Check if curriculum-related
  const isRelevant = curriculumKeywords.test(userMessage) || !!(detectedGrade || detectedSubject);

  if (!isRelevant) {
    return { relevant: false, documents: [] };
  }

  // Search for relevant documents
  const documents = await searchCurriculum(userMessage, {
    grade: detectedGrade,
    subject: detectedSubject,
    limit: 5,
  });

  return {
    relevant: true,
    documents,
    detected_grade: detectedGrade,
    detected_subject: detectedSubject,
  };
}

/**
 * Get exam questions by topic (placeholder - requires caps_exam_questions table)
 */
export async function getPastExamQuestions(
  grade: string,
  subject: string,
  topic?: string
): Promise<any[]> {
  // TODO: Implement once exam questions are ingested
  console.warn('[DashCAPSKnowledge] Exam questions not yet available');
  return [];
}

/**
 * Format CAPS document reference for citation
 */
export function formatCAPSReference(doc: CAPSDocument): string {
  const parts = [doc.subject, doc.grade];
  if (doc.year) parts.push(`(${doc.year})`);
  return `${parts.join(' ')} - ${doc.title}`;
}

export default {
  searchCurriculum,
  getDocumentsByGradeAndSubject,
  getSubjectsByGrade,
  getCAPSContext,
  getPastExamQuestions,
  formatCAPSReference,
};
