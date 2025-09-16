import { useCallback, useState } from 'react';
import { track } from '@/lib/analytics';
import { assertSupabase } from '@/lib/supabase';
import { incrementUsage, logUsageEvent } from '@/lib/ai/usage';

export type LessonGenOptions = {
  topic: string;
  subject: string;
  gradeLevel: number;
  duration?: number;
  learningObjectives: string[];
  language?: string;
  model?: string; // optional model override
};

export function useLessonGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const generate = useCallback(async (opts: LessonGenOptions) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Call server function to proxy AI (never expose keys client-side)
      const payload = {
        action: 'lesson_generation',
        topic: opts.topic,
        subject: opts.subject,
        gradeLevel: opts.gradeLevel,
        duration: opts.duration ?? 45,
        objectives: opts.learningObjectives,
        language: opts.language || 'en',
        model: opts.model || 'claude-3-sonnet',
      } as any;

      const { data, error } = await assertSupabase().functions.invoke('ai-gateway', { body: payload });
      if (error) throw error;

      const lessonText: string = (data && data.content) || '';
      setResult(lessonText);

      // Track usage client-side (best-effort) in addition to server logs
      incrementUsage('lesson_generation', 1).catch(() => {});
      logUsageEvent({
        feature: 'lesson_generation',
        model: String(payload.model),
        tokensIn: (data && data.usage?.input_tokens) || 0,
        tokensOut: (data && data.usage?.output_tokens) || 0,
        estCostCents: (data && data.cost) || 0,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      track('edudash.ai.lesson_generated', {
        subject: opts.subject,
        gradeLevel: opts.gradeLevel,
        duration: opts.duration ?? 45,
      });

      return lessonText;
    } catch (e: any) {
      setError(e?.message || 'Failed to generate lesson');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, generate } as const;
}
