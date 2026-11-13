# 익명 방 채팅앱

Node.js와 socket.io로 만든 익명 실시간 채팅앱이다. Supabase 이메일 매직 링크 또는 Google 계정으로 로그인하면 `익명-1234` 같은 이름이 자동으로 붙고, 방 목록에서 방을 고르거나 새 방을 만들어 입장한다. 메시지는 같은 방 사람들에게만 전달되며 저장하지 않는다. 이메일·Google 이름은 채팅에 공개하지 않는다.

화면은 Material Design 3 스타일이다(시스템 설정에 따라 다크 모드로 바뀐다). 폭 840px 이상에서는 왼쪽 방 목록과 오른쪽 채팅이 함께 보이고, 그보다 좁은 휴대폰·태블릿에서는 한 화면씩 전환되며 터치로 쓸 수 있다.

요구사항은 [PRD.md](PRD.md), 기술 설계는 [TRD.md](TRD.md), 구현 과제는 [TASKS.md](TASKS.md)에 있다.

## 요구 환경

- Node.js 26 이상
- npm
- Supabase 프로젝트(이메일 및 Google 인증 설정)

## 설치

```bash
npm install
```

## Supabase 로그인 설정

1. Supabase 프로젝트의 Connect 또는 Settings → API Keys에서 프로젝트 URL과 **publishable key**를 확인한다. 기존 `anon` 키도 사용할 수 있다. `secret`/`service_role` 키는 사용하지 않는다.
2. 프로젝트 루트에 `.env.example`을 참고해 `.env`를 만들고 두 값을 입력한다. `npm start`가 `.env`를 읽으며 이미 설정된 환경변수가 우선한다. `.env`는 Git에서 제외된다.

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
   PORT=3000
   ```

3. Supabase **Authentication → URL Configuration**에서 Site URL을 실제 앱 주소로 지정하고 Redirect URLs에 아래 주소를 등록한다. 주소 끝의 `/`까지 맞춘다.
   - 로컬: `http://localhost:3000/`
   - `127.0.0.1`로도 사용한다면: `http://127.0.0.1:3000/`
   - 운영: `https://<Render 서비스 주소>.onrender.com/`
4. Authentication의 로그인 제공자 설정에서 **Email**을 켜고 신규 가입을 허용한다. 이메일 템플릿은 기본 확인 링크(`{{ .ConfirmationURL }}`)를 사용하는 가입 확인·Magic Link 템플릿으로 유지한다. 숫자 OTP용 템플릿으로 바꾸지 않는다. 첫 로그인은 계정 생성까지 수행한다. [매직 링크 설정](https://supabase.com/docs/guides/auth/auth-email-passwordless), [리디렉션 주소 설정](https://supabase.com/docs/guides/auth/redirect-urls).
5. 일반 사용자에게 메일을 보내려면 **사용자 지정 SMTP**를 설정한다. Supabase 기본 발송은 프로젝트 팀 이메일 등으로 수신자가 제한되며 발송 한도도 작다. SMTP 제공자의 발신 도메인 인증과 발송 제한도 확인한다. SMTP 자격증명은 Supabase에 설정하고 앱의 공개 키에 넣지 않는다. [SMTP 설정](https://supabase.com/docs/guides/auth/auth-smtp).
6. Google 로그인을 설정한다.
   - Google Cloud Console에서 프로젝트와 OAuth 동의 화면을 설정한다. 테스트 모드면 테스트할 Google 계정을 테스트 사용자로 추가한다.
   - OAuth Client ID를 **Web application** 유형으로 생성한다. Authorized JavaScript origins에는 사용하는 앱 출처(예: `http://localhost:3000`, 운영 HTTPS 출처)를 등록한다.
   - Authorized redirect URIs에는 Supabase의 Google 제공자 화면에 표시된 콜백 주소를 그대로 등록한다. 일반적인 주소는 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`이다. 앱 주소와 다른 주소다.
   - 발급받은 Client ID와 Client Secret을 **Supabase의 Google 제공자 설정**에 저장하고 제공자를 활성화한다. Google Client Secret은 브라우저 코드나 Render의 공개 설정에 넣지 않는다.
   - 운영 공개 시 Google의 게시 상태와 필요한 동의 화면 검증을 확인한다. [Google 로그인 설정](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

앱은 브라우저 중심의 Supabase implicit flow를 사용한다. 링크가 열린 브라우저에서 로그인되며, 처리 후 URL의 인증 토큰을 지운다. 메일 앱이 다른 브라우저로 링크를 열면 그 브라우저에서 로그인된다. 운영에서는 HTTPS 주소를 사용한다.

설정이 없으면 로그인 설정 안내가 표시되고 채팅 접속은 차단된다. API 키를 대화나 저장소에 공유할 필요는 없다.

## 실행

```bash
npm start
```

브라우저에서 http://localhost:3000 을 연다. 여러 사용자를 흉내 내려면 다른 브라우저나 시크릿 창으로 같은 주소를 연다.

다른 포트를 쓰려면 `PORT` 환경변수를 지정한다.

```bash
PORT=8080 npm start
```

## 사용 방법

1. 로그인 화면에서 이메일로 링크를 보내 메일의 링크를 누르거나, Google로 계속하기를 선택한다. 로그인해야 방 목록을 볼 수 있다. 로그인 후 입장 화면 위쪽에 익명 이름이 보인다. 새로고침하면 로그인은 유지되고 익명 이름은 새로 받는다.
2. 입력란에 방 이름(최대 30자)을 넣고 입장한다. 없는 방이면 새로 만들어지고, 있는 방이면 그 방에 들어간다. 방 이름은 대소문자를 구분한다.
3. 아래 "열린 방" 목록에서 방을 눌러 입장할 수도 있다. 목록의 방 이름과 인원수는 실시간으로 바뀐다.
4. 방 안에서 메시지(최대 500자)를 입력하고 Enter나 전송 버튼으로 보낸다. 내 메시지는 오른쪽, 다른 사람 메시지는 왼쪽에 보인다.
5. 나가기:
   - 좁은 화면: 왼쪽 위 뒤로 화살표나 기기의 뒤로가기를 누른다.
   - 넓은 화면: 오른쪽 위 "나가기"를 누른다. 목록에서 다른 방을 누르면 그 방으로 바로 옮겨 간다.
   - 마지막 사람이 나가면 방은 사라진다.
6. 로그아웃하면 즉시 방을 나가고 화면의 방·메시지를 지운다. 같은 브라우저의 다른 탭에도 반영된다. 다른 기기의 로그인은 유지한다. 같은 계정으로 여러 탭을 열면 탭마다 별도 참가자로 계산한다.

토큰이 정상 갱신되면 방과 익명 이름을 유지한다. 만료·인증 실패 시 로그인 화면으로 돌아가며, 네트워크 재연결 시에는 기존처럼 로비로 돌아간다. 이미 발급된 access token의 원격 무효화에는 만료까지 시간이 걸릴 수 있다. [Supabase 로그아웃 동작](https://supabase.com/docs/reference/javascript/auth-signout).

## 테스트

```bash
npm test            # 유닛·통합 테스트 (Vitest)
npm run test:e2e    # 브라우저 E2E 테스트 (Playwright)
```

- E2E 테스트는 3100번 포트에 서버를 자동으로 띄운다. 그 포트가 비어 있어야 한다.
- E2E 전용 진입점(`tests/e2e/auth-server.js`)에서 Supabase HTTP 응답과 메일·Google 승인 흐름을 재현한다. 실제 SDK·소켓·브라우저를 사용하되 외부 인증 계정이나 메일 발송은 필요하지 않다. 운영 진입점은 테스트 제공자를 불러오지 않는다.
- 배포 전에는 실제 프로젝트에서 이메일 링크 수신·일회용 링크·Google 로그인·로그아웃을 별도로 확인한다. 자동 테스트는 실제 SMTP와 Google 제공자 설정까지 검증하지 않는다.
- E2E는 화면 폭 세 가지로 실행한다: `desktop`(1280px, 두 칸), `tablet`(768px), `mobile`(360px, 터치). 하나만 돌리려면 `npx playwright test --project=mobile`처럼 지정한다.
- Playwright 브라우저가 없으면 처음 한 번 설치한다.

  ```bash
  npx playwright install chromium
  ```

## 디렉터리 구조

```
server/    서버 (Express + socket.io)
  index.js       진입점
  app.js         소켓 이벤트 처리
  auth.js        Supabase 토큰 검증·공개 설정
  registry.js    방 ↔ 사용자 관리
  validation.js  방 이름·메시지 검증 (브라우저와 공유)
  names.js       익명 이름 생성
public/    브라우저 클라이언트 (빌드 없음, Material 3 CSS 직접 작성)
  auth.js        매직 링크·Google 로그인·세션·로그아웃 UI
tests/
  unit/          유닛 테스트
  integration/   실제 서버를 띄운 소켓 통합 테스트
  e2e/           Playwright E2E 테스트
```
