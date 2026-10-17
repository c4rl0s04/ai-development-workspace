export function parseAuthConfig(env: Record<string, string | undefined>) {
  try {
    const app = new URL(env.APP_URL ?? '');
    const supabase = new URL(env.SUPABASE_URL ?? '');
    for (const url of [app, supabase]) {
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error();
    }
    if (
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(
        env.SUPABASE_PUBLISHABLE_KEY ?? '',
      ) ||
      !/^[1-9][0-9]*$/.test(env.OWNER_GITHUB_ID ?? '')
    )
      throw new Error();
    return {
      appOrigin: app.origin,
      supabaseUrl: supabase.origin,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY as string,
      ownerGithubId: env.OWNER_GITHUB_ID as string,
    };
  } catch {
    throw new Error('Authentication configuration is unavailable');
  }
}

export type AuthConfig = ReturnType<typeof parseAuthConfig>;
