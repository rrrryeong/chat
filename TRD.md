# TRD: 익명 방 채팅앱

이 문서는 [PRD.md](PRD.md)의 요구사항을 구현하기 위한 기술 설계다. 괄호 안의 `FR-n`, `NFR-n`은 PRD의 요구사항 번호다.

> **UI 개편:** Material Design 3 적용과 반응형·터치 지원으로 바뀐 항목에는 **(UI 개편)** 표시를 붙였다. 이후 추가된 Supabase 인증 설계는 8장에 정리했다.

## 1. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 런타임 | Node.js 26 이상, ES 모듈(`"type": "module"`) |
| 서버 | Express 5(정적 파일), socket.io 4(실시간 통신) |
| 인증 | Supabase Auth, `@supabase/supabase-js` 2.x(서버 검증·브라우저 SDK) |
| 클라이언트 | 순수 HTML/CSS/JS(ES 모듈), 서버가 내려주는 `/socket.io/socket.io.js` 사용 (NFR-3) |
| UI | **(UI 개편)** Material Design 3 기준을 직접 작성한 CSS(디자인 토큰 = CSS 변수), Material Symbols 인라인 SVG. 라이브러리·CDN 없음 |
| 유닛·통합 테스트 | Vitest, `socket.io-client` |
| E2E 테스트 | Playwright (Chromium). **(UI 개편)** 데스크톱 1280px, 태블릿 768px, 모바일 360px(터치) |

## 2. 디렉터리 구조

```
server/
  validation.js   방 이름·메시지 검증 (순수 함수, 브라우저와 공유)
  names.js        익명 이름 생성 (순수 함수)
  registry.js     방 레지스트리: 방 ↔ 소켓 매핑 (상태, 소켓 비의존)
  app.js          createChatServer(): Express + socket.io 조립, 이벤트 처리
  index.js        진입점: PORT(기본 3000)로 listen
public/
  index.html      앱 바 + 입장 칸 + 채팅 칸 (한 페이지)
  style.css       M3 토큰·구성 요소·반응형 배치
  app.js          클라이언트 로직
  format.js       시각 포맷
  room-history.js (UI 개편) 방 입장/퇴장과 브라우저 기록(뒤로가기) 연동
  scroll.js       (UI 개편) 스크롤 위치 판단
tests/
  unit/           Vitest 유닛 테스트
  integration/    Vitest + socket.io-client로 실제 서버 검증
  e2e/            Playwright
```

## 3. 모듈 설계

### 3.1 `server/validation.js`

```js
validateRoomName(input) // → { ok: true, value } | { ok: false, error }
validateMessage(input)  // → { ok: true, value } | { ok: false, error }
```

- 문자열이 아니면 빈 문자열로 취급한다.
- 앞뒤 공백을 지운 값으로 검사하고, 통과하면 그 값을 `value`로 돌려준다.
- 길이는 JavaScript `String.length`로 센다. 브라우저 `maxlength`와 같은 기준이다.

| 경우 | 오류 문구 |
| --- | --- |
| 방 이름이 비어 있음 | `방 이름을 입력하세요.` |
| 방 이름이 30자 초과 (FR-9) | `방 이름은 30자 이하로 입력하세요.` |
| 메시지가 비어 있음 | `메시지를 입력하세요.` |
| 메시지가 500자 초과 (FR-15) | `메시지는 500자 이하로 입력하세요.` |

### 3.2 `server/names.js`

```js
randomName(random = Math.random) // → '익명-NNNN', NNNN ∈ [1000, 9999] (FR-1)
```

테스트에서 난수를 주입할 수 있게 `random` 인자를 받는다.

### 3.3 `server/registry.js`

`createRoomRegistry()`는 아래 메서드를 가진 객체를 돌려준다. socket.io와 무관한 순수 상태 모듈이다.

| 메서드 | 동작 |
| --- | --- |
| `join(room, socketId)` | 소켓을 방에 넣는다. 다른 방에 있으면 먼저 뺀다(FR-11). 방이 없으면 만든다. 결과 인원수를 돌려준다. |
| `leave(socketId)` | 소켓을 현재 방에서 뺀다. 방이 비면 삭제한다(FR-20). `{ room, count }` 또는 방에 없었으면 `null`을 돌려준다. |
| `roomOf(socketId)` | 소켓이 있는 방 이름 또는 `null` |
| `count(room)` | 방 인원수(없는 방은 0) |
| `list()` | `[{ name, count }]`, `name.localeCompare(other, 'ko')` 기준 가나다순 (FR-4) |

### 3.4 `server/app.js`

```js
createChatServer({ auth } = {}) // → { app, httpServer, io, registry }
```

- Express로 `public/`을 정적 제공한다.
- 소켓별 상태(`socket.data.name`)에 익명 이름을 저장한다.
- socket.io 방 이름에는 접두사 `room:`을 붙인다. 모든 소켓은 자기 id 이름의 방에 기본으로 들어가 있으므로, 사용자가 입력한 방 이름이 소켓 id와 겹치지 않게 하기 위해서다.
- 테스트는 `httpServer.listen(0)`으로 빈 포트에 띄운다.

### 3.5 `public/format.js`

```js
formatTime(timestamp) // → 'HH:MM' (로컬 시각, 두 자리 0 채움) (FR-16)
```

### 3.6 `public/room-history.js` **(UI 개편)**

방 입장·퇴장을 브라우저 기록과 연동해, 방 안에서 뒤로가기를 누르면 나가기가 되게 한다(FR-30). 테스트에서 가짜 `window`를 주입할 수 있다.

```js
createRoomHistory(win = window) // → { enter, exit, onBack }
```

| 메서드 | 동작 |
| --- | --- |
| `enter()` | 진행 중인 `exit()`가 끝나기를 기다린 뒤, 현재 기록이 방 상태(`{ inRoom: true }`)가 아니면 `pushState`로 하나 쌓는다. 방을 옮길 때(이미 방 상태)는 쌓지 않는다. URL은 바꾸지 않는다. |
| `exit()` | 앱이 스스로 나갈 때(나가기 버튼, 재연결) 호출한다. 현재 기록이 방 상태면 `history.back()`으로 되돌리고, 그 `popstate`가 올 때까지 기다리는 Promise를 돌려준다. |
| `onBack(handler)` | 사용자가 뒤로가기를 눌러 생긴 `popstate`에만 `handler`를 부른다. `exit()`가 일으킨 `popstate`는 무시한다. |

`enter()`가 진행 중인 `exit()`를 기다리는 이유: 나가자마자 다른 방에 들어가면, 늦게 도착한 `history.back()`이 새로 쌓은 기록을 지워 방금 들어간 방에서 튕겨 나갈 수 있기 때문이다.

### 3.7 `public/scroll.js` **(UI 개편)**

```js
isNearBottom({ scrollTop, scrollHeight, clientHeight }, threshold = 24) // → boolean
```

메시지 목록이 맨 아래 근처인지 판단한다. 사용자가 스크롤하면 이 값을 기억해 두고, 가상 키보드가 열리는 등 목록 높이가 줄었을 때 맨 아래에 있던 경우에만 다시 맨 아래로 스크롤한다 (NFR-2).

## 4. 소켓 이벤트 규약

이벤트 이름은 `영역:동작` 형식이다. socket.io가 예약한 `message` 이벤트와 겹치지 않게 하기 위해서다.

### 4.1 서버 → 클라이언트

| 이벤트 | 페이로드 | 대상 | 시점 |
| --- | --- | --- | --- |
| `user:welcome` | `{ name }` | 접속한 소켓 | 접속 직후 (FR-1) |
| `rooms:list` | `[{ name, count }]` | 접속한 소켓 / 전체 | 접속 직후, 그리고 방 생성·삭제·인원 변화 때마다 전체에 (FR-5) |
| `room:info` | `{ room, count }` | 해당 방 | 입장·퇴장으로 인원이 바뀔 때 (FR-12) |
| `chat:system` | `{ text, time }` | 해당 방 | 입장·퇴장 (FR-13) |
| `chat:message` | `{ from: { id, name }, text, time }` | 해당 방(보낸 사람 포함) | 메시지 수신 시 (FR-14) |

- `rooms:list`는 채팅 화면에 있는 클라이언트에게도 간다. 840px 이상에서는 목록이 함께 보이므로 꼭 필요하다(FR-24).
- `time`은 서버의 `Date.now()` 값(ms)이다.
- 클라이언트는 `from.id === socket.id`로 내 메시지를 구분한다(FR-17). 이름은 겹칠 수 있으므로 쓰지 않는다(FR-3).

### 4.2 클라이언트 → 서버 (모두 ack 콜백 사용)

| 이벤트 | 인자 | ack 응답 |
| --- | --- | --- |
| `room:join` | `roomName` | `{ ok: true, room, count, name }` / `{ ok: false, error }` |
| `room:leave` | 없음 | `{ ok: true }` |
| `chat:send` | `text` | `{ ok: true }` / `{ ok: false, error }` |

**`room:join` 처리 순서**

1. `validateRoomName`으로 검증하고, 실패하면 오류로 ack한다 (FR-10).
2. 이미 같은 방에 있으면 현재 인원수로 ack하고 끝낸다. 다른 방에 있으면 먼저 퇴장 처리를 한다 (FR-11, FR-28).
3. 레지스트리와 socket.io 방에 넣는다.
4. ack를 먼저 보낸다. 클라이언트가 채팅 화면으로 바꾼 뒤 아래 이벤트를 받게 하기 위해서다.
5. 방에 `chat:system`(`{name}님이 입장했습니다.`)과 `room:info`를 보내고, 전체에 `rooms:list`를 보낸다.

**퇴장 처리** (`room:leave`, `disconnect` 공통, FR-19·FR-21)

1. 레지스트리와 socket.io 방에서 뺀다. 방에 없었으면 아무것도 하지 않는다.
2. 남은 사람들에게 `chat:system`(`{name}님이 퇴장했습니다.`)과 `room:info`를 보낸다(방이 삭제됐으면 생략).
3. 전체에 `rooms:list`를 보낸다.

**`chat:send` 처리**

1. 방에 없으면 `방에 입장한 뒤 메시지를 보낼 수 있습니다.`로 ack한다.
2. `validateMessage`로 검증하고, 실패하면 오류로 ack한다 (FR-15).
3. 방 전체에 `chat:message`를 보내고 `{ ok: true }`로 ack한다.

## 5. 클라이언트 설계 **(UI 개편)**

### 5.1 화면 상태와 배치

- 최상위 요소 `.app`의 `data-state` 속성(`lobby` | `chat`)이 유일한 화면 상태다. 어떤 칸을 보일지는 CSS 미디어 쿼리가 이 속성을 보고 정한다. 그래서 창 크기를 바꿔도 상태가 유지된다 (FR-29).
- 구조:

```
.app[data-state]
├─ header.main-bar          앱 이름 "익명 채팅", 내 이름(my-name)
├─ div.banner               연결 끊김 띠(connection-banner) (FR-27)
├─ div.panes
│  ├─ section#lobby         방 이름 텍스트 필드 + 방 목록
│  └─ section#chat
│     ├─ div.placeholder    "방을 고르거나 새로 만들어 보세요." (chat-placeholder)
│     └─ div.chat-room      채팅 앱 바 + 메시지 목록 + 입력 줄
└─ div.snackbar             전송 실패 안내 (FR-26)
```

| 폭 | `data-state="lobby"` | `data-state="chat"` |
| --- | --- | --- |
| 840px 미만 (FR-23) | 앱 바 + `#lobby` | `#chat`의 `.chat-room`만 (앱 바 숨김). 뒤로 화살표 보임, "나가기" 글자 버튼 숨김 |
| 840px 이상 (FR-24) | 앱 바 + 왼쪽 `#lobby`(360px) + 오른쪽 `.placeholder` | 앱 바 + 왼쪽 `#lobby` + 오른쪽 `.chat-room`. 뒤로 화살표 숨김, "나가기" 글자 버튼 보임 |

- 840px 이상에서 현재 방 목록 항목에 `aria-current="true"`를 붙여 강조한다 (FR-24).
- 840px 미만의 칸 전환에는 200ms 페이드 인 애니메이션을 준다 (NFR-8).

### 5.2 Material 3 스타일

- **색 토큰:** `:root`에 `--md-sys-color-*` CSS 변수로 M3 기준 색(`#6750A4`) 체계의 라이트 값을 두고, `@media (prefers-color-scheme: dark)`에서 다크 값으로 바꾼다 (NFR-5, NFR-7). 주요 값:

| 토큰 | 라이트 | 다크 |
| --- | --- | --- |
| primary / on-primary | `#6750A4` / `#FFFFFF` | `#D0BCFF` / `#381E72` |
| primary-container / on-primary-container | `#EADDFF` / `#4F378B` | `#4F378B` / `#EADDFF` |
| surface / on-surface | `#FEF7FF` / `#1D1B20` | `#141218` / `#E6E0E9` |
| on-surface-variant | `#49454F` | `#CAC4D0` |
| surface-container / -high / -highest | `#F3EDF7` / `#ECE6F0` / `#E6E0E9` | `#211F26` / `#2B2930` / `#36343B` |
| outline / outline-variant | `#79747E` / `#CAC4D0` | `#938F99` / `#49454F` |
| error | `#B3261E` | `#F2B8B5` |
| inverse-surface / inverse-on-surface | `#322F35` / `#F5EFF7` | `#E6E0E9` / `#322F35` |

- **글자:** 시스템 글꼴 스택. M3 기준 title-large 22/28, title-medium 16/24(500), body-large 16/24, body-medium 14/20, body-small 12/16, label-large 14/20(500).
- **모양:** 텍스트 필드 4px(테두리형), 버튼 20px(완전히 둥근 모양), 리스트 항목 12px, 스낵바 4px, 말풍선 20px(보낸 쪽 아래 모서리 4px) (FR-17).
- **구성 요소:**
  - 앱 바: 높이 64px, surface 색
  - 텍스트 필드: 테두리형, 높이 56px. 위에 라벨, 아래 안내 문구 자리(오류 시 error 색) (FR-10)
  - 버튼: filled(입장), text("나가기"), 아이콘 버튼(뒤로, 전송) 40px 원형 + 48px 터치 영역
  - 리스트 항목: 높이 56px, 오른쪽에 사람 아이콘과 `N명` (FR-4)
  - 스낵바: inverse-surface 색, 화면 아래 가운데, 4초 뒤 사라짐 (FR-26)
- **아이콘:** Material Symbols(Outlined)의 `arrow_back`, `send`, `person` 경로를 `index.html` 끝의 `<symbol viewBox="0 -960 960 960">`로 한 번만 두고, 각 위치에서는 `<svg class="icon" viewBox="0 0 24 24"><use href="#icon-…"/></svg>`로 참조한다. 바깥 `svg`에 심벌과 같은 `0 -960 960 960`을 주면 도형이 영역 밖에 그려지므로 반드시 `0 0 24 24`를 쓴다. 색은 `fill: currentColor`로 따른다 (NFR-5).
- **상태 레이어와 ripple:** 누를 수 있는 요소(`.interactive`)에 `::before` 상태 레이어(hover 8%, focus·pressed 10% 불투명도)와, `:active`일 때 가운데서 퍼지는 `::after` 원형 효과를 준다. hover 효과는 `@media (hover: hover)`에서만 준다 (NFR-6).
- **포커스:** `:focus-visible`에 secondary 색 3px 외곽선을 준다 (NFR-8).
- **동작 줄이기:** `@media (prefers-reduced-motion: reduce)`에서 모든 transition·animation 시간을 0으로 만든다 (NFR-8).

### 5.3 모바일·터치

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">`: safe area 변수를 쓰고, 안드로이드에서 키보드가 열리면 레이아웃 높이가 줄도록 한다.
- `html { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }`: 더블탭 확대와 탭 지연을 없애고, 브라우저 기본 탭 강조 대신 ripple을 쓴다 (NFR-6).
- `.app { height: 100dvh }`, 본문 바깥 스크롤 없음. 메시지 목록과 방 목록만 각자 스크롤한다 (NFR-2).
- 입력 줄과 목록 아래 여백에 `env(safe-area-inset-bottom)`을 더한다.
- 모든 버튼·목록 항목·입력란은 최소 48×48px이다 (NFR-6).
- 메시지 목록의 `scroll` 이벤트마다 `isNearBottom` 결과를 기억한다. `window`·`visualViewport`의 `resize`에서 그 값이 참이면 맨 아래로 다시 스크롤한다 (NFR-2).

### 5.4 동작

- **방 이름 폼 제출:** 클라이언트에서 `validateRoomName`과 같은 규칙으로 먼저 검사한다. 오류가 없으면 `room:join`을 보내고, 서버 오류 ack도 같은 안내 문구 자리에 표시한다.
- **검증 규칙 공유:** 서버와 클라이언트는 검증 규칙을 공유한다. `server/validation.js`는 브라우저에서도 동작하는 순수 ES 모듈이고, Express가 `/shared/validation.js`로 함께 제공한다.
- **입장 성공:**
  - 방이 바뀌었으면 메시지 목록을 비우고, `data-state="chat"`으로 바꾼다.
  - 목록 강조를 갱신하고 `roomHistory.enter()`를 부른다.
  - 840px 이상에서 방에 있는 동안 다른 방을 누르면, 서버가 이전 방 퇴장을 처리하므로 같은 흐름으로 방이 바뀐다 (FR-28).
- **나가기:**
  - 뒤로 화살표나 "나가기" 버튼을 누르면 `room:leave`를 보내고 `data-state="lobby"`로 바꾼 뒤 `roomHistory.exit()`를 부른다.
  - 기기 뒤로가기는 `roomHistory.onBack`으로 받아 같은 퇴장 처리를 하되, `exit()`는 부르지 않는다(이미 기록이 되돌아갔으므로) (FR-30).
- **메시지 전송:**
  - 입력이 바뀔 때마다, 공백을 지운 값이 비어 있으면 전송 버튼을 비활성화한다 (FR-25). 500자 초과처럼 다른 이유로 무효인 입력은 비활성화하지 않는다. 비활성화된 전송 버튼은 Enter 전송까지 막아 스낵바로 이유를 알릴 수 없기 때문이다.
  - Enter나 전송 버튼으로 보내고, 성공하면 입력란을 비우고 전송 버튼을 비활성화한다. 단, 응답을 기다리는 동안 사용자가 다음 메시지를 입력했을 수 있으므로 입력란이 보낸 내용 그대로일 때만 비운다.
  - 공백뿐이면 조용히 무시한다. 그 밖의 검증 실패(예: 500자 초과)나 서버 오류 ack는 스낵바로 알리고 입력은 유지한다 (FR-26).
- **메시지 렌더링:**
  - 모든 사용자 입력은 `textContent`로 넣는다 (NFR-1).
  - 메시지 항목 클래스는 `mine` / `others` / `system`이다.
  - 항목을 추가한 뒤 목록의 `scrollTop`을 `scrollHeight`로 맞춘다 (FR-18).
- **연결:**
  - `disconnect`에서 연결 끊김 띠를 보여 준다.
  - `connect`에서 띠를 숨기고 입장 화면으로 돌아가며, 메시지 목록을 비우고 `roomHistory.exit()`를 부른다 (FR-22, FR-27).
  - 서버가 `user:welcome`으로 새 이름을 보낸다.

### 5.5 테스트용 선택자

E2E 안정성을 위해 `data-testid`를 쓴다.

- 기존: `my-name`, `room-input`, `room-error`, `room-submit`, `room-list`, `room-empty`, `room-item`, `chat-room-name`, `chat-count`, `chat-my-name`, `leave-button`, `message-list`, `message-input`
- **(UI 개편)** 추가: `back-button`, `send-button`, `chat-placeholder`, `snackbar`, `connection-banner`

`leave-button`은 "나가기" 글자 버튼(840px 이상)이고, `back-button`은 뒤로 화살표(840px 미만)다. E2E에서는 화면에 보이는 쪽을 누르는 공용 함수 `leaveRoom(page)`을 쓴다.

## 6. 테스트 전략

| 층위 | 도구 | 대상 |
| --- | --- | --- |
| 유닛 | Vitest | `validation`, `names`, `registry`, `format`, **(UI 개편)** `room-history`(가짜 window), `scroll` |
| 통합 | Vitest + `socket.io-client` | 실제 서버를 빈 포트에 띄워 이벤트 규약 전체(방 격리, 목록 갱신, 빈 방 삭제, 연결 끊김, 검증 오류) |
| E2E | Playwright | 아래 표 |

**(UI 개편)** Playwright 프로젝트와 spec 배정:

| spec | 데스크톱 1280px | 태블릿 768px | 모바일 360px(터치) | 내용 |
| --- | --- | --- | --- | --- |
| `lobby.spec.js` | ○ | | ○ | 방 목록·생성·입장·오류 |
| `chat.spec.js` | ○ | | ○ | 메시지·알림·인원수·나가기·XSS·자동 스크롤·말풍선·전송 버튼·빠른 연속 전송·스낵바·연결 끊김 띠 |
| `layout.spec.js` | ○ | ○ | ○ | 폭별 배치(한 칸/두 칸), 뒤로 화살표·나가기 버튼, 안내 화면, 목록 강조, 방 이동, 창 크기 변경 시 상태 유지, 뒤로가기, 가로 스크롤 없음, 아이콘이 실제로 그려지는지 |
| `theme.spec.js` | ○ | | | M3 색(라이트·다크), 동작 줄이기, `touch-action` |
| `touch.spec.js` | | | ○ | `tap`으로 전체 흐름, 48px 터치 대상, 키보드로 화면이 줄 때 맨 아래 유지 |

- 연결 끊김은 `context.setOffline(true)`로 흉내 낸다.
- `npm test`는 유닛과 통합을, `npm run test:e2e`는 Playwright를 실행한다.
- Playwright는 `webServer`로 `PORT=3100 node tests/e2e/auth-server.js`를 띄운다. 인증 테스트(`auth.spec.js`)는 세 화면 크기에서 실행한다.

## 7. npm 스크립트

| 스크립트 | 명령 |
| --- | --- |
| `start` | `node --env-file-if-exists=.env server/index.js` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |

## 8. Supabase 로그인

- `server/auth.js`의 `createAuth({ url, key, client })`는 공개 설정과 `verify(token)`을 제공한다. 운영에서는 공식 SDK의 `auth.getUser(token)`으로 검증한다. 인증 전 payload의 `exp`는 조기 거부에만 사용하고, 검증된 계정 ID는 소켓 내부에만 저장한다. `is_anonymous` 계정은 거부한다.
- 환경변수는 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`다. `npm start`는 선택적인 `.env` 파일을 읽는다. 공개 키만 허용하며 secret/service_role 키는 설정 오류로 처리한다. 설정 누락 시 인증을 건너뛰지 않는다.
- `GET /auth/config`는 `{ url, key }`만 `Cache-Control: no-store`로 제공하며 설정 누락이면 503이다. `/vendor/supabase.js`는 설치된 SDK의 UMD 파일만 제공한다. 프런트엔드 빌드·CDN은 추가하지 않는다. 정적 화면은 오프라인에서도 표시할 수 있지만 로그인 자체에는 Supabase 연결이 필요하다.
- `public/auth.js`는 매직 링크 발송, Google OAuth 이동, URL 콜백 처리, SDK 세션 복원·자동 갱신·로그아웃을 담당한다. 브라우저 중심 implicit flow와 `chat-auth` 저장소 키를 사용한다. 초기 URL의 토큰은 SDK 처리 후 제거하고 referrer 정책은 `no-referrer`로 설정한다.
- 로그인 완료 후 `socket.handshake.auth.token`을 전달한다. `io.use`에서 검증한 연결만 `user:welcome`과 `rooms:list`를 받는다. 실패 시 `connect_error`의 `data.code`가 `AUTH_REQUIRED`다.
- 만료 타이머와 패킷 미들웨어가 연결 중 만료를 감시한다. `auth:refresh(token, ack)`는 같은 계정의 유효 토큰일 때만 만료 시각을 바꾸며 방과 이름은 유지한다. 실패·만료 시 `auth:required` 후 연결을 끊어 기존 퇴장 처리를 수행한다.
- 클라이언트는 `onAuthStateChange` 콜백 밖에서 세션 변화를 처리한다. 소켓 연결 성공 전에는 채팅 칸을 숨긴다. 로그아웃 시 즉시 소켓을 끊고 화면·입력을 지운다. SDK의 `scope: local`과 브라우저 저장소 변경으로 같은 브라우저 탭에 반영한다. 네트워크 오류여도 로컬 세션은 제거한다. 이미 발급된 다른 연결의 access token을 즉시 원격 폐기하는 기능은 제공하지 않으며 서버는 만료를 강제한다.
- 기존 소켓 ID 기반 방·인원·내 메시지 판정과 메시지 형식은 유지한다. 인증 계정 정보는 채팅 payload에 추가하지 않는다.
- 로그인 화면 상태는 `.app[data-auth]`의 `loading | signed-out | authenticated`다. 기존 `data-state=lobby | chat`와 함께 사용한다. 840px 미만에서는 채팅 앱 바에도 로그아웃 버튼을 제공한다.
- 유닛 테스트는 Supabase SDK 경계만 대체해 토큰·만료·공개 키 정책을 검증한다. 통합 테스트는 실제 소켓에서 접속 차단·만료 퇴장·갱신·계정 바꾸기 거부·개인정보 비노출을 검증한다.
- Playwright는 운영 진입점 대신 `tests/e2e/auth-server.js`를 실행한다. 이 파일만 테스트용 Supabase HTTP API·메일함·Google 승인 화면을 조립한다. 운영 코드에는 테스트 토큰 허용 분기를 넣지 않는다. `auth.spec.js`는 세 화면 크기 모두에서 실행하며 기존 채팅 fixture도 매직 링크로 로그인한다.
- 실제 SMTP 메일 수신과 Google OAuth 자격증명·허용 URL은 자동 테스트의 대체 제공자로 검증되지 않는다. [README.md](README.md)의 설정 및 운영 점검을 별도로 수행한다.
