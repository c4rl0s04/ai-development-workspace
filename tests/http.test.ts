import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';

const owner = '159822857';
const subject = '8ccaa7af-909f-44e7-84cb-67cdccb56be6';
const key = randomBytes(32);
const user = (id = owner) => ({
  id: subject,
  aud: 'authenticated',
  role: 'authenticated',
  is_anonymous: false,
  email: 'fixture@example.invalid',
  app_metadata: { provider: 'github', providers: ['github'] },
  user_metadata: { provider_id: owner },
  identities: [
    {
      id,
      identity_id: 'fixture-identity',
      user_id: subject,
      provider: 'github',
      identity_data: { sub: id },
    },
  ],
  created_at: new Date().toISOString(),
});

function token(id = owner, age = 3600, extra = {}) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: subject,
    aud: 'authenticated',
    role: 'authenticated',
    is_anonymous: false,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + age,
    fixtureId: id,
    ...extra,
  })}`;
  return `${data}.${createHmac('sha256', key).update(data).digest('base64url')}`;
}
function session(access = token(), refresh = 'expired-refresh') {
  const claims = JSON.parse(
    Buffer.from(access.split('.')[1], 'base64url').toString(),
  );
  const value = {
    access_token: access,
    refresh_token: refresh,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: claims.exp,
    user: user(),
  };
  return `aw-auth=base64-${Buffer.from(JSON.stringify(value)).toString('base64url')}`;
}
async function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return address.port;
}
async function startApp(authOrigin?: string) {
  const probe = createServer();
  const port = await listen(probe);
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      env: {
        ...process.env,
        APP_URL: origin,
        SUPABASE_URL: authOrigin ?? '',
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock',
        OWNER_GITHUB_ID: owner,
      },
      stdio: 'ignore',
    },
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (
        (await fetch(`${origin}/login`, { signal: AbortSignal.timeout(500) }))
          .ok
      )
        return { origin, child };
    } catch {
      /* Local startup only. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error('Run npm run build first; local Next.js did not start');
}
async function stop(child: ReturnType<typeof spawn>) {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

test('built app enforces real SSR cookie boundaries with a local mock Auth server', {
  timeout: 60_000,
}, async () => {
  let outage = false;
  let logoutCalls = 0;
  let challenge = '';
  const consumedCodes = new Set<string>();
  const issuer = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (outage) {
      response.writeHead(503);
      response.end(
        JSON.stringify({ code: 'unexpected_failure', msg: 'fixture outage' }),
      );
      return;
    }
    if (request.url?.startsWith('/auth/v1/token')) {
      let body = '';
      for await (const chunk of request) body += chunk;
      const input = JSON.parse(body);
      const refresh = input.refresh_token === 'valid-refresh';
      const validCode =
        !consumedCodes.has(input.auth_code) &&
        ['valid-code', 'nonowner-code'].includes(input.auth_code) &&
        typeof input.code_verifier === 'string' &&
        createHash('sha256').update(input.code_verifier).digest('base64url') ===
          challenge;
      if (refresh || validCode) {
        if (validCode) consumedCodes.add(input.auth_code);
        const id = input.auth_code === 'nonowner-code' ? '2' : owner;
        response.end(
          JSON.stringify({
            access_token: token(id),
            refresh_token: 'valid-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: user(id),
          }),
        );
        return;
      }
      response.writeHead(400);
      response.end(
        JSON.stringify({
          code: 'refresh_token_not_found',
          msg: 'fixture rejected',
        }),
      );
      return;
    }
    if (request.url?.startsWith('/auth/v1/logout')) {
      logoutCalls++;
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.url === '/auth/v1/user') {
      const bearer =
        request.headers.authorization?.replace('Bearer ', '') ?? '';
      try {
        const [header, payload, signature] = bearer.split('.');
        const expected = createHmac('sha256', key)
          .update(`${header}.${payload}`)
          .digest();
        const actual = Buffer.from(signature, 'base64url');
        assert.equal(expected.length, actual.length);
        assert.ok(timingSafeEqual(expected, actual));
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
        assert.ok(claims.exp > Date.now() / 1000);
        response.end(JSON.stringify(user(claims.fixtureId)));
        return;
      } catch {
        response.writeHead(401);
        response.end(
          JSON.stringify({ code: 'bad_jwt', msg: 'fixture invalid token' }),
        );
        return;
      }
    }
    response.writeHead(404);
    response.end('{}');
  });
  const authOrigin = `http://127.0.0.1:${await listen(issuer)}`;
  const app = await startApp(authOrigin);
  const get = (path: string, cookie?: string) =>
    fetch(`${app.origin}${path}`, {
      redirect: 'manual',
      headers: cookie ? { Cookie: cookie } : {},
    });
  const post = (path: string, origin?: string, cookie?: string) =>
    fetch(`${app.origin}${path}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
  try {
    for (const path of ['/', '/projects', '/approvals']) {
      const unauthenticated = await get(path);
      assert.equal(unauthenticated.status, 307);
      assert.match(
        unauthenticated.headers.get('location') ?? '',
        /\/login\?error=expired$/,
      );
      const deniedBody = await unauthenticated.text();
      assert.doesNotMatch(
        deniedBody,
        /A place for the work ahead|Project management is not implemented|approval inbox is not implemented/,
      );
      const invalidSession = await get(path, 'aw-auth=invalid-session-fixture');
      assert.equal(invalidSession.status, 307);
      assert.doesNotMatch(
        await invalidSession.text(),
        /A place for the work ahead|Project management is not implemented|approval inbox is not implemented/,
      );
      const authorized = await get(path, session());
      assert.equal(authorized.status, 200);
      assert.match(authorized.headers.get('cache-control') ?? '', /no-store/);
      assert.equal(authorized.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(authorized.headers.get('x-frame-options'), 'DENY');
      assert.equal(authorized.headers.get('referrer-policy'), 'same-origin');
      assert.equal(authorized.headers.get('x-powered-by'), null);
      assert.match(
        authorized.headers.get('content-security-policy') ?? '',
        /frame-ancestors 'none'/,
      );
      const html = await authorized.text();
      assert.match(html, /Skip to content/);
      assert.match(html, /<main id="main-content"/);
      assert.match(
        html,
        new RegExp(
          `aria-current="page"[^>]*href="${path}"|href="${path}"[^>]*aria-current="page"`,
        ),
      );
      const css = html.match(/href="([^"]+\.css[^"]*)"/);
      assert.ok(css);
      assert.equal(
        (await fetch(new URL(css[1].replaceAll('&amp;', '&'), app.origin)))
          .status,
        200,
      );
      assert.match(
        (await get(path, session(token('2')))).headers.get('location') ?? '',
        /error=denied$/,
      );
    }
    assert.match(
      (await get('/', session(token(owner, -10)))).headers.get('location') ??
        '',
      /error=expired$/,
    );
    const refreshed = await get(
      '/',
      session(token(owner, -10), 'valid-refresh'),
    );
    assert.equal(refreshed.status, 200);
    assert.ok(
      refreshed.headers
        .getSetCookie()
        .some((value) => value.startsWith('aw-auth=')),
    );
    const forged = token().replace(/.$/, '!');
    assert.notEqual((await get('/', session(forged))).status, 200);
    assert.match(
      (
        await get(
          '/',
          session(
            token(owner, 3600, {
              aud: 'https://mcp.example',
              client_id: 'mcp-client',
            }),
          ),
        )
      ).headers.get('location') ?? '',
      /error=expired$/,
    );
    const spoofed = await fetch(`${app.origin}/`, {
      redirect: 'manual',
      headers: {
        'X-Owner-ID': owner,
        'X-User-ID': subject,
        Authorization: `Bearer ${token()}`,
      },
    });
    assert.equal(spoofed.status, 307);
    for (const path of ['/auth/login', '/auth/logout', '/projects']) {
      assert.equal((await post(path)).status, 403);
      assert.equal(
        (await post(path, 'https://attacker.example', session())).status,
        403,
      );
    }
    assert.equal((await post('/projects', app.origin)).status, 401);
    assert.equal(
      (await post('/projects', app.origin, session(token('2')))).status,
      403,
    );
    const login = await post('/auth/login', app.origin);
    assert.equal(login.status, 303);
    const target = new URL(login.headers.get('location') ?? '');
    assert.equal(target.origin, authOrigin);
    assert.equal(target.searchParams.get('provider'), 'github');
    challenge = target.searchParams.get('code_challenge') ?? '';
    assert.ok(challenge);
    assert.equal(
      target.searchParams.get('redirect_to'),
      `${app.origin}/auth/callback`,
    );
    assert.equal(target.searchParams.get('code_challenge_method'), 's256');
    const verifierCookie = login.headers
      .getSetCookie()
      .find((value) => value.startsWith('aw-auth-code-verifier='));
    assert.ok(verifierCookie);
    assert.match(verifierCookie, /HttpOnly/i);
    assert.match(verifierCookie, /SameSite=Lax/i);
    for (const path of [
      '/auth/callback',
      '/auth/callback?error=access_denied&error_description=secret',
      '/auth/callback?code=bad',
      '/auth/callback?code=one&code=two',
    ]) {
      const callback = await get(path);
      assert.equal(callback.status, 303);
      assert.equal(
        callback.headers.get('location'),
        `${app.origin}/login?error=failed`,
      );
      assert.doesNotMatch(await callback.text(), /secret/);
    }
    const count = logoutCalls;
    await get('/auth/callback?error=access_denied', session());
    assert.equal(
      logoutCalls,
      count,
      'invalid GET callback cannot sign out an existing session',
    );
    const verifier = verifierCookie.split(';')[0];
    const success = await get(
      '/auth/callback?code=valid-code&next=https://attacker.example',
      verifier,
    );
    assert.equal(success.status, 303);
    assert.equal(success.headers.get('location'), `${app.origin}/`);
    assert.ok(
      success.headers
        .getSetCookie()
        .some((value) => value.startsWith('aw-auth=')),
    );
    assert.equal(
      (await get('/auth/callback?code=valid-code', verifier)).headers.get(
        'location',
      ),
      `${app.origin}/login?error=failed`,
    );
    const denied = await get('/auth/callback?code=nonowner-code', verifier);
    assert.equal(
      denied.headers.get('location'),
      `${app.origin}/login?error=denied`,
    );
    assert.match(denied.headers.getSetCookie().join(';'), /Max-Age=0/i);
    const logout = await post('/auth/logout', app.origin, session());
    assert.equal(logout.status, 303);
    assert.match(logout.headers.getSetCookie().join(';'), /Max-Age=0/i);
    const value = session().slice('aw-auth='.length);
    const half = Math.floor(value.length / 2);
    const chunks = await post(
      '/auth/logout',
      app.origin,
      `aw-auth.0=${value.slice(0, half)}; aw-auth.1=${value.slice(half)}; unrelated=preserve`,
    );
    for (const name of ['aw-auth.0', 'aw-auth.1'])
      assert.ok(
        chunks.headers
          .getSetCookie()
          .some(
            (cookie) =>
              cookie.startsWith(`${name}=`) && /Max-Age=0/i.test(cookie),
          ),
      );
    assert.ok(
      chunks.headers
        .getSetCookie()
        .every((cookie) => !cookie.startsWith('unrelated=')),
    );
    outage = true;
    assert.equal((await get('/', session())).status, 503);
    const failedLogout = await post('/auth/logout', app.origin, session());
    assert.equal(failedLogout.status, 303);
    assert.match(failedLogout.headers.getSetCookie().join(';'), /Max-Age=0/i);
    assert.equal((await get('/does-not-exist')).status, 404);
    assert.equal((await get('/icon.svg')).status, 200);
    assert.equal((await get('/auth/logout')).status, 405);
  } finally {
    await stop(app.child);
    await new Promise<void>((resolve) => issuer.close(() => resolve()));
  }
});

test('unconfigured deployment builds but fails closed without private content', {
  timeout: 20_000,
}, async () => {
  const app = await startApp();
  try {
    const response = await fetch(app.origin);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /Your workspace, taking shape/);
    const login = await fetch(`${app.origin}/login`);
    assert.equal(login.status, 200);
    const html = await login.text();
    assert.match(html, /Authentication is temporarily unavailable/);
    assert.doesNotMatch(html, /Continue with GitHub/);
  } finally {
    await stop(app.child);
  }
});
