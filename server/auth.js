import { createClient } from '@supabase/supabase-js';

export function createAuth({ url, key, client } = {}) {
  if (!url || !key) return null;
  let keyRole;
  try { keyRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* publishable key는 JWT가 아니다. */ }
  if (key.startsWith('sb_secret_') || keyRole === 'service_role') {
    throw new Error('SUPABASE_PUBLISHABLE_KEY에는 공개 키만 지정하세요.');
  }
  const supabase = client ?? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return {
    config: { url, key },
    async verify(token) {
      if (typeof token !== 'string' || token.split('.').length !== 3) throw new Error('로그인이 필요합니다.');
      // exp는 만료 처리에만 사용한다. 사용자 신뢰 여부는 반드시 Supabase에서 검증한다.
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error('로그인이 필요합니다.');
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user?.id || data.user.is_anonymous) throw new Error('로그인이 필요합니다.');
      return { userId: data.user.id, expiresAt: claims.exp * 1000 };
    },
  };
}
