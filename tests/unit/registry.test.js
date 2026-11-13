import { beforeEach, describe, expect, it } from 'vitest';
import { createRoomRegistry } from '../../server/registry.js';

describe('createRoomRegistry', () => {
  let registry;
  beforeEach(() => {
    registry = createRoomRegistry();
  });

  it('처음에는 방이 없다', () => {
    expect(registry.list()).toEqual([]);
    expect(registry.count('개발')).toBe(0);
    expect(registry.roomOf('s1')).toBeNull();
  });

  it('join은 방을 만들고 인원수를 돌려준다', () => {
    expect(registry.join('개발', 's1')).toBe(1);
    expect(registry.join('개발', 's2')).toBe(2);
    expect(registry.count('개발')).toBe(2);
    expect(registry.roomOf('s1')).toBe('개발');
  });

  it('같은 방에 다시 join해도 인원이 늘지 않는다', () => {
    registry.join('개발', 's1');
    expect(registry.join('개발', 's1')).toBe(1);
  });

  it('다른 방으로 join하면 이전 방에서 빠지고, 빈 방은 삭제된다', () => {
    registry.join('개발', 's1');
    registry.join('잡담', 's1');
    expect(registry.roomOf('s1')).toBe('잡담');
    expect(registry.list()).toEqual([{ name: '잡담', count: 1 }]);
  });

  it('leave는 남은 인원을 돌려주고, 마지막 사람이 나가면 방을 지운다', () => {
    registry.join('개발', 's1');
    registry.join('개발', 's2');
    expect(registry.leave('s1')).toEqual({ room: '개발', count: 1 });
    expect(registry.roomOf('s1')).toBeNull();
    expect(registry.leave('s2')).toEqual({ room: '개발', count: 0 });
    expect(registry.list()).toEqual([]);
  });

  it('방에 없는 소켓의 leave는 null이다', () => {
    expect(registry.leave('ghost')).toBeNull();
  });

  it('list는 이름과 인원을 가나다순으로 돌려준다', () => {
    registry.join('하늘', 'a');
    registry.join('가나', 'b');
    registry.join('가나', 'c');
    registry.join('마루', 'd');
    expect(registry.list()).toEqual([
      { name: '가나', count: 2 },
      { name: '마루', count: 1 },
      { name: '하늘', count: 1 },
    ]);
  });

  it('대소문자가 다른 이름은 별개의 방이다', () => {
    registry.join('Dev', 'a');
    registry.join('dev', 'b');
    expect(registry.count('Dev')).toBe(1);
    expect(registry.count('dev')).toBe(1);
    expect(registry.list()).toHaveLength(2);
  });
});
