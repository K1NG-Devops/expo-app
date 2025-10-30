'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Database, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseExamMarkdown } from '@/lib/examParser';
import { ExamInteractiveView } from './exam-prep/ExamInteractiveView';

interface AskAIWidgetProps {
  inline?: boolean;
  initialPrompt?: string;
  displayMessage?: string; // what to show to the user (sanitized)
  fullscreen?: boolean;
  language?: string; // Language code (e.g., 'en-ZA', 'af-ZA', 'zu-ZA')
  enableInteractive?: boolean; // Enable interactive exam parsing for practice tests
}

export function AskAIWidget({ inline = true, initialPrompt, displayMessage, fullscreen = false, language = 'en-ZA', enableInteractive = false }: AskAIWidgetProps) {
  const [open, setOpen] = useState(inline);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'tool'; text: string; tool?: any }[]>([]);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const [interactiveExam, setInteractiveExam] = useState<any>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const examSetRef = useRef(false);

  // Auto-populate and send initial prompt
  useEffect(() => {
    if (!initialPrompt || hasProcessedInitial) return;
    
    const runInitial = async () => {
      setHasProcessedInitial(true);
      setInput(initialPrompt);
      // Show a short, user-friendly message instead of the internal server prompt
      const shown = displayMessage || 'Generating activity...';
      setMessages([{ role: 'user', text: shown }]);
      setInput('');

      const supabase = createClient();
      try {
        const ENABLED = process.env.NEXT_PUBLIC_AI_PROXY_ENABLED === 'true' || process.env.EXPO_PUBLIC_AI_PROXY_ENABLED === 'true';
        if (!ENABLED) {
          setMessages((m) => [...m, { role: 'assistant', text: 'Dash AI is not enabled in this environment.' }]);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            scope: 'parent',
            service_type: 'homework_help',
            enable_tools: true,  // Enable agentic mode
            payload: {
              prompt: initialPrompt,
              context: 'caps_exam_preparation',
              metadata: {
                source: 'parent_dashboard',
                feature: 'exam_prep',
                language: language || 'en-ZA'
              }
            },
            metadata: {
              role: 'parent'  // Pass role for tool access control
            }
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (error) throw error;
        
        // Handle ai-proxy response format with tool execution
        if (data?.tool_use && data?.tool_results) {
          // Tool was executed - show tool execution
          setMessages((m) => [
            ...m,
            { 
              role: 'tool', 
              text: `🔍 Executed: ${data.tool_use[0]?.name}`,
              tool: {
                name: data.tool_use[0]?.name,
                results: data.tool_results[0]
              }
            }
          ]);
        }
        
        console.log('[AskAI] Full AI response data:', data);
        const content = data?.content || data?.error?.message || 'No response from AI';
        if (content) {
          setMessages((m) => [...m, { role: 'assistant', text: content }]);
        }
        
        // If interactive mode is enabled, check for structured exam from tool OR parse markdown
        if (enableInteractive && !examSetRef.current) {
          console.log('[AskAI] enableInteractive=true, checking for exam');
          
          // PRIORITY 1: Check if tool returned structured exam data
          if (data?.tool_results && Array.isArray(data.tool_results)) {
            for (const toolResult of data.tool_results) {
              try {
                console.log('[AskAI] Tool result content:', toolResult.content);
                console.log('[AskAI] Tool result content type:', typeof toolResult.content);
                
                // Check if it's an error string
                if (typeof toolResult.content === 'string' && toolResult.content.startsWith('Error:')) {
                  console.error('[AskAI] Tool execution failed:', toolResult.content);
                  continue; // Skip this result
                }
                
                const resultData = typeof toolResult.content === 'string' 
                  ? JSON.parse(toolResult.content)
                  : toolResult.content;
                
                console.log('[AskAI] Parsed tool result data:', resultData);
                
                // Tool results have { success: true, data: { exam } } structure
                if (resultData.success && resultData.data) {
                  const examData = resultData.data;
                  if (examData.sections && Array.isArray(examData.sections)) {
                    console.log('[AskAI] ✅ Found structured exam from tool with', examData.sections.length, 'sections');
                    examSetRef.current = true;
                    setInteractiveExam(examData);
                    return; // Exit early - structured exam found
                  }
                }
                // Legacy format: direct exam data
                else if (resultData.sections && Array.isArray(resultData.sections)) {
                  console.log('[AskAI] ✅ Found structured exam (legacy format) with', resultData.sections.length, 'sections');
                  examSetRef.current = true;
                  setInteractiveExam(resultData);
                  return;
                }
              } catch (e) {
                console.error('[AskAI] Failed to parse tool result:', e);
                console.error('[AskAI] Tool result content:', toolResult.content?.substring(0, 200));
              }
            }
          }
          
          // PRIORITY 2: Fall back to markdown parsing if no tool result
          if (content) {
            console.log('[AskAI] No tool result, attempting markdown parse. Content length:', content.length);
            const parsedExam = parseExamMarkdown(content);
            console.log('[AskAI] Parsed exam:', parsedExam);
            if (parsedExam) {
              console.log('[AskAI] Setting interactive exam with', parsedExam.sections.length, 'sections');
              examSetRef.current = true;
              setInteractiveExam(parsedExam);
            } else {
              console.warn('[AskAI] Failed to parse exam from markdown');
            }
          }
        } else if (examSetRef.current) {
          console.log('[AskAI] Exam already set, skipping');
        } else {
          console.log('[AskAI] Interactive mode not enabled. enableInteractive:', enableInteractive);
        }
      } catch (err: any) {
        setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not generate the activity right now.' }]);
      } finally {
        scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
      }
    };
    runInitial();
  }, [initialPrompt, hasProcessedInitial]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setIsExecutingTool(true);

    const supabase = createClient();
    try {
      const ENABLED = process.env.NEXT_PUBLIC_AI_PROXY_ENABLED === 'true' || process.env.EXPO_PUBLIC_AI_PROXY_ENABLED === 'true';
      if (!ENABLED) {
        setMessages((m) => [...m, { role: 'assistant', text: 'Dash AI is not enabled in this environment.' }]);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'parent',
          service_type: 'homework_help',
          enable_tools: true,  // Enable agentic mode
          payload: {
            prompt: text,
            context: 'general_question',
            metadata: {
              source: 'dashboard',
              language: language || 'en-ZA'
            }
          },
          metadata: {
            role: 'parent'  // Pass role for tool access control
          }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      
      // Handle ai-proxy response format with tool execution
      if (data?.tool_use && data?.tool_results) {
        // Tool was executed - show tool execution
        setMessages((m) => [
          ...m,
          { 
            role: 'tool', 
            text: `🔍 Queried database: ${data.tool_use[0]?.input?.query_type}`,
            tool: {
              name: data.tool_use[0]?.name,
              input: data.tool_use[0]?.input,
              results: JSON.parse(data.tool_results[0]?.content || '{}')
            }
          }
        ]);
      }
      
      const content = data?.content || data?.error?.message || 'No response from AI';
      if (content) {
        setMessages((m) => [...m, { role: 'assistant', text: content }]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not process that right now.' }]);
    } finally {
      setIsExecutingTool(false);
      scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
    }
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
              {m.role === 'tool' ? (
                <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-300">{m.text}</span>
                  {m.tool?.results?.row_count !== undefined && (
                    <span className="ml-auto text-xs text-blue-400 font-semibold">
                      ✓ {m.tool.results.row_count} results
                    </span>
                  )}
                </div>
              ) : (
                <span className={`inline-block rounded-2xl px-3 py-2 shadow-lg ${m.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white' : 'bg-white/5 border border-white/10 text-gray-200 backdrop-blur'}`}>
                  {m.text}
                </span>
              )}
            </div>
          ))}
          {isExecutingTool && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Executing tool...</span>
            </div>
          )}
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

  // Fullscreen mode
  if (fullscreen) {
    // If interactive exam is available, show it instead
    if (interactiveExam) {
      return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <ExamInteractiveView
            exam={interactiveExam}
            onClose={() => setInteractiveExam(null)}
          />
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
        {/* Messages area */}
        <div ref={scrollerRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 'var(--space-8)' }}>
              <p style={{ fontSize: 14 }}>Ask anything about your dashboard, child progress, or tasks.</p>
            </div>
          )}
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  className="card"
                  style={{
                    maxWidth: '75%',
                    padding: 'var(--space-4)',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--card)',
                    color: m.role === 'user' ? 'white' : 'var(--text)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)'
                  }}
                >
                  <div style={{ margin: 0, lineHeight: 1.7 }} className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Input area */}
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: 'var(--space-4)',
          flexShrink: 0
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input
              className="searchInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSend())}
              placeholder="Type your question here..."
              style={{ flex: 1 }}
            />
            <button className="btn btnPrimary" onClick={onSend} style={{ flexShrink: 0 }}>
              <Send className="icon16" />
              Send
            </button>
          </div>
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
