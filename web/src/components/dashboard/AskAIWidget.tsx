'use client';

import { useState, useRef } from 'react';
import { X, Send, Bot } from 'lucide-react';

export function AskAIWidget({ inline = true }: { inline?: boolean }) {
  const [open, setOpen] = useState(inline);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    // TODO: Connect to ai-proxy Edge Function
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: 'Thanks! AI response coming soon.' }]);
      scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
    }, 200);
  };

  // Floating (default)
  if (!inline) {
    if (!open) {
      return (
        <button
          aria-label="Ask AI"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg px-4 py-3 inline-flex items-center gap-2"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden md:inline">Ask Dash</span>
        </button>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[90vw] rounded-xl border border-purple-700 bg-[#0c0a12] text-white shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 rounded-t-xl bg-gradient-to-r from-purple-600 to-fuchsia-600">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold">Ask Dash</span>
          </div>
          <button aria-label="Close" onClick={() => setOpen(false)} className="p-1 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div ref={scrollerRef} className="max-h-[320px] overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-xs text-gray-300">Ask anything about your dashboard, child progress, or tasks.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`text-sm leading-relaxed flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <span className={`inline-block rounded-2xl px-3 py-2 shadow-lg ${m.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white' : 'bg-white/5 border border-white/10 text-gray-200 backdrop-blur'}`}>
                {m.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 border-t border-gray-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSend())}
            placeholder="Type a question..."
            className="flex-1 bg-[#0f0a17]/80 border border-purple-800/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 shadow-inner"
          />
          <button onClick={onSend} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold inline-flex items-center shadow-md">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Inline (expands upwards inside its container)
  return (
    <div className="mt-4 mb-3 flex flex-col flex-1 max-h-full min-h-0">
      {/* Card container to match dashboard styling */}
      <div className="card flex flex-col flex-1 min-h-0 p-0">
        {/* Title row (consistent with sections) */}
        <div className="titleRow px-4 py-2">
          <div className="sectionTitle" style={{ margin: 0 }}>Ask Dash</div>
          <button aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen((v) => !v)} className="btn" style={{ height: 32, paddingInline: 10 }}>
            {open ? 'Hide' : 'Open'}
          </button>
        </div>
        {open && (
          <div className="flex flex-col flex-1 min-h-0">
            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-10 py-8 space-y-10 min-h-0">
              {messages.length === 0 && (
                <div className="text-xs text-gray-400">Ask anything about your dashboard, child progress, or tasks.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mx-3 my-2`}>
                  <div
                    className={`relative inline-block max-w-[96%] overflow-visible rounded-[28px] shadow-xl tracking-wide text-[16px] leading-8 whitespace-pre-wrap break-words px-10 py-7 
                    ${m.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                      : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]/92'}`}
                  >
                    {m.text}
                    {/* Tail */}
                    <span
                      className={`absolute w-[18px] h-[18px] rotate-45 bottom-4 ${m.role === 'user' ? 'right-[-10px] bg-gradient-to-r from-purple-600 to-fuchsia-600' : 'left-[-10px] bg-[var(--surface-2)] border border-[var(--border)]'}`}
                    ></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t bg-gradient-to-r from-purple-900/35 to-fuchsia-900/25" style={{ borderColor: 'var(--border)' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSend())}
                placeholder="Type a question..."
                className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 text-[var(--text)]"
              />
              <button onClick={onSend} className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:brightness-110 inline-flex items-center shadow-lg">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
