"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { useParentDashboardData } from '@/lib/hooks/useParentDashboardData';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft, FileText, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Simple renderers for non-exam resources
function RevisionNotes({ content }: { content: string }) {
  return (
    <div className="markdown-content" style={{ lineHeight: 1.6 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function StudyGuide({ content }: { content: string }) {
  return (
    <div className="markdown-content" style={{ lineHeight: 1.6 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function FlashcardsView({ cards }: { cards: { front: string; back: string }[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const total = cards.length;

  const prev = () => { setFlipped(false); setIndex(i => Math.max(0, i - 1)); };
  const next = () => { setFlipped(false); setIndex(i => Math.min(total - 1, i + 1)); };

  const card = cards[index];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <span className="muted" style={{ fontSize: 13 }}>{index + 1} / {total}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={prev} disabled={index === 0}>Prev</button>
          <button className="btn" onClick={() => setFlipped(f => !f)}>Flip</button>
          <button className="btn" onClick={next} disabled={index === total - 1}>Next</button>
        </div>
      </div>
      <div
        onClick={() => setFlipped(f => !f)}
        className="card"
        style={{ padding: '32px', minHeight: 180, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
      >
        {flipped ? card.back : card.front}
      </div>
    </div>
  )
}

function GenerateResourceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, profile, unreadCount, hasOrganization, loading: dashboardLoading } = useParentDashboardData();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<any>(null);

  const grade = searchParams.get('grade');
  const subject = searchParams.get('subject');
  const type = searchParams.get('type'); // revision_notes | study_guide | flashcards
  const language = searchParams.get('language') || 'en-ZA';
  const subjectLanguage = searchParams.get('subjectLanguage') || '';

  const effectiveLanguage = (subject && (subject === 'Home Language' || subject.startsWith('First Additional Language')) && subjectLanguage)
    ? subjectLanguage
    : language;

  useEffect(() => {
    if (!userId || dashboardLoading) return;
    if (!grade || !subject || !type) { setError('Missing parameters'); setLoading(false); return; }

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        // Build prompt per type
        let toolName = 'generate_caps_exam';
        let prompt = '';
        if (type === 'revision_notes') {
          toolName = undefined as any; // no tool, plain text
          prompt = `Create concise CAPS-aligned revision notes for ${grade.replace('grade_', 'Grade ')} ${subject} in ${effectiveLanguage}. Use clear headings, bullet points, key formulas/definitions, and short examples. Output plain markdown.`;
        } else if (type === 'study_guide') {
          toolName = undefined as any;
          prompt = `Create a 7-day study guide for ${grade.replace('grade_', 'Grade ')} ${subject} in ${effectiveLanguage}. Include daily goals, topics, short tasks, and quick practice ideas. Output plain markdown with headings.`;
        } else if (type === 'flashcards') {
          toolName = undefined as any;
          prompt = `Generate 24 concise Q&A flashcards for ${grade.replace('grade_', 'Grade ')} ${subject} in ${effectiveLanguage}. Return ONLY JSON as {"cards":[{"front":"Question","back":"Answer"}, ...]}. Keep items short and clear.`;
        }

        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            scope: 'parent',
            service_type: 'dash_conversation',
            enable_tools: !!toolName,
            tool_choice: toolName ? { type: 'tool', name: toolName } : undefined,
            payload: { prompt, context: 'caps_exam_preparation', metadata: { type, language: effectiveLanguage, subjectLanguage: subjectLanguage || undefined, grade, subject } },
            metadata: { role: 'parent' }
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error) throw error;

        if (type === 'flashcards') {
          let parsed: any = null;
          try {
            parsed = typeof data?.text === 'string' ? JSON.parse(data.text) : (typeof data?.content === 'string' ? JSON.parse(data.content) : data);
          } catch {
            // try to extract JSON
            const raw = (data?.text || data?.content || '') as string;
            const m = raw.match(/\{[\s\S]*\}/);
            parsed = m ? JSON.parse(m[0]) : null;
          }
          const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
          setResource({ kind: 'flashcards', cards });
        } else {
          const text: string = (data?.text || data?.content || '') as string;
          setResource({ kind: type, text });
        }
      } catch (e: any) {
        console.error('[generate-resource] error', e);
        setError(e.message || 'Failed to generate');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, dashboardLoading, grade, subject, type, language, subjectLanguage]);

  const goBack = () => router.push('/dashboard/parent');

  if (dashboardLoading || !userId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
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
      <div style={{ padding: 'var(--space-4)', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <button className="btn" onClick={goBack}><ArrowLeft className="icon16" />Back to Exam Prep</button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn" onClick={() => location.reload()}><Sparkles className="icon16" /> Regenerate</button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '10vh 0' }}>
            <Loader2 className="icon32" style={{ animation: 'spin 1s linear infinite' }} />
            <p className="muted" style={{ marginTop: 12 }}>Generating your resource…</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 24 }}>
            <p>{error}</p>
            <button className="btn" onClick={goBack}><ArrowLeft className="icon16" />Back</button>
          </div>
        )}

        {!loading && !error && resource && (
          <div className="card" style={{ padding: 24 }}>
            {resource.kind === 'revision_notes' && <RevisionNotes content={resource.text} />}
            {resource.kind === 'study_guide' && <StudyGuide content={resource.text} />}
            {resource.kind === 'flashcards' && <FlashcardsView cards={resource.cards} />}
          </div>
        )}
      </div>
    </ParentShell>
  );
}

export default function GenerateResourcePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 className="icon32" style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <GenerateResourceInner />
    </Suspense>
  );
}
