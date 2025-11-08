"use client";

import { useMemo, useState } from 'react';

interface CountAndTapProps {
  item: string; // emoji or short label
  min?: number;
  max?: number;
  onFinish?: (score: { correct: boolean; target: number; selected: number }) => void;
}

export default function CountAndTap({ item, min = 3, max = 9, onFinish }: CountAndTapProps) {
  const target = useMemo(() => Math.floor(Math.random() * (max - min + 1)) + min, [min, max]);
  const [selected, setSelected] = useState(0);

  const cells = Array.from({ length: target }, (_, i) => i);

  const finish = () => onFinish?.({ correct: selected === target, target, selected });

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Tap to count: {item}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 44px)', gap: 8 }}>
        {cells.map(i => (
          <button key={i} className="btn" onClick={() => setSelected(s => s + 1)} style={{ height: 44 }}>
            {item}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div className="muted">Your count: {selected}</div>
        <button className="btn btnPrimary" onClick={finish}>Done</button>
      </div>
    </div>
  );
}
