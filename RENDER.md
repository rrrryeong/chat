# Render 배포 안내

이 앱은 Express가 정적 화면을 제공하고 Socket.IO가 실시간 채팅을 처리한다. Render의 **Web Service 한 개**로 배포한다. Static Site만으로는 채팅 서버를 실행할 수 없다. 로그인에는 Supabase Auth 프로젝트가 필요하며, 별도 프런트엔드 빌드·채팅 메시지 데이터베이스·Docker 설정은 필요하지 않다.

아래 내용은 Supabase 이메일 매직 링크·Google 로그인과 익명 채팅 구현 기준이며, Render 설정은 2026-11-13 공식 문서로 확인했다.

## 1. 저장소 준비

Render에서 접근할 수 있는 GitHub 등의 Git 저장소에 앱 소스가 있어야 한다. `package.json`, `package-lock.json`, `server/`, `public/`을 포함하고 `node_modules`는 올리지 않는다.

사용할 저장소와 브랜치를 확인한다. 공용 저장소에 있는 앱을 배포한다면 다음 경로를 사용한다.

```text
src/exercise/bardroh/day15/chat
```

로컬 폴더 경로가 아니라 **저장소 루트 기준 경로**다. 실제 배포할 브랜치에도 이 경로와 최신 앱 소스가 있는지 확인한다.

## 2. Web Service 생성

1. [Render Dashboard](https://dashboard.render.com/)에 로그인한다.
2. **New → Web Service**를 선택한다.
3. **Git Provider**에서 GitHub 계정을 연결하고 저장소를 선택한다. 비공개 저장소는 Render에 접근 권한을 부여한다.
4. 아래 값을 입력한다.

| 설정 | 값 |
| --- | --- |
| Name | 원하는 고유 서비스 이름(예: `anonymous-room-chat`) |
| Language / Runtime | `Node` |
| Branch | 배포할 브랜치(예: `main`) |
| Region | 주 사용자와 가까운 사용 가능한 리전 |
| Root Directory | 공용 저장소라면 `src/exercise/bardroh/day15/chat` |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type / Compute Plan | 실습은 `Free`, 상시 운영은 적절한 유료 인스턴스 |
| Health Check Path | `/` |

앱 자체가 저장소 루트에 있으면 **Root Directory를 비운다**. 명령은 설정된 Root Directory 안에서 실행되므로 `cd`를 추가하지 않는다. 이 프로젝트에는 `build` 스크립트가 없으며, Build Command는 런타임 의존성을 설치하는 역할만 한다. `/`은 Express가 `public/index.html`을 제공하는 경로로, 기본 HTTP 응답 확인에 사용한다.

참고: [Web Service 생성](https://render.com/docs/web-services), [하위 폴더 배포](https://render.com/docs/monorepo-support), [상태 확인](https://render.com/docs/health-checks).

## 3. 환경변수 지정

서비스 생성 화면의 환경변수 항목 또는 서비스의 **Environment**에서 설정한다.

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `NODE_VERSION` | `26` | 프로젝트의 `engines.node`가 요구하는 Node.js 26 계열 사용 |
| `NODE_ENV` | `production` | 운영 모드 |
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | 프로젝트의 공개 키 | publishable 또는 기존 anon 키. secret/service_role 사용 금지 |

`NODE_VERSION=26`으로 메이저 버전을 제한한다. 특정 패치 버전 재현이 필요하면 검증한 `26.x.y`의 실제 버전 번호로 지정한다. 현재 `package.json`의 `>=26`은 상한이 없으므로 환경변수로 명시하는 편이 안전하다. [Node.js 버전 설정](https://render.com/docs/node-version).

`PORT`는 Render가 제공하는 값을 그대로 사용하고 직접 추가하지 않는다. `server/index.js`는 `process.env.PORT`를 읽으며, 호스트를 생략한 `httpServer.listen(port)`로 루프백에만 바인딩하지 않는다. 현재 코드로 배포할 수 있다. [포트 바인딩 요구사항](https://render.com/docs/web-services#port-binding).

클라이언트는 `/auth/config`에서 Supabase URL과 공개 키만 받는다. Google Client Secret과 SMTP 비밀번호는 Supabase에 설정하며 앱 환경변수에는 넣지 않는다. 소켓은 페이지와 같은 출처에 연결하므로 Render URL을 소스에 하드코딩할 필요가 없다.

### Supabase 및 Google 허용 주소

서비스 주소를 확인한 뒤 [README의 Supabase 설정](README.md#supabase-로그인-설정)을 수행한다.

1. Supabase URL Configuration의 **Site URL**을 `https://<Render 서비스 주소>.onrender.com/`로 지정하고 같은 주소를 **Redirect URLs**에도 등록한다. 커스텀 도메인을 사용하면 그 주소도 등록한다.
2. Email 제공자와 신규 가입을 활성화하고, 이메일 템플릿의 확인 링크를 유지한다. 일반 사용자에게 로그인 메일을 보내려면 사용자 지정 SMTP를 설정한다. 기본 메일 발송은 수신 대상과 한도에 제약이 있다.
3. Google Cloud의 Web application OAuth 클라이언트에 앱의 HTTPS 출처를 등록한다. Redirect URI는 **Supabase 제공자 화면의 콜백 주소**(`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`)다. Render 앱 주소를 이 콜백 대신 넣지 않는다.
4. Google Client ID와 Client Secret을 Supabase Google 제공자에 설정하고 활성화한다. 테스트 모드에서는 Google 테스트 사용자를 등록한다.

참고: [Supabase 리디렉션](https://supabase.com/docs/guides/auth/redirect-urls), [매직 링크](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## 4. 배포 및 확인

1. **Create Web Service**를 누른다.
2. 배포 로그에서 Node.js 버전이 26 계열인지, 의존성 설치와 `npm start`가 성공하는지 확인한다.
3. 실행 로그에 `채팅 서버 실행 중: http://localhost:<포트>`가 나오고 서비스가 **Live** 상태가 되는지 확인한다. 로그의 `localhost`는 서버가 출력하는 안내 문구다.
4. Render가 제공한 `https://<서비스 주소>.onrender.com`을 연다. 공개 주소에 `:3000`이나 `:10000`을 붙이지 않는다.
5. 일반 창과 시크릿 창에서 같은 주소를 열어 아래 동작을 확인한다.
   - 로그인 전에는 방 목록이 숨겨지고 로그인 화면이 표시된다.
   - 실제 메일로 링크를 받아 로그인하고, Google 계정으로도 로그인할 수 있다. 사용한 링크는 재사용할 수 없는지 확인한다.
   - 인증된 각 창에 익명 이름이 표시되고 이메일·Google 이름은 채팅에 표시되지 않는다.
   - 한 창에서 만든 방이 다른 창의 목록에도 나타난다.
   - 두 창이 같은 방에 입장하면 인원수가 2명으로 표시되고 메시지를 주고받는다.
   - 다른 방에는 메시지가 전달되지 않는다.
   - 마지막 사용자가 나가면 방이 사라진다.
   - 모바일 화면에서 입장, 전송, 뒤로가기가 동작한다.
   - 새로고침 후 로그인은 유지된다. 로그아웃하면 방에서 퇴장하고 로그인 화면으로 돌아간다.

Render Web Service는 WebSocket을 지원한다. HTTPS 페이지에서 현재 Socket.IO 클라이언트는 같은 출처로 연결하며 WebSocket 업그레이드 시 `wss`를 사용한다. WebSocket 전용 서비스나 별도 포트는 만들지 않는다. 개발자 도구 Network에서 `/socket.io/` 요청을 확인할 수 있고, WebSocket 업그레이드 성공 시 `101 Switching Protocols`가 보인다. Socket.IO는 HTTP polling으로도 통신할 수 있다. [WebSocket 지원](https://render.com/docs/websocket).

## 5. 업데이트 배포

Git Provider로 연결하고 자동 배포가 켜져 있으면, 연결된 브랜치에 변경사항을 push할 때 다시 배포된다. Root Directory를 지정했다면 해당 폴더의 변경이 배포를 유발한다. 필요하면 Dashboard의 **Manual Deploy**에서 배포할 수도 있다. 이 안내를 작성하면서 실제 저장소 push나 Render 서비스 생성은 수행하지 않았다.

참고: [Express 배포와 자동 배포](https://render.com/docs/deploy-node-express-app).

## 6. 현재 앱의 운영 제약

- **인스턴스는 1개로 유지한다.** 방과 사용자는 프로세스 메모리의 `Map`에 있고, Socket.IO도 기본 메모리 어댑터를 사용한다. 인스턴스를 늘리면 방 목록과 메시지가 서로 공유되지 않는다. 여러 인스턴스 운영에는 공유 상태 저장소와 Socket.IO 어댑터 등 별도 설계가 필요하다.
- **서버 재시작·재배포 시 방과 접속 상태가 초기화된다.** 메시지는 저장하지 않는다. 현재 클라이언트는 재연결되면 로비로 돌아가며 새 익명 이름을 받는다. 방에는 다시 입장해야 한다. 유료 인스턴스로 바꾸어도 메모리 상태가 영구 보존되지는 않는다.
- **Free는 실습·데모에 적합하다.** Render는 수신 트래픽이 15분 동안 없는 Free Web Service를 중지하며, 기존 WebSocket의 수신 메시지도 트래픽에 포함한다. 다음 접속 시 기동에 약 1분이 걸릴 수 있다. Free에는 사용량 제한도 있으므로 계정의 최신 한도를 확인한다. [Free 인스턴스 제한](https://render.com/docs/free).

## 7. 문제 해결

| 증상 | 확인할 내용 |
| --- | --- |
| `package.json`을 찾지 못함 | Root Directory가 실제 앱의 저장소 내 경로인지 확인한다. |
| Node 버전 오류 또는 `EBADENGINE` | `NODE_VERSION=26`과 배포 로그의 실제 Node 버전을 확인하고 다시 배포한다. |
| `npm ci` 실패 | `package.json`과 `package-lock.json`의 일치 여부 및 로그의 패키지 설치 오류를 확인한다. |
| `Missing script: build` | Build Command를 `npm ci --omit=dev`로 설정한다. |
| 포트 감지 실패 또는 `502` | Start Command가 `npm start`인지, 서버가 종료되지 않았는지, `PORT`를 임의로 덮어쓰지 않았는지 확인한다. |
| 상태 확인이 `404`로 실패 | Health Check Path를 `/`로 설정한다. 현재 `/health`는 구현되어 있지 않다. |
| 첫 접속이 오래 걸림 | Free 인스턴스의 절전 후 기동 여부와 배포 상태를 확인한다. |
| 화면은 보이지만 채팅이 안 됨 | 익명 이름 표시, 브라우저 Console과 `/socket.io/` 요청, 서버 로그를 확인한다. Static Site로 만들었다면 Web Service로 배포한다. |
| 로그인 서비스 미설정 안내 | 두 Supabase 환경변수를 추가하고 재배포한다. `/auth/config`가 503인지 확인한다. |
| 메일 발송 실패·수신 안 됨 | 사용자 지정 SMTP, 수신 대상·발송 한도, 스팸함, Supabase Auth 로그를 확인한다. |
| 링크가 로컬 주소로 돌아옴 | Supabase Site URL과 Redirect URLs를 운영 HTTPS 주소로 맞춘다. |
| Google `redirect_uri_mismatch` | Google OAuth Redirect URI가 Supabase의 콜백 주소와 일치하는지 확인한다. |
| Google 접근 거부 | 제공자 활성화·Client ID/Secret·테스트 사용자·OAuth 게시 상태를 확인한다. |
| 사용자마다 방 목록이 다름 | 같은 배포 주소인지, 인스턴스 수가 1개인지 확인한다. |

## 8. 배포 전 테스트

로컬에서 프로젝트가 요구하는 Node.js 26 이상과 개발 의존성이 설치된 환경으로 실행한다.

```bash
npm ci
npm test
npm run test:e2e
```

Playwright Chromium이 없으면 `npx playwright install chromium`을 먼저 실행한다. E2E는 3100번 포트에 테스트 서버를 자동으로 실행한다. Render의 `npm ci --omit=dev`는 운영 의존성만 설치하므로 테스트는 로컬 또는 개발 의존성을 설치하는 별도 CI 환경에서 수행한다.

자동 E2E는 테스트용 Supabase HTTP 제공자로 인증 흐름을 검증한다. 실제 메일 발송과 Google OAuth 설정의 성공 여부는 위 운영 주소에서 별도로 확인해야 한다.
