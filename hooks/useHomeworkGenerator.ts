import { useCallback, useState } from 'react';
import { assertSupabase } from '@/lib/supabase';
import { incrementUsage, logUsageEvent } from '@/lib/ai/usage';

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
  const [result, setResult] = useState<string | null>(null);

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
      setResult(text);

      incrementUsage('homework_help', 1).catch(() => {});
      logUsageEvent({
        feature: 'homework_help',
        model: String(payload.model),
        tokensIn: (data && data.usage?.input_tokens) || 0,
        tokensOut: (data && data.usage?.output_tokens) || 0,
        estCostCents: (data && data.cost) || 0,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      return text;
    } catch (e: any) {
      setError(e?.message || 'Failed to generate help');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, generate } as const;
}
