'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { ArrowLeft, Send, User, School, Check, CheckCheck, Loader } from 'lucide-react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface MessageThread {
  id: string;
  subject: string;
  created_by: string;
  student_id?: string;
  participants: any[];
  student?: {
    first_name: string;
    last_name: string;
  };
}

// Format message timestamp
const formatMessageTime = (timestamp: string): string => {
  const messageTime = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
};

// Message bubble component
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  const senderName = `${message.sender.first_name} ${message.sender.last_name}`.trim();
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      gap: 8
    }}>
      {!isOwnMessage && (
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: 'var(--primary-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {message.sender.role === 'principal' ? (
            <School size={18} color="var(--primary)" />
          ) : (
            <User size={18} color="var(--primary)" />
          )}
        </div>
      )}
      
      <div style={{
        maxWidth: '70%',
        minWidth: 120
      }}>
        {!isOwnMessage && (
          <div style={{ 
            fontSize: 12, 
            color: 'var(--muted)', 
            marginBottom: 4,
            paddingLeft: 12
          }}>
            {senderName} • <span style={{ textTransform: 'capitalize' }}>{message.sender.role}</span>
          </div>
        )}
        
        <div style={{
          background: isOwnMessage ? 'var(--primary)' : 'var(--surface-2)',
          color: isOwnMessage ? 'white' : 'var(--text-primary)',
          padding: '12px 16px',
          borderRadius: isOwnMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          wordWrap: 'break-word'
        }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {message.content}
          </p>
        </div>
        
        <div style={{ 
          fontSize: 11, 
          color: 'var(--muted)', 
          marginTop: 4,
          paddingLeft: isOwnMessage ? 0 : 12,
          paddingRight: isOwnMessage ? 12 : 0,
          textAlign: isOwnMessage ? 'right' : 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          gap: 4
        }}>
          {formatMessageTime(message.created_at)}
          {isOwnMessage && (
            message.read ? (
              <CheckCheck size={14} color="var(--primary)" />
            ) : (
              <Check size={14} color="var(--muted)" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default function MessageThreadPage() {
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const { slug } = useTenantSlug(userId);
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/sign-in');
        return;
      }

      setUserEmail(session.user.email);
      setUserId(session.user.id);
      setLoading(false);
    };

    initAuth();
  }, [router, supabase]);

  // Fetch thread and messages
  useEffect(() => {
    if (!userId || !threadId) return;

    const fetchThreadData = async () => {
      try {
        // Fetch thread details
        const { data: threadData, error: threadError } = await supabase
          .from('message_threads')
          .select('*, participants(*), student:students(*)')
          .eq('id', threadId)
          .single();

        if (threadError) throw threadError;
        setThread(threadData);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*, sender:user_profiles(*)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('thread_id', threadId)
          .neq('sender_id', userId);

        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching thread:', err);
      }
    };

    fetchThreadData();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`thread-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          // Fetch sender details for the new message
          const { data: senderData } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, role')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: senderData
          } as Message;

          setMessages((prev) => [...prev, newMsg]);

          // Mark as read if from another user
          if (payload.new.sender_id !== userId) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, threadId, supabase]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !threadId || sending) return;

    setSending(true);
    try {
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: userId,
          content: newMessage.trim(),
          read: false
        });

      if (sendError) throw sendError;

      // Update thread's last_message_at
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <ParentShell 
        tenantSlug={slug} 
        userEmail={userEmail} 
        userName={profile?.firstName}
        preschoolName={profile?.preschoolName}
      >
        <div className="container">
          <div className="section">
            <button 
              onClick={() => router.back()} 
              className="btn btnSecondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', fontSize: 18, marginBottom: 16 }}>
                Failed to load conversation
              </p>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                {error}
              </p>
              <button className="btn btnPrimary" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ParentShell>
    );
  }

  const otherParticipant = thread?.participants?.find(p => p.user_id !== userId);
  const participantName = otherParticipant?.user_profile ? 
    `${otherParticipant.user_profile.first_name} ${otherParticipant.user_profile.last_name}`.trim() :
    'Teacher';
  const participantRole = otherParticipant?.user_profile?.role || 'teacher';
  const studentName = thread?.student ? 
    `${thread.student.first_name} ${thread.student.last_name}`.trim() :
    null;

  return (
    <ParentShell 
      tenantSlug={slug} 
      userEmail={userEmail} 
      userName={profile?.firstName}
      preschoolName={profile?.preschoolName}
    >
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="section" style={{ 
          position: 'sticky', 
          top: 0, 
          background: 'var(--background)',
          zIndex: 10,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <button 
              onClick={() => router.back()} 
              className="btn btnSecondary"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 16px'
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'var(--primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {participantRole === 'principal' ? (
                <School size={24} color="var(--primary)" />
              ) : (
                <User size={24} color="var(--primary)" />
              )}
            </div>
            
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 2 }}>
                {participantName}
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--muted)', 
                margin: 0,
                textTransform: 'capitalize'
              }}>
                {participantRole}
                {studentName && ` • Re: ${studentName}`}
              </p>
            </div>
          </div>
          
          {thread?.subject && (
            <div style={{ 
              marginTop: 12, 
              padding: '8px 12px', 
              background: 'var(--surface-1)', 
              borderRadius: 8,
              fontSize: 14,
              color: 'var(--text-secondary)'
            }}>
              <strong>Subject:</strong> {thread.subject}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="section" style={{ 
          minHeight: '50vh',
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: '24px 0'
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={message.sender_id === userId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="section" style={{ 
          position: 'sticky', 
          bottom: 0, 
          background: 'var(--background)',
          paddingTop: 16,
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            alignItems: 'flex-end'
          }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sending}
              style={{
                flex: 1,
                minHeight: 48,
                maxHeight: 120,
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: 14,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="btn btnPrimary"
              style={{ 
                height: 48,
                width: 48,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {sending ? (
                <Loader size={20} className="spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          
          <p style={{ 
            fontSize: 12, 
            color: 'var(--muted)', 
            marginTop: 8,
            marginBottom: 0 
          }}>
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </ParentShell>
  );
}
