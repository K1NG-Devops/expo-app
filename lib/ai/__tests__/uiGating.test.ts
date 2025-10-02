/**
 * Integration tests for UI gating helpers
 */

import { canAttach, canSearchHistory } from '../uiGating';
import type { Tier } from '../capabilities';

describe('uiGating', () => {
  describe('canAttach', () => {
    it('denies image/doc attachments for free tier', () => {
      const t: Tier = 'free';
      expect(canAttach(t, ['image']).ok).toBe(false);
      expect(canAttach(t, ['pdf']).ok).toBe(false);
    });

    it('allows search for basic/premium tiers', () => {
      expect(canSearchHistory('basic' as Tier)).toBe(true);
      expect(canSearchHistory('premium' as Tier)).toBe(true);
    });

    it('allows images only with premium and above', () => {
      expect(canAttach('basic' as Tier, ['image']).ok).toBe(false);
      expect(canAttach('premium' as Tier, ['image']).ok).toBe(true);
    });

    it('allows documents only with premium and above', () => {
      expect(canAttach('basic' as Tier, ['pdf']).ok).toBe(false);
      expect(canAttach('premium' as Tier, ['pdf']).ok).toBe(true);
    });

    it('handles mixed attachments', () => {
      const res = canAttach('premium' as Tier, ['image', 'pdf']);
      expect(res.ok).toBe(true);
      const res2 = canAttach('basic' as Tier, ['image', 'pdf']);
      expect(res2.ok).toBe(false);
      expect(res2.missing).toEqual(expect.arrayContaining(['multimodal.vision', 'multimodal.documents']));
    });
  });
});
