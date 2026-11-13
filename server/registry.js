// 방과 소켓의 매핑을 관리한다. socket.io와 무관한 순수 상태 모듈이다.
// 한 소켓은 한 번에 한 방에만 있고, 빈 방은 즉시 삭제한다.
export function createRoomRegistry() {
  const members = new Map(); // 방 이름 → Set<socketId>
  const roomBySocket = new Map(); // socketId → 방 이름

  function count(room) {
    return members.get(room)?.size ?? 0;
  }

  function leave(socketId) {
    const room = roomBySocket.get(socketId);
    if (room === undefined) return null;
    roomBySocket.delete(socketId);
    const set = members.get(room);
    set.delete(socketId);
    if (set.size === 0) members.delete(room);
    return { room, count: set.size };
  }

  function join(room, socketId) {
    if (roomBySocket.get(socketId) !== room) {
      leave(socketId);
      if (!members.has(room)) members.set(room, new Set());
      members.get(room).add(socketId);
      roomBySocket.set(socketId, room);
    }
    return count(room);
  }

  function roomOf(socketId) {
    return roomBySocket.get(socketId) ?? null;
  }

  function list() {
    return [...members]
      .map(([name, set]) => ({ name, count: set.size }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  return { join, leave, roomOf, count, list };
}
