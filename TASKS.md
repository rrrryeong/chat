# TASKS: 익명 방 채팅앱

[TRD.md](TRD.md)를 구현 순서대로 나눈 과제 목록이다. 위에서부터 하나씩 진행하고, 끝난 과제는 `[x]`로 표시한다. 기능 과제는 모두 TDD(Red → Green → Refactor)로 진행한다.

## T1. 프로젝트 골격

- [x] `package.json`(ES 모듈, Node ≥ 26, `start`/`test`/`test:e2e` 스크립트)
- [x] 의존성 설치: `express`, `socket.io` / 개발: `vitest`, `socket.io-client`, `@playwright/test`
- [x] `vitest.config.js`(tests/unit, tests/integration), `playwright.config.js`(tests/e2e, 포트 3100, 데스크톱·모바일 360px)
- [x] `.gitignore`

**완료 조건:** `npm test`가 실행된다(아직 테스트 없음).

## T2. 입력 검증 모듈 — `server/validation.js` (FR-9, FR-15)

- [x] `validateRoomName`: trim, 빈 이름 거부, 30자 초과 거부, 문자열 아님 → 빈 값, 대소문자 보존
- [x] `validateMessage`: trim, 빈 메시지 거부, 500자 초과 거부, 문자열 아님 → 빈 값

**완료 조건:** 경계값(30/31자, 500/501자, 공백만)을 포함한 유닛 테스트 통과.

## T3. 익명 이름과 시각 포맷 (FR-1, FR-16)

- [x] `server/names.js` `randomName(random)`: `익명-NNNN`, 1000~9999 경계
- [x] `public/format.js` `formatTime(ts)`: `HH:MM` 두 자리 0 채움

**완료 조건:** 유닛 테스트 통과.

## T4. 방 레지스트리 — `server/registry.js` (FR-4, FR-11, FR-20)

- [x] `join`: 방 생성, 인원 증가, 다른 방에 있으면 먼저 이동
- [x] `leave`: 인원 감소, 빈 방 삭제, 방에 없으면 `null`
- [x] `roomOf`, `count`
- [x] `list`: 이름·인원, 가나다순, 대소문자 다른 방은 별개

**완료 조건:** 유닛 테스트 통과.

## T5. 소켓 서버: 접속·목록·입장·퇴장 — `server/app.js`, `server/index.js`

- [x] 접속 시 `user:welcome`(익명 이름), `rooms:list` 전송 (FR-1, FR-4)
- [x] `room:join`: 검증 오류 ack, 성공 ack(`room`, `count`, `name`), `chat:system` 입장 알림, `room:info`, 전체 `rooms:list` (FR-5, FR-8, FR-10, FR-12, FR-13)
- [x] 다른 방으로 join하면 이전 방에서 퇴장 처리 (FR-11)
- [x] `room:leave`와 `disconnect`: 퇴장 알림, `room:info`, 빈 방 삭제 후 `rooms:list` (FR-19, FR-20, FR-21)
- [x] `room:` 접두사로 소켓 id와 방 이름 충돌 방지
- [x] `public/`과 `/shared/validation.js` 정적 제공

**완료 조건:** `socket.io-client` 통합 테스트 통과.

## T6. 소켓 서버: 메시지 — `chat:send` (FR-14, FR-15)

- [x] 같은 방(보낸 사람 포함)에만 `chat:message` 전달, 다른 방은 미수신
- [x] 페이로드 `{ from: { id, name }, text, time }`, 텍스트는 trim된 값
- [x] 방에 없으면 오류 ack, 검증 실패 오류 ack, 성공 `{ ok: true }`

**완료 조건:** 통합 테스트 통과.

## T7. 클라이언트: 입장 화면 (FR-4~FR-10, FR-22)

- [x] `public/index.html`, `style.css`, `app.js` 골격과 화면 전환
- [x] 내 이름 표시, 방 목록 실시간 렌더링(이름·인원), 빈 목록 안내
- [x] 방 이름 폼: 클라이언트 검증 오류·서버 오류를 빨간 문구로 표시, 성공 시 채팅 화면으로
- [x] 목록 항목 클릭으로 입장
- [x] 재연결 시 입장 화면으로 복귀

**완료 조건:** E2E 통과 — 브라우저 A가 만든 방이 B의 목록에 인원과 함께 나타나고, B가 클릭해 입장. 잘못된 이름은 오류 문구.

## T8. 클라이언트: 채팅 화면 (FR-12~FR-19, NFR-1)

- [x] 헤더: 방 이름, 인원수(실시간), 내 이름, 나가기
- [x] 메시지 렌더링: 이름·내용·HH:MM, `mine`/`others`/`system` 정렬, `textContent`
- [x] Enter 전송, 성공 시 입력란 비우기, 자동 스크롤
- [x] 나가기 → 입장 화면, 목록 갱신

**완료 조건:** E2E 통과 — 같은 방은 메시지 수신·다른 방은 미수신, 내/남 메시지 정렬, 입장·퇴장 알림과 인원수, 나가기, `<img onerror>` 메시지가 실행되지 않음.

## T9. 최종 검증 (NFR-2)

- [x] 모바일 360px에서 입장·채팅 화면에 가로 스크롤이 없음(E2E)
- [x] `npm test`, `npm run test:e2e` 전체 통과

## 진행 메모

- FR-22(재연결 시 입장 화면 복귀)는 `connect` 이벤트에서 `showLobby()`를 호출하도록 구현했다. 브라우저에서 연결을 끊었다 잇는 방법이 마땅치 않아 E2E로는 검증하지 않았다. 서버 쪽 끊김 처리는 통합 테스트로 검증했다.
- 최종 테스트: 유닛·통합 44개, E2E 13개(데스크톱 12, 모바일 1) 모두 통과.

---

# UI 개편: Material 3 + 반응형·터치

[PRD.md](PRD.md)와 [TRD.md](TRD.md)의 **(UI 개편)** 항목을 구현한다. 서버는 바꾸지 않는다.

## T10. E2E 환경 재구성 (NFR-4)

- [x] `playwright.config.js`: 데스크톱 1280px, 태블릿 768px, 모바일 360px(터치) 프로젝트와 spec 배정(TRD 6장)
- [x] `fixtures.js`에 `leaveRoom(page)`(보이는 나가기 버튼 클릭)과 `isWide(page)` 추가
- [x] 기존 spec의 바뀐 기대값 정리: 오류 색(M3 error), 입장 후 입력란 숨김(840px 미만에서만), 나가기 버튼(`leaveRoom` 사용). 기존 `mobile.spec.js`는 `layout.spec.js`·`touch.spec.js`로 옮긴다

**완료 조건:** 기존 기능 테스트가 데스크톱·모바일 양쪽에서 실행된다(UI 변경 전이라 일부 실패 가능).

## T11. 클라이언트 순수 모듈 (FR-30, NFR-2)

- [x] `public/room-history.js`: `enter`/`exit`/`onBack`, 방 이동 시 기록 중복 없음, `exit` 중 `enter`는 기다림, 앱이 일으킨 `popstate` 무시
- [x] `public/scroll.js`: `isNearBottom`

**완료 조건:** 가짜 window를 쓴 유닛 테스트 통과.

## T12. M3 테마와 기본 구성 요소 (NFR-3, NFR-5~8)

- [x] 색 토큰(라이트·다크), 글자, 모양 CSS 변수
- [x] 앱 바, 테두리형 텍스트 필드, filled·text·아이콘 버튼, 리스트 항목, 상태 레이어·ripple, 포커스 표시
- [x] `touch-action: manipulation`, viewport 메타, 동작 줄이기
- [x] 인라인 SVG 아이콘(`arrow_back`, `send`, `person`)

**완료 조건:** `theme.spec.js` 통과(라이트·다크 배경색, error 색, 동작 줄이기, `touch-action`).

## T13. 반응형 배치 (FR-19, FR-23, FR-24, FR-28~30)

- [x] `data-state` 기반 배치: 840px 미만 한 칸 전환, 이상 두 칸
- [x] 뒤로 화살표(840px 미만)와 "나가기" 글자 버튼(이상), 오른쪽 안내 화면
- [x] 현재 방 목록 강조(`aria-current`), 두 칸에서 목록 클릭으로 방 이동(메시지 목록 비움)
- [x] 창 크기 변경 시 상태 유지
- [x] 기기 뒤로가기 = 나가기 (`room-history` 연동)

**완료 조건:** `layout.spec.js`가 세 폭 모두에서 통과.

## T14. 채팅 구성 요소 (FR-17, FR-25~27, NFR-2)

- [x] M3 말풍선(색·모서리), 시스템 메시지
- [x] 전송 아이콘 버튼과 빈 입력 비활성화
- [x] 스낵바: 전송 실패 시 오류 문구, 입력 유지
- [x] 연결 끊김 띠, 재연결 시 입장 화면 복귀(FR-22 E2E 검증 포함)
- [x] 키보드 등으로 목록 높이가 줄면 맨 아래 유지

**완료 조건:** `chat.spec.js` 추가 테스트 통과(데스크톱·모바일).

## T15. 모바일 터치 마무리와 최종 검증 (NFR-2, NFR-6)

- [x] `touch.spec.js`: `tap`으로 생성·입장·전송·나가기, 보이는 모든 터치 대상 48×48px 이상, 360px 가로 스크롤 없음, 화면 높이 축소 시 맨 아래 유지
- [x] `npm test`, `npm run test:e2e` 전체 통과
- [x] `README.md`의 테스트 설명을 세 환경 기준으로 갱신

## UI 개편 진행 메모

- 구현 중 발견해 고친 버그:
  - **입력 지워짐:** 메시지를 빠르게 연달아 보내면, 늦게 온 성공 응답이 다음에 입력 중인 내용을 지웠다. 보낸 내용 그대로일 때만 비우도록 고쳤다.
  - **긴 메시지 안내 없음:** 전송 버튼을 "검증 실패 시 비활성화"로 만들었더니, 500자 초과 입력에서 Enter도 막혀 스낵바가 뜨지 않았다. 빈 입력일 때만 비활성화하도록 고쳤다.
  - **아이콘 안 보임:** 바깥 `svg`의 viewBox가 심벌과 같아 아이콘이 영역 밖에 그려졌다. 스크린샷으로 발견해 `0 0 24 24`로 고치고 회귀 테스트를 추가했다.
- FR-22(재연결 시 입장 화면 복귀)는 `context.setOffline`으로 E2E 검증까지 마쳤다.
- 최종 테스트: 유닛·통합 54개, E2E 67개 통과(건너뜀 2개는 두 칸 전용 테스트가 태블릿·모바일에서 건너뛴 것).

---

## T16. Supabase 이메일 매직 링크·Google 로그인 (FR-31~36)

- [x] 로그인 필수 정책, 익명 표시 이름 및 연결 단위 참가자 정책 반영
- [x] `server/auth.js`: 공식 SDK 토큰 검증, 만료·익명 계정 거부, 관리자 키 오설정 방지
- [x] 소켓 최초 인증, 만료 시 퇴장, 같은 계정의 토큰 갱신 시 방·이름 유지
- [x] `public/auth.js`: 매직 링크·Google OAuth, 세션 복원·갱신, 오류 안내, 로그아웃과 탭 동기화
- [x] 로그인 화면·로비·채팅의 반응형 로그아웃 버튼과 48px 터치 대상
- [x] `.env.example`, `.env` 제외, 선택적 환경파일 로딩, SDK를 같은 서버에서 제공
- [x] 실제 소켓 통합 테스트 및 테스트 전용 Supabase HTTP 제공자를 사용하는 브라우저 E2E
- [x] PRD·TRD·README·RENDER에 인증 정책과 설정 절차 반영
- [x] Red → Green 확인. 검증 우회 변이 시 유닛 테스트 9개 실패 확인 후 원복
- [x] 최종 유닛 51개·통합 23개·E2E 100개 통과, E2E 2개 건너뜀(기존 두 칸 화면 전용)

실제 Supabase 프로젝트 키·SMTP·Google OAuth 자격증명은 제공되지 않아 외부 서비스 설정과 실제 메일·Google 계정 연동 점검은 수행하지 않았다. 설정 방법은 README와 RENDER에 작성했다.
