'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Database, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseExamMarkdown } from '@/lib/examParser';
import { ExamInteractiveView } from './exam-prep/ExamInteractiveView';
import { useAIConversation } from '@/lib/hooks/useAIConversation';
import { useExamSession } from '@/lib/hooks/useExamSession';
import { useRouter } from 'next/navigation';

const TRUTHY_ENV_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'enabled']);
const FALSY_ENV_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'disabled']);

const parseEnvBoolean = (value?: string | undefined): boolean | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (TRUTHY_ENV_VALUES.has(normalized)) return true;
  if (FALSY_ENV_VALUES.has(normalized)) return false;
  return undefined;
};

const isDashAIEnabled = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_AI_PROXY_ENABLED,
    process.env.EXPO_PUBLIC_AI_PROXY_ENABLED,
  ];

  for (const candidate of candidates) {
    const parsed = parseEnvBoolean(candidate);
    if (parsed === true) return true;
    if (parsed === false) continue;
  }

  return false;
};

interface AskAIWidgetProps {
  inline?: boolean;
  initialPrompt?: string;
  displayMessage?: string;
  fullscreen?: boolean;
  language?: string;
  enableInteractive?: boolean;
  conversationId?: string; // NEW: For persistence
  onClose?: () => void;
}

export function AskAIWidget({ 
  inline = true, 
  initialPrompt, 
  displayMessage, 
  fullscreen = false, 
  language = 'en-ZA', 
  enableInteractive = false,
  conversationId, // NEW
  onClose 
}: AskAIWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(inline);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'tool'; text: string; tool?: any }[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const [interactiveExam, setInteractiveExam] = useState<any>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const examSetRef = useRef(false);
  
  // NEW: Conversation persistence
  const { 
    messages: persistedMessages, 
    saveMessages 
  } = useAIConversation(conversationId || null);
  
  // NEW: Exam session management
  const { saveExamGeneration } = useExamSession(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-populate initial prompt in input field (but DON'T auto-run)
  useEffect(() => {
    if (!initialPrompt || hasProcessedInitial) return;
    
    setHasProcessedInitial(true);
    setInput(initialPrompt); // Pre-fill the input field
    // User must manually click Send button to generate
  }, [initialPrompt, hasProcessedInitial]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    const supabase = createClient();
    try {
      const ENABLED = isDashAIEnabled();
      if (!ENABLED) {
        setMessages((m) => [...m, { 
          role: 'assistant', 
          text: '⚠️ Dash AI is not enabled.' 
        }]);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      // Build conversation history from existing messages
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'tool' ? 'assistant' : msg.role,
        content: msg.text
      }));
      
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'parent',
          service_type: 'homework_help',
          enable_tools: true,
          payload: {
            prompt: text,
            context: enableInteractive ? 'caps_exam_preparation' : 'general_question',
            conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
            metadata: {
              source: enableInteractive ? 'exam_generator' : 'dashboard',
              language: language || 'en-ZA',
              enableInteractive: enableInteractive
            }
          },
          metadata: {
            role: 'parent'
          }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) {
        console.error('[DashAI] Send Error:', error);
        throw error;
      }
      
      // Handle interactive exam mode FIRST (before adding to messages)
      if (enableInteractive && !examSetRef.current) {
        if (data?.tool_results && Array.isArray(data.tool_results)) {
          for (const toolResult of data.tool_results) {
            try {
              // Check if content is an error message first
              if (typeof toolResult.content === 'string') {
                if (toolResult.content.startsWith('Error:') || toolResult.content.startsWith('{') === false) {
                  console.error('[DashAI] Tool execution failed:', toolResult.content);
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `❌ Exam generation failed: ${toolResult.content}\n\nPlease try again with different parameters.`,
                  }]);
                  continue;
                }
              }
              const resultData = typeof toolResult.content === 'string' 
                ? JSON.parse(toolResult.content)
                : toolResult.content;
              if (resultData.success && resultData.data?.sections) {
                examSetRef.current = true;
                try {
                  const generationId = await saveExamGeneration(
                    resultData.data,
                    text,
                    resultData.data.title || 'Generated Exam',
                    resultData.data.grade,
                    resultData.data.subject
                  );
                  setCurrentGenerationId(generationId);
                  router.push(`/dashboard/parent/generate-exam?id=${generationId}`);
                  onClose?.();
                  setLoading(false);
                  return;
                } catch (error) {
                  console.error('[DashAI] Failed to save exam:', error);
                  // Fallback: navigate to generator with params (no modal)
                  const g = resultData.data.grade || 'grade_9';
                  const s = encodeURIComponent(resultData.data.subject || 'Mathematics');
                  router.push(`/dashboard/parent/generate-exam?grade=${g}&subject=${s}&type=practice_test&language=${encodeURIComponent(language || 'en-ZA')}`);
                  onClose?.();
                  setLoading(false);
                  return;
                }
              } else if (resultData.sections) {
                examSetRef.current = true;
                try {
                  const generationId = await saveExamGeneration(
                    resultData,
                    text,
                    resultData.title || 'Generated Exam',
                    resultData.grade,
                    resultData.subject
                  );
                  setCurrentGenerationId(generationId);
                  router.push(`/dashboard/parent/generate-exam?id=${generationId}`);
                  onClose?.();
                  setLoading(false);
                  return;
                } catch (error) {
                  console.error('[DashAI] Failed to save exam:', error);
                  const g = resultData.grade || 'grade_9';
                  const s = encodeURIComponent(resultData.subject || 'Mathematics');
                  router.push(`/dashboard/parent/generate-exam?grade=${g}&subject=${s}&type=practice_test&language=${encodeURIComponent(language || 'en-ZA')}`);
                  onClose?.();
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              console.error('[DashAI] Failed to parse tool result:', e);
              setMessages(prev => [...prev, {
                role: 'assistant',
                text: `❌ Failed to process exam generation result. The AI may have returned an error:\n\n${toolResult.content}\n\nPlease try again.`,
              }]);
            }
          }
        }
        // Fallback to markdown parsing
        const content = data?.content || data?.error?.message || '';
        if (content) {
          const parsedExam = parseExamMarkdown(content);
          if (parsedExam) {
            examSetRef.current = true;
            try {
              const generationId = await saveExamGeneration(
                parsedExam,
                text,
                parsedExam.title,
                parsedExam.grade,
                parsedExam.subject
              );
              setCurrentGenerationId(generationId);
              router.push(`/dashboard/parent/generate-exam?id=${generationId}`);
              onClose?.();
              setLoading(false);
              return;
            } catch (error) {
              console.error('[DashAI] Failed to save exam:', error);
              const g = parsedExam.grade || 'grade_9';
              const s = encodeURIComponent(parsedExam.subject || 'Mathematics');
              router.push(`/dashboard/parent/generate-exam?grade=${g}&subject=${s}&type=practice_test&language=${encodeURIComponent(language || 'en-ZA')}`);
              onClose?.();
              setLoading(false);
              return;
            }
          }
        }
      }
      
      // Handle tool execution (non-interactive mode)
      if (data?.tool_use && data?.tool_results) {
        let toolResults;
        const resultContent = data.tool_results[0]?.content;
        
        // Try to parse as JSON, but handle error strings gracefully
        if (typeof resultContent === 'string') {
          if (resultContent.startsWith('Error:') || resultContent.startsWith('{') === false) {
            // It's an error message, not JSON
            toolResults = { error: resultContent };
          } else {
            try {
              toolResults = JSON.parse(resultContent);
            } catch (e) {
              console.error('[DashAI] Failed to parse tool result as JSON:', e);
              toolResults = { error: resultContent };
            }
          }
        } else {
          toolResults = resultContent;
        }
        
        setMessages((m) => [
          ...m,
          { 
            role: 'tool', 
            text: `🔧 ${data.tool_use[0]?.name}`,
            tool: {
              name: data.tool_use[0]?.name,
              input: data.tool_use[0]?.input,
              results: toolResults
            }
          }
        ]);
      }
      
      // If we didn't show interactive exam, add content to messages
      const content = data?.content || data?.error?.message || 'No response from AI';
      if (content) {
        setMessages((m) => [...m, { role: 'assistant', text: content }]);
      }
    } catch (err: any) {
      console.error('[DashAI] Error:', err);
      const errorMessage = err?.message || 'Unknown error';
      setMessages((m) => [...m, { 
        role: 'assistant', 
        text: `❌ **Error:** ${errorMessage}\n\nPlease check the browser console for details.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  // Fullscreen mode
  if (fullscreen) {
    if (interactiveExam) {
      return (
        <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div className="topbar" style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <div className="topbarEdge">
              <div className="topbarRow">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles className="icon20" style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Dash AI</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {interactiveExam.title || displayMessage || 'Interactive Exam'}
                    </div>
                  </div>
                </div>
                <button className="iconBtn" onClick={() => setInteractiveExam(null)} aria-label="Close">
                  <X className="icon16" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Exam Content - Scrollable */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ExamInteractiveView
              exam={interactiveExam}
              generationId={currentGenerationId}
              onClose={() => setInteractiveExam(null)}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="app" style={{ height: '100%' }}>
        {/* Header */}
        <div className="topbar" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="topbarEdge">
            <div className="topbarRow">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles className="icon20" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Dash AI</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {displayMessage || 'AI-Powered Exam Help'}
                  </div>
                </div>
              </div>
              {onClose && (
                <button className="iconBtn" onClick={handleClose} aria-label="Close">
                  <X className="icon16" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="content" ref={scrollerRef} style={{ 
          flex: 1, 
          paddingBottom: 'calc(80px + var(--space-4))',
          paddingTop: 'var(--space-4)'
        }}>
          <div className="container" style={{ maxWidth: 900 }}>
            {messages.length === 0 && (
              <div className="card" style={{ 
                textAlign: 'center', 
                padding: 'var(--space-6)',
                marginTop: 'var(--space-6)' 
              }}>
                <Bot style={{ 
                  width: 48, 
                  height: 48, 
                  margin: '0 auto var(--space-4)', 
                  color: 'var(--primary)' 
                }} />
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                  Ask Dash AI Anything
                </div>
                <div className="muted" style={{ fontSize: 14 }}>
                  CAPS-aligned help • Exam prep • Practice tests • 24/7 support
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' 
                  }}
                >
                  {m.role === 'tool' ? (
                    <div className="card" style={{
                      maxWidth: '85%',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <Database className="icon16" style={{ color: '#60a5fa', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 600 }}>
                        {m.text}
                      </span>
                      {m.tool?.results?.row_count !== undefined && (
                        <span className="badge" style={{ marginLeft: 'auto' }}>
                          {m.tool.results.row_count} results
                        </span>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="card" 
                      style={{
                        maxWidth: '85%',
                        background: m.role === 'user' 
                          ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' 
                          : 'var(--surface-2)',
                        borderColor: m.role === 'user' ? 'transparent' : 'var(--border)',
                        color: m.role === 'user' ? 'white' : 'var(--text)'
                      }}
                    >
                      {m.role === 'assistant' ? (
                        <div className="markdown-content" style={{ lineHeight: 1.7 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <div style={{ lineHeight: 1.6 }}>{m.text}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)' }}>
                  <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Dash AI is thinking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: 'var(--space-4)',
          zIndex: 10
        }}>
          <div className="container" style={{ maxWidth: 900, display: 'flex', gap: 'var(--space-3)' }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
              placeholder="Ask about exams, subjects, practice tests..."
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button 
              className="btn btnPrimary" 
              onClick={onSend}
              disabled={loading || !input.trim()}
              style={{ minWidth: 100 }}
            >
              <Send className="icon16" />
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating widget (not inline)
  if (!inline) {
    if (!open) {
      return (
        <button
          className="btn btnPrimary"
          onClick={() => setOpen(true)}
          aria-label="Ask Dash AI"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
            borderRadius: '999px',
            height: 56,
            paddingLeft: 20,
            paddingRight: 20,
            boxShadow: '0 8px 30px rgba(124, 58, 237, 0.4)'
          }}
        >
          <Bot className="icon20" />
          <span>Ask Dash</span>
        </button>
      );
    }

    return (
      <div 
        className="card" 
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 50,
          width: 380,
          maxWidth: '90vw',
          height: 520,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--space-3)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-2) var(--radius-2) 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles className="icon16" style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Dash AI</span>
          </div>
          <button 
            onClick={() => setOpen(false)} 
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text)'
            }}
          >
            <X className="icon16" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)'
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 'var(--space-4)', fontSize: 12 }}>
              Ask about exams, practice tests, or any CAPS subject
            </div>
          )}

          {messages.map((m, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex', 
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' 
              }}
            >
              {m.role === 'tool' ? (
                <div style={{
                  padding: 10,
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12
                }}>
                  <Database className="icon16" style={{ color: '#60a5fa' }} />
                  <span style={{ color: '#93c5fd' }}>{m.text}</span>
                </div>
              ) : (
                <div style={{
                  maxWidth: '85%',
                  padding: 12,
                  borderRadius: 16,
                  background: m.role === 'user' 
                    ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' 
                    : 'var(--surface-2)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: m.role === 'user' ? 'white' : 'var(--text)',
                  fontSize: 13,
                  lineHeight: 1.6
                }}>
                  {m.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
              <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8
        }}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
            placeholder="Type your question..."
            disabled={loading}
            style={{ flex: 1, height: 36, fontSize: 13 }}
          />
          <button 
            className="btn btnPrimary" 
            onClick={onSend}
            disabled={loading || !input.trim()}
            style={{ width: 36, height: 36, padding: 0 }}
          >
            <Send className="icon16" />
          </button>
        </div>
      </div>
    );
  }

  // Inline mode (embedded in page)
  return (
    <div className="section">
      <div className="card" style={{ padding: 0 }}>
        {/* Header */}
        <div className="titleRow" style={{ padding: 'var(--space-4)', marginBottom: 0 }}>
          <div className="sectionTitle" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles className="icon16" style={{ color: 'var(--primary)' }} />
            Dash AI
          </div>
          <button className="btn" onClick={() => setOpen(!open)} style={{ height: 32 }}>
            {open ? 'Hide' : 'Show'}
          </button>
        </div>

        {open && (
          <>
            {/* Messages */}
            <div 
              ref={scrollerRef}
              style={{
                maxHeight: 400,
                overflowY: 'auto',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)'
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Ask about your dashboard, child progress, or exam prep
                </div>
              )}

              {messages.map((m, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' 
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: 'var(--space-3)',
                    borderRadius: 12,
                    background: m.role === 'user' 
                      ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' 
                      : 'var(--surface-2)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    color: m.role === 'user' ? 'white' : 'var(--text)',
                    fontSize: 14,
                    lineHeight: 1.6
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
                  <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Processing...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: 'var(--space-4)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 10
            }}>
              <input
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
                placeholder="Ask a question..."
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btnPrimary" 
                onClick={onSend}
                disabled={loading || !input.trim()}
              >
                <Send className="icon16" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
