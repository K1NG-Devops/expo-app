/**
 * Exam Parser Utility
 * 
 * Parses generated exam markdown into interactive question components
 * Supports multiple choice, short answer, and essay questions
 */

export interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'numeric';
  text: string;
  marks: number;
  options?: string[]; // For multiple choice
  correctAnswer?: string | number; // For auto-grading
  sectionTitle?: string;
}

export interface ParsedExam {
  title: string;
  instructions: string[];
  sections: {
    title: string;
    questions: ExamQuestion[];
  }[];
  totalMarks: number;
  hasMemo: boolean;
}

/**
 * Parse exam markdown into structured format
 */
export function parseExamMarkdown(markdown: string): ParsedExam | null {
  try {
    console.log('[ExamParser] Parsing markdown. First 500 chars:', markdown.substring(0, 500));
    const lines = markdown.split('\n');
    console.log('[ExamParser] Total lines:', lines.length);
    
    let title = '';
    const instructions: string[] = [];
    const sections: { title: string; questions: ExamQuestion[] }[] = [];
    let currentSection: { title: string; questions: ExamQuestion[] } | null = null;
    let totalMarks = 0;
    let hasMemo = false;
    
    let inInstructions = false;
    let inMemo = false;
    let currentQuestion: Partial<ExamQuestion> | null = null;
    let questionIdCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect title (first # heading)
      if (line.startsWith('# ') && !title) {
        title = line.replace(/^# /, '').trim();
        continue;
      }
      
      // Detect INSTRUCTIONS section
      if (line.includes('INSTRUCTIONS') || line.includes('**INSTRUCTIONS:**')) {
        inInstructions = true;
        continue;
      }
      
      // Detect end of instructions (horizontal rule or section start)
      if (inInstructions && (line.startsWith('---') || line.startsWith('## '))) {
        inInstructions = false;
      }
      
      // Collect instructions
      if (inInstructions && line.match(/^\d+\./)) {
        instructions.push(line.replace(/^\d+\.\s*/, ''));
        continue;
      }
      
      // Detect MARKING MEMORANDUM
      if (line.includes('MARKING MEMORANDUM') || line.includes('MEMO')) {
        hasMemo = true;
        inMemo = true;
        continue;
      }
      
      // Skip memo content for interactive exam
      if (inMemo) {
        continue;
      }
      
      // Detect section headers (## SECTION A, etc.)
      if (line.startsWith('## ') && line.toUpperCase().includes('SECTION')) {
        if (currentSection) {
          console.log('[ExamParser] Saving section:', currentSection.title, 'with', currentSection.questions.length, 'questions');
          sections.push(currentSection);
        }
        const sectionTitle = line.replace(/^## /, '').trim();
        console.log('[ExamParser] New section detected:', sectionTitle);
        currentSection = {
          title: sectionTitle,
          questions: [],
        };
        continue;
      }
      
      // Detect question start (numeric pattern like "1.", "1.1", "Question 1:", "**Question 1**")
      const questionMatch = line.match(/^\*?\*?(?:Question\s+)?(\d+\.?\d*\.?)\*?\*?[:\s]+(.+)/i);
      if (questionMatch && currentSection) {
        console.log('[ExamParser] Question detected:', line);
        // Save previous question
        if (currentQuestion && currentQuestion.text) {
          currentSection.questions.push(currentQuestion as ExamQuestion);
          totalMarks += currentQuestion.marks || 0;
          console.log('[ExamParser] Saved question:', currentQuestion.text.substring(0, 50));
        }
        
        const [, questionNum, questionText] = questionMatch;
        
        // Extract marks from question text like "(5 marks)" or "[5]"
        const marksMatch = questionText.match(/\((\d+)\s*marks?\)|\[(\d+)\]/i);
        const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2]) : 1;
        
        currentQuestion = {
          id: `q-${++questionIdCounter}`,
          text: questionText.replace(/\((\d+)\s*marks?\)|\[(\d+)\]/gi, '').trim(),
          marks,
          sectionTitle: currentSection.title,
          type: 'short_answer', // Default type
        };
        
        // Detect question type
        if (questionText.toLowerCase().includes('choose') || 
            questionText.toLowerCase().includes('select') ||
            questionText.toLowerCase().includes('which')) {
          currentQuestion.type = 'multiple_choice';
          currentQuestion.options = [];
        } else if (questionText.toLowerCase().includes('explain') ||
                   questionText.toLowerCase().includes('describe') ||
                   questionText.toLowerCase().includes('discuss')) {
          currentQuestion.type = 'essay';
        } else if (questionText.toLowerCase().includes('calculate') ||
                   questionText.toLowerCase().includes('solve')) {
          currentQuestion.type = 'numeric';
        }
        
        continue;
      }
      
      // Detect multiple choice options (a), b), A., B., etc.)
      const optionMatch = line.match(/^([a-dA-D][\)\.]\s+)(.+)/);
      if (optionMatch && currentQuestion && currentQuestion.type === 'multiple_choice') {
        currentQuestion.options = currentQuestion.options || [];
        currentQuestion.options.push(optionMatch[2].trim());
      }
    }
    
    // Save last question
    if (currentQuestion && currentQuestion.text && currentSection) {
      currentSection.questions.push(currentQuestion as ExamQuestion);
      totalMarks += currentQuestion.marks || 0;
    }
    
    // Save last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Only return parsed exam if we have questions
    console.log('[ExamParser] Parsing complete. Sections:', sections.length, 'Total questions:', sections.reduce((sum, s) => sum + s.questions.length, 0));
    if (sections.length > 0 && sections.some(s => s.questions.length > 0)) {
      console.log('[ExamParser] Valid exam detected. Title:', title, 'Total marks:', totalMarks);
      return {
        title: title || 'Practice Exam',
        instructions,
        sections,
        totalMarks,
        hasMemo,
      };
    }
    
    console.warn('[ExamParser] No valid sections or questions found');
    return null;
  } catch (error) {
    console.error('[ExamParser] Failed to parse exam:', error);
    return null;
  }
}

/**
 * Validate student answers against memorandum
 * (Simplified - real validation would require NLP)
 */
export function gradeAnswer(
  question: ExamQuestion,
  studentAnswer: string
): { isCorrect: boolean; feedback: string; marks: number } {
  // For MVP, we'll do basic validation
  // In production, this would integrate with AI for grading
  
  if (!studentAnswer || studentAnswer.trim() === '') {
    return {
      isCorrect: false,
      feedback: 'Answer is required',
      marks: 0,
    };
  }
  
  if (question.type === 'multiple_choice' && question.correctAnswer) {
    const isCorrect = studentAnswer.toLowerCase() === question.correctAnswer.toString().toLowerCase();
    return {
      isCorrect,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.correctAnswer}`,
      marks: isCorrect ? question.marks : 0,
    };
  }
  
  // For other question types, provide neutral feedback
  // (AI grading would happen here in production)
  return {
    isCorrect: true, // Assume correct for now
    feedback: 'Answer recorded. Teacher will review your response.',
    marks: question.marks, // Award full marks tentatively
  };
}
