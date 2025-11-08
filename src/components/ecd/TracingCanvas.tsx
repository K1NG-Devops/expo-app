"use client";

import { useEffect, useRef, useState } from 'react';

interface TracingCanvasProps {
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundPath: string; // SVG path data of letter/number outline
  onComplete?: (pngDataUrl: string) => void;
}

export default function TracingCanvas({ width = 320, height = 220, strokeColor = '#0ea5e9', backgroundPath, onComplete }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    // Clear
    ctx.clearRect(0, 0, width, height);
    // Draw faint path as hint
    const path = new Path2D(backgroundPath);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.translate(20, 20);
    ctx.scale(1, 1);
    ctx.stroke(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [backgroundPath, width, height]);

  const getCtx = () => canvasRef.current!.getContext('2d')!;
  const getPos = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as any).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: any) => { setDrawing(true); const ctx = getCtx(); ctx.beginPath(); const { x, y } = getPos(e); ctx.moveTo(x, y); };
  const move = (e: any) => { if (!drawing) return; const ctx = getCtx(); const { x, y } = getPos(e); ctx.strokeStyle = strokeColor; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => setDrawing(false);

  const handleSave = () => {
    const data = canvasRef.current!.toDataURL('image/png');
    onComplete?.(data);
  };

  const handleClear = () => {
    const ctx = getCtx();
    ctx.clearRect(0, 0, width, height);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ border: '1px solid var(--border)', background: 'white', borderRadius: 8, width: '100%', height }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={handleClear}>Clear</button>
        <button className="btn btnPrimary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
