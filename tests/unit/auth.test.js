import { describe, expect, it, vi } from 'vitest';
import { createAuth } from '../../server/auth.js';

const token = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('Supabase 인증', () => {
  it('Supabase가 검증한 사용자의 ID와 토큰 만료 시각을 반환한다', async () => {
    const accessToken = token({ exp: 2000000000 });
    const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) } };
    const auth = createAuth({ url: 'https://example.supabase.co', key: 'public-key', client });
    await expect(auth.verify(accessToken)).resolves.toEqual({ userId: 'user-1', expiresAt: 2000000000000 });
    expect(client.auth.getUser).toHaveBeenCalledWith(accessToken);
    expect(auth.config).toEqual({ url: 'https://example.supabase.co', key: 'public-key' });
  });

  it.each([undefined, '', 42, 'broken', token({}), token({ exp: 1 })])('누락·손상·만료 토큰을 거부한다: %s', async (value) => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) } };
    const auth = createAuth({ url: 'https://example.supabase.co', key: 'public-key', client });
    await expect(auth.verify(value)).rejects.toThrow();
  });

  it('위조 토큰은 Supabase 검증 실패 시 거부한다', async () => {
    const client = { auth: { getUser: async () => ({ data: { user: null }, error: new Error('invalid JWT') }) } };
    const auth = createAuth({ url: 'https://example.supabase.co', key: 'public-key', client });
    await expect(auth.verify(token({ exp: 2000000000 }))).rejects.toThrow();
  });

  it('Supabase 익명 계정은 채팅 로그인으로 인정하지 않는다', async () => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'anon', is_anonymous: true } } }) } };
    const auth = createAuth({ url: 'https://example.supabase.co', key: 'public-key', client });
    await expect(auth.verify(token({ exp: 2000000000 }))).rejects.toThrow();
  });

  it('설정이 없으면 인증을 비활성 객체로 대체하지 않는다', () => {
    expect(createAuth()).toBeNull();
  });

  it.each(['sb_secret_do-not-expose', token({ role: 'service_role' })])('관리자 키를 공개 설정에 사용하지 못한다', (key) => {
    expect(() => createAuth({ url: 'https://example.supabase.co', key })).toThrow();
  });
});
