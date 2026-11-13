// 방 이름과 메시지 검증 규칙. 서버와 브라우저가 함께 쓰는 순수 ES 모듈이다.

export const ROOM_NAME_MAX = 30;
export const MESSAGE_MAX = 500;

function validateText(input, { max, emptyError, tooLongError }) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (value === '') return { ok: false, error: emptyError };
  if (value.length > max) return { ok: false, error: tooLongError };
  return { ok: true, value };
}

export function validateRoomName(input) {
  return validateText(input, {
    max: ROOM_NAME_MAX,
    emptyError: '방 이름을 입력하세요.',
    tooLongError: `방 이름은 ${ROOM_NAME_MAX}자 이하로 입력하세요.`,
  });
}

export function validateMessage(input) {
  return validateText(input, {
    max: MESSAGE_MAX,
    emptyError: '메시지를 입력하세요.',
    tooLongError: `메시지는 ${MESSAGE_MAX}자 이하로 입력하세요.`,
  });
}
