'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, Brain, Target, Sparkles, GraduationCap, Clock, Award, Globe, MessageSquare } from 'lucide-react';
import { ConversationalExamBuilder } from './ConversationalExamBuilder';

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

// Short labels for language subjects (HL/FAL selector)
const SUBJECT_LANG_CHOICES = [
  { code: 'en-ZA', label: 'English' },
  { code: 'af-ZA', label: 'Afrikaans' },
  { code: 'zu-ZA', label: 'isiZulu' },
  { code: 'xh-ZA', label: 'isiXhosa' },
  { code: 'nso-ZA', label: 'Sepedi' },
];

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
  foundation: [
    'Home Language',
    'First Additional Language',
    'Mathematics',
    'Life Skills',
    'Creative Arts',
    'Physical Education'
  ],
  intermediate: [
    'Home Language',
    'First Additional Language',
    'Mathematics',
    'Natural Sciences & Technology',
    // Split Social Sciences so parents can pick specifically
    'Geography',
    'History',
    'Social Sciences',
    'Creative Arts',
    'Life Skills'
  ],
  senior: [
    'Home Language',
    'First Additional Language',
    'Mathematics',
    'Natural Sciences',
    // Split Social Sciences into distinct subjects
    'Geography',
    'History',
    'Social Sciences',
    'Technology',
    'Economic & Management Sciences',
    'Life Orientation',
    'Creative Arts'
  ],
  fet: [
    'Home Language',
    'First Additional Language',
    'Mathematics',
    'Mathematical Literacy',
    'Life Sciences',
    'Physical Sciences',
    'Geography',
    'History',
    'Accounting',
    'Business Studies',
    'Economics',
    'Life Orientation',
    'Tourism',
    'Consumer Studies',
    'Computer Applications Technology (CAT)',
    'Information Technology (IT)',
    'Engineering Graphics & Design (EGD)',
    'Agricultural Sciences',
    'Visual Arts',
    'Dramatic Arts',
    'Music'
  ],
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
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<string>('grade_9');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [selectedExamType, setSelectedExamType] = useState<string>('practice_test');
  const [selectedLanguage, setSelectedLanguage] = useState<SouthAfricanLanguage>('en-ZA');
  // Language for HL/FAL subject specifically (defaults to UI language if empty)
  const [selectedSubjectLang, setSelectedSubjectLang] = useState<SouthAfricanLanguage | ''>('');
  const [showConversationalBuilder, setShowConversationalBuilder] = useState(false);

  // Show conversational builder if requested
  if (showConversationalBuilder) {
    return (
      <ConversationalExamBuilder
        grade={selectedGrade}
        subject={selectedSubject}
        onClose={() => setShowConversationalBuilder(false)}
        onSave={(exam) => {
          console.log('Exam saved:', exam);
          setShowConversationalBuilder(false);
          // TODO: Save to database
        }}
      />
    );
  }

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

    const subjectLangParam = (selectedSubject === 'Home Language' || selectedSubject.startsWith('First Additional Language'))
      ? (selectedSubjectLang || selectedLanguage)
      : '';

    // DIRECT NAVIGATION: do not expose or preview raw prompts
    const params = new URLSearchParams({
      grade: selectedGrade,
      subject: selectedSubject,
      type: selectedExamType,
      language: selectedLanguage,
    });

    if (subjectLangParam) params.set('subjectLanguage', subjectLangParam);

    // Route based on resource type
    if (selectedExamType === 'practice_test') {
      router.push(`/dashboard/parent/generate-exam?${params.toString()}`);
    } else {
      router.push(`/dashboard/parent/generate-resource?${params.toString()}`);
    }
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
          ???? All exam content will be generated in your selected language
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

        {(selectedSubject === 'Home Language' || selectedSubject.startsWith('First Additional Language')) && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 14 }}>
              Choose language for this subject
            </label>
            <select
              value={selectedSubjectLang || selectedLanguage}
              onChange={(e) => setSelectedSubjectLang(e.target.value as SouthAfricanLanguage)}
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
              {SUBJECT_LANG_CHOICES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <p className="muted" style={{ fontSize: 11, marginTop: 'var(--space-2)' }}>
              This sets the target language for the Home/First Additional Language subject. The UI/content language above still applies to the rest of the paper.
            </p>
          </div>
        )}
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
        style={{ width: '100%', fontSize: 14, padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}
      >
        <Sparkles className="icon16" />
        Generate {examType?.label}
      </button>

      <p className="muted" style={{ fontSize: 11, marginBottom: 'var(--space-4)', textAlign: 'center' }}>
        CAPS-aligned content will be generated using your selections. We never show system prompts.
      </p>

      {/* Conversational Builder Banner - Moved to Bottom */}
      {(
        <>
          <div style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '13px',
            margin: 'var(--space-3) 0',
            position: 'relative',
          }}>
            <span style={{ background: 'var(--background)', padding: '0 12px', position: 'relative', zIndex: 1 }}>
              or try our new feature
            </span>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border)', zIndex: 0 }} />
          </div>

          <div style={{
            padding: 'var(--space-4)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span>NEW: Conversational Exam Builder</span>
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '12px' }}>
                  Let Dash AI guide you step-by-step. Choose topics, adjust difficulty, and refine each section in real-time!
                </p>
                <button
                  onClick={() => setShowConversationalBuilder(true)}
                  className="btn btnPrimary"
                  style={{ fontSize: '14px' }}
                >
                  <MessageSquare className="icon16" />
                  Start Conversational Builder
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
