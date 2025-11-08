"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import TracingCanvas from '@/components/ecd/TracingCanvas';
import DragDropMatch, { MatchItem } from '@/components/ecd/DragDropMatch';
import CountAndTap from '@/components/ecd/CountAndTap';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ECDPlayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const saveSubmission = async (payload: Partial<{ type: string; title: string; score: number; total: number; percentage: number; thumbnail_url?: string; data?: any; rubric?: any; rubric_score?: number; rubric_total?: number }>) => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // fetch assigned teacher to attach
      const { data: prof } = await supabase.from('profiles').select('assigned_teacher_id, preschool_id').eq('id', userId).single();

      const insert = {
        user_id: userId,
        assigned_teacher_id: prof?.assigned_teacher_id || null,
        preschool_id: prof?.preschool_id || null,
        ...payload,
      } as any;

      const { error } = await supabase.from('activity_submissions').insert(insert);
      if (error) throw error;
      alert('Saved for teacher review!');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  // Sample data
  const left: MatchItem[] = [
    { id: 'square', label: 'Square' },
    { id: 'circle', label: 'Circle' },
    { id: 'triangle', label: 'Triangle' },
  ];
  const right: MatchItem[] = [
    { id: 'triangle', label: 'Triangle' },
    { id: 'square', label: 'Square' },
    { id: 'circle', label: 'Circle' },
  ];
  const correct = { square: 'square', circle: 'circle', triangle: 'triangle' };

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <button className="btn" onClick={() => router.back()}><ArrowLeft className="icon16" />Back</button>

      <h1 className="h1" style={{ marginTop: 12 }}>ECD Play & Learn</h1>

      <div className="section">
        <div className="sectionTitle">Tracing</div>
        <div className="card" style={{ padding: 16 }}>
          <TracingCanvas
            backgroundPath="M10 100 Q 80 10 150 100 T 290 100" // simple curved path example
            onComplete={(png) => saveSubmission({ type: 'tracing', title: 'Letter Tracing', score: 1, total: 1, percentage: 100, thumbnail_url: png, rubric: { coverage: 3, smoothness: 3, direction: 3 }, rubric_score: 9, rubric_total: 12 })}
          />
        </div>
      </div>

      <div className="section">
        <div className="sectionTitle">Drag & Match</div>
        <div className="card" style={{ padding: 16 }}>
          <DragDropMatch
            left={left}
            right={right}
            correct={correct}
            onFinish={(r) => {
              const acc = r.correct / r.total;
              const level = acc >= 0.9 ? 4 : acc >= 0.7 ? 3 : acc >= 0.4 ? 2 : 1;
              saveSubmission({ type: 'dragdrop', title: 'Shapes Match', score: r.correct, total: r.total, percentage: (r.correct / r.total) * 100, data: r, rubric: { accuracy: level, focus: 3, independence: 3 }, rubric_score: level + 3 + 3, rubric_total: 12 })
            }}
          />
        </div>
      </div>

      <div className="section">
        <div className="sectionTitle">Count & Tap</div>
        <div className="card" style={{ padding: 16 }}>
          <CountAndTap item="🍎" onFinish={(r) => saveSubmission({ type: 'counttap', title: 'Count Apples', score: r.correct ? 1 : 0, total: 1, percentage: r.correct ? 100 : 0, data: r, rubric: { correctness: r.correct ? 4 : 1, effort: 3 }, rubric_score: (r.correct ? 4 : 1) + 3, rubric_total: 8 })} />
        </div>
      </div>

      {saving && (
        <div style={{ position: 'fixed', bottom: 16, right: 16 }} className="card">
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} /> Saving…
          </div>
        </div>
      )}
    </div>
  );
}
