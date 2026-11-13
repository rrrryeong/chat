import { describe, expect, it } from 'vitest';
import { validateMessage, validateRoomName } from '../../server/validation.js';

describe('validateRoomName', () => {
  it('앞뒤 공백을 지운 이름을 돌려준다', () => {
    expect(validateRoomName('  개발  ')).toEqual({ ok: true, value: '개발' });
  });

  it('대소문자를 그대로 보존한다', () => {
    expect(validateRoomName('Dev')).toEqual({ ok: true, value: 'Dev' });
  });

  it.each(['', '   ', '\t\n'])('빈 이름(%j)은 거부한다', (input) => {
    expect(validateRoomName(input)).toEqual({ ok: false, error: '방 이름을 입력하세요.' });
  });

  it.each([undefined, null, 42, {}])('문자열이 아니면(%j) 빈 이름으로 취급한다', (input) => {
    expect(validateRoomName(input)).toEqual({ ok: false, error: '방 이름을 입력하세요.' });
  });

  it('30자는 허용하고 31자는 거부한다', () => {
    expect(validateRoomName('가'.repeat(30))).toEqual({ ok: true, value: '가'.repeat(30) });
    expect(validateRoomName('가'.repeat(31))).toEqual({
      ok: false,
      error: '방 이름은 30자 이하로 입력하세요.',
    });
  });

  it('길이는 공백을 지운 뒤에 센다', () => {
    expect(validateRoomName(`  ${'a'.repeat(30)}  `)).toEqual({ ok: true, value: 'a'.repeat(30) });
  });
});

describe('validateMessage', () => {
  it('앞뒤 공백을 지운 메시지를 돌려준다', () => {
    expect(validateMessage('  안녕  ')).toEqual({ ok: true, value: '안녕' });
  });

  it.each(['', '    ', undefined, null, 7])('빈 메시지(%j)는 거부한다', (input) => {
    expect(validateMessage(input)).toEqual({ ok: false, error: '메시지를 입력하세요.' });
  });

  it('500자는 허용하고 501자는 거부한다', () => {
    expect(validateMessage('a'.repeat(500))).toEqual({ ok: true, value: 'a'.repeat(500) });
    expect(validateMessage('a'.repeat(501))).toEqual({
      ok: false,
      error: '메시지는 500자 이하로 입력하세요.',
    });
  });
});
