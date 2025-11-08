'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, Loader2, CheckCircle2, XCircle, ArrowLeft, FileText, Plus, Edit2, Eye, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useExamSession } from '@/lib/hooks/useExamSession';

// Global controls/utilities for this builder
const AUTO_ADVANCE = true; // set false to require explicit user clicks
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  quickActions?: QuickAction[];
  examPreview?: ExamSection[];
}

interface QuickAction {
  id: string;
  label: string;
  value: string;
  type: 'button' | 'chip';
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

interface ExamSection {
  id: string;
  title: string;
  questions: ExamQuestion[];
  status: 'draft' | 'approved' | 'editing';
}

interface ExamQuestion {
  id: string;
  number: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'numeric';
  marks: number;
  options?: string[];
  correctAnswer?: string;
}

interface ConversationalExamBuilderProps {
  grade: string;
  subject: string;
  onClose: () => void;
  onSave?: (exam: any) => void;
}

export function ConversationalExamBuilder({ 
  grade, 
  subject, 
  onClose,
  onSave 
}: ConversationalExamBuilderProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { saveExamGeneration } = useExamSession(null)
  const [conversationState, setConversationState] = useState<{
    stage: 'greeting' | 'topic_selection' | 'exam_scope' | 'question_types' | 'generating' | 'refining' | 'complete';
    selectedTopics: string[];
    duration: number;
    totalMarks: number;
    questionTypes: string[];
    sections: ExamSection[];
    currentSectionIndex: number;
  }>({
    stage: 'greeting',
    selectedTopics: [],
    duration: 60,
    totalMarks: 50,
    questionTypes: [],
    sections: [],
    currentSectionIndex: 0,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      startConversation();
    }
  }, []);

  const startConversation = () => {
    const gradeLabel = grade.replace('grade_', 'Grade ').replace('_', ' ');
    addMessage({
      role: 'assistant',
      content: `Hi! 👋 I'm Dash AI, and I'm here to help you create a CAPS-aligned ${gradeLabel} ${subject} exam.\n\nLet me guide you through building the perfect practice test. We'll do this step-by-step, and you can adjust anything along the way.\n\nFirst, let me suggest some topics based on the CAPS curriculum...`,
    });

    // Simulate thinking then show topics
    setTimeout(() => {
      setIsTyping(true);
      fetchCAPSTopics();
    }, 1500);
  };

  const fetchCAPSTopics = async () => {
    // In a real implementation, this would call the search_caps_curriculum tool
    // For now, we'll use example topics
    const exampleTopics = getExampleTopics(grade, subject);
    
    setIsTyping(false);
    addMessage({
      role: 'assistant',
      content: `Here are the main CAPS topics for ${subject}:\n\nWhich topics would you like to focus on? You can select multiple topics, or click "Select All" to include everything.`,
      quickActions: [
        ...exampleTopics.map((topic, i) => ({
          id: `topic-${i}`,
          label: topic,
          value: topic,
          type: 'chip' as const,
        })),
        { id: 'all-topics', label: '✓ Select All', value: 'all', type: 'button' as const, variant: 'primary' as const },
        { id: 'continue-topics', label: '→ Continue with selected topics', value: 'continue', type: 'button' as const, variant: 'success' as const },
      ],
    });

    setConversationState(prev => ({ ...prev, stage: 'topic_selection' }));
  };

  const handleTopicSelection = (topics: string[]) => {
    if (topics.length === 0) {
      return; // Don't proceed if no topics selected
    }

    const topicList = topics.join(', ');
    addMessage({
      role: 'user',
      content: `I'll focus on: ${topicList}`,
    });

    setConversationState(prev => ({ ...prev, selectedTopics: topics }));

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({
          role: 'assistant',
          content: `Perfect! Now let's set up the exam structure.\n\nHow much time should students have, and how many marks? Select both, then click Continue.`,
          quickActions: [
            { id: 'time-30', label: '30 minutes', value: '30', type: 'chip' as const },
            { id: 'time-60', label: '60 minutes', value: '60', type: 'chip' as const },
            { id: 'time-90', label: '90 minutes', value: '90', type: 'chip' as const },
            { id: 'divider-1', label: '|', value: 'divider', type: 'chip' as const },
            { id: 'marks-25', label: '25 marks', value: '25', type: 'chip' as const },
            { id: 'marks-50', label: '50 marks', value: '50', type: 'chip' as const },
            { id: 'marks-75', label: '75 marks', value: '75', type: 'chip' as const },
            { id: 'continue-scope', label: '→ Continue', value: 'continue', type: 'button' as const, variant: 'primary' as const },
          ],
        });
        setConversationState(prev => ({ ...prev, stage: 'exam_scope' }));
      }, 1000);
    }, 500);
  };

  const handleScopeSelection = (duration: number, marks: number) => {
    addMessage({
      role: 'user',
      content: `${duration} minutes, ${marks} marks`,
    });

    setConversationState(prev => ({ 
      ...prev, 
      duration, 
      totalMarks: marks,
    }));

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({
          role: 'assistant',
          content: `Great! Now, what types of questions would you like?\n\nI recommend a mix for comprehensive assessment.`,
          quickActions: [
            { id: 'type-mc', label: '☑️ Multiple Choice', value: 'multiple_choice', type: 'chip' as const },
            { id: 'type-short', label: '✍️ Short Answer', value: 'short_answer', type: 'chip' as const },
            { id: 'type-numeric', label: '🔢 Calculations', value: 'numeric', type: 'chip' as const },
            { id: 'type-essay', label: '📝 Essay', value: 'essay', type: 'chip' as const },
            { id: 'recommended', label: '✨ Use Recommended Mix', value: 'recommended', type: 'button' as const, variant: 'primary' as const },
          ],
        });
        setConversationState(prev => ({ ...prev, stage: 'question_types' }));
      }, 1200);
    }, 500);
  };

  const handleQuestionTypeSelection = (types: string[]) => {
    if (types.length === 0) {
      return; // Don't proceed if no types selected
    }

    const typeLabels = types.map(t => {
      switch(t) {
        case 'multiple_choice': return 'Multiple Choice';
        case 'short_answer': return 'Short Answer';
        case 'numeric': return 'Calculations';
        case 'essay': return 'Essay';
        default: return t;
      }
    }).join(', ');

    addMessage({
      role: 'user',
      content: `Include: ${typeLabels}`,
    });

    setConversationState(prev => ({ 
      ...prev, 
      questionTypes: types,
    }));

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const gradeLabel = grade.replace('grade_', 'Grade ').replace('_', ' ');

        if (AUTO_ADVANCE) {
          addMessage({
            role: 'assistant',
            content: `Perfect setup! Let me create the exam structure:\n\n📋 **${gradeLabel} ${subject} Practice Test**\n⏱️ Duration: ${conversationState.duration} minutes\n📊 Total: ${conversationState.totalMarks} marks\n📚 Topics: ${conversationState.selectedTopics.join(', ')}\n\nOkay, I'll start generating Section A now…`,
          });
          setConversationState(prev => ({ ...prev, stage: 'generating' }));
          generateSection(0);
        } else {
          addMessage({
            role: 'assistant',
            content: `Perfect setup! Let me create the exam structure:\n\n📋 **${gradeLabel} ${subject} Practice Test**\n⏱️ Duration: ${conversationState.duration} minutes\n📊 Total: ${conversationState.totalMarks} marks\n📚 Topics: ${conversationState.selectedTopics.join(', ')}\n\nI'll organize this into sections. Ready for me to generate Section A?`,
            quickActions: [
              { id: 'generate-section', label: '✨ Yes, generate Section A', value: 'generate', type: 'button' as const, variant: 'primary' as const },
              { id: 'adjust', label: 'Wait, let me adjust', value: 'adjust', type: 'button' as const, variant: 'secondary' as const },
            ],
          });
          setConversationState(prev => ({ ...prev, stage: 'generating' }));
        }
      }, 1500);
    }, 500);
  };

  const generateSection = async (sectionIndex: number, retries = 0) => {
    setIsTyping(true)

    try {
      const supabase = createClient()
      
      // Try to get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[ConversationalExamBuilder] Session data:', sessionData);
      console.log('[ConversationalExamBuilder] Session error:', sessionError);
      
      // Check if we have a valid session
      if (sessionError || !sessionData?.session) {
        console.error('[ConversationalExamBuilder] No valid session found');
        
        // Try to refresh the session
        const { data: refreshData } = await supabase.auth.refreshSession();
        
        if (!refreshData?.session) {
          throw new Error('Authentication required. Please refresh the page and try again.');
        }
        
        const token = refreshData.session.access_token;
        console.log('[ConversationalExamBuilder] Session refreshed, got token');
      }
      
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Authentication required. Please refresh the page and try again.');
      }
      
      console.log('[ConversationalExamBuilder] Got auth token, length:', token.length);

      // Build the prompt for this section
      const sectionLabel = String.fromCharCode(65 + sectionIndex) // A, B, C...

      // Build the prompt for this section with continuity info
      const prompt = buildSectionPrompt(sectionLabel)

      // Build conversation history for continuity (last 20 messages)
      const conversationHistory = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      console.log('[ConversationalExamBuilder] Generating section with prompt:', prompt)

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          scope: 'parent',
          service_type: 'dash_conversation',
          enable_tools: true,
          tool_choice: { type: 'tool', name: 'generate_caps_exam' },
          payload: {
            prompt,
            context: 'caps_exam_generation_conversational',
            metadata: {
              grade,
              subject,
              topics: conversationState.selectedTopics,
              section: sectionLabel,
              conversational: true,
              previousSectionsCount: conversationState.sections.length,
              previousSectionTitles: conversationState.sections.map((s) => s.title),
              previousQuestions: conversationState.sections.flatMap((s, si) => 
                s.questions.map((q, qi) => `${String.fromCharCode(65 + si)}.${qi + 1} ${q.text}`)
              ),
            },
            // Put conversationHistory inside payload so ai-proxy forwards it
            conversationHistory,
          },
        },
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log('[ConversationalExamBuilder] AI response:', data)
      console.log('[ConversationalExamBuilder] AI error:', error)

      if (error) {
        console.error('[ConversationalExamBuilder] Supabase invoke error:', error)
        const msg = typeof (error as any)?.message === 'string' ? (error as any).message : ''
        if (/429|Too Many Requests|quota|rate limit/i.test(msg)) {
          // Silent auto-retry with backoff up to 2 times, then show message
          if (retries < 2) {
            await sleep(1000 * Math.pow(2, retries));
            return generateSection(sectionIndex, retries + 1);
          }
          setIsTyping(false)
          addMessage({
            role: 'assistant',
            content: 'We hit the current AI usage limit. Please wait a moment and try again, or upgrade to increase your quota.',
            quickActions: [
              { id: 'retry-section', label: '🔄 Try Again', value: 'retry', type: 'button', variant: 'primary' },
              { id: 'adjust-back', label: '← Go Back', value: 'back', type: 'button', variant: 'secondary' },
            ],
          })
          return
        }
        throw error
      }

      // Extract section from tool results or content
      console.log('[ConversationalExamBuilder] Extracting section from response...');
      const section = extractSectionFromResponse(data, sectionLabel);
      
      console.log('[ConversationalExamBuilder] Extracted section:', section);
      
      setIsTyping(false);
      
      if (section) {
        setConversationState(prev => ({
          ...prev,
          sections: [...prev.sections, section],
          currentSectionIndex: sectionIndex,
        }));

        addMessage({
          role: 'assistant',
          content: `✅ Section ${sectionLabel} is ready! Here's what I created:`,
          examPreview: [section],
          quickActions: [
            { id: 'approve', label: '✓ Looks good!', value: 'approve', type: 'button' as const, variant: 'success' as const },
            { id: 'harder', label: '📈 Make it harder', value: 'harder', type: 'button' as const },
            { id: 'easier', label: '📉 Make it easier', value: 'easier', type: 'button' as const },
            { id: 'more', label: '+ Add more questions', value: 'more', type: 'button' as const },
            { id: 'regenerate', label: '🔄 Regenerate', value: 'regenerate', type: 'button' as const, variant: 'secondary' as const },
          ],
        });
      }

    } catch (error: any) {
      setIsTyping(false);
      console.error('[ConversationalExamBuilder] Error:', error);
      
      // Show more helpful error message
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      addMessage({
        role: 'assistant',
        content: `I encountered an error generating the section: ${errorMsg}\n\nLet's try a different approach. Would you like to try again or adjust your selections?`,
        quickActions: [
          { id: 'retry-section', label: '🔄 Try Again', value: 'retry', type: 'button' as const, variant: 'primary' as const },
          { id: 'adjust-back', label: '← Go Back', value: 'back', type: 'button' as const, variant: 'secondary' as const },
        ],
      });
    }
  };

  const buildSectionPrompt = (sectionLabel: string) => {
    const gradeLabel = grade.replace('grade_', 'Grade ').replace('_', ' ')
    const marksForSection = Math.floor(conversationState.totalMarks / 3)

    const prev = conversationState.sections
    const prevSummary = prev.length
      ? `Existing sections already created (do NOT duplicate their questions):\n${prev
          .map((s, i) => `- Section ${String.fromCharCode(65 + i)}: ${s.title} (${s.questions.length} questions)`) 
          .join('\n')}`
      : 'No previous sections yet.'

    const sectionSpec = getSectionSpec(sectionLabel)

    return `Create Section ${sectionLabel} for a ${gradeLabel} ${subject} CAPS exam.\n\nTopics to cover: ${conversationState.selectedTopics.slice(0, 3).join(', ')}.\n${prevSummary}\n\nRequirements:\n- Use ${sectionSpec}.\n- Allocate about ${marksForSection} marks for this section.\n- Avoid repeating questions from prior sections.\n- Use clear numbering and include correct answers for MCQs.\n\nUse the generate_caps_exam tool and return a single section in the 'sections' array.`
  };

  const getSectionSpec = (section: string) => {
    // Distribute questions across sections
    if (section === 'A') return '5-7 Multiple Choice questions (1-2 marks each)';
    if (section === 'B') return '3-5 Short Answer questions (3-5 marks each)';
    if (section === 'C') return '2-3 Calculation/Problem Solving questions (5-10 marks each)';
    return '3-5 questions';
  };

  const handleSectionApproval = () => {
    addMessage({
      role: 'user',
      content: 'Looks good!',
    })

    const currentSection = conversationState.currentSectionIndex
    const nextSection = currentSection + 1
    const sectionLabel = String.fromCharCode(65 + nextSection)

    // Mark current section as approved
    setConversationState(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === currentSection ? { ...s, status: 'approved' as const } : s
      ),
    }))

    if (nextSection < 3) {
      if (AUTO_ADVANCE) {
        setTimeout(() => {
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            addMessage({ role: 'assistant', content: `Excellent! Generating Section ${sectionLabel}…` })
            generateSection(nextSection)
          }, 500)
        }, 300)
        return;
      }
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          addMessage({
            role: 'assistant',
            content: `Excellent! Ready for Section ${sectionLabel}?`,
            quickActions: [
              { id: 'generate-next', label: `✨ Generate Section ${sectionLabel}`, value: 'generate-next', type: 'button', variant: 'primary' },
              { id: 'preview', label: '👁️ Preview full exam', value: 'preview', type: 'button' },
              { id: 'finish', label: '✓ Finish with current sections', value: 'finish', type: 'button', variant: 'success' },
            ],
          })
        }, 800)
      }, 500)
    } else {
      finishExam()
    }
  }

  const handleSectionRefinement = (action: string) => {
    addMessage({
      role: 'user',
      content: action === 'harder' ? 'Make it harder' : 
               action === 'easier' ? 'Make it easier' : 
               action === 'more' ? 'Add more questions' : 
               'Regenerate section',
    })

    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage({
          role: 'assistant',
          content: `I'm regenerating Section ${String.fromCharCode(65 + conversationState.currentSectionIndex)} with your requested changes...`,
        })
        // Regenerate with modified parameters
        generateSection(conversationState.currentSectionIndex)
      }, 1000)
    }, 500)
  };

  const compileExam = () => {
    const gradeLabel = grade.replace('grade_', 'Grade ').replace('_', ' ')
    const sections = conversationState.sections.map((s, i) => ({
      title: s.title || `SECTION ${String.fromCharCode(65 + i)}`,
      questions: s.questions,
    }))
    const totalMarks = sections.reduce((sum, s) => sum + (s.questions?.reduce((m, q) => m + (q.marks || 1), 0) || 0), 0)
    return {
      title: `${gradeLabel} ${subject} Practice Test`,
      grade,
      subject,
      totalMarks,
      durationMinutes: conversationState.duration,
      sections,
      instructions: [
        'Answer ALL questions',
        'Show all workings where applicable',
        'Write neatly and clearly',
      ],
    }
  }

  const handleSaveExam = async () => {
    const exam = compileExam()
    addMessage({ role: 'assistant', content: 'Saving your exam…' })
    const id = await saveExamGeneration(exam, 'Conversational Exam Builder', exam.title, grade, subject)
    if (id) {
      addMessage({
        role: 'assistant',
        content: '✅ Exam saved. You can find it under My Exams. Opening now…',
      })
      // Navigate to My Exams
      setTimeout(() => router.push('/dashboard/parent/my-exams'), 600)
      onSave?.(exam)
    } else {
      addMessage({ role: 'assistant', content: '❌ Could not save exam. Please try again.' })
    }
  }

  const handlePreviewExam = () => {
    const exam = compileExam()
    const summary = `Preview:\n- Sections: ${exam.sections.length}\n- Total questions: ${exam.sections.reduce((n, s) => n + (s.questions?.length || 0), 0)}\n- Total marks: ${exam.totalMarks}\n- Duration: ${exam.durationMinutes} minutes`
    addMessage({ role: 'assistant', content: summary })
  }

  const handleEditSections = () => {
    addMessage({
      role: 'assistant',
      content: 'Which section would you like to edit? (A, B, or C) Then tell me what to change, and click Regenerate.',
    })
    setConversationState((prev) => ({ ...prev, stage: 'refining' }))
  }

  const finishExam = () => {
    setConversationState(prev => ({ ...prev, stage: 'complete' }));
    
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `🎉 Your exam is complete!\n\n📋 **Summary:**\n- ${conversationState.sections.length} sections\n- ${conversationState.sections.reduce((sum, s) => sum + s.questions.length, 0)} total questions\n- ${conversationState.totalMarks} marks\n- ${conversationState.duration} minutes\n\nWould you like to save it or make any final adjustments?`,
        quickActions: [
          { id: 'save', label: '💾 Save Exam', value: 'save', type: 'button' as const, variant: 'primary' as const },
          { id: 'preview-final', label: '👁️ Preview', value: 'preview', type: 'button' },
          { id: 'edit', label: '✏️ Edit Sections', value: 'edit', type: 'button' },
        ],
      });
    }, 500);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    addMessage({
      role: 'user',
      content: inputValue,
    });

    setInputValue('');
    
    // Process the user's message
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({
          role: 'assistant',
          content: `I understand. Let me help you with that...`,
        });
      }, 1000);
    }, 500);
  };

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // NEW: extract section from AI response
  const extractSectionFromResponse = (data: any, sectionLabel: string): ExamSection | null => {
    const tryParse = (val: any) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      if (typeof val !== 'string') return null;
      try {
        return JSON.parse(val);
      } catch {
        // try code fence
        const match = val.match(/```(?:json)?\n([\s\S]*?)```/i);
        if (match) {
          try { return JSON.parse(match[1]); } catch {}
        }
        // try to locate sections array
        const sectionsIdx = val.indexOf('"sections"');
        if (sectionsIdx >= 0) {
          const braceStart = val.indexOf('{', sectionsIdx - 50);
          const braceEnd = val.lastIndexOf('}');
          if (braceStart >= 0 && braceEnd > braceStart) {
            try { return JSON.parse(val.slice(braceStart, braceEnd + 1)); } catch {}
          }
        }
        return null;
      }
    };

    const pickSection = (payload: any): any => {
      if (!payload) return null;
      const sections: any[] = payload.sections || payload.result?.sections || payload.data?.sections || [];
      if (!Array.isArray(sections) || sections.length === 0) return null;
      // Prefer section whose title mentions the requested label
      const byTitle = sections.find((s) =>
        typeof s?.title === 'string' && new RegExp(`Section\\s*${sectionLabel}`, 'i').test(s.title)
      );
      return byTitle || sections[0];
    };

    let candidate: any = null;

    // Tool results path
    const toolResults = (data && (data.tool_results || data.tools || data.result?.tool_results)) || [];
    if (Array.isArray(toolResults) && toolResults.length > 0) {
      for (const tr of toolResults) {
        const parsed = tryParse(tr?.result ?? tr?.output ?? tr?.content);
        const section = pickSection(parsed);
        if (section) { candidate = section; break; }
      }
    }

    // Direct content path
    if (!candidate) {
      const parsed = tryParse(data?.result ?? data?.content ?? data?.message ?? data);
      const section = pickSection(parsed);
      if (section) candidate = section;
    }

    if (!candidate) return null;

    // Normalize to ExamSection
    const normalizeQuestionType = (t: any): ExamQuestion['type'] => {
      if (!t) return 'short_answer';
      const s = String(t).toLowerCase();
      if (s.includes('choice') || s === 'mcq' || s === 'multiple_choice') return 'multiple_choice';
      if (s.includes('essay')) return 'essay';
      if (s.includes('calc') || s.includes('numeric') || s.includes('problem')) return 'numeric';
      return 'short_answer';
    };

    const qs = Array.isArray(candidate.questions) ? candidate.questions : candidate.items || [];

    const questions: ExamQuestion[] = qs.map((q: any, idx: number) => ({
      id: q.id || `${Date.now()}-${idx}`,
      number: q.number || `${sectionLabel}.${idx + 1}`,
      text: q.text || q.question || q.prompt || '',
      type: normalizeQuestionType(q.type),
      marks: Number(q.marks ?? q.points ?? 1),
      options: q.options || q.choices || undefined,
      correctAnswer: q.correctAnswer || q.answer || q.correct || undefined,
    }));

    return {
      id: candidate.id || `${Date.now()}`,
      title: candidate.title || `SECTION ${sectionLabel}`,
      questions,
      status: 'draft',
    };
  };

  // NEW: central quick action handler
  const handleQuickAction = (action: QuickAction) => {
    // Chip toggles by stage
    if (action.type === 'chip') {
      if (conversationState.stage === 'topic_selection') {
        setConversationState((prev) => {
          const exists = prev.selectedTopics.includes(action.value);
          const next = exists
            ? prev.selectedTopics.filter((t) => t !== action.value)
            : [...prev.selectedTopics, action.value];
          return { ...prev, selectedTopics: next };
        });
        return;
      }
      if (conversationState.stage === 'exam_scope') {
        if (action.id.startsWith('time-')) {
          const mins = parseInt(action.value, 10);
          if (!Number.isNaN(mins)) setConversationState((p) => ({ ...p, duration: mins }));
          return;
        }
        if (action.id.startsWith('marks-')) {
          const marks = parseInt(action.value, 10);
          if (!Number.isNaN(marks)) setConversationState((p) => ({ ...p, totalMarks: marks }));
          return;
        }
      }
      if (conversationState.stage === 'question_types') {
        setConversationState((prev) => {
          const exists = prev.questionTypes.includes(action.value);
          const next = exists
            ? prev.questionTypes.filter((t) => t !== action.value)
            : [...prev.questionTypes, action.value];
          return { ...prev, questionTypes: next };
        });
        return;
      }
    }

    // Buttons
    switch (action.value) {
      case 'all': {
        const topics = getExampleTopics(grade, subject);
        setConversationState((p) => ({ ...p, selectedTopics: topics }));
        break;
      }
      case 'continue': {
        if (conversationState.stage === 'topic_selection') {
          handleTopicSelection(conversationState.selectedTopics);
        } else if (conversationState.stage === 'exam_scope') {
          handleScopeSelection(conversationState.duration, conversationState.totalMarks);
        }
        break;
      }
      case 'recommended': {
        const types = ['multiple_choice', 'short_answer', 'numeric'];
        setConversationState((p) => ({ ...p, questionTypes: types }));
        handleQuestionTypeSelection(types);
        break;
      }
      case 'generate': {
        // Generate Section A
        generateSection(0);
        break;
      }
      case 'generate-next': {
        generateSection(conversationState.currentSectionIndex + 1);
        break;
      }
      case 'approve': {
        handleSectionApproval();
        break;
      }
      case 'harder':
      case 'easier':
      case 'more':
      case 'regenerate': {
        handleSectionRefinement(action.value);
        break;
      }
      case 'preview':
      case 'preview-final': {
        handlePreviewExam();
        break;
      }
      case 'finish': {
        finishExam();
        break;
      }
      case 'save': {
        handleSaveExam();
        break;
      }
      case 'edit': {
        handleEditSections();
        break;
      }
      case 'retry': {
        generateSection(conversationState.currentSectionIndex);
        break;
      }
      case 'back': {
        // Go back a step (simple heuristic)
        const prevStage = conversationState.stage;
        const fallback: typeof conversationState.stage = prevStage === 'generating' ? 'question_types' : 'exam_scope';
        setConversationState((p) => ({ ...p, stage: fallback }));
        break;
      }
      default:
        break;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: 'var(--background)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={onClose} className="btn btnSecondary">
            <ArrowLeft className="icon16" />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
              <Sparkles className="icon16" style={{ display: 'inline', marginRight: '8px' }} />
              Conversational Exam Builder
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {grade.replace('grade_', 'Grade ').replace('_', ' ')} {subject}
            </p>
          </div>
        </div>
        
        {conversationState.stage === 'complete' && (
          <button className="btn btnPrimary" onClick={handleSaveExam}>
            <Save className="icon16" />
            Save Exam
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              width: '100%',
               padding: 'var(--space-3)',
               borderRadius: 'var(--radius-2)',
               background: message.role === 'user' ? 'var(--primary)' : 'var(--surface)',
               color: message.role === 'user' ? '#fff' : 'var(--text)',
               border: message.role === 'user' ? 'none' : '1px solid var(--border)',
               // Accent edge to hint alignment
               borderRight: message.role === 'user' ? '4px solid var(--primary)' : undefined,
               borderLeft: message.role !== 'user' ? '4px solid var(--border)' : undefined,
             }}>
               <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                 {message.content}
               </div>

               {/* Exam Preview */}
               {message.examPreview && message.examPreview.length > 0 && (
                 <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--background)', borderRadius: 'var(--radius-1)', border: '1px solid var(--border)' }}>
                   {message.examPreview.map((section) => (
                     <div key={section.id} style={{ marginBottom: 'var(--space-3)' }}>
                       <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                         {section.title}
                       </h3>
                       {section.questions.map((q, i) => (
                         <div key={q.id} style={{ marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>
                           <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                             {q.number}. {q.text} <span style={{ color: 'var(--muted)', fontSize: '12px' }}>({q.marks} marks)</span>
                           </p>
                           {q.options && (
                             <div style={{ paddingLeft: 'var(--space-3)', fontSize: '14px', color: 'var(--muted)' }}>
                               {q.options.map((opt, j) => (
                                 <div key={j}>{String.fromCharCode(97 + j)}) {opt}</div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   ))}
                 </div>
               )}

               {/* Quick Actions */}
               {message.quickActions && message.quickActions.length > 0 && (
                 <div style={{ 
                   marginTop: 'var(--space-3)', 
                   display: 'flex', 
                   flexWrap: 'wrap', 
                   gap: 'var(--space-2)' 
                 }}>
                   {message.quickActions.map((action) => {
                     // Check if this chip is selected
                     const isTopicSelected = conversationState.selectedTopics.includes(action.value);
                     const isTypeSelected = conversationState.questionTypes.includes(action.value);
                     const isTimeSelected = conversationState.duration === parseInt(action.value);
                     const isMarksSelected = conversationState.totalMarks === parseInt(action.value);
                     const isSelected = isTopicSelected || isTypeSelected || isTimeSelected || isMarksSelected;

                     // Skip dividers
                     if (action.value === 'divider') {
                       return <span key={action.id} style={{ color: 'var(--border)', padding: '0 4px' }}>|</span>;
                     }

                     return (
                       <button
                         key={action.id}
                         onClick={() => handleQuickAction(action)}
                         className={action.type === 'button' ? `btn ${action.variant === 'primary' ? 'btnPrimary' : action.variant === 'success' ? 'btnSuccess' : ''}` : ''}
                         style={{
                           ...(action.type === 'chip' ? {
                             padding: '6px 12px',
                             borderRadius: '16px',
                             border: isSelected
                               ? '2px solid var(--primary)' 
                               : '1px solid var(--border)',
                             background: isSelected
                               ? 'rgba(var(--primary-rgb), 0.1)'
                               : 'var(--background)',
                             fontSize: '13px',
                             cursor: 'pointer',
                             transition: 'all 0.2s',
                             fontWeight: isSelected ? 600 : 400,
                           } : {}),
                         }}
                       >
                         {action.label}
                       </button>
                     );
                   })}
                 </div>
               )}
             </div>
           </div>
         ))}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--muted)' }}>
            <Loader2 className="icon16" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px' }}>Dash is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message or use the buttons above..."
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              fontSize: '14px',
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="btn btnPrimary"
          >
            <Send className="icon16" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get example topics (in real app, this would call the CAPS search tool)
function getExampleTopics(grade: string, subject: string): string[] {
  if (subject.toLowerCase().includes('math')) {
    return [
      'Algebra & Equations',
      'Geometry & Measurement',
      'Data Handling & Probability',
      'Number Operations',
      'Functions & Graphs',
    ];
  }
  
  if (subject.toLowerCase().includes('science')) {
    return [
      'Matter & Materials',
      'Energy & Change',
      'Life & Living',
      'Planet Earth & Beyond',
    ];
  }

  return [
    'Topic 1',
    'Topic 2',
    'Topic 3',
    'Topic 4',
  ];
}
