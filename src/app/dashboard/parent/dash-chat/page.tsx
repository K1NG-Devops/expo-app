'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { ChatInterface } from '@/components/dash-chat/ChatInterface';
import { ConversationList } from '@/components/dash-chat/ConversationList';
import { Sparkles, Plus } from 'lucide-react';

export default function DashChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>();
  const { slug } = useTenantSlug(userId);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  // Load most recent conversation from database on mount
  useEffect(() => {
    const loadMostRecentConversation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Try to get the most recent conversation
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('conversation_id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.conversation_id) {
          setActiveConversationId(data.conversation_id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dash_last_conversation_id', data.conversation_id);
          }
        } else {
          // No existing conversations, create a new one
          const newId = `dash_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          setActiveConversationId(newId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dash_last_conversation_id', newId);
          }
        }
      } catch (error) {
        console.warn('Could not load recent conversation:', error);
        // Fallback to new conversation
        const newId = `dash_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        setActiveConversationId(newId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dash_last_conversation_id', newId);
        }
      } finally {
        setConversationsLoaded(true);
      }
    };

    loadMostRecentConversation();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        router.push('/sign-in'); 
        return; 
      }
      setEmail(session.user.email || '');
      setUserId(session.user.id);
    })();
  }, [router, supabase.auth]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNewConversation = () => {
    const newId = `dash_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setActiveConversationId(newId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dash_last_conversation_id', newId);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dash_last_conversation_id', conversationId);
    }
  };

  // Clear current chat: remove local + DB, then start a fresh one
  const handleClearChat = async () => {
    try {
      const currentId = activeConversationId;
      if (currentId) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`dash_chat_${currentId}`);
        }
        // Best-effort delete in DB (non-blocking UI)
        try { await supabase.from('ai_conversations').delete().eq('conversation_id', currentId); } catch (e) { console.warn('DB clear failed (non-fatal):', e); }
      }
    } finally {
      const newId = `dash_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      setActiveConversationId(newId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dash_last_conversation_id', newId);
      }
      setMenuOpen(false);
    }
  };

  return (
    <ParentShell tenantSlug={slug} userEmail={email} showBrandChip={false}
      headerChildren={(
        <>
          <div className={`dash-header-info`}>
            <h1 className={`dash-header-title ${isMobile ? 'dash-header-title-mobile' : ''}`}>Dash AI</h1>
          </div>
        </>
      )}
      headerActionsRight={(
        <>
          {isMobile && (
            <button
              onClick={() => setShowConversations(true)}
              className="btn"
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="View chats"
            >
              💬
            </button>
          )}
          <button
            onClick={handleNewConversation}
            className="btn"
            style={{ padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text)', fontWeight: 600 }}
            title="New conversation"
          >
            <Plus size={18} /> {isMobile ? '' : 'New Chat'}
          </button>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="btn"
            style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text)', fontWeight: 600 }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Dash menu"
          >
            ⋮
          </button>
        </>
      )}
    >
      <style jsx global>{`
        .dash-chat-container {
          margin: calc(var(--space-3) * -1) calc(var(--space-2) * -1);
          margin-bottom: calc(var(--bottomnav-h, 0px) * -1);
          padding: 0;
          height: 100vh;
          max-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--surface-0);
        }

        .dash-chat-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
        }

        .dash-chat-header-mobile {        .dash-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dash-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dash-avatar-mobile {
          width: 36px;
          height: 36px;
        }

        .dash-header-info { color: var(--text); }

        .dash-header-title { 
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .dash-header-title-mobile {
          font-size: 16px;
        }

        .dash-header-subtitle {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
        }

        .dash-header-subtitle-mobile {
          font-size: 11px;
        }

        .chat-main-content {
          display: flex;
          flex: 1;
          position: relative;
          overflow: hidden;
          min-height: 0;
        }

        .chat-sidebar {
          width: 300px;
          border-right: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--surface-0);
        }

        .chat-area {
          flex: 1;
          background: var(--surface-0);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          position: relative;
        }

        @media (max-width: 768px) {
          .chat-sidebar {
            display: none;
          }
        }

        /* Mobile conversation panel */
        .mobile-conversations-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 3000;
          animation: fadeIn 0.2s ease;
        }

        .mobile-conversations-panel {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 85%;
          max-width: 320px;
          background: var(--surface-0);
          z-index: 3001;
          display: flex;
          flex-direction: column;
          animation: slideInLeft 0.3s ease;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        @keyframes fabPulse {
          0%, 100% {
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
          }
          50% {
            box-shadow: 0 4px 24px rgba(102, 126, 234, 0.6);
          }
        }

        .fab-new-chat-pulse {
          animation: fabPulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="dash-chat-container">
        {/* Removed in-page header; now integrated into ParentShell header */}

        {/* Main Content */}
        <div className="chat-main-content">
          {!isMobile && (
            <div className="chat-sidebar">
              <ConversationList
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
              />
            </div>
          )}

          <div className="chat-area">
            {conversationsLoaded && activeConversationId ? (
              <ChatInterface
                key={activeConversationId}
                conversationId={activeConversationId}
                onNewConversation={handleNewConversation}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                <p>Loading conversation...</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu dropdown with full-screen dark overlay */}
        {menuOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,1)', zIndex: 2000 }}
            onClick={() => setMenuOpen(false)}
          >
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'fixed', top: 64, right: 16, background: 'var(--surface-1)', color: 'var(--text)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden' }}
            >
              <button onClick={() => { setMenuOpen(false); handleNewConversation(); }} style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>New Chat</button>
              <button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }} style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>Dash Settings</button>
              <button onClick={handleClearChat} style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>Clear Chat</button>
              <button onClick={() => { localStorage.clear(); setMenuOpen(false); }} style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>Clear Local Cache</button>
            </div>
          </div>
        )}
      </div>

      {/* Settings modal with dark mode-friendly styles */}
      {settingsOpen && (
        <div className="fixed" style={{ inset: 0 as any, background: 'rgba(0,0,0,0.85)', zIndex: 4000 }} onClick={() => setSettingsOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ position: 'fixed', inset: 0 as any, borderRadius: 0, background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between" style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-0)', position: 'sticky', top: 0 }}>
              <h3 className="h3" style={{ margin: 0 }}>Dash Settings</h3>
              <button className="btn" onClick={() => setSettingsOpen(false)}>Close</button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <p className="text-sm" style={{ color: 'var(--muted)', marginTop: 0 }}>Settings are saved locally.</p>

              <div className="grid gap-3 mt-3">
                <label className="flex items-center justify-between">
                  <span>Enable Tools</span>
                  <input type="checkbox" defaultChecked={localStorage.getItem('dash_enable_tools') === '1'} onChange={(e) => localStorage.setItem('dash_enable_tools', e.target.checked ? '1' : '0')} />
                </label>
                <label className="flex items-center justify-between">
                  <span>Stream Responses</span>
                  <input type="checkbox" defaultChecked={localStorage.getItem('dash_stream') === '1'} onChange={(e) => localStorage.setItem('dash_stream', e.target.checked ? '1' : '0')} />
                </label>
                <label className="flex items-center justify-between">
                  <span>Allow Image Analysis</span>
                  <input type="checkbox" defaultChecked={localStorage.getItem('dash_allow_images') !== '0'} onChange={(e) => localStorage.setItem('dash_allow_images', e.target.checked ? '1' : '0')} />
                </label>

                <hr className="mt-3 mb-3" />

                <label className="flex items-center justify-between">
                  <span>Enable RAG (CAPS)</span>
                  <input type="checkbox" defaultChecked={localStorage.getItem('dash_rag') === '1'} onChange={(e) => localStorage.setItem('dash_rag', e.target.checked ? '1' : '0')} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="label">Language</span>
                    <select className="input" defaultValue={localStorage.getItem('dash_lang') || 'auto'} onChange={(e) => localStorage.setItem('dash_lang', e.target.value)}>
                      <option value="auto">Auto</option>
                      <option value="en">English (SA)</option>
                      <option value="af">Afrikaans</option>
                      <option value="zu">isiZulu</option>
                      <option value="xh">isiXhosa</option>
                      <option value="nso">Sepedi</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="label">TTS Style</span>
                    <select className="input" defaultValue={localStorage.getItem('dash_tts_style') || ''} onChange={(e) => localStorage.setItem('dash_tts_style', e.target.value)}>
                      <option value="">Natural</option>
                      <option value="friendly">Friendly</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="professional">Professional</option>
                      <option value="cheerful">Cheerful</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="label">TTS Rate</span>
                    <input className="input" type="number" min={-50} max={50} defaultValue={Number(localStorage.getItem('dash_tts_rate') ?? '5')} onChange={(e) => localStorage.setItem('dash_tts_rate', e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="label">TTS Pitch</span>
                    <input className="input" type="number" min={-50} max={50} defaultValue={Number(localStorage.getItem('dash_tts_pitch') ?? '0')} onChange={(e) => localStorage.setItem('dash_tts_pitch', e.target.value)} />
                  </label>
                </div>

                <label className="flex items-center justify-between">
                  <span>Force Azure TTS only</span>
                  <input type="checkbox" checked readOnly />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Conversations Panel */}
      {isMobile && showConversations && (
        <>
          <div 
            className="mobile-conversations-overlay"
            onClick={() => setShowConversations(false)}
          />
          <div className="mobile-conversations-panel">
            {/* Header */}
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'var(--surface-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                💬 Your Chats
              </h3>
              <button
                onClick={() => setShowConversations(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--text)',
                  padding: 4
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ConversationList
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => {
                  handleSelectConversation(id);
                  setShowConversations(false);
                }}
                onNewConversation={() => {
                  handleNewConversation();
                  setShowConversations(false);
                }}
              />
            </div>
          </div>
        </>
      )}
    </ParentShell>
  );
}
