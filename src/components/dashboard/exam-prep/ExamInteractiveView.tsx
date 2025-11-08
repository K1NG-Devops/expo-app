'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, FileCheck, AlertCircle, Bot, Sparkles } from 'lucide-react';
import { ParsedExam, ExamQuestion, gradeAnswer } from '@/lib/examParser';
import { useExamSession } from '@/lib/hooks/useExamSession';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExamDiagram } from './ExamDiagram';
import { DrawingInput } from './DrawingInput';

interface ExamInteractiveViewProps {
  exam: ParsedExam;
  generationId?: string | null;
  onClose?: () => void;
}

interface StudentAnswers {
  [questionId: string]: string;
}

interface QuestionFeedback {
  isCorrect: boolean;
  feedback: string;
  marks: number;
}

export function ExamInteractiveView({ exam, generationId, onClose }: ExamInteractiveViewProps) {
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswers>({});
  const [workings, setWorkings] = useState<Record<string, string>>({});
  const [showWorking, setShowWorking] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, QuestionFeedback>>({});
  const [score, setScore] = useState<{ earned: number; total: number } | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  // Store corrected memo answers per question
  const [correctedAnswers, setCorrectedAnswers] = useState<Record<string, string | number>>({});
  
  const { saveProgress } = useExamSession(generationId || null);
  
  // Height of the fixed submit bar (used to add bottom padding so content isn't hidden)
  const submitBarHeight = isMobile ? 100 : 88;

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };  

  const handleWorkingChange = (questionId: string, value: string) => {
    setWorkings((prev) => ({ ...prev, [questionId]: value }));
  };
  
  /**
   * Get AI-powered explanations for incorrect answers
   */
  const supabase = createClient();

  // Individual question explanation
  const getAIExplanation = async (questionId: string) => {
    setLoadingExplanations(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user?.id) {
      console.error('User not authenticated');
      setLoadingExplanations(false);
      return;
    }

    const questionFeedback = feedback[questionId];
    const question = exam.sections.flatMap(s => s.questions).find((q) => q.id === questionId);
    if (!question || !questionFeedback) {
      setLoadingExplanations(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const langMeta: any = {};
      if ((exam.subject === 'Home Language' || (exam.subject || '').startsWith('First Additional Language')) && (exam as any).subjectLanguage) {
        langMeta.subjectLanguage = (exam as any).subjectLanguage;
      }

      const prompt = `You are a CAPS-aligned South African tutor. A student answered this question incorrectly:\n\nQuestion: ${question.text}\n${question.type === 'multiple_choice' ? `Options:\n${question.options?.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n')}` : ''}\n\nStudent's Answer: ${studentAnswers[questionId]}\nCorrect Answer: ${question.correctAnswer}\n\nPlease provide a clear, encouraging explanation in 2-3 sentences that:\n1. Explains why their answer was wrong\n2. Teaches the correct concept\n3. Encourages them to keep learning\n\nUse simple language appropriate for ${exam.grade || "the learner's grade"}.`;

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'parent',
          service_type: 'homework_help',
          enable_tools: false,
          payload: { prompt },
          metadata: { role: 'parent', language: (exam as any).language || undefined, ...langMeta }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw error;

      const text: string | undefined = (data && (data.text || data.content)) as string | undefined;
      if (text) {
        setExplanations((prev) => ({
          ...prev,
          [questionId]: text,
        }));
      } else {
        setExplanations((prev) => ({
          ...prev,
          [questionId]: 'No explanation available at the moment. Please try again shortly.'
        }));
      }
    } catch (err: any) {
      console.error('Error getting AI explanation:', err);
      const msg = typeof err?.message === 'string' ? err.message : '';
      setExplanations((prev) => ({
        ...prev,
        [questionId]: /429|quota|rate limit|Too Many Requests/i.test(msg)
          ? 'AI usage is temporarily limited. Please try again in a few minutes.'
          : 'We could not fetch an explanation right now. Please try again.'
      }));
    }

    setLoadingExplanations(false);
  };

  const getAIExplanations = async () => {
    setLoadingExplanations(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user?.id) {
      console.error('User not authenticated');
      setLoadingExplanations(false);
      return;
    }

    const wrongAnswers = Object.entries(feedback).filter(([_, f]) => !f.isCorrect);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      for (const [questionId] of wrongAnswers) {
        const question = exam.sections.flatMap(s => s.questions).find((q) => q.id === questionId);
        if (!question) continue;

        const prompt = `You are a CAPS-aligned South African tutor. A student answered this question incorrectly:\n\nQuestion: ${question.text}\n${question.type === 'multiple_choice' ? `Options:\n${question.options?.map((opt, i) => `${String.fromCharCode(97 + i)}) ${opt}`).join('\n')}` : ''}\n\nStudent's Answer: ${studentAnswers[questionId]}\nCorrect Answer: ${question.correctAnswer}\n\nPlease provide a clear, encouraging explanation in 2-3 sentences that:\n1. Explains why their answer was wrong\n2. Teaches the correct concept\n3. Encourages them to keep learning\n\nUse simple language appropriate for ${exam.grade || 'the learner\'s grade'}.`;

        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            scope: 'parent',
            service_type: 'homework_help',
            enable_tools: false,
            payload: { prompt },
            metadata: { role: 'parent' }
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (error) throw error;

        const text: string | undefined = (data && (data.text || data.content)) as string | undefined;
        if (text) {
          setExplanations((prev) => ({
            ...prev,
            [questionId]: text,
          }));
        }
      }
    } catch (err) {
      console.error('Error getting AI explanations:', err);
    }

    setLoadingExplanations(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const feedbackResults: Record<string, QuestionFeedback> = {};
    let earnedMarks = 0;

    exam.sections.forEach((section) => {
      section.questions.forEach((question) => {
        const answer = studentAnswers[question.id] || '';
        const qForGrading = { ...question, correctAnswer: correctedAnswers[question.id] ?? question.correctAnswer } as ExamQuestion;
        const result = gradeAnswer(qForGrading, answer);
        feedbackResults[question.id] = result;
        earnedMarks += result.marks;
      });
    });

    setFeedback(feedbackResults);
    const finalScore = { earned: earnedMarks, total: exam.totalMarks };
    setScore(finalScore);
    setSubmitted(true);

    // Save progress to database (include workings under keys `working:<id>`)
    const answersToSave: Record<string, string> = { ...studentAnswers };
    Object.entries(workings).forEach(([qid, val]) => { answersToSave[`working:${qid}`] = val; });

    await saveProgress(
      answersToSave,
      finalScore,
      exam.title,
      exam.grade || 'Grade 12',
      exam.subject || 'General'
    );
    
    setSaving(false);

    // Scroll to top to see results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Re-check memo with AI or local solver for numeric questions
  const recheckMemo = async (questionId: string) => {
    const question = exam.sections.flatMap(s => s.questions).find(q => q.id === questionId);
    if (!question) return;
    // Try local solver first
    if (question.type === 'numeric') {
      const local = localSolvePriceProblem(question.text);
      if (typeof local.answer === 'number') {
        setCorrectedAnswers(prev => ({ ...prev, [questionId]: local.answer! }));
        // Re-grade just this question
        const ans = studentAnswers[questionId] || '';
        const result = gradeAnswer({ ...question, correctAnswer: local.answer } as ExamQuestion, ans);
        setFeedback(prev => ({ ...prev, [questionId]: result }));
        // Also attach an auto explanation if missing
        setExplanations(prev => ({
          ...prev,
          [questionId]: `Working: ${local.steps}\n\nTherefore, the total is R${local.answer}.`
        }));
        return;
      }
    }
    // Fall back to AI compute
    try {
      setLoadingExplanations(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const prompt = `Solve this question and return only JSON as {"answer": "<final>"}. If currency appears, include the currency symbol.\n\nQuestion: ${question.text}`;
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'parent',
          service_type: 'homework_help',
          enable_tools: false,
          payload: { prompt },
          metadata: { role: 'parent' }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      let val: string | number | undefined;
      try {
        const parsed = typeof data?.text === 'string' && data.text.trim().startsWith('{')
          ? JSON.parse(data.text)
          : (typeof data?.content === 'string' && data.content.trim().startsWith('{') ? JSON.parse(data.content) : undefined);
        val = parsed?.answer;
      } catch {}
      if (!val && (data?.text || data?.content)) {
        const src = (data.text || data.content) as string;
        const num = src.match(/R?\s?\d+(?:\.\d+)?/);
        if (num) val = num[0].replace(/\s/g, '');
      }
      if (val !== undefined) {
        setCorrectedAnswers(prev => ({ ...prev, [questionId]: val as any }));
        const ans = studentAnswers[questionId] || '';
        const result = gradeAnswer({ ...question, correctAnswer: val as any } as ExamQuestion, ans);
        setFeedback(prev => ({ ...prev, [questionId]: result }));
      }
    } catch (e) {
      console.error('Recheck memo failed:', e);
    } finally {
      setLoadingExplanations(false);
    }
  };

  const localSolvePriceProblem = (text: string): { answer?: number; steps?: string } => {
    try {
      const lower = text.toLowerCase();
      // Extract item prices: "a book costs R15" or "book costs 15"
      const priceRegex = /(\b[a-z]+\b)\s+costs?\s*r?\s*(\d+(?:\.\d+)?)/gi;
      const prices: Record<string, number> = {};
      let m: RegExpExecArray | null;
      while ((m = priceRegex.exec(lower))) {
        const item = m[1].replace(/[^a-z]/g, '');
        prices[item] = parseFloat(m[2]);
      }
      // Extract quantities: "2 books", "3 pens"
      const qtyRegex = /(\d+)\s+(\b[a-z]+s\b)/gi;
      const qtys: Record<string, number> = {};
      while ((m = qtyRegex.exec(lower))) {
        const n = parseFloat(m[1]);
        const plural = m[2].replace(/[^a-z]/g, '');
        const singular = plural.replace(/s$/, '');
        qtys[singular] = (qtys[singular] || 0) + n;
      }
      const items = Object.keys(qtys);
      if (items.length === 0 || Object.keys(prices).length === 0) return {};
      let total = 0;
      const parts: string[] = [];
      for (const item of items) {
        if (prices[item] !== undefined) {
          const sub = qtys[item] * prices[item];
          total += sub;
          parts.push(`${qtys[item]} ${item}${qtys[item] === 1 ? '' : 's'} × R${prices[item]} = R${sub}`);
        }
      }
      if (total > 0) {
        return { answer: total, steps: parts.join(' + ') + ` → Total = R${total}` };
      }
      return {};
    } catch {
      return {};
    }
  };

  const renderQuestion = (question: ExamQuestion) => {
    const answer = studentAnswers[question.id] || '';
    const questionFeedback = feedback[question.id];
    const isAnswered = answer.trim() !== '';

    const builtInExplanation = (question as any).explanation || (question as any).solution || (question as any).rationale || '';
    const finalExplanation = explanations[question.id] || builtInExplanation;

    const isDrawing = (question as any).type === 'drawing' || /\b(draw|sketch|diagram|picture)\b/i.test(question.text);

    return (
      <div
        key={question.id}
        style={{
          padding: 'var(--space-4)',
          background: 'var(--card)',
          borderRadius: isMobile ? '0' : 'var(--radius-2)',
          ...(submitted ? {
            borderTop: `2px solid ${questionFeedback?.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
            borderRight: `2px solid ${questionFeedback?.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
            borderBottom: `2px solid ${questionFeedback?.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
            borderLeft: `2px solid ${questionFeedback?.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
          } : {
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
          }),
          marginBottom: isMobile ? '0' : 'var(--space-4)',
        }}
      >
        {/* Question Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 'var(--space-2)' }}>
              {question.text}
            </p>
          </div>
          <div style={{
            background: 'var(--primary)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 'var(--radius-1)',
            fontSize: 12,
            fontWeight: 600,
            marginLeft: 'var(--space-2)',
          }}>
            [{question.marks} {question.marks === 1 ? 'mark' : 'marks'}]
          </div>
        </div>

        {/* Diagram (if present) */}
        {question.diagram && <ExamDiagram diagram={question.diagram} />}

        {/* Question Input */}
        {isDrawing ? (
          <DrawingInput
            value={typeof answer === 'string' ? answer : ''}
            onChange={(data) => handleAnswerChange(question.id, data)}
          />
        ) : question.type === 'multiple_choice' && question.options ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {question.options.map((option, idx) => {
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = answer === optionLetter;
              return (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'var(--space-3)',
                    background: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-2)',
                    cursor: submitted ? 'not-allowed' : 'pointer',
                    opacity: submitted ? 0.7 : 1,
                  }}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={optionLetter}
                    checked={isSelected}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={submitted}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  <span style={{ fontSize: 14 }}>
                    <strong>{optionLetter}.</strong> {option}
                  </span>
                </label>
              );
            })}
          </div>
        ) : question.type === 'essay' ? (
          <textarea
            value={answer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            disabled={submitted}
            placeholder="Write your answer here..."
            rows={6}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        ) : (
          <input
            type={question.type === 'numeric' ? 'number' : 'text'}
            value={answer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            disabled={submitted}
            placeholder="Enter your answer..."
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
            }}
          />
        )}

        {/* Optional Working Area for multi-mark questions */}
        {(['numeric', 'short_answer', 'essay'] as any).includes(question.type) && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            {!showWorking[question.id] ? (
              <button
                className="btn"
                onClick={() => setShowWorking(prev => ({ ...prev, [question.id]: true }))}
                disabled={submitted}
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                Add Working / Steps
              </button>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Working (optional)</label>
                <textarea
                  value={workings[question.id] || ''}
                  onChange={(e) => handleWorkingChange(question.id, e.target.value)}
                  disabled={submitted}
                  placeholder="Show your steps and calculations here..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-2)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {submitted && questionFeedback && (
          <>
            <div
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: questionFeedback.isCorrect
                  ? 'rgba(16, 185, 129, 0.12)' // brighter success
                  : 'rgba(255, 59, 48, 0.1)',
                borderRadius: 'var(--radius-2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
              }}
            >
              {questionFeedback.isCorrect ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
              ) : (
                <XCircle className="w-5 h-5" style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, margin: 0 }}>{questionFeedback.feedback.replace('Awaiting teacher review', 'Dash will review this answer')}</p>
                <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                  Marks awarded: {questionFeedback.marks}/{question.marks}
                </p>
                
                {/* Reveal correct answer and explanation when toggled */}
                {showAnswers && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {typeof question.correctAnswer !== 'undefined' && (
                      <p style={{ fontSize: 13, margin: 0 }}>
                        <strong>Correct answer:</strong> {String(question.correctAnswer)}
                      </p>
                    )}
                    {finalExplanation && (
                      <div className="markdown-content" style={{ fontSize: 13, marginTop: '6px' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalExplanation}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Individual Explain Button for Wrong Answers */}
                {!questionFeedback.isCorrect && !explanations[question.id] && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      onClick={() => getAIExplanation(question.id)}
                      disabled={loadingExplanations}
                      style={{
                        marginTop: 'var(--space-2)',
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, var(--primary), rgba(124, 58, 237, 0.8))',
                        color: '#fff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      {loadingExplanations ? 'Loading...' : 'Explain Answer'}
                    </button>
                    {question.type === 'numeric' && (
                      <button
                        className="btn"
                        onClick={() => recheckMemo(question.id)}
                        disabled={loadingExplanations}
                        style={{ marginTop: 'var(--space-2)', padding: '6px 12px', fontSize: 12 }}
                      >
                        Recheck Memo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Explanation (if available) */}
            {explanations[question.id] && (
              <div style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-4)',
                background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12), rgba(52, 199, 89, 0.22))',
                borderRadius: 'var(--radius-2)',
                borderLeft: '3px solid #34D399', // brighter green
                boxShadow: '0 2px 8px rgba(52, 199, 89, 0.12)'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--primary)'
                }}>
                  <Bot className="icon20" />
                  <span style={{ fontSize: 15 }}>🤖 Dash AI Explanation</span>
                </div>
                <div className="markdown-content" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {explanations[question.id]}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const answeredCount = Object.values(studentAnswers).filter(a => a.trim() !== '').length;
  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div style={{ 
      maxWidth: isMobile ? '100vw' : 900, 
      margin: '0 auto', 
      padding: isMobile ? '0' : 'var(--space-4)',
      width: isMobile ? '100%' : 'auto',
      // Add bottom padding so the fixed bar never covers content
      paddingBottom: !submitted ? `calc(${submitBarHeight}px + env(safe-area-inset-bottom, 0px))` : undefined,
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--card)',
        borderRadius: isMobile ? '0' : 'var(--radius-2)',
        marginBottom: isMobile ? '0' : 'var(--space-4)',
        borderBottom: isMobile ? '1px solid var(--border)' : undefined,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>
          {exam.title}
        </h1>

        {/* Score Display (if submitted) */}
        {submitted && score && (
          <div style={{
            padding: 'var(--space-4)',
            background: score.earned / score.total >= 0.5
              ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(255, 149, 0, 0.1) 0%, rgba(255, 149, 0, 0.2) 100%)',
            borderRadius: 'var(--radius-2)',
            border: '2px solid',
            borderColor: score.earned / score.total >= 0.5 ? 'var(--success)' : 'var(--warning)',
            marginBottom: 'var(--space-3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>
              {score.earned}/{score.total}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {Math.round((score.earned / score.total) * 100)}% Score
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 'var(--space-2)', marginBottom: 0 }}>
              {score.earned / score.total >= 0.8 ? '🏆 Outstanding!' :
               score.earned / score.total >= 0.7 ? '✅ Well done!' :
               score.earned / score.total >= 0.5 ? '👍 Good effort!' :
               '💪 Keep practicing!'}
            </p>

            {/* Toggle to reveal answers & explanations after submission */}
            <div style={{ marginTop: 'var(--space-3)' }}>
              <button
                className="btn"
                onClick={() => setShowAnswers((v) => !v)}
                style={{ minWidth: 220 }}
              >
                {showAnswers ? 'Hide Answers & Explanations' : 'Show Answers & Explanations'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {exam.instructions && Array.isArray(exam.instructions) && exam.instructions.length > 0 && !submitted && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Instructions:
            </h3>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0 }}>
              {exam.instructions.map((instruction, idx) => (
                <li key={idx} style={{ fontSize: 14, marginBottom: 'var(--space-1)' }}>
                  {instruction}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress Indicator */}
        {!submitted && (
          <div style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 14 }}>
              Answered: {answeredCount}/{totalQuestions} questions
            </span>
          </div>
        )}
      </div>

      {/* Sections */}
      {exam.sections && Array.isArray(exam.sections) && exam.sections.map((section, sectionIdx) => (
        <div 
          key={sectionIdx} 
          style={{ 
            marginBottom: isMobile ? '0' : 'var(--space-4)',
            // Ensure last section has enough space above the fixed bar on all devices
            paddingBottom: (!submitted && sectionIdx === exam.sections.length - 1)
              ? `${submitBarHeight + 24}px`
              : '0'
          }}
        >
          <h2 style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: isMobile ? '0' : 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: isMobile ? '0' : 'var(--radius-2)',
          }}>
            {section.title}
          </h2>
          {section.questions && Array.isArray(section.questions) && section.questions.map(renderQuestion)}
        </div>
      ))}

      {/* Submit Button */}
      {!submitted && (
        <div style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-3)',
          paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          zIndex: 1000,
          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <button
              className="btn btnPrimary"
              onClick={handleSubmit}
              disabled={answeredCount === 0 || saving}
              style={{ 
                width: '100%', 
                fontSize: isMobile ? 18 : 16, 
                padding: isMobile ? 'var(--space-4) var(--space-3)' : 'var(--space-4)',
                fontWeight: 600
              }}
            >
              <FileCheck className="icon16" />
              {saving ? 'Submitting...' : `Submit Exam (${answeredCount}/${totalQuestions} answered)`}
            </button>
            {answeredCount === 0 && (
              <p className="muted text-center" style={{ fontSize: 12, marginTop: 'var(--space-2)', marginBottom: 0 }}>
                Please answer at least one question before submitting
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* AI Explanations Button */}
      {submitted && Object.values(feedback).some(f => !f.isCorrect) && (
        <div style={{ 
          marginTop: 'var(--space-4)', 
          padding: 'var(--space-4)',
          background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
          borderRadius: 'var(--radius-2)',
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <Sparkles style={{ width: 32, height: 32, color: 'var(--primary)', margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Need help understanding your mistakes?
          </h3>
          <p className="muted" style={{ fontSize: 14, marginBottom: 'var(--space-4)', maxWidth: 500, margin: '0 auto var(--space-4)' }}>
            Dash AI can provide detailed step-by-step explanations for each question you got wrong, helping you learn from your mistakes.
          </p>
          <button 
            className="btn btnPrimary"
            onClick={getAIExplanations}
            disabled={loadingExplanations || Object.keys(explanations).length > 0}
            style={{ 
              fontSize: 16, 
              padding: 'var(--space-3) var(--space-6)',
              minWidth: 280
            }}
          >
            <Bot className="icon20" />
            {loadingExplanations 
              ? 'Getting Explanations...' 
              : Object.keys(explanations).length > 0
              ? '✓ Explanations Loaded'
              : '🤖 Get AI Explanations'}
          </button>
          {Object.keys(explanations).length > 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)', marginBottom: 0 }}>
              ? Scroll up to see explanations for each incorrect answer
            </p>
          )}
        </div>
      )}

      {/* Close Button (after submission) */}
      {submitted && onClose && (
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <button
            className="btn btnSecondary"
            onClick={onClose}
            style={{ padding: 'var(--space-3) var(--space-6)' }}
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
