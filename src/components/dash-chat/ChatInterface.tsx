'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Image as ImageIcon, Camera, Paperclip, Loader2, Sparkles, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ImageUpload } from './ImageUpload';
import { createClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: Array<{
    url: string;
    hash?: string;
    media_type: string;
    preview?: string;
  }>;
  meta?: {
    tokensUsed?: number;
    model?: string;
    citations?: Array<{ attachmentId?: string; page?: number; snippet?: string; score?: number; chunkIndex?: number }>;
  };
}

interface ChatInterfaceProps {
  conversationId: string;
  onNewConversation?: () => void;
  initialMessages?: ChatMessage[];
}

export function ChatInterface({ 
  conversationId, 
  onNewConversation,
  initialMessages = [] 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; hash: string; media_type: string; preview: string; size: number }>>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    // Try multiple times to ensure layout has settled
    const el = messagesContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 150);
    });
  };

  const storageKey = useMemo(() => `dash_chat_${conversationId}`, [conversationId]);
  const persistLocal = (updated: ChatMessage[]) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };
  const getFlag = (key: string, defaultOn = true) => {
    if (typeof window === 'undefined') return defaultOn;
    const v = localStorage.getItem(key);
    return v == null ? defaultOn : v === '1';
  };

  const detectLang = (text: string): 'en' | 'af' | 'zu' | 'xh' | 'st' | 'nso' => {
    const t = (text || '').toLowerCase();
    // Prioritize Afrikaans before other Sotho languages to avoid false positives
    if (/(\bmy\b|\bnaam\b|\bek\b|\bjy\b|\bvir\b|\bwat\b|\bmet\b|\bnie\b|\bmaar\b|\bbaie\b|\basseblief\b|\bdankie\b|goeie\s*(môre|more|middag|aand))/.test(t)) return 'af'; // Afrikaans
    if (/(ngiy|mina|wena|ukh|kuy|ukung|ngabe|yebo|cha|sawubona|unjani)\b/.test(t)) return 'zu'; // isiZulu
    if (/(ndiy|ndiza|ndicela|mna|ux|ikhona|molweni|unjani)\b/.test(t)) return 'xh'; // isiXhosa
    // Sesotho/Sepedi: remove 'ek' token (was causing Afrikaans false positives)
    if (/(\bke\b|\bha\b|\btsa\b|\bhore\b|\bmme\b|joalo ka|dumela)\b/.test(t)) return 'st'; // Sesotho
    if (/(\bke\b|\bga\b|\ble\b|\bgore\b|\bmme\b|\byo\b|\bmo\b|\bgo\b|dumela)\b/.test(t)) return 'nso'; // Sepedi/Northern Sotho
    return 'en';
  };

  // Helper: convert public URL to base64 payload for Claude
  const urlToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Auto-scroll to bottom only when new messages arrive (not when loading)
  useEffect(() => {
    if (!isLoadingConversation && messages.length > 0) {
      scrollToBottom();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isTyping, isLoadingConversation]); // Only scroll when message count changes or typing state changes

  // Auto-resize textarea dynamically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 40), 120);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Load conversation from database
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadConversation = async () => {
    setIsLoadingConversation(true);
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) {
        console.warn('Error loading conversation from DB:', error);
      }

      if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        const parsedMessages = (data.messages as any[]).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
        persistLocal(parsedMessages);
        console.log(`✅ Loaded ${parsedMessages.length} messages from database`);
        setTimeout(() => setIsLoadingConversation(false), 100); // Delay to prevent auto-scroll
        return;
      }

      // Fallback to localStorage if no server data
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed: ChatMessage[] = JSON.parse(raw).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            if (parsed.length > 0) {
              setMessages(parsed);
              console.log(`✅ Loaded ${parsed.length} messages from localStorage`);
              setTimeout(() => setIsLoadingConversation(false), 100); // Delay to prevent auto-scroll
              return;
            }
          }
        }
      } catch (localError) {
        console.warn('Error loading from localStorage:', localError);
      }

      console.log('New conversation - no existing messages');
      // Ensure UI is cleared for brand new conversations
      setMessages([]);
      setIsLoadingConversation(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Local fallback on error
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed: ChatMessage[] = JSON.parse(raw).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            setMessages(parsed);
            setTimeout(() => setIsLoadingConversation(false), 100);
            return;
          }
        }
      } catch {}
      setIsLoadingConversation(false);
    }
  };

  const saveConversation = async (updatedMessages: ChatMessage[]) => {
    try {
      // Always persist locally
      persistLocal(updatedMessages);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('preschool_id, organization_id')
        .eq('id', userData.user.id)
        .single();

      const preschoolId = profile?.preschool_id || profile?.organization_id || null;

      const conversationData = {
        user_id: userData.user.id,
        preschool_id: preschoolId,
        conversation_id: conversationId,
        title: updatedMessages[0]?.content.substring(0, 50) || 'New Chat',
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      } as any;

      // Prefer upsert on conversation_id to avoid race/failures
      const { error: upsertErr } = await supabase
        .from('ai_conversations')
        .upsert(conversationData, { onConflict: 'conversation_id' });

      if (upsertErr) {
        console.warn('[Chat] Upsert failed, falling back to update/insert:', upsertErr.message);
        const { data: existing, error: existErr } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('conversation_id', conversationId)
          .maybeSingle();
        if (existErr) console.warn('[Chat] existence check error:', existErr.message);

        if (existing) {
          const { error: updErr } = await supabase
            .from('ai_conversations')
            .update(conversationData)
            .eq('conversation_id', conversationId);
          if (updErr) console.error('[Chat] update failed:', updErr.message);
        } else {
          const { error: insErr } = await supabase
            .from('ai_conversations')
            .insert(conversationData);
          if (insErr) console.error('[Chat] insert failed:', insErr.message);
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    
    if (!textToSend && selectedImages.length === 0) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend || '📷 [Image attached]',
      timestamp: new Date(),
      images: selectedImages.length > 0 ? selectedImages : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    persistLocal(newMessages);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setIsLoadingConversation(false); // Ensure we allow auto-scroll for new messages

    try {
      // Attempt RAG-boosted answer first (if enabled)
      const ragEnabled = getFlag('dash_rag', false); // Disable by default until CAPS is seeded
      if (ragEnabled && textToSend && !selectedImages.length) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          
          if (!token) {
            console.warn('No auth token for RAG');
          } else {
            const { data: rag, error: ragError } = await supabase.functions.invoke('rag-answer', {
              body: {
                conversation_id: conversationId,
                message: textToSend,
                top_k: 6,
                filters: undefined,
              },
              // Explicitly forward the Authorization header to avoid 401s in some environments
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!ragError && (rag as any)?.has_context && (rag as any)?.answer) {
              setIsTyping(false);
              const assistantMessage: ChatMessage = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: (rag as any).answer,
                timestamp: new Date(),
                meta: { citations: (rag as any).citations || [] },
              };
              const finalMessages = [...newMessages, assistantMessage];
              setMessages(finalMessages);
              persistLocal(finalMessages);
              await saveConversation(finalMessages);
              setIsLoading(false);
              return;
            }
          }
        } catch (e: any) {
          // Silent fallback to standard flow
          console.warn('RAG fallback (will use ai-proxy):', e?.message || e);
        }
      }

      const allowImages = getFlag('dash_allow_images', true);

      // Always send text-only history to keep payload small and reliable
      const conversationHistoryTextOnly = newMessages.map((msg) => ({
        role: msg.role,
        content: msg.content + (msg.images && (msg.images as any).length > 0 ? ' (image omitted)' : ''),
      }));

      // Only attach images from the current outgoing message (convert URLs → base64)
      const imagesForRequest = allowImages && selectedImages.length > 0
        ? await Promise.all(
            selectedImages.map(async (img) => ({
              data: await urlToBase64(img.url),
              media_type: img.media_type,
            }))
          )
        : undefined;

      const conversationHistory = conversationHistoryTextOnly;

      console.log('Sending conversation with', conversationHistory.length, 'messages');

      const enableTools = getFlag('dash_enable_tools', false);
      const streamPref = getFlag('dash_stream', false);
      const stream = false;
      if (streamPref && typeof window !== 'undefined') {
        console.warn('[dash-chat] Streaming disabled in this view; forcing non-streaming mode');
        try { localStorage.setItem('dash_stream', '0'); } catch {}
      }

      const promptForProxy = textToSend || (imagesForRequest ? 'Please analyze the attached image(s) and assist with homework or questions shown.' : '');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const invokeAiProxy = async (
        opts: { prompt: string; images?: Array<{ data: string; media_type: string }>; history: any[] }
      ) => {
        return await supabase.functions.invoke('ai-proxy', {
          body: {
            scope: 'parent',
            service_type: 'dash_conversation',
            payload: {
              prompt: opts.prompt,
              images: opts.images,
              conversationHistory: opts.history,
              metadata: { language: detectLang(textToSend) }
            },
            enable_tools: enableTools,
            stream,
            metadata: {
              language: detectLang(textToSend)
            }
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      };

      let { data, error } = await invokeAiProxy({ prompt: promptForProxy, images: imagesForRequest, history: conversationHistory });
      console.log('[dash-chat] ai-proxy response', { type: typeof data, ok: !error, data });

      // If tier restriction prevents vision, or service is unavailable, retry without images using text-only history
      if (error) {
        try {
          const anyErr: any = error;
          const status = anyErr?.context?.status ?? anyErr?.status;
          let details: any = null;
          try { details = (anyErr?.context && (await anyErr.context.json?.())) || null; } catch {}
          const code = details?.error?.code as string | undefined;
          const tierBlocked = code === 'tier_restriction' || status === 403;
          const serviceUnavailable = code === 'ai_service_error' || status === 503;
          if (imagesForRequest && (tierBlocked || serviceUnavailable)) {
            console.warn('[dash-chat] Vision blocked or unavailable; retrying without images', { status, code });
            const fallbackPrompt = (textToSend || '').trim().length > 0
              ? `${textToSend}\n\n(Note: If the image was important, describe it briefly and I will still help.)`
              : 'Please help based on my previous message. (Note: images could not be processed.)';
            const retry = await invokeAiProxy({ prompt: fallbackPrompt, images: undefined, history: conversationHistoryTextOnly });
            data = retry.data;
            error = retry.error;
          }
        } catch { /* ignore */ }
      }

      setIsTyping(false);

      if (error) throw error;

      // Normalize assistant content to a safe string
      let assistantContent: string = '';
      if (typeof data === 'string') {
        // Streaming responses (SSE) would arrive as text; not supported in this UI
        assistantContent = data.includes('event:') ? '' : data;
      } else {
        const rawContent: any = (data && ((data as any).text || (data as any).content)) ?? '';
        assistantContent = typeof rawContent === 'string'
          ? rawContent
          : (() => { try { return JSON.stringify(rawContent); } catch { return String(rawContent); } })();
      }

      // Prefer new usage shape; fall back to legacy fields
      const tokensUsed = (data as any)?.usage
        ? (((data as any).usage.tokens_in || 0) + ((data as any).usage.tokens_out || 0))
        : ((((data as any)?.tokensIn || 0) + ((data as any)?.tokensOut || 0)) || 0);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: assistantContent || '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        meta: {
          tokensUsed,
          model: (data as any)?.model || undefined,
        },
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      persistLocal(finalMessages);
      await saveConversation(finalMessages);
      scrollToBottom();

    } catch (error) {
      // Improved error diagnostics for Edge Functions
      try {
        const anyErr: any = error;
        if (anyErr?.context) {
          const ctx = anyErr.context;
          let details: any = null;
          try { details = await ctx.json?.(); } catch { try { details = await ctx.text?.(); } catch { /* noop */ } }
          console.error('[dash-chat] Function error details:', details || '(no details)');

          // Show friendlier message for common cases
          const code = details?.error?.code;
          const msg = details?.error?.message as string | undefined;
          if (code === 'tier_restriction') {
            const friendly = 'Image understanding requires the Basic plan or an active trial. Please upgrade to enable this, or send your question as text without images.';
            const errorMessage: ChatMessage = {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content: `❌ ${friendly}`,
              timestamp: new Date(),
            };
            const failed = [...newMessages, errorMessage];
            setMessages(failed);
            persistLocal(failed);
            setIsTyping(false);
            setIsLoading(false);
            return;
          }
          if (code === 'quota_exceeded') {
            const friendly = 'You have reached the current AI usage limit. Please wait and try again, or upgrade for higher limits.';
            const errorMessage: ChatMessage = {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content: `❌ ${friendly}`,
              timestamp: new Date(),
            };
            const failed = [...newMessages, errorMessage];
            setMessages(failed);
            persistLocal(failed);
            setIsTyping(false);
            setIsLoading(false);
            return;
          }
          if (code === 'unauthorized') {
            const friendly = 'Your session expired. Please refresh and sign in again to continue.';
            const errorMessage: ChatMessage = {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content: `❌ ${friendly}`,
              timestamp: new Date(),
            };
            const failed = [...newMessages, errorMessage];
            setMessages(failed);
            persistLocal(failed);
            setIsTyping(false);
            setIsLoading(false);
            return;
          }
        }
      } catch { /* noop */ }

      console.error('Error sending message:', error);
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      const failed = [...newMessages, errorMessage];
      setMessages(failed);
      persistLocal(failed);
    } finally {
      setIsLoading(false);
      setSelectedImages([]); // clear after send
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (images: Array<{ url: string; hash: string; media_type: string; preview: string; size: number }>) => {
    setSelectedImages(images);
    setShowImageUpload(false);
    // Auto-focus input after selecting images
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        background: 'linear-gradient(to bottom, var(--surface-0) 0%, rgba(124, 58, 237, 0.02) 100%)',
        position: 'relative',
      }}
    >
      {/* Messages Area - Scrollable */}
      <div
        className="messages-scroll-area"
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '80px', // Space for input
          paddingTop: '80px', // Extra space at top to scroll past header
        }}
      >
        <div style={{
          padding: '0 12px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: '100%',
        }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px 40px', 
            color: 'var(--muted)',
          }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)',
              }}
            >
              <Sparkles size={40} color="white" />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
              Hi! I'm Dash
            </h3>
            <p style={{ fontSize: 14 }}>
              Ask me anything! I can help with homework, explain concepts, solve problems, and more.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} color="white" />
            </div>
            <div
              style={{
                background: 'var(--surface-1)',
                padding: '12px 16px',
                borderRadius: 16,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
                <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <ImageUpload
          onSelect={handleImageSelect}
          onClose={() => setShowImageUpload(false)}
          maxImages={3}
        />
      )}

      {/* Input Area - Modern Fixed Bottom Bar */}
      <div
        style={{
          padding: '8px 12px 8px 12px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          background: 'rgba(var(--bg-rgb), 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          boxShadow: '0 -2px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Selected Images Preview - Above Input */}
        {selectedImages.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              padding: '8px',
              background: 'var(--surface-1)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          >
            {selectedImages.map((img, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={img.preview}
                  alt={`Selected ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.85)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={12} color="white" strokeWidth={3} />
                </button>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                fontSize: 13,
                color: 'var(--muted)',
                fontWeight: 500,
              }}
            >
              {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} attached
            </div>
          </div>
        )}
        
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {/* Camera/Image Button */}
          <button
            onClick={() => setShowImageUpload(true)}
            disabled={isLoading}
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              flexShrink: 0,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s ease',
              color: 'var(--primary)',
            }}
            title="Attach image"
          >
            <Camera size={20} />
          </button>

          {/* Text Input Container */}
          <div 
            style={{ 
              flex: 1, 
              position: 'relative',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              minHeight: 40,
              maxHeight: 120,
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? 'Dash is thinking...' : 'Message Dash...'}
              disabled={isLoading}
              className="input"
              style={{
                width: '100%',
                minHeight: 40,
                maxHeight: 120,
                padding: '10px 50px 10px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                resize: 'none',
                lineHeight: '20px',
                fontSize: 15,
                fontWeight: 400,
                outline: 'none',
                overflowY: 'auto',
                overflowX: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                caretColor: 'var(--primary)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
              rows={1}
            />
            
            {/* Send Button - Modern Floating */}
            <button
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                width: 32,
                height: 32,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                flexShrink: 0,
                border: 'none',
                cursor: isLoading || (!input.trim() && selectedImages.length === 0) ? 'not-allowed' : 'pointer',
                background: isLoading || (!input.trim() && selectedImages.length === 0)
                  ? 'var(--surface-2)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                opacity: isLoading || (!input.trim() && selectedImages.length === 0) ? 0.4 : 1,
                transition: 'all 0.2s ease',
                boxShadow: (input.trim() || selectedImages.length > 0) && !isLoading
                  ? '0 2px 12px rgba(124, 58, 237, 0.4)'
                  : 'none',
                transform: (input.trim() || selectedImages.length > 0) && !isLoading ? 'scale(1)' : 'scale(0.9)',
              }}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 size={16} className="spin" color="white" />
              ) : (
                <Send size={16} color={(input.trim() || selectedImages.length > 0) ? 'white' : 'var(--muted)'} />
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Hide scrollbar for all browsers */
        .messages-scroll-area {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        
        .messages-scroll-area::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
          width: 0;
          height: 0;
        }

        /* Improve input placeholder visibility */
        .input::placeholder {
          color: var(--muted);
          opacity: 0.9;
        }

        /* Extra mobile scrollbar hiding */
        @media (max-width: 768px) {
          .messages-scroll-area::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
          }
        }

        @keyframes typing {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }
        
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--muted);
          animation: typing 1.4s ease-in-out infinite;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Smooth fade-in for image previews */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
