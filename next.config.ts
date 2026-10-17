import type { NextConfig } from 'next';
import { parseAuthConfig } from './src/infrastructure/auth/config';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    let formAction = "'self'";
    try {
      // Chromium also checks redirects following a form POST during OAuth.
      formAction += ` ${parseAuthConfig(process.env).supabaseUrl} https://github.com`;
    } catch {
      // Unconfigured deployments retain same-origin forms and fail closed.
    }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action ${formAction}`,
          },
        ],
      },
    ];
  },
};

export default config;
