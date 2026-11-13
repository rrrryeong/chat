// 스크롤 위치가 맨 아래 근처(threshold px 이내)인지 판단한다.
export function isNearBottom({ scrollTop, scrollHeight, clientHeight }, threshold = 24) {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
