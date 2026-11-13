import { formatTime } from '/format.js';
import { createRoomHistory } from '/room-history.js';
import { isNearBottom } from '/scroll.js';
import { validateMessage, validateRoomName } from '/shared/validation.js';
import { startAuth } from '/auth.js';

/* global io */
let accessToken = null;
let accountId = null;
const socket = io({ autoConnect: false, auth: (callback) => callback({ token: accessToken }) });
const roomHistory = createRoomHistory(window);

const $ = (selector) => document.querySelector(selector);
const app = $('.app');
const myName = $('[data-testid="my-name"]');
const banner = $('[data-testid="connection-banner"]');
const roomForm = $('#room-form');
const roomInput = $('#room-input');
const roomError = $('#room-error');
const roomList = $('#room-list');
const roomEmpty = $('[data-testid="room-empty"]');
const chatRoomName = $('#chat-room-name');
const chatCount = $('[data-testid="chat-count"]');
const chatMyName = $('[data-testid="chat-my-name"]');
const backButton = $('[data-testid="back-button"]');
const leaveButton = $('[data-testid="leave-button"]');
const messageList = $('#message-list');
const messageForm = $('#message-form');
const messageInput = $('#message-input');
const sendButton = $('[data-testid="send-button"]');
const snackbar = $('[data-testid="snackbar"]');

const ROOM_HELP = roomError.textContent.trim();

let currentRoom = null;
let latestRooms = [];
let stickToBottom = true;
let snackbarTimer = null;

// ===== 화면 상태 =====
// data-state가 유일한 화면 상태이고, 칸 배치는 CSS가 화면 폭에 따라 정한다.

function setRoomMessage(text, isError) {
  roomError.textContent = text;
  roomError.classList.toggle('error', isError);
}

function showLobby() {
  currentRoom = null;
  app.dataset.state = 'lobby';
  messageList.replaceChildren();
  renderRooms(latestRooms);
}

function showChat(room, count) {
  if (room !== currentRoom) messageList.replaceChildren();
  currentRoom = room;
  setRoomMessage(ROOM_HELP, false);
  roomInput.value = '';
  chatRoomName.textContent = room;
  setCount(count);
  app.dataset.state = 'chat';
  renderRooms(latestRooms);
  stickToBottom = true;
}

function setCount(count) {
  chatCount.textContent = `${count}명`;
}

function showSnackbar(text) {
  snackbar.textContent = text;
  snackbar.hidden = false;
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    snackbar.hidden = true;
  }, 4000);
}

// ===== 방 목록 =====

function renderRooms(rooms) {
  latestRooms = rooms;
  roomEmpty.hidden = rooms.length > 0;
  roomList.replaceChildren(
    ...rooms.map(({ name, count }) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-item interactive';
      button.dataset.testid = 'room-item';
      if (name === currentRoom) button.setAttribute('aria-current', 'true');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'room-name';
      nameSpan.textContent = name;

      const countSpan = document.createElement('span');
      countSpan.className = 'room-count';
      countSpan.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-person" /></svg>';
      countSpan.append(`${count}명`);

      button.append(nameSpan, countSpan);
      button.addEventListener('click', () => joinRoom(name));
      item.append(button);
      return item;
    }),
  );
}

// ===== 입장·퇴장 =====

async function joinRoom(roomName) {
  const checked = validateRoomName(roomName);
  if (!checked.ok) {
    setRoomMessage(checked.error, true);
    return;
  }
  const ack = await socket.emitWithAck('room:join', checked.value);
  if (!ack.ok) {
    setRoomMessage(ack.error, true);
    return;
  }
  showChat(ack.room, ack.count);
  await roomHistory.enter();
}

async function leaveRoom({ fromHistory = false } = {}) {
  if (currentRoom === null) return;
  showLobby();
  await socket.emitWithAck('room:leave');
  if (!fromHistory) await roomHistory.exit();
}

roomForm.addEventListener('submit', (event) => {
  event.preventDefault();
  joinRoom(roomInput.value);
});

backButton.addEventListener('click', () => leaveRoom());
leaveButton.addEventListener('click', () => leaveRoom());
roomHistory.onBack(() => leaveRoom({ fromHistory: true }));

// ===== 메시지 =====

// 사용자 입력은 모두 textContent로만 넣는다(HTML 실행 방지).
function appendMessage(kind, { name, text, time }) {
  const item = document.createElement('li');
  item.className = `message ${kind}`;
  if (kind === 'system') {
    item.textContent = text;
  } else {
    const meta = document.createElement('span');
    meta.className = 'meta';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = name;
    const timeEl = document.createElement('time');
    timeEl.className = 'time';
    timeEl.dateTime = new Date(time).toISOString();
    timeEl.textContent = formatTime(time);
    meta.append(nameSpan, ' ', timeEl);
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.textContent = text;
    item.append(meta, bubble);
  }
  messageList.append(item);
  scrollToBottom();
}

function scrollToBottom() {
  messageList.scrollTop = messageList.scrollHeight;
  stickToBottom = true;
}

// 빈 입력일 때만 비활성화한다. 너무 긴 입력은 전송을 시도하게 해 스낵바로 이유를 알린다
// (비활성화된 전송 버튼은 Enter 전송까지 막기 때문).
function updateSendButton() {
  sendButton.disabled = messageInput.value.trim() === '';
}

messageInput.addEventListener('input', updateSendButton);

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = messageInput.value;
  const checked = validateMessage(raw);
  if (!checked.ok) {
    // 공백뿐인 입력은 조용히 무시하고, 그 밖의 검증 실패는 알린다.
    if (raw.trim() !== '') showSnackbar(checked.error);
    return;
  }
  const ack = await socket.emitWithAck('chat:send', checked.value);
  if (!ack.ok) {
    showSnackbar(ack.error);
    return;
  }
  // 응답을 기다리는 동안 다음 메시지를 입력했을 수 있으므로, 보낸 내용 그대로일 때만 비운다.
  if (messageInput.value === raw) messageInput.value = '';
  updateSendButton();
});

// 맨 아래를 보고 있었다면, 키보드 등으로 목록 높이가 줄어도 맨 아래를 유지한다.
messageList.addEventListener('scroll', () => {
  stickToBottom = isNearBottom(messageList);
});

function keepBottomOnResize() {
  if (stickToBottom) messageList.scrollTop = messageList.scrollHeight;
}
window.addEventListener('resize', keepBottomOnResize);
window.visualViewport?.addEventListener('resize', keepBottomOnResize);

// ===== 연결 =====

socket.on('connect', () => {
  app.dataset.auth = 'authenticated';
  banner.hidden = true;
  const wasInRoom = currentRoom !== null;
  showLobby();
  if (wasInRoom) roomHistory.exit();
});
socket.on('disconnect', () => {
  banner.hidden = accessToken === null;
});
socket.on('user:welcome', ({ name }) => {
  myName.textContent = name;
  chatMyName.textContent = name;
});
socket.on('rooms:list', renderRooms);
socket.on('room:info', ({ room, count }) => {
  if (room === currentRoom) setCount(count);
});
socket.on('chat:message', ({ from, text, time }) => {
  appendMessage(from.id === socket.id ? 'mine' : 'others', { name: from.name, text, time });
});
socket.on('chat:system', ({ text, time }) => appendMessage('system', { text, time }));

function clearChat() {
  socket.disconnect();
  app.dataset.auth = 'signed-out';
  banner.hidden = true;
  latestRooms = [];
  showLobby();
  myName.textContent = '';
  chatMyName.textContent = '';
  roomInput.value = '';
  messageInput.value = '';
  snackbar.hidden = true;
  updateSendButton();
  void roomHistory.exit();
}

const authentication = startAuth((session) => {
  const previousToken = accessToken;
  const previousAccount = accountId;
  accessToken = session?.access_token ?? null;
  accountId = session?.user.id ?? null;
  if (!accessToken) {
    clearChat();
    return;
  }
  if (previousAccount && previousAccount !== accountId) clearChat();
  if (socket.connected) {
    if (previousToken !== accessToken) {
      socket.timeout(10000).emit('auth:refresh', accessToken, (error, result) => {
        if (error || !result?.ok) void authentication.signOut('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      });
    }
  } else if (!socket.active) {
    socket.connect();
  }
});

socket.on('connect_error', (error) => {
  if (error.data?.code === 'AUTH_REQUIRED') {
    void authentication.signOut('로그인을 확인하지 못했습니다. 다시 로그인해 주세요.');
  } else {
    banner.hidden = false;
  }
});
socket.on('auth:required', () => {
  void authentication.signOut('로그인이 만료되었습니다. 다시 로그인해 주세요.');
});
