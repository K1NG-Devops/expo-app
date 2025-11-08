"use client";

import { useMemo, useState } from 'react';

export interface MatchItem { id: string; label: string; imageUrl?: string }

interface DragDropMatchProps {
  left: MatchItem[]; // anchors
  right: MatchItem[]; // draggable
  correct: Record<string, string>; // left.id -> right.id
  onFinish?: (result: { correct: number; total: number; pairs: Array<{ left: string; right: string; ok: boolean }> }) => void;
}

export default function DragDropMatch({ left, right, correct, onFinish }: DragDropMatchProps) {
  const [pairs, setPairs] = useState<Record<string, string | null>>({});
  const [dragging, setDragging] = useState<string | null>(null);

  const total = useMemo(() => Object.keys(correct).length, [correct]);
  const correctCount = useMemo(() => Object.entries(pairs).filter(([l, r]) => r && correct[l] === r).length, [pairs, correct]);

  const onDrop = (leftId: string, rightId: string) => {
    setPairs(p => ({ ...p, [leftId]: rightId }));
  };

  const done = () => {
    const rows = Object.keys(correct).map(l => ({ left: l, right: pairs[l] || null, ok: pairs[l] === correct[l] }));
    onFinish?.({ correct: rows.filter(r => r.ok).length, total, pairs: rows as any });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          {left.map(l => (
            <div key={l.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{l.label}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {right.map(r => (
                  <button
                    key={r.id}
                    className="btn"
                    onClick={() => onDrop(l.id, r.id)}
                    style={{
                      border: pairs[l.id] === r.id ? '2px solid var(--primary)' : undefined,
                      background: pairs[l.id] === r.id ? 'rgba(var(--primary-rgb), 0.1)' : undefined,
                      fontSize: 12
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Matches</div>
          {Object.keys(correct).map(l => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{left.find(i => i.id === l)?.label}</span>
              <span>→ {pairs[l] ? right.find(i => i.id === pairs[l])?.label : '—'}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div className="muted">Score: {correctCount}/{total}</div>
            <button className="btn btnPrimary" onClick={done}>Finish</button>
          </div>
        </div>
      </div>
    </div>
  );
}
