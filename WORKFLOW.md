# WORKFLOW

---

## 1. 프롬프트

```
@../../day14/album/에서 AGENTS.md와 CLAUDE.md를 이 폴더에 복사해줘. AGENTS.md는 프로젝트 의존적인 내용을 지우고 중립적인 부분만 남겨줘. 앞으로 개발할 프로젝트는 채팅앱이야.
```

### 결과
- `day14/album`의 `AGENTS.md`, `CLAUDE.md`를 이 폴더로 복사했다.
- `CLAUDE.md`는 `@AGENTS.md` 한 줄뿐이라 그대로 두었다.
- `AGENTS.md`의 원본 규칙(기본 규칙, TDD, 테스트 필수, Git 규칙, 작업 기록 규칙)은 이미 앨범 앱에 묶인 내용이 아니어서 모두 유지했다. 특정 도구를 가리키던 `(Playwright)`만 `(예: Playwright)`로 바꿨다.
- `AGENTS.md`의 작업 기록 규칙에 따라 이 `WORKFLOW.md`를 새로 만들었다.

---

## 2. 프롬프트

```
/mattpocock-skills:grill-me node.js와 socket.io로 방(room) 개념이 있는 익명 채팅앱을 만들어줘. 방 이름을 입력해서 입장하고, 같은 방 사용자들끼리만 메시지를 주고 받을 수 있어.
```

### 결과
- grilling 스킬로 설계 인터뷰를 시작했다. 아직 코드는 작성하지 않았다.
- 확인한 환경: Node v26.13.0, npm 11.20.0, 폴더에는 문서 파일만 있다.
- 1라운드 질문(8개): 익명 신원 표시, 프런트엔드 구성, 메시지 보관, 입장·퇴장 알림, 방 목록·인원 표시, 방 이름 규칙, 동시 참여 방 수, 테스트 도구.

---

## 3. 프롬프트

```
전부 추천대로 할건데 Q5만 다르게. 방목록은 보여주는 쪽으로 했으면 좋겠어(목록에서 고르는 방식).
```

### 결과
- 1라운드 확정: 서버가 랜덤 익명 이름 부여, Express + 순수 HTML/JS(빌드 없음), 메시지 저장 안 함, 입장·퇴장 시스템 메시지 표시, 방 이름은 trim·빈 이름 거부·최대 30자·대소문자 구분, 한 번에 한 방만 참여, 테스트는 Vitest + socket.io-client와 Playwright.
- Q5 변경: 입장 화면에 방 목록을 보여 주고 목록에서 골라 입장한다. 방 안에서는 현재 인원수를 표시한다.
- 2라운드 질문(7개): 새 방 만들기 방식, 빈 방 처리, 목록 표시 내용·실시간 갱신, 익명 이름 유지 범위, 메시지 규칙, 메시지 화면 표시, 프로젝트 기본 설정(포트·모듈·git).

---

## 4. 프롬프트

```
전부 추천대로 해줘
```

### 결과
- 2라운드 확정: 목록 위 입력란으로 새 방 생성(이미 있으면 입장), 빈 방은 즉시 삭제, 목록에 방 이름·인원수를 가나다순으로 실시간 표시, 익명 이름은 접속마다 1회 부여(방을 옮겨도 유지), 메시지는 trim·빈 메시지 거부·최대 500자·서버 검증·`textContent` 출력, 이름·내용·HH:MM 시각 표시와 좌우 정렬·자동 스크롤·Enter 전송, ES 모듈·PORT 기본 3000·npm 스크립트 3종·git init 안 함.
- 남은 세부 사항(오류 표시, 연결 끊김, 화면 전환, 스타일)을 기본값으로 제시하고 전체 설계 요약에 대한 확인을 요청했다. 아직 코드는 작성하지 않았다.

---

## 5. 프롬프트

```
이 내용 기반으로 PRD.md를 저장하고, 그로부터 TRD.md를 생성, 최종적으로 TASKS.md를 생성하고 저장한 후 TASKS.md에 있는 과제들을 하나씩 해결하는 방법으로 진행했으면 좋겠어.
```

### 결과
- 문서: `PRD.md`(FR-1~22, NFR-1~4), `TRD.md`(모듈 설계, 소켓 이벤트 규약 `영역:동작`, 테스트 전략), `TASKS.md`(T1~T9) 작성.
- 구현(TASKS 순서, TDD):
  - T1 `package.json`(express, socket.io / vitest, socket.io-client, @playwright/test), `vitest.config.js`, `playwright.config.js`(포트 3100, 데스크톱 + 모바일 360px), `.gitignore`
  - T2 `server/validation.js`: 방 이름 30자, 메시지 500자. 브라우저와 공유하기 위해 `/shared/validation.js`로 제공
  - T3 `server/names.js`(`익명-NNNN`), `public/format.js`(HH:MM)
  - T4 `server/registry.js`: 방↔소켓 매핑, 빈 방 삭제, 가나다순 목록
  - T5·T6 `server/app.js`, `server/index.js`: 입장·퇴장·끊김·메시지 처리. socket.io 방에 `room:` 접두사를 붙여 소켓 id와 충돌 방지
  - T7·T8 `public/index.html`, `style.css`, `app.js`: 입장 화면(실시간 목록, 오류 문구)과 채팅 화면(좌우 정렬, 시스템 메시지, 자동 스크롤, `textContent` 출력)
  - T9 모바일 360px 가로 스크롤 E2E
- 테스트: `tests/unit` 4개 파일, `tests/integration` 2개 파일(실제 서버 + socket.io-client), `tests/e2e` 3개 spec(+ 컨텍스트 자동 정리 fixture).
- 각 과제는 Red를 확인한 뒤 Green으로 진행했다. 처음부터 통과한 테스트(`room:` 접두사, 채팅 헤더 인원수, 모바일 레이아웃)는 구현을 잠시 깨뜨려 실패하는지 확인하고 원복했다.
- 진행 중 수정: E2E 테스트 간에 브라우저 컨텍스트가 남아 방 목록이 섞이는 문제를 fixture로 해결했다. Chromium이 `align-self`를 `flow-end`로 보고하는 문제는 화면 좌표 비교로 바꿨다. 모바일 테스트는 한글이 아닌 끊김 없는 라틴 문자열로 바꿨다(한글은 글자 단위로 줄바꿈되어 넘침을 잡지 못함).
- 최종 결과: `npm test` 44개 통과, `npm run test:e2e` 13개 통과(추가 3회 반복 실행도 모두 통과).
- 미검증: FR-22(재연결 시 입장 화면 복귀)는 E2E로 검증하지 않았다.

---

## 6. 프롬프트

```
실행방법을 정리해서 README.md로 저장해줘
```

### 결과
- `README.md` 작성: 요구 환경, 설치, 실행(`npm start`, `PORT` 변경), 사용 방법, 테스트 명령(E2E는 3100번 포트 사용, Playwright 브라우저 설치), 디렉터리 구조.
- 문서만 추가하고 코드는 바꾸지 않아 테스트는 실행하지 않았다.

---

## 7. 프롬프트

```
이 프로젝트를  공용 repo인 ~/work/kosa-ict-genai-2026-hyundai/src/exercise/bardroh/day15 에 chat 폴더로 복사하고 공용 repo를 commit & push해줘
```

### 결과
- 프로젝트를 `~/work/kosa-ict-genai-2026-hyundai/src/exercise/bardroh/day15/chat`으로 복사했다. `node_modules`, `test-results`, `playwright-report`는 제외했다.
- 공용 repo에서 `day15/chat` 경로만 stage해 `main` 브랜치에 commit하고 `origin`에 push했다(rebase 없이).

---

## 8. 프롬프트

```
/mattpocock-skills:grill-me 이 어플리케이션의 인터페이스를 머티리얼로 바꾸고 모바일에서도 잘 작동하도록(터치 포함) 반응형으로 변경하려고 하는데 이에 맞춰서 설계를 변경해줘
```

### 결과
- grilling 스킬로 UI 개편 설계 인터뷰를 시작했다. 아직 문서와 코드는 바꾸지 않았다.
- 1라운드 질문(9개): 머티리얼 구현 방식(NFR-3 충돌), 머티리얼 버전, 넓은 화면 레이아웃, 방 만들기 UI, 다크 모드, 테마 색, 터치 범위, 모바일 키보드·화면 높이 처리, 설계 문서 반영 방식.

---

## 9. 프롬프트

```
전부 추천대로 해줘
```

### 결과
- UI 개편 1라운드 확정: Material Design 3 기준을 직접 작성한 CSS로 구현(의존성·빌드 없음, NFR-3 문구 수정), expanded(840px 이상) 폭은 방 목록 + 채팅 두 칸·그 미만은 한 화면씩 전환, 방 만들기는 목록 위 M3 테두리형 텍스트 필드 유지, 시스템 설정을 따르는 다크 모드, 기준 색 `#6750A4`, 터치는 기본(48px 대상·ripple·더블탭 확대 제거)만, `100dvh`·하단 입력 고정·safe area 처리, 문서는 PRD/TRD 직접 수정 + TASKS에 T10~ 추가(확인 후).
- 2라운드 질문(9개): 두 칸 화면 세부, 나가기 버튼 형태, Android 뒤로가기, 아이콘, 글꼴, 말풍선 모양, 전송 버튼, E2E 구성, 애니메이션·접근성.

---

## 10. 프롬프트

```
전부 추천대로 해줘
```

### 결과
- UI 개편 2라운드 확정: 두 칸 화면 세부(앱 바에 앱 이름·내 이름, 왼쪽 360px 목록, 현재 방 강조, 오른쪽 빈 안내, 목록 클릭으로 방 이동, 크기 변경 시 상태 유지), 나가기는 840px 미만 뒤로 화살표·이상 "나가기" 글자 버튼, 방 안에서 기기 뒤로가기 = 나가기(`pushState`/`popstate`, URL 불변), 아이콘은 인라인 SVG, 시스템 글꼴 + M3 글자 기준, 말풍선 색·모양, 전송 아이콘 버튼(빈 입력 비활성), E2E 3종(1280/768/360 터치), 200ms 애니메이션·동작 줄이기 대응·포커스 표시.
- 남은 세부 사항(목록 항목 모양, 전송 실패 안내, 연결 끊김 표시)을 기본값으로 제시하고 전체 설계 요약에 대한 확인을 요청했다. 문서는 아직 수정하지 않았다.

---

## 11. 프롬프트

```
이제 문서들을 수정하고 구현해줘
```

### 결과
- 문서:
  - `PRD.md`: Material 3·반응형·터치 요구사항 반영(FR-23~30 추가, FR-4·8·10·12·17·19·25·26·27·NFR-2~8 수정, "(UI 개편)" 표시)
  - `TRD.md`: UI 기술 스택, `room-history.js`·`scroll.js` 모듈, 화면 상태(`data-state`)와 폭별 배치, M3 토큰 표, 모바일·터치 처리, E2E 3환경 배정
  - `TASKS.md`: T10~T15 추가 후 완료 처리
  - `README.md`: 화면 설명, 나가기 방법, E2E 3환경 실행법
- 구현(TDD):
  - T10 `playwright.config.js`(desktop 1280 / tablet 768 / mobile 360 터치), fixture에 `leaveRoom`·`isWide`. 기존 spec은 M3 error 색과 폭별 나가기 버튼에 맞게 수정, `mobile.spec.js`는 `layout`·`touch` spec으로 흡수
  - T11 `public/room-history.js`, `public/scroll.js` + 유닛 테스트 10개
  - T12~T14 `public/index.html`, `style.css`, `app.js` 재작성: M3 토큰(라이트·다크), 테두리형 텍스트 필드, 버튼·리스트·상태 레이어·ripple, 인라인 SVG 아이콘, 840px 기준 한 칸/두 칸, 뒤로 화살표·"나가기", 목록 강조·방 이동, 기기 뒤로가기 = 나가기, 전송 아이콘 버튼, 스낵바, 연결 끊김 띠, 키보드로 화면이 줄 때 맨 아래 유지, `touch-action: manipulation`, 동작 줄이기
  - T15 `touch.spec.js`(탭 흐름, 48px 터치 대상, 화면 높이 축소)
- Red/Green: 새 spec 전체를 먼저 작성해 37개 실패를 확인한 뒤 구현했다. 가드성 테스트 4개(입력 비우기, resize 유지, 48px, 외부 요청)와 `room-history`의 대기 로직은 구현을 깨뜨려 실패를 확인하고 원복했다.
- 구현 중 고친 버그:
  - 빠른 연속 전송 시 늦은 응답이 다음 입력을 지우던 문제
  - 500자 초과 입력에서 Enter가 막혀 스낵바가 안 뜨던 문제
  - SVG viewBox 때문에 아이콘이 안 보이던 문제(스크린샷으로 발견, 회귀 테스트 추가)
- 최종 결과: `npm test` 54개 통과, `npm run test:e2e` 67개 통과·2개 건너뜀(두 칸 전용 테스트를 태블릿·모바일에서 건너뜀), 추가 3회 반복도 모두 통과. 서버 코드는 바꾸지 않았다.

---

## 12. 프롬프트

```
공용 repo에 복사하고 commit & push해줘
```

### 결과
- UI 개편 결과를 `~/work/kosa-ict-genai-2026-hyundai/src/exercise/bardroh/day15/chat`에 동기화했다. 로컬에서 지운 `tests/e2e/mobile.spec.js`도 공용 repo에서 지웠고, `node_modules`, `test-results`, `playwright-report`는 제외했다.
- 공용 repo에서 `day15/chat` 경로만 stage해 `main`에 commit하고 `origin`에 push했다(rebase 없이).

---

## 13. 프롬프트

```
이 채팅앱 애플리케이션을 Render로 배포하는 방법을 RENDER.md 파일에 작성해주세요
```

### 결과
- `RENDER.md` 작성: Render Web Service 생성, 공용 저장소의 Root Directory, 설치·실행 명령, Node.js 26 환경변수, 상태 확인, 배포 검증, 업데이트 및 문제 해결 절차.
- 현재 서버·클라이언트 구조와 Render 공식 문서를 확인했다. 단일 인스턴스, 메모리 상태 초기화, Free 인스턴스의 제약을 안내했다.
- 문서만 수정했다. Red/Green 및 유닛·E2E 테스트는 실행하지 않았다(코드·동작 변경 없음). 실제 배포·설치·commit·push는 수행하지 않았다.

---

## 14. 프롬프트

```
[$mattpocock-skills:grill-me](/Users/ryeong/.codex/plugins/cache/mattpocock/mattpocock-skills/1.3.2/skills/productivity/grill-me/SKILL.md) supabase의 이메일, google로 로그인을 구현해줘.
```

### 결과
- 명시된 `grill-me`와 연결된 `grilling` 스킬을 읽고 로그인 설계 인터뷰를 시작했다. 스킬 지시에 따라 읽기 전용 조사 에이전트로 현재 인증·소켓·방·테스트 구조를 확인했다.
- 현재 PRD는 계정을 비목표로 하고, 소켓 연결마다 익명 이름과 방 소속을 관리한다. 기존 정책과 로그인 요구를 조율할 1라운드 질문으로 로그인 필수 여부, 이메일 방식, 표시 이름, 여러 탭의 참가자 처리를 제시한다.
- 스킬의 사용자 답변·공통 이해 확인 지시에 따라 구현은 아직 시작하지 않았다. 코드 변경·설치 및 테스트 실행 없음. Red/Green, 유닛·E2E 통과 수는 아직 해당 없음.

---

## 15. 프롬프트

```
이메일 OTP와 매직 링크가 뭐야?
```

### 결과
- Supabase 공식 문서를 확인하고 비밀번호 없는 이메일 로그인 두 방식의 차이를 설명했다. OTP는 이메일로 받은 일회용 코드를 앱에 입력하고, 매직 링크는 이메일의 일회용 로그인 링크를 누르는 방식이다.
- 이메일·비밀번호 방식과 비교하고, 현재 앱에는 이메일 OTP와 Google 로그인 조합을 추천했다. 로그인 정책은 아직 확정되지 않았다.
- `WORKFLOW.md`만 업데이트했다. 코드 변경이 없어 Red/Green 및 유닛·E2E 테스트는 실행하지 않았다.

---

## 16. 프롬프트

```
전부 추천대로 구현하고, Q2는 매직 링크 방식으로 구현해줘.
```

### 결과
- 로그인 필수, 이메일 매직 링크·Google OAuth, 익명 표시 이름 유지, 소켓 연결별 참가자 처리 정책을 구현했다. 로그아웃은 현재 브라우저 세션과 같은 저장소를 사용하는 탭에 적용하고 다른 기기의 로그인은 유지한다.
- `@supabase/supabase-js` 의존성을 추가했다. `server/auth.js`에서 서버 측 토큰 검증·만료·Supabase 익명 계정 거부·관리자 키 오설정 방지를 구현했다. `server/app.js`에 인증된 연결만 허용하는 미들웨어, 공개 설정·로컬 SDK 제공, 연결 중 만료·토큰 갱신 처리를 추가했다.
- `public/auth.js`와 기존 app.js·index.html·style.css에 로그인 화면, 콜백 URL 처리, 세션 복원·자동 갱신, 다중 탭 로그아웃, 네트워크 장애 중 로컬 세션 제거, 좁은 채팅 화면의 로그아웃 버튼을 구현했다.
- `.env.example`과 `.gitignore`, package.json의 선택적 환경파일 로딩을 추가하고 package-lock.json을 갱신했다. 실제 키·비밀정보는 작성하지 않았다.
- 테스트: 인증 유닛·소켓 통합·브라우저 E2E를 추가하고 기존 인증 없는 fixture를 로그인 흐름으로 변경했다. E2E 전용 auth-server.js에서 외부 Supabase HTTP·메일·Google 승인 흐름만 재현하며 운영 코드에는 테스트 인증 우회 경로를 넣지 않았다.
- TDD Red: 인증 모듈 부재, 미인증 소켓 허용, 만료·갱신 미구현, 로그인 화면 부재 등의 실패를 먼저 확인했다. Green: 구현 후 모두 통과했다. 바로 통과한 보안 가드도 검증 우회 변이를 넣어 9개 실패를 확인하고 원복했다. 구조 정리와 원복 이후 전체 회귀 테스트도 통과했다.
- E2E에서 좁은 화면의 채팅 중 로그아웃 버튼 누락을 발견해 추가하고, 방 입장 완료 후 동작을 검증하도록 테스트의 대기 조건을 보정했다. 기존 CDN 비의존 테스트는 인증 요청을 허용하면서 자산을 로컬 제공하는 기준으로 이름과 준비 흐름을 변경했다.
- 최종 결과: `npm test` 유닛 51개·통합 23개 통과(총 74개), `npm run test:e2e` 100개 통과·2개 건너뜀(기존 두 칸 화면 전용). 모바일 로그인·로비·채팅 화면을 캡처해 배치를 확인했다. 운영 `npm start`에서도 `/` 200, `/auth/config` 503(미설정 차단), `/vendor/supabase.js` 200, `/test/mail` 404를 확인했다.
- PRD·TRD·TASKS·README·RENDER를 갱신했다. Supabase 실제 키·SMTP·Google OAuth 자격증명이 없어 실제 서비스 설정·메일 발송·Google 계정으로의 실연동은 확인하지 않았다. 필요한 절차와 허용 URL은 README·RENDER에 작성했다. commit·push·실제 Render 배포는 수행하지 않았다.

---

## 17. 프롬프트

```
실행 방법 알려줘
```

### 결과
- package.json·.env.example·README를 확인해 Node.js 26 이상, 의존성 설치, .env 작성, Supabase 허용 URL·제공자 설정, npm start와 localhost:3000 접속 방법을 안내했다.
- 기존 .env를 덮어쓰지 않도록 예제 복사 명령에 `cp -n`을 사용했다. 실제 서버 실행·설정 변경은 하지 않았다.
- WORKFLOW.md만 업데이트했다. 코드 변경이 없어 Red/Green 및 유닛·E2E 테스트는 실행하지 않았다.

---

## 18. 프롬프트

```
render로 배포하는 방법 다시 작성해서 RENDER.md에 작성해줘.
```

### 결과
- 현재 package.json·환경변수·서버 실행 방식과 Render·Supabase 공식 문서를 확인하고 RENDER.md를 전체 재작성했다.
- 저장소 준비 → Supabase URL·공개 키 확보 → Render Web Service 생성·Root Directory·명령 설정 → 환경변수·첫 배포 → 운영 URL 등록 → 이메일 매직 링크·SMTP → Google OAuth → 최종 점검 순서로 정리했다.
- Render 앱 출처와 Supabase Google 콜백 주소를 구분하는 표, 업데이트·단일 인스턴스·Free 제한·문제 해결 안내를 포함했다.
- RENDER.md와 WORKFLOW.md만 수정했다. 코드 변경이 없어 Red/Green 및 유닛·E2E 테스트는 실행하지 않았다. 실제 배포·설정 변경·commit·push는 수행하지 않았다.

---

## 19. 프롬프트

```
로그인 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.
라고 뜨는데 어떻게 해야해?
```

### 결과
- 해당 메시지는 서버 시작 시 SUPABASE_URL 또는 SUPABASE_PUBLISHABLE_KEY를 읽지 못해 인증 설정이 null일 때 /auth/config가 503을 반환하면서 표시됨을 확인했다.
- 로컬 .env 파일과 두 변수의 비어 있지 않은 값 존재 여부만 확인했다. 실제 값은 출력하지 않았다. 로컬 실행이라면 프로젝트 루트에서 npm start로 서버 재시작을 안내했다.
- Render 실행이라면 로컬 .env와 별도로 해당 서비스의 Environment에 두 변수를 등록하고 Save and deploy로 반영하도록 안내했다. Render 환경변수와 Supabase 공개 키 공식 문서를 확인했다.
- WORKFLOW.md만 수정했다. 실행 중 서버·환경변수·계정 설정은 변경하지 않았고 코드 변경이 없어 Red/Green 및 유닛·E2E 테스트는 실행하지 않았다.

---

## 20. 프롬프트

```
구글로 계속하기를 하면 {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"} 라는 에러가 뜹니다.
```

### 결과
- 클라이언트가 올바른 `provider: 'google'`로 OAuth를 요청함을 확인했다. 오류는 요청 대상 Supabase 프로젝트에서 Google 제공자가 활성화되지 않았음을 의미한다고 설명했다.
- Supabase Google 제공자 활성화·Client ID/Secret 저장, Google Cloud Web application OAuth 클라이언트 및 Supabase 콜백 등록 절차를 공식 문서로 확인해 안내했다.
- 이미 제공자를 켰다면 앱의 SUPABASE_URL이 설정한 프로젝트와 일치하는지 확인하고, URL 변경 시 로컬 재시작 또는 Render 재배포하도록 안내했다.
- WORKFLOW.md만 수정했다. 코드·외부 계정 설정 변경 없이 안내했으며 Red/Green 및 유닛·E2E 테스트는 실행하지 않았다.

---

## 21. 프롬프트

```
400 오류: redirect_uri_mismatch
라는 에러가 뜹니다.
```

### 결과
- Supabase·Google 공식 OAuth 문서를 확인해 요청의 redirect_uri와 Google OAuth 클라이언트의 허용 리디렉션 URI 불일치 오류임을 설명했다.
- Supabase Google 제공자 화면의 정확한 콜백 주소를 Google Auth Platform의 해당 Web application 클라이언트 Authorized redirect URIs에 등록하도록 안내했다. Supabase Client ID와 Google 클라이언트의 일치, 프로토콜·프로젝트 ID·경로·끝 슬래시도 확인하도록 안내했다.
- Google에 등록할 Supabase 콜백 주소와 Supabase에 등록할 앱 복귀 URL을 구분했다. WORKFLOW.md만 수정했고 코드·외부 설정 변경 및 테스트 실행은 하지 않았다(Red/Green·유닛·E2E 해당 없음).
