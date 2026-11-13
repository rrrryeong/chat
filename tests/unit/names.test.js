import { describe, expect, it } from 'vitest';
import { randomName } from '../../server/names.js';

describe('randomName', () => {
  it('익명-NNNN 형식의 이름을 만든다', () => {
    expect(randomName()).toMatch(/^익명-\d{4}$/);
  });

  it('난수의 최솟값은 1000, 최댓값은 9999가 된다', () => {
    expect(randomName(() => 0)).toBe('익명-1000');
    expect(randomName(() => 0.9999999)).toBe('익명-9999');
  });
});
