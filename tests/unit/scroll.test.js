import { describe, expect, it } from 'vitest';
import { isNearBottom } from '../../public/scroll.js';

describe('isNearBottom', () => {
  it('맨 아래면 참이다', () => {
    expect(isNearBottom({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
  });

  it('기본 여유(24px) 안이면 참, 넘으면 거짓이다', () => {
    expect(isNearBottom({ scrollTop: 576, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollTop: 575, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
  });

  it('내용이 화면보다 짧으면 참이다', () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 400 })).toBe(true);
  });

  it('여유 값을 바꿀 수 있다', () => {
    expect(isNearBottom({ scrollTop: 500, scrollHeight: 1000, clientHeight: 400 }, 100)).toBe(true);
  });
});
