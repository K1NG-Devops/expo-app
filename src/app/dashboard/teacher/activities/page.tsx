"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function ActivitySummaryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const teacherId = sessionData.session?.user?.id;
      if (!teacherId) { router.push('/sign-in'); return; }

      let q = supabase
        .from('activity_submissions')
        .select('id, user_id, type, title, score, total, percentage, thumbnail_url, created_at, profiles!inner(first_name,last_name)')
        .eq('assigned_teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(200);
      const { data } = await q;
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const byType = useMemo(() => {
    const g: Record<string, { count: number; avg: number }> = {};
    items.forEach((i) => {
      const t = i.type || 'unknown';
      if (!g[t]) g[t] = { count: 0, avg: 0 };
      g[t].count += 1;
      g[t].avg += Number(i.percentage || 0);
    });
    Object.keys(g).forEach((k) => (g[k].avg = g[k].count ? g[k].avg / g[k].count : 0));
    return g;
  }, [items]);

  return (
    <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <button className="btn" onClick={() => router.back()}><ArrowLeft className="icon16"/>Back</button>
      <h1 className="h1" style={{ marginTop: 12 }}>Activity Summary</h1>

      <div className="section">
        <div className="sectionTitle">Overview</div>
        <div className="grid2">
          {Object.entries(byType).map(([type, s]) => (
            <div key={type} className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{type}</div>
              <div className="muted">Submissions: {s.count}</div>
              <div className="muted">Average: {s.avg.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="sectionTitle">Recent Submissions</div>
        <div className="card" style={{ padding: 16 }}>
          {loading ? 'Loading…' : items.length === 0 ? 'No submissions yet' : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {r.thumbnail_url && <img src={r.thumbnail_url} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.title || 'Activity'} • {r.type}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.profiles?.first_name} {r.profiles?.last_name} • {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{Number(r.percentage || 0).toFixed(1)}%</div>
                    <div className="muted" style={{ fontSize: 12 }}>{Number(r.score || 0)}/{Number(r.total || 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
