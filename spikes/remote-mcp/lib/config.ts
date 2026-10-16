import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  OWNER_GITHUB_ID: z.string().regex(/^\d+$/),
  MCP_OAUTH_CLIENT_ID: z.string().min(1),
  MCP_OAUTH_REDIRECT_URI: z.url(),
});

export function config() {
  const env = envSchema.parse(process.env);
  const app = new URL(env.APP_URL);
  const supabase = new URL(env.SUPABASE_URL);
  for (const url of [app, supabase]) {
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Configure HTTPS origins without paths or credentials (HTTP loopback allowed).');
    }
  }
  const callback = new URL(env.MCP_OAUTH_REDIRECT_URI);
  if (callback.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(callback.hostname) ||
      callback.username || callback.password || callback.search || callback.hash) {
    throw new Error('This spike requires an exact HTTP loopback Codex callback.');
  }
  return {
    appOrigin: app.origin,
    supabaseUrl: supabase.origin,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    ownerGithubId: env.OWNER_GITHUB_ID,
    clientId: env.MCP_OAUTH_CLIENT_ID,
    callback: callback.href,
    issuer: `${supabase.origin}/auth/v1`,
    resource: `${app.origin}/api/mcp`,
    metadata: `${app.origin}/.well-known/oauth-protected-resource/api/mcp`,
  };
}

export type Config = ReturnType<typeof config>;
