import { useCallback, useState } from 'react';
import { assertSupabase } from '@/lib/supabase';
import { incrementUsage, logUsageEvent } from '@/lib/ai/usage';
import { DashAIAssistant } from '@/services/DashAIAssistant';

export type HomeworkGenOptions = {
  question: string;
  subject: string;
  gradeLevel: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  context?: string;
  model?: string;
};

export function useHomeworkGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const generate = useCallback(async (opts: HomeworkGenOptions) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        action: 'homework_help',
        question: opts.question,
        subject: opts.subject,
        gradeLevel: opts.gradeLevel,
        difficulty: opts.difficulty || 'medium',
        context: opts.context || null,
        model: opts.model || 'claude-3-sonnet',
      } as any;
      const { data, error } = await assertSupabase().functions.invoke('ai-gateway', { body: payload });
      if (error) throw error;
      const text: string = (data && data.content) || '';
      setResult({ text, __fallbackUsed: !!(data && (data as any).provider_error) });

      incrementUsage('homework_help', 1).catch(() => { /* Intentional: error handled */ });
      logUsageEvent({
        feature: 'homework_help',
        model: String(payload.model),
        tokensIn: (data && data.usage?.input_tokens) || 0,
        tokensOut: (data && data.usage?.output_tokens) || 0,
        estCostCents: (data && data.cost) || 0,
        timestamp: new Date().toISOString(),
      }).catch(() => { /* Intentional: error handled */ });

      return text;
    } catch (e: any) {
      // Fallback to Dash assistant
      try {
        const dash = DashAIAssistant.getInstance();
        await dash.initialize();
        if (!dash.getCurrentConversationId()) {
          await dash.startNewConversation('Homework Helper');
        }
        const prompt = `Provide step-by-step help for the following homework question for Grade ${opts.gradeLevel}: \nSubject: ${opts.subject}\nQuestion: ${opts.question}\nContext: ${opts.context || 'N/A'}\nDifficulty: ${opts.difficulty || 'medium'}\nFocus on understanding, with clear explanation and examples.`;
        const response = await dash.sendMessage(prompt);
        const text = response.content || '';
        setResult({ text, __fallbackUsed: true });
        incrementUsage('homework_help', 1).catch(() => { /* Intentional: error handled */ });
        logUsageEvent({ feature: 'homework_help', model: 'dash-fallback', tokensIn: 0, tokensOut: 0, estCostCents: 0, timestamp: new Date().toISOString() }).catch(() => { /* Intentional: error handled */ });
        return text;
      } catch (fallbackErr) {
        setError(e?.message || 'Failed to generate help');
        throw e;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, generate } as const;
}
