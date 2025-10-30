'use client';

import { useState } from 'react';
import { BookOpen, FileText, Brain, Target, Sparkles, GraduationCap, Clock, Award } from 'lucide-react';

interface ExamPrepWidgetProps {
  onAskDashAI?: (prompt: string, display: string) => void;
  guestMode?: boolean;
}

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

export function ExamPrepWidget({ onAskDashAI, guestMode = false }: ExamPrepWidgetProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>('grade_9');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [selectedExamType, setSelectedExamType] = useState<string>('practice_test');

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

    if (selectedExamType === 'practice_test') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS (Curriculum and Assessment Policy Statement) curriculum.

Generate a comprehensive practice examination paper for ${gradeInfo?.label} ${selectedSubject} strictly aligned to the CAPS curriculum.

**Exam Specifications:**
- Grade: ${gradeInfo?.label}
- Subject: ${selectedSubject}
- Phase: ${phase === 'foundation' ? 'Foundation Phase' : phase === 'intermediate' ? 'Intermediate Phase' : phase === 'senior' ? 'Senior Phase' : 'FET Phase'}
- Duration: ${gradeInfo?.value === 'grade_12' ? '3 hours' : gradeInfo?.value.includes('1') ? '2 hours' : '90 minutes'}
- Total Marks: ${gradeInfo?.value === 'grade_12' ? '150' : gradeInfo?.value.includes('1') ? '100' : '75'}

**CAPS Alignment Requirements:**
- Strictly follow CAPS curriculum document for ${gradeInfo?.label} ${selectedSubject}
- Include questions across all cognitive levels:
  * Knowledge and Understanding (20-30%)
  * Routine Procedures (30-40%)
  * Complex Procedures (20-30%)
  * Problem Solving and Reasoning (15-20%)
- Cover all major topics from Term 3-4 assessments
- Use South African context in word problems (ZAR currency, local geography, etc.)
- Follow official Department of Basic Education exam format

**Output Structure:**

# DEPARTMENT OF BASIC EDUCATION
# ${gradeInfo?.label} ${selectedSubject}
# PRACTICE EXAMINATION ${new Date().getFullYear()}

**INSTRUCTIONS:**
1. Answer ALL questions
2. Show all working clearly
3. Round off to TWO decimal places where necessary
4. Write neatly and legibly
5. You may use an approved calculator (except for ${selectedSubject === 'Mathematics' ? 'Section A' : 'specified sections'})

**TIME:** [Duration]  
**MARKS:** [Total]

---

## SECTION A: [Topic/Type]
[Questions with clear mark allocation]

## SECTION B: [Topic/Type]
[Questions with clear mark allocation]

[Continue with remaining sections...]

---

# MARKING MEMORANDUM

## SECTION A
**Question 1:** [Marks]
- Step 1: [Working] ✓ (1 mark)
- Step 2: [Working] ✓ (1 mark)
- Final Answer: [Answer] ✓✓ (2 marks)
- **Total: X marks**

[Complete memorandum with detailed solutions, mark allocation, and assessment rubrics]

---

## PARENT/TEACHER GUIDANCE

**Key Concepts Assessed:**
- [List main topics covered]

**Common Mistakes to Watch For:**
- [Common errors students make]

**Assessment Criteria:**
- 80-100%: Outstanding achievement
- 70-79%: Meritorious achievement
- 60-69%: Substantial achievement
- 50-59%: Adequate achievement
- 40-49%: Moderate achievement
- 0-39%: Not achieved

**Study Tips for This Paper:**
- [Specific advice for preparation]

---

© ${new Date().getFullYear()} EduDash Pro • CAPS-Aligned Educational Resources`;

      display = `Practice Test: ${gradeInfo?.label} ${selectedSubject} • CAPS-Aligned Exam Paper with Marking Memo`;
    } else if (selectedExamType === 'revision_notes') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

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

      display = `Revision Notes: ${gradeInfo?.label} ${selectedSubject} • CAPS Term 4 Focus Areas`;
    } else if (selectedExamType === 'study_guide') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

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

      display = `Study Guide: ${gradeInfo?.label} ${selectedSubject} • 7-Day Exam Preparation Plan`;
    } else if (selectedExamType === 'flashcards') {
      prompt = `You are Dash, a South African education assistant specializing in CAPS curriculum.

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

      display = `Flashcards: ${gradeInfo?.label} ${selectedSubject} • 30 Essential CAPS Concepts`;
    }

    onAskDashAI(prompt, display);
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
