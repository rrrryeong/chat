/* global supabase */

// SDK 자산은 같은 서버에서 제공하고, 인증 요청만 Supabase로 보낸다.
export function startAuth(onSession) {
  const form = document.querySelector('#auth-form');
  const email = document.querySelector('#auth-email');
  const send = document.querySelector('#auth-send');
  const google = document.querySelector('#auth-google');
  const logoutButtons = document.querySelectorAll('.auth-logout');
  const status = document.querySelector('[data-testid="auth-status"]');
  const storageKey = 'chat-auth';
  let client;
  let signedOut = false;
  const message = (text) => { status.textContent = text; };
  const enable = (enabled) => { send.disabled = !enabled; google.disabled = !enabled; };
  const redirectTo = `${location.origin}/`;

  function accept(session) {
    if (session && signedOut) return;
    onSession(session);
  }

  async function signOut(text = '') {
    signedOut = true;
    onSession(null);
    email.value = '';
    message(text);
    try {
      const { error } = await client?.auth.signOut({ scope: 'local' }) ?? {};
      if (error) message(text || '이 기기에서 로그아웃했습니다. 서버 연결 상태를 확인해 주세요.');
    } catch {
      message(text || '이 기기에서 로그아웃했습니다. 서버 연결 상태를 확인해 주세요.');
    } finally {
      // 네트워크 장애 중에도 이 브라우저에 남은 인증 정보를 제거한다.
      localStorage.removeItem(storageKey);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === storageKey && !event.newValue) {
      signedOut = true;
      onSession(null);
    }
  });

  for (const button of logoutButtons) button.addEventListener('click', () => { void signOut(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client || !form.reportValidity()) return;
    signedOut = false;
    enable(false);
    message('로그인 링크를 보내는 중…');
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.value.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw error;
      message('이메일로 보낸 로그인 링크를 눌러 주세요. 메일이 없으면 스팸함을 확인해 주세요.');
    } catch {
      message('로그인 링크를 보내지 못했습니다. 이메일과 연결 상태를 확인하고 잠시 후 다시 시도해 주세요.');
    } finally { enable(true); }
  });

  google.addEventListener('click', async () => {
    if (!client) return;
    signedOut = false;
    enable(false);
    message('Google 로그인으로 이동하는 중…');
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
    } catch {
      message('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      enable(true);
    }
  });

  async function initialize() {
    enable(false);
    const callback = new URLSearchParams(location.hash.slice(1));
    const callbackError = callback.has('error') || new URLSearchParams(location.search).has('error');
    if (callbackError) {
      history.replaceState(null, '', location.pathname);
      message('로그인 링크가 만료되었거나 로그인이 취소되었습니다. 다시 시도해 주세요.');
    }
    try {
      const response = await fetch('/auth/config', { cache: 'no-store' });
      const config = await response.json();
      if (!response.ok) {
        message(config.error);
        onSession(null);
        return;
      }
      client = supabase.createClient(config.url, config.key, {
        auth: { storageKey, flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      client.auth.onAuthStateChange((_event, session) => {
        // SDK의 인증 콜백 안에서 다른 인증 메서드를 기다리지 않는다.
        setTimeout(() => accept(session), 0);
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (callback.has('access_token')) history.replaceState(null, '', location.pathname);
      accept(data.session);
      enable(true);
      if (!callbackError) message('이메일 링크 또는 Google 계정으로 로그인해 주세요.');
    } catch {
      onSession(null);
      message('로그인 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    }
  }

  void initialize();
  return { signOut };
}
