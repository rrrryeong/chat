// 접속한 사용자에게 붙일 익명 이름을 만든다. 테스트에서 난수를 주입할 수 있다.
export function randomName(random = Math.random) {
  const number = 1000 + Math.floor(random() * 9000);
  return `익명-${number}`;
}
