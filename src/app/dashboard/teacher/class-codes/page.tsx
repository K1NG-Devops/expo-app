"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Copy, Plus, ToggleLeft, ToggleRight, Loader2, ArrowLeft } from 'lucide-react';

function genCode(): string {
  const seg = (n: number) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
  return `${seg(2)}-${seg(2)}-${seg(4)}`;
}

export default function ClassCodesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.push('/sign-in'); return; }
      setTeacherId(sessionData.session.user.id);
      await load();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teacher_class_codes')
      .select('id, code, active, created_at')
      .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  };

  const createCode = async () => {
    setCreating(true);
    try {
      const code = genCode();
      const { data: profile } = await supabase.from('profiles').select('id, preschool_id').eq('id', teacherId).single();
      const { error } = await supabase.from('teacher_class_codes').insert({ code, teacher_id: teacherId, preschool_id: profile?.preschool_id || null });
      if (error) throw error;
      await load();
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('teacher_class_codes').update({ active: !active }).eq('id', id);
    await load();
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    alert('Copied to clipboard');
  };

  return (
    <div className="container" style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <button className="btn" onClick={() => router.back()}><ArrowLeft className="icon16"/>Back</button>
      <h1 className="h1" style={{ marginTop: 12 }}>Class Codes</h1>
      <p className="muted" style={{ marginBottom: 12 }}>Create and manage codes students/parents can enter to link to you.</p>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <button className="btn btnPrimary" onClick={createCode} disabled={creating}>
          {creating ? <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} /> : <Plus className="icon16" />} New Code
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16 }}><Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} /> Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16 }} className="muted">No codes yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>Code</th>
                <th style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>Created</th>
                <th style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>Active</th>
                <th style={{ padding: 12, borderBottom: '1px solid var(--border)' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{r.code}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                    <button className="btn" onClick={() => toggle(r.id, r.active)}>
                      {r.active ? <ToggleRight className="icon16" /> : <ToggleLeft className="icon16" />} {r.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                    <button className="btn" onClick={() => copy(r.code)}><Copy className="icon16"/> Copy</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
