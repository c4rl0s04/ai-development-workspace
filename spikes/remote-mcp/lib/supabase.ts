import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { config } from './config';
export { isOwner } from './owner';

export async function sessionClient(renderOnly = false) {
  const settings = config();
  const jar = await cookies();
  return createServerClient(settings.supabaseUrl, settings.publishableKey, {
    cookieOptions: { httpOnly: true, secure: settings.appOrigin.startsWith('https:'), sameSite: 'lax' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // Render-only pages cannot persist refresh cookies; actions/callbacks must.
        if (!renderOnly) values.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}
