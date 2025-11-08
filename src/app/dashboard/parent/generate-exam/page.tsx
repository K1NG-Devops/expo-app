'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { useParentDashboardData } from '@/lib/hooks/useParentDashboardData';
import { ExamInteractiveView } from '@/components/dashboard/exam-prep/ExamInteractiveView';
import { useExamSession } from '@/lib/hooks/useExamSession';
import { createClient } from '@/lib/supabase/client';
import { parseExamMarkdown } from '@/lib/examParser';
import { Loader2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Printer, Share2, PlusCircle } from 'lucide-react';

function GenerateExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userId,
    profile,
    childrenCards,
    activeChildId,
    setActiveChildId,
    childrenLoading,
    metrics,
    unreadCount,
    trialStatus,
    loading: dashboardLoading,
    hasOrganization,
    usageType
  } = useParentDashboardData();
  
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<any>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('Initializing...');
  const hasGeneratedRef = useRef(false);
  
  const { saveExamGeneration } = useExamSession(null);
  
  // New: view existing exam by id (bypass generation)
  const viewId = searchParams.get('id');
  const isViewMode = !!viewId;

  // Helper: normalize any tool output into ParsedExam-like structure our UI expects
  const normalizeExam = (raw: any): any | null => {
    if (!raw) return null;
    const examObj = raw.success && raw.data ? raw.data : raw;

    // Normalize sections to array
    let sections: any = examObj.sections || examObj.data?.sections || examObj.params?.sections;
    if (!sections) return null;

    if (!Array.isArray(sections)) {
      // If object/dictionary, convert to array preserving order by key
      if (typeof sections === 'object') {
        sections = Object.values(sections);
      } else {
        return null;
      }
    }

    // Normalize each section and question
    let qCounter = 0;
    const normSections = sections.map((sec: any, sIdx: number) => {
      // Section may be { title, questions } or { name, items } etc.
      const title = sec.title || sec.name || `Section ${String.fromCharCode(65 + sIdx)}`;
      let questions = sec.questions || sec.items || sec.qs || [];
      if (!Array.isArray(questions) && typeof questions === 'object') {
        questions = Object.values(questions);
      }
      if (!Array.isArray(questions)) questions = [];

      const normQuestions = questions.map((q: any) => {
        const id = q.id || `q-${++qCounter}`;
        const text = q.text || q.question || q.prompt || '';
        const options = q.options || q.choices || undefined;
        const marks = Number(q.marks ?? q.points ?? 1) || 1;
        const type = (q.type || (
          options ? 'multiple_choice' : (typeof q.correct_answer === 'number' || /\d/.test(String(q.correct_answer || '')) ? 'numeric' : 'short_answer')
        )) as any;
        const correctAnswer = q.correctAnswer ?? q.correct_answer ?? q.answer ?? undefined;
        const diagram = q.diagram || undefined;
        return {
          id,
          text,
          options,
          marks,
          type,
          correctAnswer,
          diagram,
        };
      });

      return { title, questions: normQuestions };
    });

    // Compute total marks
    const totalMarks = normSections.reduce((sum: number, s: any) => sum + s.questions.reduce((qSum: number, q: any) => qSum + (Number(q.marks) || 0), 0), 0);

    return {
      title: examObj.title || `${(examObj.grade || '').toString().replace('grade_', 'Grade ')} ${(examObj.subject || 'Practice Test')}`.trim(),
      grade: examObj.grade,
      subject: examObj.subject,
      instructions: examObj.instructions || [],
      sections: normSections,
      totalMarks: totalMarks || examObj.totalMarks || 0,
      hasMemo: !!examObj.memo || !!examObj.answers,
    };
  };

  // Get params from URL
  const grade = searchParams.get('grade');
  const subject = searchParams.get('subject');
  const examType = searchParams.get('type');
  const language = searchParams.get('language') || 'en-ZA';
  const subjectLanguage = searchParams.get('subjectLanguage') || '';
  const customPromptParam = searchParams.get('prompt');

  // Helper: subject display with HL/FAL language
  const subjectDisplay = (() => {
    if (!subject) return '';
    const langShort: Record<string, string> = {
      'en-ZA': 'English',
      'af-ZA': 'Afrikaans',
      'zu-ZA': 'isiZulu',
      'xh-ZA': 'isiXhosa',
      'nso-ZA': 'Sepedi',
    };
    if (subject === 'Home Language' && subjectLanguage) return `${langShort[subjectLanguage] || subjectLanguage} Home Language`;
    if (subject?.startsWith('First Additional Language') && subjectLanguage) return `${langShort[subjectLanguage] || subjectLanguage} First Additional Language`;
    return subject;
  })();

  // Use the subject-specific language when HL/FAL; otherwise use UI language
  const effectiveLanguage = (subject && (subject === 'Home Language' || subject.startsWith('First Additional Language')) && subjectLanguage)
    ? subjectLanguage
    : language;

  useEffect(() => {
    if (isViewMode) {
      // Load previously saved exam and render immediately
      (async () => {
        try {
          setProgress('Loading saved exam...');
          const supabase = createClient();
          const { data, error } = await supabase
            .from('exam_generations')
            .select('*')
            .eq('id', viewId)
            .single();
          if (error) throw error;
          const parsed = typeof data.generated_content === 'string'
            ? JSON.parse(data.generated_content)
            : data.generated_content;
          setExam(parsed);
          setGenerationId(data.id);
          setGenerating(false);
          setProgress('Ready!');
        } catch (e: any) {
          console.error('[GenerateExam] Failed to load saved exam:', e);
          setError('Could not load the saved exam.');
          setGenerating(false);
          setProgress('');
        }
      })();
    }
  }, [isViewMode, viewId]);
  
  useEffect(() => {
    if (isViewMode) return; // Skip generation in view mode
    if (!grade || !subject || !examType) {
      setError('Missing exam parameters. Please go back and try again.');
      setGenerating(false);
      return;
    }
    
    if (!userId || dashboardLoading || hasGeneratedRef.current) {
      return;
    }
    
    hasGeneratedRef.current = true;
    generateExam();
  }, [grade, subject, examType, userId, dashboardLoading, isViewMode]);
  
  const generateExam = async () => {
    setGenerating(true);
    setError(null);
    setProgress('Preparing your exam...');
    
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const gradeDisplay = grade!.replace('grade_', 'Grade ').replace('_', ' ');
      const displaySubject = subjectDisplay || subject;

      // Try to pull CAPS seeded content via RAG to guide generation
      let ragContext = '';
      try {
        setProgress('Fetching syllabus context...');
        const ragQuery = `Give a concise CAPS-aligned outline for ${gradeDisplay} ${displaySubject} (${examType}). Include key topics, subtopics and outcomes aligned to term weighting. Respond in ${effectiveLanguage}. Use bullet points.`;
        const { data: rag, error: ragErr } = await supabase.functions.invoke('rag-answer', {
          body: {
            conversation_id: `exam-${userId || 'anon'}-${(grade||'').toString()}-${(subject||'').toString()}`.slice(0, 60),
            message: ragQuery,
            top_k: 8,
            filters: { grade: grade, subject }
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ragErr && (rag as any)?.answer) {
          ragContext = String((rag as any).answer).slice(0, 2000);
          console.log('[GenerateExam] Using RAG context (len):', ragContext.length);
        } else {
          console.warn('[GenerateExam] RAG not available or empty; proceeding without seeded context');
        }
      } catch (e) {
        console.warn('[GenerateExam] RAG fetch failed; proceeding without seeded context');
      }

      // Base prompt with explicit length/marks and sections
      const basePrompt = `TASK: Generate a CAPS-aligned ${displaySubject} exam for ${gradeDisplay}.

${ragContext ? `CAPS CONTEXT (use to choose topics and difficulty):\n${ragContext}\n\n` : ''}Return the exam in STRICT MARKDOWN that our parser understands with:
- A title line (e.g. "# ${gradeDisplay} ${displaySubject} Practice Test")
- Sections labeled "Section A", "Section B" OR Afrikaans "Afdeling A", "Afdeling B" using H2 (##)
- Target length and marks: MIN 20 questions total and ~100 total marks
- Section A: at least 10 short/MCQ questions (2–4 marks each)
- Section B: at least 7 numeric/short-answer (3–6 marks each)
- Section C: 3 extended problems or reasoning questions (6–10 marks each) if appropriate
- Each question numbered like "1." and include marks in parentheses at end (e.g. "(3)")
- Multiple choice options listed as A) B) C) D) when applicable (each on its own line)
- End with a "## Memo" section with numbered answers (e.g. "1. C")
- Use ${effectiveLanguage} for all text

Do not include any extraneous commentary. Output ONLY the exam markdown.`;

      const stricterSuffix = `\n\nSTRICT FORMAT RULES:\n- Use H2 headings (##) for sections, exactly as "## Section A" or "## Afdeling A"\n- Start every option line with a capital letter followed by ")" and a space, e.g. "A) Option text"\n- Put marks at the end of each question in parentheses, e.g. "(3)"\n- End with a H2 heading "## Memo" followed by one answer per question on new lines\n- No explanations, no extra prose`;

      const attempts = [basePrompt, basePrompt + stricterSuffix];

      let lastError: unknown = null;
      for (let attempt = 0; attempt < attempts.length; attempt++) {
        const prompt = customPromptParam ? `${attempts[attempt]}\n\nUSER NOTES: ${customPromptParam}` : attempts[attempt];

        setProgress(attempt === 0 ? 'Asking Dash AI to generate your exam...' : 'Retrying with stricter instructions...');
        const { data, error: invokeError } = await supabase.functions.invoke('ai-proxy', {
          body: {
            scope: 'parent',
            service_type: 'dash_conversation',
            enable_tools: false,
            payload: {
              prompt,
              context: 'caps_exam_preparation',
              metadata: {
                source: 'exam_generator',
                language: effectiveLanguage,
                subjectLanguage: subjectLanguage || undefined,
                grade,
                subject,
                examType,
                enableInteractive: true
              }
            },
            metadata: { role: 'parent' }
          }
        })
        
        if (invokeError) {
          console.error('[GenerateExam] Invoke error:', invokeError)
          const msg = typeof invokeError?.message === 'string' ? invokeError.message : ''
          if (/429|Too Many Requests|quota|rate limit/i.test(msg)) {
            throw new Error('AI quota reached or temporarily rate-limited. Please try again later or upgrade your plan.')
          }
          lastError = invokeError
          continue
        }
        
        console.log('[GenerateExam] AI Response:', JSON.stringify(data, null, 2));
        setProgress('Parsing exam content...');
        const content = data?.content || '';
        const parsedExam = content ? parseExamMarkdown(content) : null;
        if (parsedExam) {
          setProgress('Saving your exam...');
          const displayTitle = parsedExam.title || `${gradeDisplay} ${displaySubject} Practice Test`;
          const genId = await saveExamGeneration(
            { ...parsedExam, title: displayTitle },
            prompt,
            displayTitle,
            parsedExam.grade || grade!,
            parsedExam.subject || subject!
          );
          setGenerationId(genId);
          setExam({ ...parsedExam, title: displayTitle });
          setGenerating(false);
          setProgress('Ready!');
          return;
        } else {
          console.warn('[GenerateExam] Parse failed on attempt', attempt + 1, '- will', attempt === attempts.length - 1 ? 'stop' : 'retry');
        }
      }

      // If both attempts failed
      throw lastError || new Error('Failed to parse exam data from AI response');
      
    } catch (err: any) {
      console.error('[GenerateExam] Error:', err)
      console.error('[GenerateExam] Full error details:', {
        message: err.message,
        stack: err.stack,
        data: err.data
      })
      const friendly = typeof err?.message === 'string' && /429|quota|rate limit|Too Many Requests/i.test(err.message)
        ? 'You have reached your current AI usage limit. Please wait and try again, or upgrade to increase your quota.'
        : (err.message || 'Failed to generate exam. Please try again.')
      setError(friendly)
      setGenerating(false)
      setProgress('')
    }
  };
  
  const handleClose = () => {
    router.push('/dashboard/parent');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const handleShare = async () => {
    try {
      const url = typeof window !== 'undefined'
        ? (generationId ? `${window.location.origin}/dashboard/parent/generate-exam?id=${generationId}` : window.location.href)
        : '';
      const title = exam?.title || 'CAPS Practice Exam';
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    } catch (e) {
      console.error('[GenerateExam] Share failed:', e);
    }
  };

  const handleNewPaper = () => {
    router.push('/dashboard/parent');
  };

  if (dashboardLoading || !userId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <Loader2 className="icon32" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  
  return (
    <ParentShell
      userEmail={profile?.email}
      userName={profile?.firstName || 'User'}
      preschoolName={profile?.preschoolName}
      unreadCount={unreadCount}
      hasOrganization={hasOrganization}
    >
      <div style={{ padding: 'var(--space-4)' }}>
        {generating && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '1.5rem'
          }}>
            <div style={{
              position: 'relative',
              width: '80px',
              height: '80px'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'spin 2s linear infinite'
              }}>
                <Loader2 
                  className="icon32" 
                  style={{ 
                    color: 'var(--primary)',
                  }} 
                />
              </div>
              <Sparkles 
                className="icon32" 
                style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'var(--primary)',
                  animation: 'pulse 2s ease-in-out infinite'
                }} 
              />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                marginBottom: 'var(--space-2)',
                color: 'var(--text)'
              }}>
                Generating Your Exam
              </h1>
              <p style={{ 
                fontSize: '15px',
                color: 'var(--muted)', 
                marginBottom: 'var(--space-4)',
                maxWidth: '500px'
              }}>
                Dash AI is creating a {grade?.replace('grade_', 'Grade ').replace('_', ' ')} {subjectDisplay || subject} exam for you.
                <br />
                This may take 15-30 seconds.
              </p>
            </div>
            
            <div style={{
              padding: '1rem 2rem',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary)',
                animation: 'pulseOpacity 1.5s ease-in-out infinite'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                {progress}
              </span>
            </div>
            
            <button 
              onClick={handleClose}
              className="btn"
              style={{ marginTop: 'var(--space-4)' }}
            >
              <ArrowLeft className="icon16" />
              Cancel
            </button>
          </div>
        )}
        
        {error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem',
            minHeight: '60vh',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(var(--danger-rgb), 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle className="icon32" style={{ color: 'var(--danger)' }} />
            </div>
            
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                marginBottom: 'var(--space-2)' 
              }}>
                Generation Failed
              </h2>
              <p style={{ 
                color: 'var(--muted)', 
                fontSize: '15px',
                marginBottom: 'var(--space-4)'
              }}>
                {error}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={handleClose} className="btn">
                <ArrowLeft className="icon16" />
                Go Back
              </button>
              <button 
                onClick={() => {
                  hasGeneratedRef.current = false;
                  generateExam();
                }} 
                className="btn btnPrimary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {exam && !generating && (
          <>
            {/* Action Toolbar */}
            <div className="exam-toolbar" style={{
              display: 'flex',
              gap: 'var(--space-2)',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)'
            }}>
              <div>
                <button className="btn toolbar-btn" onClick={handleClose} aria-label="Back to Exam Prep">
                  <ArrowLeft className="icon16" />
                  <span className="label">Back to Exam Prep</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn toolbar-btn" onClick={handlePrint} aria-label="Print / Save PDF">
                  <Printer className="icon16" />
                  <span className="label">Print / Save PDF</span>
                </button>
                <button className="btn toolbar-btn" onClick={handleShare} aria-label="Share">
                  <Share2 className="icon16" />
                  <span className="label">Share</span>
                </button>
                <button className="btn btnPrimary toolbar-btn" onClick={handleNewPaper} aria-label="Generate Another Paper">
                  <PlusCircle className="icon16" />
                  <span className="label">Generate Another Paper</span>
                </button>
              </div>
            </div>

            <style jsx>{`
              .exam-toolbar { position: sticky; top: 0; background: var(--bg); padding: 8px 0; z-index: 5; }
              .toolbar-btn { display: inline-flex; align-items: center; gap: 8px; }
              @media (max-width: 480px) {
                .exam-toolbar { gap: 8px; padding-top: 6px; padding-bottom: 6px; }
                .toolbar-btn .label { display: none; }
                .toolbar-btn { padding: 8px; }
              }
            `}</style>

            <ExamInteractiveView
              exam={exam}
              generationId={generationId}
              onClose={handleClose}
            />
          </>
        )}
      </div>
    </ParentShell>
  );
}

export default function GenerateExamPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <Loader2 className="icon32" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <GenerateExamContent />
    </Suspense>
  );
}
