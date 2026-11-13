# Render 배포 방법

현재 앱의 **이메일 매직 링크·Google 로그인**을 포함한 배포 절차다. 순서대로 진행하면 된다. 공식 문서 확인일: 2026-11-13.

앱은 Render **Web Service 1개**, 로그인은 **Supabase Auth**를 사용한다. Express가 화면과 Socket.IO를 함께 제공하므로 별도 프런트엔드 서비스나 빌드 단계는 필요하지 않다. 채팅 메시지용 데이터베이스도 사용하지 않는다.

## 1. 배포할 저장소 준비

Render에서 접근할 수 있는 GitHub 등의 Git 저장소와 배포할 브랜치를 준비한다. 저장소에는 최신 로그인 구현과 다음 파일이 포함되어야 한다.

```text
package.json
package-lock.json
server/
public/
```

`.env`와 `node_modules`는 저장소에 올리지 않는다. 이 문서의 명령·경로는 현재 프로젝트 기준이며, 문서 작성 과정에서 실제 복사·commit·push는 수행하지 않았다.

공용 저장소를 사용한다면 앱 경로는 다음과 같다. 해당 브랜치에 최신 로그인 코드가 반영되었는지도 확인한다.

```text
src/exercise/bardroh/day15/chat
```

선택 사항으로 배포 전에 로컬의 Node.js 26 이상 환경에서 전체 테스트를 실행한다.

```bash
npm ci
npm test
npm run test:e2e
```

Playwright Chromium이 없다면 `npx playwright install chromium`을 먼저 실행한다. E2E는 테스트용 인증 제공자를 사용하므로 실제 Supabase 키 없이 실행할 수 있다. 실제 메일 수신과 Google 설정은 배포 후 별도로 확인한다.

## 2. Supabase 프로젝트와 공개 키 준비

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인한다.
2. 사용할 프로젝트를 만들거나 기존 프로젝트를 연다.
3. 프로젝트의 Connect 또는 Settings → API Keys에서 아래 값을 확인한다.

| 필요한 값 | 예시 | 설정할 Render 환경변수 |
| --- | --- | --- |
| Project URL | `https://YOUR_PROJECT_REF.supabase.co` | `SUPABASE_URL` |
| Publishable key | `sb_publishable_...` | `SUPABASE_PUBLISHABLE_KEY` |

기존 `anon` 키도 사용할 수 있다. **`secret` 또는 `service_role` 키는 사용하지 않는다.** 이 앱은 Supabase URL과 공개 키를 브라우저에도 제공하며 관리자 키를 넣으면 시작 시 오류로 처리한다.

## 3. Render Web Service 만들기

1. [Render Dashboard](https://dashboard.render.com/)에 로그인한다.
2. **New → Web Service**를 선택한다.
3. **Git Provider**에서 GitHub 등을 연결하고 저장소를 선택한다. 비공개 저장소라면 Render에 저장소 접근 권한을 부여한다.
4. 아래 설정을 입력한다.

| 항목 | 입력값 |
| --- | --- |
| Name | 원하는 서비스 이름, 예: `anonymous-room-chat` |
| Branch | 실제 배포할 브랜치, 예: `main` |
| Region | 사용자가 주로 접속하는 곳과 가까운 사용 가능한 리전 |
| Language / Runtime | `Node` |
| Root Directory | 아래 경로 표 참고 |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type / Compute Plan | 실습은 `Free`, 상시 운영은 적절한 유료 인스턴스 |
| Health Check Path | `/` |

**Root Directory는 저장소 구조에 따라 지정한다.**

| 저장소 안의 앱 위치 | Root Directory |
| --- | --- |
| 저장소 루트에 `package.json`, `server`, `public`이 있음 | 비워 둠 |
| 공용 저장소의 기존 chat 폴더 사용 | `src/exercise/bardroh/day15/chat` |
| 그 밖의 하위 폴더에 앱이 있음 | 해당 폴더의 저장소 루트 기준 상대 경로 |

Root Directory에 로컬 절대 경로를 넣지 않는다. Build·Start 명령은 이 폴더 안에서 실행되므로 명령 앞에 `cd`를 붙이지 않는다. `npm run build` 스크립트는 없으므로 위 Build Command를 그대로 사용한다.

참고: [Express 배포](https://render.com/docs/deploy-node-express-app), [하위 폴더 배포](https://render.com/docs/monorepo-support).

## 4. Render 환경변수 입력 후 첫 배포

서비스 생성 화면의 환경변수 항목에 다음 값을 추가한다. 이미 서비스를 만들었다면 **Environment**에서 수정하고 재배포한다.

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `26` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | 2단계에서 확인한 실제 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | 2단계에서 확인한 실제 공개 키 |

`NODE_VERSION=26`은 프로젝트의 Node.js 요구사항을 만족하면서 메이저 버전이 자동으로 올라가는 것을 막는다. [Render Node.js 버전 설정](https://render.com/docs/node-version).

Render에는 `.env` 파일을 업로드할 필요가 없다. `npm start`는 `.env`가 없어도 동작하고 Render 환경변수를 읽는다. `PORT`는 Render가 제공하는 값을 사용하므로 직접 추가하지 않는다. 현재 서버는 이미 `process.env.PORT`를 사용한다.

**Create Web Service**를 누르고 배포 로그를 확인한다. 설치와 시작이 성공하고 **Live**가 되면 Render의 공개 HTTPS 주소를 복사한다.

```text
https://<서비스 주소>.onrender.com/
```

공개 주소 뒤에 `:3000`이나 `:10000`을 붙이지 않는다. 서버 로그의 `http://localhost:<포트>`는 프로세스의 안내 문구이며 접속할 공개 주소는 Render 화면에 표시된다.

아직 아래 인증 설정을 하지 않았다면 이 단계에서는 로그인 페이지가 열리는 것까지만 확인한다. `/` 상태 확인은 정적 페이지 응답을 확인하므로 Live 상태만으로 이메일·Google 로그인이 검증되는 것은 아니다.

## 5. Supabase에 배포 주소 등록

Supabase의 **Authentication → URL Configuration**을 연다.

| 항목 | 값 |
| --- | --- |
| Site URL | `https://<서비스 주소>.onrender.com/` |
| Redirect URLs | `https://<서비스 주소>.onrender.com/` 추가 |

이 앱은 로그인 후 **현재 앱 출처의 `/`**로 돌아오도록 요청한다. 따라서 운영 주소를 끝의 `/`까지 맞춰 등록한다. 로컬 개발도 계속한다면 Redirect URLs에 `http://localhost:3000/`도 추가한다.

커스텀 도메인을 사용하면 그 도메인의 HTTPS 주소도 등록하고, 기본 접속 도메인에 맞춰 Site URL을 갱신한다. 운영 Redirect URLs에는 실제 사용하는 주소를 명시한다.

참고: [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 6. 이메일 매직 링크 설정

1. Supabase Authentication의 로그인 제공자 설정에서 **Email**을 활성화한다.
2. 신규 사용자 가입을 허용한다. 이 앱은 처음 로그인하는 사용자도 이메일 인증을 마치면 계정을 생성한다.
3. 가입 확인·Magic Link 이메일 템플릿은 기본 확인 링크를 사용한다. 핵심 링크 값은 `{{ .ConfirmationURL }}`이며 숫자 OTP만 표시하는 템플릿으로 바꾸지 않는다.
4. 일반 사용자에게 메일을 보내려면 **사용자 지정 SMTP**를 설정한다. SMTP 제공자의 호스트·포트·계정·비밀번호·발신자 정보를 Supabase에 입력하고 필요한 발신 도메인 인증을 마친다.
5. 실제 배포 페이지에서 이메일을 입력하고 **로그인 링크 보내기**를 누른다. 받은 메일의 링크를 열어 배포 주소로 돌아오는지 확인한다.

Supabase 기본 SMTP는 프로젝트 팀 이메일 등으로 수신 대상이 제한되고 발송 한도도 작다. 일반 사용자에게 공개할 때는 사용자 지정 SMTP를 준비한다. SMTP 비밀번호는 Supabase에 설정하며 Render의 공개 키 항목에 넣지 않는다.

매직 링크는 일회용이며 유효기간이 있다. 이 앱은 링크를 연 브라우저에서 로그인하고, 인증 처리 후 주소의 토큰을 지운다. 휴대폰의 메일 앱이 다른 브라우저를 열면 그 브라우저에서 로그인된다.

참고: [매직 링크](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP 설정과 제한](https://supabase.com/docs/guides/auth/auth-smtp).

## 7. Google 로그인 설정

Google 설정에는 **앱 주소**와 **Supabase 콜백 주소**가 각각 필요하다.

| 용도 | 입력할 주소 예시 |
| --- | --- |
| Google OAuth의 Authorized JavaScript origins | `https://<서비스 주소>.onrender.com` |
| Google OAuth의 Authorized redirect URIs | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` |
| Supabase의 앱 Redirect URLs | `https://<서비스 주소>.onrender.com/` |

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 선택하고 OAuth 동의 화면을 설정한다.
2. OAuth Client ID를 **Web application** 유형으로 생성한다.
3. 앱 출처를 Authorized JavaScript origins에 등록한다.
4. Supabase의 Google 제공자 설정 화면에 표시되는 콜백 주소를 Authorized redirect URIs에 **그대로** 등록한다. 앱의 Render 주소를 이 콜백 주소 대신 넣지 않는다.
5. 발급된 **Client ID와 Client Secret**을 Supabase의 Google 제공자 설정에 입력하고 활성화한다. 앱 코드나 Render의 공개 설정에는 Client Secret을 넣지 않는다.
6. Google OAuth 동의 화면이 테스트 모드라면 테스트할 Google 계정을 테스트 사용자에 등록한다. 공개 운영 전에는 게시 상태와 필요한 검증을 확인한다.
7. 배포 페이지에서 **Google로 계속하기**를 눌러 계정 선택 후 앱으로 돌아오는지 확인한다.

참고: [Supabase Google 로그인 공식 안내](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## 8. 최종 동작 확인

일반 창과 시크릿 창 또는 다른 브라우저에서 같은 배포 주소를 연다.

- 로그인 전에는 방 목록과 채팅이 보이지 않는다.
- 이메일 링크와 Google 로그인으로 각각 로그인할 수 있다.
- 로그인 후에는 `익명-1234` 형태의 이름이 표시되고 이메일·Google 이름은 채팅에 공개되지 않는다.
- 두 창이 같은 방에 입장하면 인원수가 2명이고 서로 메시지를 주고받는다.
- 다른 방에는 메시지가 전달되지 않는다.
- 새로고침 후 로그인은 유지되며 로비로 돌아온다.
- 로그아웃하면 방에서 나가고 로그인 화면으로 돌아간다. 같은 브라우저의 다른 탭에도 반영된다.
- 모바일에서도 로그인·입장·전송·뒤로가기·로그아웃이 동작한다.

Socket.IO는 같은 앱 주소에 연결한다. HTTPS에서 WebSocket으로 업그레이드하면 `wss`를 사용하며, 별도 서비스나 공개 포트를 만들 필요가 없다. 개발자 도구 Network에서 `/socket.io/` 요청과 업그레이드 응답 `101`을 확인할 수 있다. HTTP polling으로도 통신할 수 있다. [Render WebSocket 지원](https://render.com/docs/websocket).

## 9. 업데이트와 운영 시 주의점

Git Provider로 연결하고 자동 배포가 켜져 있으면 연결된 브랜치에 변경을 push할 때 다시 배포된다. Root Directory를 지정한 경우 해당 폴더의 변경이 배포 대상이 된다. 수동 배포는 서비스의 **Manual Deploy**에서 실행한다. [자동 배포](https://render.com/docs/deploy-node-express-app).

현재 앱은 **인스턴스 1개**로 운영한다. 방·사용자 상태가 서버 프로세스 메모리에 있어 인스턴스를 늘리면 방과 메시지가 공유되지 않는다. 재시작·재배포 시 방과 연결 상태는 초기화되고, 사용자는 재연결 후 로비에서 다시 입장해야 한다. Supabase 로그인 추가가 채팅 기록 저장을 의미하지는 않는다.

Free 인스턴스는 실습·데모에 적합하다. Render는 수신 트래픽이 15분 동안 없으면 Free Web Service를 중지하며 기존 WebSocket의 수신 메시지도 트래픽에 포함한다. 다음 접속 시 기동에 약 1분이 걸릴 수 있다. 월간 사용량 제한도 확인한다. 유료 인스턴스에서도 앱의 메모리 상태가 영구 보존되는 것은 아니다. [Free 제한](https://render.com/docs/free).

## 10. 문제 해결

| 증상 | 확인·해결 방법 |
| --- | --- |
| `package.json`을 못 찾음 | Root Directory가 앱 폴더의 저장소 내 상대 경로인지 확인한다. |
| Node 버전 오류, `EBADENGINE` | `NODE_VERSION=26`을 설정하고 로그의 실제 버전을 확인한 뒤 재배포한다. |
| `npm ci` 실패 | package.json·package-lock.json이 함께 반영됐는지와 설치 로그를 확인한다. |
| `Missing script: build` | Build Command를 `npm ci --omit=dev`로 지정한다. |
| 포트 감지 실패, `502` | Start Command가 `npm start`인지, 프로세스 종료 오류가 없는지, PORT를 덮어쓰지 않았는지 확인한다. |
| 상태 확인 `404` | Health Check Path를 `/`로 지정한다. 현재 `/health`는 없다. |
| 로그인 서비스 미설정 안내 | Render의 두 Supabase 환경변수를 확인하고 재배포한다. `/auth/config`의 503 여부를 확인한다. |
| 공개 키 설정 오류로 시작 실패 | secret/service_role 대신 publishable 또는 anon 키를 사용한다. |
| 메일이 오지 않음 | 스팸함, SMTP 설정, 기본 발송의 수신 대상·한도, Supabase Auth 로그를 확인한다. |
| 링크가 localhost로 돌아옴 | Supabase Site URL과 Redirect URLs에 운영 HTTPS 주소를 등록한다. |
| 매직 링크 만료·재사용 오류 | 로그인 화면에서 새 링크를 요청한다. |
| Google `redirect_uri_mismatch` | Google에 등록한 Redirect URI를 Supabase 제공자 화면의 콜백 주소와 맞춘다. |
| Google 테스트 사용자 접근 거부 | 테스트 사용자 목록, 제공자 활성화, Client ID·Secret 및 게시 상태를 확인한다. |
| 로그인되지만 채팅 연결 실패 | 브라우저 Console, `/socket.io/` 요청, 서버 로그와 Supabase 토큰 검증 상태를 확인한다. |
| 사용자마다 방 목록이 다름 | 같은 배포 주소를 사용하는지, 인스턴스가 1개인지 확인한다. |
| 첫 접속이 느림 | Free 인스턴스의 절전 후 기동 여부와 배포 상태를 확인한다. |
