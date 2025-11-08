"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function EnterClassCodePage() {
  const supabase = createClient();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Find code
      const { data: codeRow, error: codeErr } = await supabase
        .from('teacher_class_codes')
        .select('id, teacher_id, preschool_id, active')
        .eq('code', code.trim())
        .single();
      if (codeErr || !codeRow || codeRow.active === false) throw new Error('Invalid or inactive code');

      // Attach to teacher
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ assigned_teacher_id: codeRow.teacher_id, preschool_id: codeRow.preschool_id ?? null })
        .eq('id', userId);
      if (updErr) throw updErr;

      setSuccess('Class code linked! Your teacher can now see your activity and exams.');
      setTimeout(() => router.push('/dashboard/parent'), 1200);
    } catch (e: any) {
      setError(e.message || 'Failed to link code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: '8vh auto', padding: 16 }}>
      <h1 className="h1">Enter Class Code</h1>
      <p className="muted" style={{ marginBottom: 16 }}>Enter the code your teacher gave you to link your account.</p>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 16 }}>
        <input
          className="input"
          placeholder="e.g. GP-7A-4XZ9"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <button className="btn btnPrimary" type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} /> : 'Link Class'}
        </button>
        {success && (
          <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <CheckCircle className="icon16" /> {success}
          </div>
        )}
        {error && (
          <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <AlertCircle className="icon16" /> {error}
          </div>
        )}
      </form>
    </div>
  );
}
