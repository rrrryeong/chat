// Playwright 전용 진입점. 운영 서버에는 이 테스트용 인증 제공자를 연결하지 않는다.
import express from 'express';
import { createHmac, randomUUID } from 'node:crypto';
import { createChatServer } from '../../server/app.js';
import { createAuth } from '../../server/auth.js';

const port = Number(process.env.PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;
const auth = createAuth({ url: `${origin}/auth-provider`, key: 'sb_publishable_test' });
const { app, httpServer } = createChatServer({ auth });
const mails = new Map();
const links = new Map();
const sessions = new Map();
const signature = (value) => createHmac('sha256', 'test-provider-only').update(value).digest('base64url');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function session(email) {
  const user = { id: email, email, aud: 'authenticated', role: 'authenticated',
    app_metadata: { provider: 'email' }, user_metadata: { full_name: '비공개 이름' },
    created_at: '2026-01-01T00:00:00Z', is_anonymous: false };
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: email, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', aud: 'authenticated' })}`;
  const result = { access_token: `${unsigned}.${signature(unsigned)}`, refresh_token: randomUUID(),
    expires_in: 3600, token_type: 'bearer', user };
  sessions.set(result.refresh_token, result);
  return result;
}

function currentUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return [...sessions.values()].find((value) => value.access_token === token)?.user;
}

function finish(res, value) {
  const params = new URLSearchParams({ access_token: value.access_token, refresh_token: value.refresh_token,
    expires_in: '3600', token_type: 'bearer', type: 'magiclink' });
  res.redirect(`${origin}/#${params}`);
}

app.use(express.json());
app.post('/auth-provider/auth/v1/otp', (req, res) => {
  const email = req.body.email;
  if (email === 'fail@example.com') return res.status(429).json({ msg: 'email rate limit exceeded' });
  const id = randomUUID();
  links.set(id, email);
  mails.set(email, `${origin}/auth-provider/auth/v1/verify?token=${id}`);
  res.json({});
});
app.get('/test/mail', (req, res) => res.json({ link: mails.get(req.query.email) }));
app.get('/auth-provider/auth/v1/verify', (req, res) => {
  const email = links.get(req.query.token);
  if (!email) return res.redirect(`${origin}/#error=access_denied&error_code=otp_expired&error_description=Expired+link`);
  links.delete(req.query.token);
  finish(res, session(email));
});
app.get('/auth-provider/auth/v1/user', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ msg: 'invalid JWT' });
  res.json(user);
});
app.post('/auth-provider/auth/v1/token', (req, res) => {
  const previous = sessions.get(req.body.refresh_token);
  if (!previous) return res.status(400).json({ msg: 'invalid refresh token' });
  sessions.delete(req.body.refresh_token);
  res.json(session(previous.user.email));
});
app.post('/auth-provider/auth/v1/logout', (req, res) => {
  const user = currentUser(req);
  for (const [key, value] of sessions) if (value.user.id === user?.id) sessions.delete(key);
  res.status(204).end();
});
app.get('/auth-provider/auth/v1/authorize', (_req, res) => {
  res.type('html').send('<!doctype html><meta charset="utf-8"><a href="/test/google-confirm">Google 계정으로 계속</a>');
});
app.get('/test/google-confirm', (_req, res) => finish(res, session('google@example.com')));

httpServer.listen(port, '127.0.0.1');
