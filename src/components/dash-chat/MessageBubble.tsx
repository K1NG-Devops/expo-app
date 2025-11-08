'use client';

import { User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from './ChatInterface';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const supabase = createClient();
  const [playing, setPlaying] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [detectingLang, setDetectingLang] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ensure text content is a string for rendering
  const contentStr: string = typeof message.content === 'string'
    ? message.content
    : (() => {
        try {
          if (message.content == null) return '';
          if (typeof (message.content as any).toString === 'function') {
            const s = (message.content as any).toString();
            return typeof s === 'string' ? s : JSON.stringify(message.content);
          }
          return JSON.stringify(message.content);
        } catch {
          return String(message.content);
        }
      })();

  const detectLang = (text: string): 'en' | 'af' | 'zu' | 'xh' | 'st' | 'nso' => {
    const t = (text || '').toLowerCase();
    // Prioritize Afrikaans first to avoid false positives
    if (/(\bmy\b|\bnaam\b|\bek\b|\bjy\b|\bvir\b|\bwat\b|\bmet\b|\bnie\b|\bmaar\b|\bbaie\b|\basseblief\b|\bdankie\b|goeie\s*(môre|more|middag|aand))/.test(t)) return 'af';
    if (/(ngiy|mina|wena|ukh|kuy|ukung|ngabe|yebo|cha)\b/.test(t)) return 'zu';
    if (/(ndiy|ndiza|ndicela|mna|wena|ux|ith|ikhona|molweni|unjani)\b/.test(t)) return 'xh';
    // Sesotho without 'ek' token to prevent Afrikaans collision
    if (/(\bke\b|\bha\b|\btsa\b|\bhore\b|\bmme\b|o ka|joalo ka|dumela)\b/.test(t)) return 'st';
    if (/(\bke\b|\bga\b|\ble\b|\bgore\b|\bmme\b|\byo\b|\bmo\b|\bgo\b|dumela)\b/.test(t)) return 'nso';
    return 'en';
  };

  // Ensure correct Azure voices regardless of server defaults
  const CLIENT_VOICE_MAP: Record<string, string> = {
    af: 'af-ZA-AdriNeural',
    zu: 'zu-ZA-ThandoNeural',
    xh: 'en-ZA-LeahNeural', // fallback (no native voice)
    st: 'en-ZA-LeahNeural', // fallback
    nso: 'en-ZA-LeahNeural', // fallback
    en: 'en-ZA-LeahNeural',
  };

  const speak = async () => {
    try {
      setAudioError(null);

      // If already playing, stop
      if (playing && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlaying(false);
        return;
      }

      setPlaying(true);
      setDetectingLang(true);

      // Always auto-detect from the current message content
      const detected = detectLang(contentStr) as 'en' | 'af' | 'zu' | 'xh' | 'st' | 'nso';
      const supported: Array<'en' | 'af' | 'zu'> = ['en', 'af', 'zu'];
      if (!supported.includes(detected as any)) {
        setDetectingLang(false);
        setPlaying(false);
        setAudioError('Text-to-speech is only available for Afrikaans, English, and isiZulu at the moment.');
        return;
      }

      const langKey = detected as 'en' | 'af' | 'zu';

      // Force correct Azure voice for detected language
      const voice_id = CLIENT_VOICE_MAP[langKey] || CLIENT_VOICE_MAP.en;

      setDetectingLang(false);

      const style = typeof window !== 'undefined' ? localStorage.getItem('dash_tts_style') || undefined : undefined;
      const rate = typeof window !== 'undefined' ? Number(localStorage.getItem('dash_tts_rate') || '5') : 5;
      const pitch = typeof window !== 'undefined' ? Number(localStorage.getItem('dash_tts_pitch') || '0') : 0;
      const body: any = { text: contentStr, language: langKey, voice_id, style, rate, pitch };
      const { data, error } = await supabase.functions.invoke('tts-proxy', { body });
      if (error) throw error;
      if (!data?.audio_url) {
        throw new Error('No audio returned');
      }
      const audio = new Audio(data.audio_url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => { setPlaying(false); setAudioError('Playback failed'); };
      await audio.play();
    } catch (e: any) {
      setAudioError(e?.message || 'TTS failed');
      setPlaying(false);
      setDetectingLang(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
        paddingLeft: isUser ? 2 : 0,
        paddingRight: isUser ? 0 : 2,
        marginBottom: 20,
        animation: 'messageSlideIn 0.3s ease-out',
      }}
    >
      {/* Avatar - At screen edges */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: isUser
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          marginLeft: isUser ? 0 : '-2px',
          marginRight: isUser ? '-2px' : 0,
        }}
      >
        {isUser ? (
          <User size={14} color="white" />
        ) : (
          <Sparkles size={14} color="white" />
        )}
      </div>

      {/* Message Content - Wider */}
      <div
        style={{
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {message.images.map((img, index) => (
              <div
                key={index}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  maxWidth: 200,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <img
                  src={(img as any).url || img.preview || (img as any).data}
                  alt={`Attachment ${index + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        <div
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'var(--surface-1)',
            color: isUser ? 'white' : 'var(--text)',
            padding: '14px 18px',
            borderRadius: 18,
            border: isUser ? 'none' : '1px solid var(--border)',
            fontSize: 15,
            lineHeight: 1.6,
            boxShadow: isUser
              ? '0 4px 12px rgba(102, 126, 234, 0.25)'
              : '0 2px 8px rgba(0, 0, 0, 0.05)',
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
          }}
        >
          {isUser ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {contentStr}
            </p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {contentStr}
              </ReactMarkdown>

              {/* Citations */}
              {!!message.meta?.citations?.length && (
                <div style={{
                  marginTop: 10,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center'
                }}>
                  {message.meta.citations!.map((c, i) => (
                    <span key={i} title={c.snippet || ''} style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 10,
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.25)',
                      color: '#7c3aed'
                    }}>
                      S{i+1}{typeof c.page === 'number' ? ` · p${c.page}` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* TTS - Disabled due to language detection issues */}
              {/* 
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <button
                  onClick={speak}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: playing
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' // red when playing
                      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', // green idle
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: playing
                      ? '0 2px 10px rgba(220,38,38,0.35)'
                      : '0 2px 10px rgba(34,197,94,0.35)'
                  }}
                  title={playing ? 'Stop' : 'Listen'}
                >
                  {playing ? '⏹ Stop' : '🔊 Listen'}
                </button>
                {detectingLang && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Detecting language…</span>
                )}
                {audioError && (
                  <span style={{ fontSize: 11, color: 'var(--danger)' }}>{audioError}</span>
                )}
              </div>
              */}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            paddingLeft: isUser ? 0 : 8,
            paddingRight: isUser ? 8 : 0,
            justifyContent: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          <span>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {message.meta?.tokensUsed && (
            <span>• {message.meta.tokensUsed} tokens</span>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .markdown-content {
          font-size: 15px;
          line-height: 1.6;
        }
        
        .markdown-content p {
          margin: 0 0 12px 0;
        }
        
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        
        .markdown-content li {
          margin: 6px 0;
        }

        .markdown-content li::marker {
          color: #7c3aed;
        }
        
        .markdown-content code {
          background: rgba(124, 58, 237, 0.1);
          color: #7c3aed;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-weight: 500;
        }
        
        .markdown-content pre {
          background: var(--surface-2);
          padding: 16px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 12px 0;
          border: 1px solid var(--border);
        }
        
        .markdown-content pre code {
          background: none;
          padding: 0;
          color: var(--text);
          font-weight: 400;
        }
        
        .markdown-content strong {
          font-weight: 700;
          color: #7c3aed;
        }
        
        .markdown-content em {
          font-style: italic;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid #7c3aed;
          padding-left: 16px;
          margin: 12px 0;
          color: var(--muted);
          font-style: italic;
        }
        
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        
        .markdown-content th,
        .markdown-content td {
          border: 1px solid var(--border);
          padding: 10px 14px;
          text-align: left;
        }
        
        .markdown-content th {
          background: var(--surface-2);
          font-weight: 600;
          color: #7c3aed;
        }

        .markdown-content a {
          color: #7c3aed;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .markdown-content a:hover {
          text-decoration: underline;
          color: #ec4899;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin: 16px 0 8px 0;
          font-weight: 700;
          color: #7c3aed;
        }

        .markdown-content h1 { font-size: 24px; }
        .markdown-content h2 { font-size: 20px; }
        .markdown-content h3 { font-size: 18px; }
        .markdown-content h4 { font-size: 16px; }

        .markdown-content hr {
          border: none;
          border-top: 2px solid var(--border);
          margin: 16px 0;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .markdown-content {
            font-size: 14px;
          }

          .markdown-content code {
            font-size: 13px;
            padding: 2px 6px;
          }

          .markdown-content pre {
            padding: 12px;
          }

          .markdown-content th,
          .markdown-content td {
            padding: 8px 10px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
