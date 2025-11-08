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
  diagram?: {
    type: 'chart' | 'mermaid' | 'svg' | 'image';
    data: any;
    title?: string;
    caption?: string;
  };
}

export interface ParsedExam {
  title: string;
  grade?: string;
  subject?: string;
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
    
    // Store answers from marking memorandum
    const memoAnswers: Record<string, string> = {};
    let currentMemoQuestionNum = '';
    
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
      if (line.includes('MARKING MEMORANDUM') || line.match(/^##\s*MEMO/i) || line.includes('MEMO')) {
        hasMemo = true;
        inMemo = true;
        // Save last question before entering memo
        if (currentQuestion && currentQuestion.text && currentSection) {
          currentSection.questions.push(currentQuestion as ExamQuestion);
          totalMarks += currentQuestion.marks || 0;
          currentQuestion = null;
        }
        // Save last section
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        continue;
      }
      
      // Process memo content to extract answers
      if (inMemo) {
        // Match question number in memo: "1.", "1.1", "Question 1:", etc.
        const memoQuestionMatch = line.match(/^\*?\*?(?:Question\s+)?(\d+\.?\d*\.?)\*?\*?[:\s]+(.+)/i);
        if (memoQuestionMatch) {
          currentMemoQuestionNum = memoQuestionMatch[1].replace(/\.$/, ''); // Remove trailing dot
          const answerText = memoQuestionMatch[2].trim();
          // Store answer (could be multi-line, so we'll concatenate)
          memoAnswers[currentMemoQuestionNum] = answerText;
          console.log('[ExamParser] Memo answer for Q' + currentMemoQuestionNum + ':', answerText);
        } else if (currentMemoQuestionNum && line && !line.startsWith('##') && !line.startsWith('---')) {
          // Continue multi-line answer
          memoAnswers[currentMemoQuestionNum] += ' ' + line;
        }
        continue;
      }
      
      // Detect section headers: treat ANY H2 (## ...) as a section header
      if (line.startsWith('## ')) {
        const sectionTitle = line.replace(/^## /, '').trim();
        // Ignore memo-style H2 if any slipped through
        if (!/^memo\b/i.test(sectionTitle)) {
          if (currentSection) {
            console.log('[ExamParser] Saving section:', currentSection.title, 'with', currentSection.questions.length, 'questions');
            sections.push(currentSection);
          }
          console.log('[ExamParser] New section detected:', sectionTitle);
          currentSection = {
            title: sectionTitle,
            questions: [],
          };
        }
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
        
        // Extract marks from question text like "(5)" or "(5 marks)" or "[5]"
        const marksMatch = questionText.match(/\((\d+)\s*marks?\)|\[(\d+)\]|\((\d+)\)/i);
        const marks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2] || marksMatch[3]) : 1;
        
        currentQuestion = {
          id: `q-${++questionIdCounter}`,
          text: questionText.replace(/\((\d+)\s*marks?\)|\[(\d+)\]|\((\d+)\)/gi, '').trim(),
          marks,
          sectionTitle: currentSection.title,
          type: 'short_answer', // Default type
        };
        
        // Detect question type based on keywords and structure
        const lowerText = questionText.toLowerCase();
        
        // Multiple choice detection
        if (lowerText.includes('choose') || 
            lowerText.includes('select') ||
            lowerText.includes('which of the following') ||
            lowerText.match(/circle.*correct|tick.*correct|mark.*correct/)) {
          currentQuestion.type = 'multiple_choice';
          currentQuestion.options = [];
        } 
        // Essay questions
        else if (lowerText.match(/explain|describe|discuss|write.*paragraph|write.*essay/)) {
          currentQuestion.type = 'essay';
        } 
        // Numeric questions (calculations, sequences, formulas)
        else if (lowerText.match(/calculate|solve|sum of|product of|difference|quotient|equation|formula|sequence|pattern|multiples?|factors?|next \d+ numbers/)) {
          currentQuestion.type = 'numeric';
        }
        // If still short_answer, check if it expects a number (place value, count, etc.)
        else if (lowerText.match(/how many|count|place value|value of|digit/)) {
          currentQuestion.type = 'numeric';
        }
        
        continue;
      }
      
      // Detect multiple choice options (A) B) A. B., etc.)
      const optionMatch = line.match(/^([a-dA-D][).])\s+(.+)/);
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
    
    // Attach correct answers from memo to questions
    if (hasMemo && Object.keys(memoAnswers).length > 0) {
      console.log('[ExamParser] Attaching memo answers to questions:', Object.keys(memoAnswers));
      let questionCounter = 0;
      for (const section of sections) {
        for (const question of section.questions) {
          questionCounter++;
          const questionNum = String(questionCounter);
          if (memoAnswers[questionNum]) {
            question.correctAnswer = memoAnswers[questionNum].trim();
            console.log('[ExamParser] Q' + questionNum + ' correct answer:', question.correctAnswer);
          }
        }
      }
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

function hasCurrencyContext(questionText?: string, correct?: any): boolean {
  const q = (questionText || '').toLowerCase();
  const c = String(correct ?? '').toLowerCase();
  return q.includes(' r') || q.includes('rand') || c.startsWith('r');
}
function formatCurrencyMaybe(n: number, useCurrency: boolean): string {
  if (!useCurrency) return String(Number.isInteger(n) ? n : Number(n.toFixed(2)));
  const val = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `R${val}`;
}

/**
 * Validate student answers against memorandum
 * Enhanced version with flexible matching
 */
export function gradeAnswer(
  question: ExamQuestion,
  studentAnswer: string
): { isCorrect: boolean; feedback: string; marks: number } {
  // Empty answer
  if (!studentAnswer || studentAnswer.trim() === '') {
    return { isCorrect: false, feedback: 'No answer provided', marks: 0 };
  }

  // Drawing/Essay cannot be auto-graded reliably
  if ((question as any).type === 'drawing') {
    return { isCorrect: false, feedback: '🖼️ Auto-marking not available for drawings. Answer recorded.', marks: 0 };
  }

  // Multiple choice
  if (question.type === 'multiple_choice') {
    const studentNorm = studentAnswer.trim().toLowerCase();
    const correctRaw = (question.correctAnswer ?? '').toString().trim().toLowerCase();

    // Match letter (a-d)
    let studentLetter = studentNorm.match(/([a-d])/i)?.[1]?.toLowerCase();
    let correctLetter = correctRaw.match(/([a-d])/i)?.[1]?.toLowerCase();

    // If correct answer is text, align to option letter
    if (!correctLetter && question.options) {
      const idx = question.options.findIndex(o => o.trim().toLowerCase() === correctRaw || o.trim().toLowerCase().includes(correctRaw));
      if (idx >= 0) correctLetter = String.fromCharCode(97 + idx);
    }
    if (!studentLetter && studentNorm.length === 1 && /[a-d]/.test(studentNorm)) studentLetter = studentNorm;

    const isCorrect = !!correctLetter && studentLetter === correctLetter;
    return {
      isCorrect,
      feedback: isCorrect
        ? '✓ Correct!'
        : `✗ Incorrect. The correct answer is ${correctLetter?.toUpperCase() || '?'}`,
      marks: isCorrect ? question.marks : 0,
    };
  }

  // Numeric and short answers (with robust parsing)
  const studNum = parseNumericValue(studentAnswer);
  const corrNum = question.correctAnswer != null ? parseNumericValue(String(question.correctAnswer)) : null;

  // If no memo, attempt to compute from question text for numeric
  let effectiveCorrectNum = corrNum;
  if (effectiveCorrectNum == null && (question.type === 'numeric' || /\b(calculate|simplify|total|sum)\b/i.test(question.text))) {
    const computed = computeAnswerFromQuestionText(question.text);
    if (computed != null) effectiveCorrectNum = computed;
  }

  const currency = hasCurrencyContext(question.text, question.correctAnswer);

  // If both sides look numeric, compare numerically
  if (studNum != null && effectiveCorrectNum != null) {
    const tolerance = Math.max(Math.abs(effectiveCorrectNum * 0.001), 0.01); // 0.1% or 0.01
    const isCorrect = Math.abs(studNum - effectiveCorrectNum) <= tolerance;
    const sFmt = formatCurrencyMaybe(studNum, currency);
    const cFmt = formatCurrencyMaybe(effectiveCorrectNum, currency);
    if (isCorrect) {
      return { isCorrect: true, feedback: `✓ Correct! (${sFmt})`, marks: question.marks };
    }
    // Very close feedback
    if (Math.abs(studNum - effectiveCorrectNum) <= Math.max(Math.abs(effectiveCorrectNum * 0.05), 0.5)) {
      return { isCorrect: false, feedback: `🔶 Very close! Your answer: ${sFmt}. Expected: ${cFmt}`, marks: 0 };
    }
    return { isCorrect: false, feedback: `✗ Incorrect. Expected: "${cFmt}"`, marks: 0 };
  }

  // If answers are lists of numbers, compare as sets (order-insensitive)
  const studentList = extractNumbersList(studentAnswer);
  const correctList = extractNumbersList(String(question.correctAnswer ?? ''));
  if (studentList.length > 1 && correctList.length > 1) {
    const sortNum = (a: number, b: number) => a - b;
    const sSorted = [...studentList].sort(sortNum);
    const cSorted = [...correctList].sort(sortNum);
    const sameLen = sSorted.length === cSorted.length;
    const allMatch = sameLen && sSorted.every((v, i) => Math.abs(v - cSorted[i]) <= Math.max(Math.abs(cSorted[i] * 0.001), 0.01));
    const fmt = (arr: number[]) => arr.map(n => formatCurrencyMaybe(n, currency)).join(', ');
    return allMatch
      ? { isCorrect: true, feedback: `✓ Correct! (${fmt(sSorted)})`, marks: question.marks }
      : { isCorrect: false, feedback: `✗ Incorrect. Expected: ${fmt(cSorted)}`, marks: 0 };
  }

  // Fallback to text similarity
  const studentClean = String(studentAnswer).trim().toLowerCase().replace(/[.,;:!?]/g, '');
  const correctClean = String(question.correctAnswer ?? '').trim().toLowerCase().replace(/[.,;:!?]/g, '');
  if (correctClean) {
    if (studentClean === correctClean || studentClean.includes(correctClean) || correctClean.includes(studentClean)) {
      return { isCorrect: true, feedback: '✓ Correct!', marks: question.marks };
    }
    const sim = similarityScore(studentClean, correctClean);
    if (sim > 0.8) {
      return { isCorrect: false, feedback: `🔶 Close! Check your wording. Expected: "${question.correctAnswer}"`, marks: 0 };
    }
    return { isCorrect: false, feedback: `✗ Your answer: "${studentAnswer}". Expected: "${question.correctAnswer}"`, marks: 0 };
  }

  // No memo available and could not compute
  return { isCorrect: false, feedback: '🤖 Auto-marking not available. Answer recorded.', marks: 0 };
}

/** Utility: parse a numeric-like answer string
 * Handles currency (R), thousand separators, decimals, percentages and simple fractions
 */
function parseNumericValue(raw: string): number | null {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  // Replace comma decimals with dot, remove thousand separators
  s = s.replace(/\s/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  s = s.replace(',', '.');
  // Currency (R15 or 15R)
  s = s.replace(/^r/, '').replace(/r$/, '');
  // Fractions like 1/2
  if (/^-?\d+\s*\/?\s*\d+$/.test(s)) {
    const [a, b] = s.split('/').map(n => parseFloat(n));
    if (!isNaN(a) && !isNaN(b) && b !== 0) return a / b;
  }
  // Percentages like 50%
  if (/%$/.test(s)) {
    const n = parseFloat(s.replace('%', ''));
    if (!isNaN(n)) return n / 100;
  }
  // Plain number
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

/** Utility: extract a list of numbers from a string */
function extractNumbersList(raw: string): number[] {
  if (!raw) return [];
  const s = String(raw);
  const matches = s.match(/-?\d+(?:[.,]\d+)?/g) || [];
  return matches.map(m => parseNumericValue(m)!).filter(v => typeof v === 'number' && !isNaN(v));
}

/** Utility: similarity (Levenshtein) */
function similarityScore(a: string, b: string): number {
  return calculateSimilarity(a, b);
}

/** Try to compute a numeric answer from the question text (simple cases) */
function computeAnswerFromQuestionText(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Price word problems: "a book costs R15 ... 2 books and 3 pens"
  const priceRegex = /(\b[a-z]+\b)\s+costs?\s*r?\s*(\d+(?:[.,]\d+)?)/gi;
  const prices: Record<string, number> = {};
  let m: RegExpExecArray | null;
  while ((m = priceRegex.exec(lower))) {
    const item = m[1].replace(/[^a-z]/g, '');
    prices[item] = parseNumericValue(m[2]) || 0;
  }
  const qtyRegex = /(\d+)\s+(\b[a-z]+s\b)/gi;
  const qtys: Record<string, number> = {};
  while ((m = qtyRegex.exec(lower))) {
    const n = parseFloat(m[1]);
    const plural = m[2].replace(/[^a-z]/g, '');
    const singular = plural.replace(/s$/, '');
    qtys[singular] = (qtys[singular] || 0) + n;
  }
  if (Object.keys(prices).length && Object.keys(qtys).length) {
    let total = 0;
    for (const k of Object.keys(qtys)) {
      if (prices[k] !== undefined) total += qtys[k] * prices[k];
    }
    if (total > 0) return total;
  }
  // Arithmetic expression extraction: e.g., "Simplify: 12 + 4 - 6" or "7 + 2 x 3"
  const exprMatch = text.replace(/[×x]/gi, '*').replace(/÷/g, '/').match(/(\d+(?:[.,]\d+)?(?:\s*[+\-*/()]\s*\d+(?:[.,]\d+)?)*)/);
  if (exprMatch && exprMatch[1]) {
    let expr = exprMatch[1].replace(/,/g, '.');
    expr = expr.replace(/[^0-9+*/().\s-]/g, '');
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`return (${expr})`)();
      if (typeof val === 'number' && isFinite(val)) return val;
    } catch {}
  }
  return null;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 */
function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance for spell-check tolerance
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

