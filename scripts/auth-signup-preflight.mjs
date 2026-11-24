// Read-only Auth settings probe. No signup, session, user-data or database request.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const envPath = fileURLToPath(new URL('../apps/web/.env.local', import.meta.url));
const file = readFileSync(envPath, 'utf8');
function value(name) {
  const line = file.split(/\r?\n/).find(item => item.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
}
const pinned = 'https://gllsiklbvqpxzucvkehw.supabase.co';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? value('NEXT_PUBLIC_SUPABASE_URL');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? value('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const origin = process.env.CONTRATPRO_APP_ORIGIN ?? value('CONTRATPRO_APP_ORIGIN');
console.log(JSON.stringify({ local: { projectMatch: url === pinned, originMatchesReproduction: origin === 'http://localhost:3000',
  publishableKeyFormat: typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key),
  recoverySecretPresent: !!value('CONTRATPRO_AUTH_FLOW_SECRET') } }));
if (url !== pinned || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
  console.log('REMOTE_NOT_ATTEMPTED_CONFIGURATION_MISMATCH'); process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${pinned}/auth/v1/settings`, { method: 'GET', redirect: 'error', cache: 'no-store',
      headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) console.log(JSON.stringify({ settings: { httpStatus: response.status, verified: false } }));
    else {
      const data = await response.json();
      const bool = input => typeof input === 'boolean' ? input : 'NOT_EXPOSED';
      console.log(JSON.stringify({ settings: { httpStatus: response.status, disableSignup: bool(data.disable_signup),
        emailEnabled: bool(data.external?.email), emailAutoConfirm: bool(data.mailer_autoconfirm),
        googleEnabled: bool(data.external?.google) } }));
    }
  } catch { console.log('SETTINGS_READ_FAILED_NO_PROVIDER_DETAILS_PRINTED'); process.exitCode = 1; }
}
const logPath = fileURLToPath(new URL('../apps/web/.next/dev/logs/next-development.log', import.meta.url));
try {
  const page = await fetch('http://localhost:3000/fr/sign-up?status=error', { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const html = await page.text();
  console.log(JSON.stringify({ localPage: { httpStatus: page.status, signupPostAction: html.includes('action="/fr/auth/sign-up"'),
    contextSpecificSignupError: html.includes('L’inscription n’a pas pu être finalisée.'), referrerPolicy: page.headers.get('referrer-policy') } }));
} catch { console.log('LOCAL_PAGE_NOT_READ'); }
if (existsSync(logPath)) {
  const log = readFileSync(logPath, 'utf8');
  const codes = ['signup_disabled', 'email_provider_disabled', 'email_address_not_authorized', 'over_email_send_rate_limit',
    'unexpected_failure', 'bad_code_verifier', 'AUTH_CONFIGURATION_UNAVAILABLE'];
  console.log(JSON.stringify({ existingDevelopmentLog: Object.fromEntries(codes.map(code => [code, log.split(code).length - 1])) }));
}
