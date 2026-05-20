/**
 * Verifies credentials sign-in against production (or AUTH_BASE_URL).
 * Usage: AUTH_BASE_URL=https://unibridge-eight.vercel.app node scripts/verify-auth-login.mjs
 */
const base = process.env.AUTH_BASE_URL ?? 'https://unibridge-eight.vercel.app';

async function login(email, password) {
  const jar = {};
  const getCookieHeader = () =>
    Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  const saveCookies = (res) => {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) jar[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  };

  const csrfRes = await fetch(`${base}/api/auth/csrf`, {
    headers: { cookie: getCookieHeader() },
  });
  saveCookies(csrfRes);
  const { csrfToken } = await csrfRes.json();

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    redirect: 'false',
    callbackUrl: `${base}/login/redirect`,
    json: 'true',
  });

  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: getCookieHeader(),
    },
    body,
  });
  saveCookies(res);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { parseError: true, body: text.slice(0, 200) };
  }

  return { status: res.status, ok: res.ok, data, cookieCount: Object.keys(jar).length };
}

async function registerFresh() {
  const email = `verify${Date.now()}@auth.unibridge.test`;
  const password = 'VerifyPass123!';
  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Verify Auth',
      email,
      password,
      role: 'STUDENT',
      locale: 'EN',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Register failed: ${JSON.stringify(data)}`);
  return { email, password };
}

async function main() {
  console.log('Testing auth at', base);
  const { email, password } = await registerFresh();
  console.log('Registered', email);
  const result = await login(email, password);
  console.log('Login result:', JSON.stringify(result, null, 2));
  if (!result.ok || result.status >= 500) {
    process.exit(1);
  }
  console.log('OK — login works');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
