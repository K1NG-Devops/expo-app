'use client';

import { useState } from 'react';
import { BookOpen, FileText, Brain, Target, Sparkles, GraduationCap, Clock, Award, Globe } from 'lucide-react';

interface ExamPrepWidgetProps {
  onAskDashAI?: (prompt: string, display: string, language?: string, enableInteractive?: boolean) => void;
  guestMode?: boolean;
}

// South African language codes (aligned with lib/voice/language.ts)
type SouthAfricanLanguage = 'en-ZA' | 'af-ZA' | 'zu-ZA' | 'xh-ZA' | 'nso-ZA';

const LANGUAGE_OPTIONS: Record<SouthAfricanLanguage, string> = {
  'en-ZA': 'English (South Africa)',
  'af-ZA': 'Afrikaans',
  'zu-ZA': 'isiZulu',
  'xh-ZA': 'isiXhosa',
  'nso-ZA': 'Sepedi (Northern Sotho)',
};

const GRADES = [
  { value: 'grade_r', label: 'Grade R', age: '5-6' },
  { value: 'grade_1', label: 'Grade 1', age: '6-7' },
  { value: 'grade_2', label: 'Grade 2', age: '7-8' },
  { value: 'grade_3', label: 'Grade 3', age: '8-9' },
  { value: 'grade_4', label: 'Grade 4', age: '9-10' },
  { value: 'grade_5', label: 'Grade 5', age: '10-11' },
  { value: 'grade_6', label: 'Grade 6', age: '11-12' },
  { value: 'grade_7', label: 'Grade 7', age: '12-13' },
  { value: 'grade_8', label: 'Grade 8', age: '13-14' },
  { value: 'grade_9', label: 'Grade 9', age: '14-15' },
  { value: 'grade_10', label: 'Grade 10', age: '15-16' },
  { value: 'grade_11', label: 'Grade 11', age: '16-17' },
  { value: 'grade_12', label: 'Grade 12 (Matric)', age: '17-18' },
];

const SUBJECTS_BY_PHASE = {
  foundation: ['Home Language', 'First Additional Language', 'Mathematics', 'Life Skills'],
  intermediate: ['Home Language', 'First Additional Language', 'Mathematics', 'Natural Sciences & Technology', 'Social Sciences'],
  senior: ['Home Language', 'First Additional Language', 'Mathematics', 'Natural Sciences', 'Social Sciences', 'Technology', 'Economic & Management Sciences', 'Life Orientation'],
  fet: ['Home Language', 'First Additional Language', 'Mathematics', 'Life Sciences', 'Physical Sciences', 'Accounting', 'Business Studies', 'Economics', 'Geography', 'History', 'Life Orientation'],
};

const EXAM_TYPES = [
  { id: 'practice_test', label: 'Practice Test', description: 'Full exam paper with memo', icon: FileText, color: 'primary', duration: '60-120 min' },
  { id: 'revision_notes', label: 'Revision Notes', description: 'Topic summaries & key points', icon: BookOpen, color: 'accent', duration: '30 min read' },
  { id: 'study_guide', label: 'Study Guide', description: 'Week-long study schedule', icon: Target, color: 'warning', duration: '7-day plan' },
  { id: 'flashcards', label: 'Flashcards', description: 'Quick recall questions', icon: Brain, color: 'danger', duration: '15 min' },
];

// Grade-level complexity mapping for age-appropriate content
const GRADE_COMPLEXITY = {
  'grade_r': {
    duration: '20 minutes',
    marks: 10,
    questionTypes: 'Picture identification, matching, coloring, simple counting',
    vocabulary: 'Basic colors, shapes, numbers 1-5, simple animals',
    instructions: 'Use LOTS of visual cues, emojis, and simple one-word answers. NO writing required. Focus on recognition and matching.',
    calculator: false,
    decimals: false,
  },
  'grade_1': {
    duration: '30 minutes',
    marks: 20,
    questionTypes: 'Fill-in-the-blank with word bank, matching pictures to words, simple multiple choice (2-3 options), basic counting',
    vocabulary: 'Simple everyday words, numbers 1-10, basic family/animals/food vocabulary',
    instructions: 'Keep sentences SHORT (3-5 words max). Provide word banks for fill-in-blanks. Use pictures wherever possible. For First Additional Language: assume BEGINNER level.',
    calculator: false,
    decimals: false,
  },
  'grade_2': {
    duration: '45 minutes',
    marks: 30,
    questionTypes: 'Short answer (1-2 sentences), fill-in-blanks, multiple choice (3-4 options), simple problem solving',
    vocabulary: 'Expanded vocabulary, numbers 1-20, basic sentence construction',
    instructions: 'Simple paragraph reading (3-4 sentences). Basic grammar concepts. For Additional Language: elementary conversational level.',
    calculator: false,
    decimals: false,
  },
  'grade_3': {
    duration: '60 minutes',
    marks: 40,
    questionTypes: 'Short paragraphs, multiple choice, true/false, matching, basic problem solving',
    vocabulary: 'Age-appropriate vocabulary, numbers 1-100, basic fractions (half, quarter)',
    instructions: 'Reading comprehension with short stories (1 paragraph). Introduction to simple essays (3-4 sentences). Basic calculator use for checking only.',
    calculator: false,
    decimals: false,
  },
  'grade_4': {
    duration: '90 minutes',
    marks: 50,
    questionTypes: 'Paragraphs, essays (5-7 sentences), multiple choice, problem solving, data interpretation',
    vocabulary: 'Grade-appropriate vocabulary, decimals to 1 place, basic fractions',
    instructions: 'Reading passages (2-3 paragraphs). Essay writing with structure. Basic calculator allowed.',
    calculator: true,
    decimals: true,
  },
  'grade_5': {
    duration: '90 minutes',
    marks: 60,
    questionTypes: 'Extended paragraphs, structured essays, complex problem solving, comprehension',
    vocabulary: 'Intermediate vocabulary, decimals to 2 places, common fractions',
    instructions: 'Multi-paragraph reading. Structured essays with introduction and conclusion. Calculator allowed.',
    calculator: true,
    decimals: true,
  },
  'grade_6': {
    duration: '90 minutes',
    marks: 75,
    questionTypes: 'Essays with clear structure, data analysis, multi-step problem solving',
    vocabulary: 'Advanced intermediate vocabulary, percentages, ratios, algebraic thinking',
    instructions: 'Complex reading comprehension. Essay writing with planning. Calculator allowed except for mental math sections.',
    calculator: true,
    decimals: true,
  },
  'grade_7': {
    duration: '2 hours',
    marks: 75,
    questionTypes: 'Analytical essays, data interpretation, multi-step problems, reasoning',
    vocabulary: 'Grade 7 curriculum vocabulary, algebraic expressions, geometry',
    instructions: 'Extended reading passages. Structured analytical writing. Scientific calculator allowed.',
    calculator: true,
    decimals: true,
  },
  'grade_8': {
    duration: '2 hours',
    marks: 100,
    questionTypes: 'Analytical and creative writing, complex problem solving, research-based questions',
    vocabulary: 'Grade 8 curriculum, algebra, functions, advanced grammar',
    instructions: 'Critical thinking required. Extended essays with evidence. Scientific calculator allowed.',
    calculator: true,
    decimals: true,
  },
  'grade_9': {
    duration: '2 hours',
    marks: 100,
    questionTypes: 'Critical analysis, extended essays, complex calculations, abstract reasoning',
    vocabulary: 'Grade 9 curriculum, quadratics, trigonometry basics, formal language',
    instructions: 'FET Phase preparation. Formal academic writing. Scientific calculator required.',
    calculator: true,
    decimals: true,
  },
  'grade_10': {
    duration: '2.5 hours',
    marks: 100,
    questionTypes: 'FET formal exam format, extended responses, proofs, investigations',
    vocabulary: 'Grade 10 curriculum, advanced algebra, trigonometry, analytical writing',
    instructions: 'NSC preparation format. Extended essay responses. Scientific calculator required.',
    calculator: true,
    decimals: true,
  },
  'grade_11': {
    duration: '3 hours',
    marks: 150,
    questionTypes: 'NSC format, research essays, complex multi-step problems, investigations',
    vocabulary: 'Grade 11 curriculum, calculus introduction, advanced topics',
    instructions: 'Full NSC exam format. University preparation. Scientific calculator required.',
    calculator: true,
    decimals: true,
  },
  'grade_12': {
    duration: '3 hours',
    marks: 150,
    questionTypes: 'Full NSC Matric format, research essays, proofs, investigations, applications',
    vocabulary: 'Grade 12 curriculum, calculus, statistics, formal academic language',
    instructions: 'Official NSC Matric format. University-level expectations. Scientific calculator required.',
    calculator: true,
    decimals: true,
  },
};

export function ExamPrepWidget({ onAskDashAI, guestMode = false }: ExamPrepWidgetProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>('grade_9');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [selectedExamType, setSelectedExamType] = useState<string>('practice_test');
  const [selectedLanguage, setSelectedLanguage] = useState<SouthAfricanLanguage>('en-ZA');

  const getPhase = (grade: string): keyof typeof SUBJECTS_BY_PHASE => {
    if (grade === 'grade_r' || grade === 'grade_1' || grade === 'grade_2' || grade === 'grade_3') return 'foundation';
    if (grade === 'grade_4' || grade === 'grade_5' || grade === 'grade_6') return 'intermediate';
    if (grade === 'grade_7' || grade === 'grade_8' || grade === 'grade_9') return 'senior';
    return 'fet';
  };

  const phase = getPhase(selectedGrade);
  const availableSubjects = SUBJECTS_BY_PHASE[phase];

  const gradeInfo = GRADES.find(g => g.value === selectedGrade);
  const examType = EXAM_TYPES.find(e => e.id === selectedExamType);

  const handleGenerate = () => {
    if (!onAskDashAI) return;

    // Check guest mode limit
    if (guestMode) {
      const key = 'EDUDASH_EXAM_PREP_FREE_USED';
      const today = new Date().toDateString();
      const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      
      if (stored === today) {
        alert('Free limit reached for today. Upgrade to Parent Starter (R49.99/month) for unlimited exam generation.');
        return;
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, today);
      }
    }

    let prompt = '';
    let display = '';
    
    // Get language name and grade complexity
    const languageName = LANGUAGE_OPTIONS[selectedLanguage];
    const complexity = GRADE_COMPLEXITY[selectedGrade as keyof typeof GRADE_COMPLEXITY];
    const isAdditionalLanguage = selectedSubject.includes('Additional');
    const isFoundationPhase = phase === 'foundation';

    if (selectedExamType === 'practice_test') {
      // NEW: Use tool-based generation for structured output
      prompt = `Generate a CAPS-aligned practice examination for ${gradeInfo?.label} ${selectedSubject} in ${languageName}.

IMPORTANT: You MUST use the 'generate_caps_exam' tool to create this exam. Do NOT write markdown.

Key requirements:
- Student age: ${gradeInfo?.age} years old
- Duration: ${complexity.duration}
- Total marks: ${complexity.marks}
- Language: ${languageName} (${selectedLanguage})
- Question types: ${complexity.questionTypes}

Every question MUST:
1. Start with a clear action verb (${isFoundationPhase ? 'Circle, Count, Match, Choose' : phase === 'intermediate' ? 'List, Calculate, Identify, Describe' : phase === 'senior' ? 'Analyze, Evaluate, Explain, Compare' : 'Critically analyze, Evaluate, Justify, Synthesize'})
2. Include ALL data needed to answer (sequences, options, scenarios)
3. Be answerable without images/diagrams (use text descriptions)
4. Be age-appropriate for ${gradeInfo?.age}-year-olds

Use the generate_caps_exam tool now.`;
      
      // OLD PROMPT (keep as fallback if tool fails):
      const fallbackPrompt = `You are Dash, a South African education assistant specializing in CAPS (Curriculum and Assessment Policy Statement) curriculum.

**IMPORTANT: Generate ALL content in ${languageName} (${selectedLanguage}). Use ONLY this language throughout the entire exam and memorandum. Do NOT switch languages unless the user explicitly requests it.**

**CRITICAL AGE-APPROPRIATE REQUIREMENTS:**
- **Student Age**: ${gradeInfo?.age} years old
- **Exam Duration**: ${complexity.duration} (STRICTLY ENFORCE - this is the attention span for this age group)
- **Total Marks**: ${complexity.marks} MAXIMUM (do not exceed)
- **Question Types**: ${complexity.questionTypes}
- **Vocabulary Level**: ${complexity.vocabulary}
- **Language Proficiency**: ${isAdditionalLanguage ? 'BEGINNER/ELEMENTARY - This is a FIRST ADDITIONAL LANGUAGE, assume students are just learning this language' : 'Age-appropriate home language proficiency'}
- **Special Instructions**: ${complexity.instructions}
- **Calculator Use**: ${complexity.calculator ? 'Allowed' : 'NOT ALLOWED - too young for calculator'}
- **Decimal Places**: ${complexity.decimals ? 'Use 2 decimal places where needed' : 'NO DECIMALS - too advanced for this grade'}

${isFoundationPhase ? `
**FOUNDATION PHASE SPECIFIC REQUIREMENTS:**
- Use EMOJIS and symbols to make it engaging (😊, 🐕, 🏠, 🎈)
- Provide WORD BANKS for fill-in-the-blank questions
- Use [PICTURE: description] to indicate where images should be shown
- Keep ALL sentences under 5 words for Grade R-1
- NO essay writing - max 1-2 sentences
- NO abstract concepts
- Focus on concrete, everyday objects and experiences
` : ''}

Generate an interactive, age-appropriate practice examination paper for ${gradeInfo?.label} ${selectedSubject} strictly aligned to the CAPS curriculum.

**Exam Format:**
- Grade: ${gradeInfo?.label} (Ages ${gradeInfo?.age})
- Subject: ${selectedSubject}
- Phase: ${phase === 'foundation' ? 'Foundation Phase' : phase === 'intermediate' ? 'Intermediate Phase' : phase === 'senior' ? 'Senior Phase' : 'FET Phase'}
- Duration: ${complexity.duration}
- Total Marks: ${complexity.marks}

**CAPS Curriculum Alignment:**
- Follow ${gradeInfo?.label} CAPS document exactly
- Use South African context (ZAR currency, local places, culturally relevant examples)
- ${isFoundationPhase ? 'Focus on play-based learning and visual recognition' : 'Balance knowledge, application, and reasoning'}

**Output Structure (INTERACTIVE FORMAT):**

# 🎓 DEPARTMENT OF BASIC EDUCATION
# ${gradeInfo?.label} ${selectedSubject}
# PRACTICE EXAMINATION ${new Date().getFullYear()}

**INSTRUCTIONS:**
${isFoundationPhase ? `
1. Listen to your teacher read the questions
2. Point to or circle the correct answer
3. Ask for help if you need it
4. Take your time - there is no rush
` : `
1. Answer ALL questions
2. ${complexity.calculator ? 'You may use a calculator' : 'Work without a calculator'}
3. ${complexity.decimals ? 'Round to 2 decimal places where needed' : 'Show all your work'}
4. Write neatly and clearly
`}

**TIME:** ${complexity.duration}
**MARKS:** ${complexity.marks}

---

## SECTION A: [Simple topic appropriate for age]

**Question 1.** [COMPLETE question with ALL DATA needed to answer it] (X marks)
${isFoundationPhase ? '[PICTURE: simple everyday object]' : ''}
${complexity.questionTypes.includes('word bank') ? `
**Word Bank:** [word1] [word2] [word3]
` : ''}

**PEDAGOGICAL FRAMEWORK - WRITE QUESTIONS LIKE A TEACHER:**

Imagine you are a South African CAPS teacher preparing an exam for your ${gradeInfo?.label} class. You know your students' abilities and attention span (${gradeInfo?.age} years old). Every question must be:
- Clear enough that students know EXACTLY what to do
- Complete with all information needed (like you're speaking directly to the student)
- Age-appropriate in language and complexity
- Answerable within the time limit

**AGE-APPROPRIATE INSTRUCTION VERBS (Use these):**
${isFoundationPhase ? `
**Foundation Phase (Ages 4-9):**
- Point to, Circle, Color, Match, Draw, Count, Say, Show, Find, Name, Choose
- Example: "Circle the animal that lives in water: cat, fish, bird, dog"` : 
phase === 'intermediate' ? `
**Intermediate Phase (Ages 10-12):**
- List, Identify, Name, Calculate, Describe, Compare, Explain (simple), Choose, Give, State
- Example: "List THREE ways that plants and animals are different"` : 
phase === 'senior' ? `
**Senior Phase (Ages 13-15):**
- Analyze, Compare, Explain (detailed), Evaluate, Calculate (multi-step), Describe (detailed), Justify, Classify, Apply
- Example: "Explain TWO ways that climate change affects coastal ecosystems in South Africa"` : `
**FET Phase (Ages 16-18):**
- Critically analyze, Evaluate, Justify, Synthesize, Formulate, Investigate, Prove, Derive, Discuss, Argue
- Example: "Critically evaluate the impact of apartheid policies on South African economic development"`}

**CRITICAL QUESTION FORMAT RULES (NON-NEGOTIABLE):**
1. Start with an ACTION VERB appropriate for the age group
2. Include ALL data, options, sequences, or information needed
3. Specify HOW MANY items to provide ("List TWO", "Give THREE reasons", "Name FOUR")
4. NO vague scenarios without questions
5. NO references to diagrams/images (use text descriptions)
6. Questions must be answerable in the allocated time

**WRONG - Too vague (teacher would NEVER write this):**
❌ "A building contractor is planning to construct a house. The contractor wants to use suitable materials."
   - No question! What should the student do?
❌ "A teacher wants to demonstrate the process of melting to the class."
   - No clear instruction! What is being asked?
❌ "Find the common difference in the sequence."
   - Missing data! Which sequence?

**CORRECT - Clear teacher instructions:**
✅ "A building contractor must choose between brick, wood, and steel for house walls. **List TWO advantages** of using brick."
✅ "Ice is heated from 0°C to 10°C. **Describe what happens** to the water particles during this process."
✅ "**Calculate** the common difference in this sequence: 2, 5, 8, 11, 14"
✅ "A substance has tightly packed particles in a fixed pattern. **Identify** the state of matter."
✅ "**Choose** the correct answer: Which animal is a mammal? A) Snake  B) Eagle  C) Dolphin  D) Frog"

[Continue with ${complexity.marks / 2} questions max]

---

## SECTION B: [Another age-appropriate topic]

[Continue with remaining questions - keep total under ${complexity.marks} marks]

---

# MARKING MEMORANDUM

## SECTION A
**Question 1:** (X marks)
- Correct answer: [simple, clear answer] ✓
${isFoundationPhase ? '- Accept phonetic spelling for Foundation Phase' : '- Award marks for method and answer'}

[Complete memo for all questions]

---

## PARENT/TEACHER GUIDANCE

**Age-Appropriate Expectations for ${gradeInfo?.label} (${gradeInfo?.age} years):**
- Students at this age can: [realistic capabilities]
- Common developmental stage: [appropriate level]

**Key Concepts Assessed:**
- [Age-appropriate topics]

**Support Tips:**
- ${isFoundationPhase ? 'Read questions aloud, allow pointing/verbal answers, use lots of encouragement' : 'Provide quiet space, encourage showing work, help with time management'}
- ${isAdditionalLanguage ? 'Remember: This is a new language for them - focus on basic vocabulary and simple sentences' : 'Age-appropriate language support'}

**Assessment Criteria:**
- 80-100%: Outstanding
- 60-79%: Good progress
- 40-59%: Developing
- Below 40%: Needs support

---

© ${new Date().getFullYear()} EduDash Pro • Age-Appropriate CAPS-Aligned Resources`;

      display = `Practice Test: ${gradeInfo?.label} ${selectedSubject} • CAPS-Aligned Exam Paper with Marking Memo (${languageName})`;
    } else if (selectedExamType === 'revision_notes') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

**IMPORTANT: Generate ALL content in ${languageName} (${selectedLanguage}). Use ONLY this language throughout the entire document. Do NOT switch languages.**

Generate comprehensive revision notes for ${gradeInfo?.label} ${selectedSubject} aligned to CAPS Term 4 assessment topics.

**Requirements:**
- Grade: ${gradeInfo?.label}
- Subject: ${selectedSubject}
- Format: Structured revision guide with clear headings
- Include: Key concepts, formulas, definitions, examples, diagrams (described in text)
- Use South African context and terminology
- Highlight exam-critical content

**Output Structure:**

# ${gradeInfo?.label} ${selectedSubject} Revision Notes
## CAPS Term 4 Focus Areas

### Topic 1: [Main Topic Name]
**Key Concepts:**
- [Concept 1 with clear explanation]
- [Concept 2 with clear explanation]

**Important Formulas/Rules:**
- [Formula 1 with when to use it]
- [Formula 2 with when to use it]

**Worked Example:**
[Step-by-step example problem with solution]

**Common Exam Questions:**
- [Type of question students should expect]
- [How to approach it]

**Memory Tips:**
- [Mnemonics or shortcuts]

---

[Continue for all major topics...]

---

## Quick Reference Summary
[One-page summary of all key formulas, definitions, and concepts]

## Exam Preparation Checklist
- [ ] Understand all key concepts
- [ ] Memorize essential formulas
- [ ] Practice worked examples
- [ ] Complete past papers
- [ ] Review common mistakes

---

© ${new Date().getFullYear()} EduDash Pro • CAPS-Aligned Revision Resources`;

      display = `Revision Notes: ${gradeInfo?.label} ${selectedSubject} • CAPS Term 4 Focus Areas (${languageName})`;
    } else if (selectedExamType === 'study_guide') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

**IMPORTANT: Generate ALL content in ${languageName} (${selectedLanguage}). Use ONLY this language throughout the entire study guide. Do NOT switch languages.**

Generate a 7-day intensive study schedule for ${gradeInfo?.label} ${selectedSubject} exam preparation aligned to CAPS curriculum.

**Requirements:**
- Grade: ${gradeInfo?.label}
- Subject: ${selectedSubject}
- Timeline: 7 days leading up to exam
- Include: Daily topics, practice exercises, review sessions, rest periods
- Realistic time allocations
- South African school context (考虑 daily homework, other subjects)

**Output Structure:**

# 7-Day Study Plan: ${gradeInfo?.label} ${selectedSubject}
## CAPS-Aligned Exam Preparation Schedule

**Exam Date:** [One week from today]  
**Daily Commitment:** 60-90 minutes  
**Total Topics:** [Number based on CAPS curriculum]

---

## Day 1 (Monday): [Main Topic]
⏰ **Time:** 75 minutes  
🎯 **Focus:** [Specific CAPS topic]

**Morning Session (40 min):**
- [ ] Review notes: [Specific subtopic 1]
- [ ] Review notes: [Specific subtopic 2]
- [ ] Watch/read: [Resource suggestion]

**Afternoon Session (35 min):**
- [ ] Practice: 5 questions on [topic]
- [ ] Self-assess using memo
- [ ] Identify weak areas

**Evening Quick Review (10 min):**
- [ ] Flashcards: Key formulas/concepts
- [ ] Tomorrow's preview: [Next topic]

**Progress Check:**
- Can you explain [concept] to someone else?
- Can you solve [problem type] without notes?

---

[Continue for Days 2-6...]

---

## Day 7 (Sunday): Final Review & Rest
⏰ **Time:** 45 minutes + rest  
🎯 **Focus:** Consolidation & confidence building

**Morning (45 min):**
- [ ] Quick revision: All key formulas
- [ ] Skim through all notes (don't study deeply)
- [ ] Review common mistakes list
- [ ] Practice 3 easy warm-up questions

**Afternoon:**
- 🛑 NO HEAVY STUDYING
- ✅ Light review of one-page summary
- ✅ Pack exam materials (calculator, pens, ID)
- ✅ Prepare healthy snacks for exam day
- ✅ Set 2 alarms for exam morning

**Evening:**
- 🌙 Early bedtime (8-9 hours sleep)
- 📵 No screens 1 hour before bed
- 🧘 Relaxation or light exercise

---

## Study Tips for Success

**Before You Start:**
- Gather all materials (textbook, notes, calculator)
- Find quiet study space
- Tell family your study schedule
- Prepare healthy snacks

**During Study Sessions:**
- Use Pomodoro technique (25 min study, 5 min break)
- Practice active recall (close book, try to remember)
- Explain concepts out loud
- Make notes of what you don't understand

**Self-Care Reminders:**
- 🥤 Drink water regularly
- 🍎 Eat brain-healthy foods
- 💤 Get 8 hours sleep each night
- 🏃 Take movement breaks
- 🧠 Don't cram the night before

---

## Parent Support Guide

**How to Help:**
- Provide quiet study environment
- Ensure regular meals and snacks
- Check daily progress (not pressuring)
- Offer encouragement, not criticism
- Help with practice testing (read questions)

**Warning Signs to Watch:**
- Excessive stress or anxiety
- Sleeping too little
- Skipping meals
- Isolation from family

**When to Seek Help:**
- If student is completely stuck on topic
- If panic/anxiety is overwhelming
- If additional tutoring might help

---

© ${new Date().getFullYear()} EduDash Pro • CAPS-Aligned Study Resources`;

      display = `Study Guide: ${gradeInfo?.label} ${selectedSubject} • 7-Day Exam Preparation Plan (${languageName})`;
    } else if (selectedExamType === 'flashcards') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

**IMPORTANT: Generate ALL content in ${languageName} (${selectedLanguage}). Use ONLY this language for all flashcard content. Do NOT switch languages.**

Generate 30 flashcards for ${gradeInfo?.label} ${selectedSubject} covering essential exam concepts aligned to CAPS curriculum.

**Requirements:**
- Grade: ${gradeInfo?.label}
- Subject: ${selectedSubject}
- Format: Question on front, detailed answer on back
- Cover: Definitions, formulas, problem-solving strategies, key facts
- Difficulty: Mix of easy recall and challenging application

**Output Structure:**

# ${gradeInfo?.label} ${selectedSubject} Flashcards
## CAPS Exam Essentials

---

### Flashcard 1
**FRONT (Question):**
[Clear, concise question or prompt]

**BACK (Answer):**
[Detailed answer with explanation]
[Example if applicable]
[Common mistake to avoid]

---

### Flashcard 2
**FRONT (Question):**
[Clear, concise question or prompt]

**BACK (Answer):**
[Detailed answer with explanation]

---

[Continue for 30 flashcards covering all major topics...]

---

## How to Use These Flashcards

**Study Methods:**
1. **Spaced Repetition:** Review cards you got wrong more frequently
2. **Active Recall:** Try to answer before flipping
3. **Teach Someone:** Explain the answer out loud
4. **Mix Order:** Don't memorize sequence, shuffle daily
5. **Practice Application:** Don't just memorize, understand why

**Daily Routine:**
- Morning: 10 new cards
- Afternoon: Review all cards once
- Evening: Focus on difficult cards

**Mastery Levels:**
- ✅ Got it right immediately → Review in 3 days
- 🤔 Got it right after thinking → Review tomorrow
- ❌ Got it wrong → Review today + tomorrow

---

© ${new Date().getFullYear()} EduDash Pro • CAPS-Aligned Study Resources`;

      display = `Flashcards: ${gradeInfo?.label} ${selectedSubject} • 30 Essential CAPS Concepts (${languageName})`;
    }
    
    // For practice tests, enable interactive mode
    const isInteractive = selectedExamType === 'practice_test';

    onAskDashAI(prompt, display, selectedLanguage, isInteractive);
  };

  return (
    <>
      <div className="sectionTitle" style={{ marginBottom: 'var(--space-4)' }}>
        <GraduationCap className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        CAPS Exam Preparation
      </div>

      {guestMode && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-2)',
          marginBottom: 'var(--space-4)',
          fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Award className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <strong>Free Trial: 1 exam resource per day</strong>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Upgrade to Parent Starter (R49.99/month) for unlimited practice tests, study guides, and more.
          </p>
        </div>
      )}

      {/* Grade Selector */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 14 }}>
          Select Grade
        </label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 14
          }}
        >
          {GRADES.map((grade) => (
            <option key={grade.value} value={grade.value}>
              {grade.label} (Ages {grade.age})
            </option>
          ))}
        </select>
      </div>

      {/* Language Selector */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 14 }}>
          <Globe className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Select Language
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value as SouthAfricanLanguage)}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 14
          }}
        >
          {Object.entries(LANGUAGE_OPTIONS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)' }}>
          🇿🇦 All exam content will be generated in your selected language
        </p>
      </div>

      {/* Subject Selector */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 14 }}>
          Select Subject
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-2)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 14
          }}
        >
          {availableSubjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)' }}>
          Subjects available for {phase === 'foundation' ? 'Foundation Phase' : phase === 'intermediate' ? 'Intermediate Phase' : phase === 'senior' ? 'Senior Phase' : 'FET Phase'}
        </p>
      </div>

      {/* Exam Type Selector */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 14 }}>
          Select Resource Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          {EXAM_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedExamType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedExamType(type.id)}
                className="card"
                style={{
                  padding: 'var(--space-3)',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--card)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', textAlign: 'center' }}>
                  <div style={{
                    padding: 8,
                    borderRadius: 'var(--radius-2)',
                    background: `var(--${type.color})`
                  }}>
                    <Icon className="icon16" style={{ color: '#fff' }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{type.label}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{type.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }} className="muted">
                    <Clock className="icon12" />
                    {type.duration}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="btn btnPrimary"
        onClick={handleGenerate}
        style={{ width: '100%', fontSize: 14, padding: 'var(--space-3)' }}
      >
        <Sparkles className="icon16" />
        Generate {examType?.label} with Dash AI
      </button>

      <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-3)', textAlign: 'center' }}>
        🇿🇦 CAPS-aligned content generated by Dash AI • Exams next week? We've got you covered!
      </p>
    </>
  );
}
