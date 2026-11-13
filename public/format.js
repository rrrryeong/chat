// 서버 타임스탬프(ms)를 로컬 시각 'HH:MM'으로 바꾼다.
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
