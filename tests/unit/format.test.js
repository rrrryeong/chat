import { describe, expect, it } from 'vitest';
import { formatTime } from '../../public/format.js';

describe('formatTime', () => {
  it('로컬 시각을 HH:MM으로 0을 채워 표시한다', () => {
    expect(formatTime(new Date(2026, 10, 13, 9, 5).getTime())).toBe('09:05');
    expect(formatTime(new Date(2026, 10, 13, 23, 59).getTime())).toBe('23:59');
    expect(formatTime(new Date(2026, 10, 13, 0, 0).getTime())).toBe('00:00');
  });
});
