"use client";

import React, { useEffect, useRef, useState } from "react";

interface DrawingInputProps {
  value?: string | null; // data URL
  onChange?: (dataUrl: string) => void;
  height?: number;
}

export function DrawingInput({ value, onChange, height = 220 }: DrawingInputProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement as HTMLElement | null;
    const width = Math.min(parent?.clientWidth || 600, 900);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#0f0f0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctxRef.current = ctx;
    setInitialized(true);

    // Load existing image if provided
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
  }, [height]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ctxRef.current) return;
    drawing.current = true;
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !ctxRef.current) return;
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const end = () => {
    if (!ctxRef.current) return;
    drawing.current = false;
    // emit data URL
    if (onChange && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#0f0f0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (onChange) onChange(canvas.toDataURL("image/png"));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onChange?.(canvas.toDataURL("image/png"));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>Draw here or upload a picture</span>
        <div style={{ display: "flex", gap: 8 }}>
          <label className="btn" style={{ fontSize: 12, padding: "6px 10px", cursor: "pointer" }}>
            Upload
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          <button type="button" className="btn" onClick={clear} style={{ fontSize: 12, padding: "6px 10px" }}>Clear</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height, borderRadius: 8, border: "1px solid var(--border)", touchAction: "none", background: "var(--surface)" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </div>
  );
}
