import type { AuthInfo } from '@modelcontextprotocol/server';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { createMcpHandler, withMcpAuth, protectedResourceHandler } from 'mcp-handler';
import { z } from 'zod';
import type { Config } from './config';

export function createMcpEndpoint(settings: Config, key?: JWTVerifyGetKey) {
  const jwks = key ?? createRemoteJWKSet(new URL(`${settings.issuer}/.well-known/jwks.json`));
  const handler = createMcpHandler((server) => {
    server.registerTool('connection_test', {
      title: 'Connection test',
      description: 'Confirm authenticated owner access; returns no identity or credential data.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async () => ({ content: [{ type: 'text', text: 'Authenticated connection successful.' }] }));
  }, { serverInfo: { name: 'remote-mcp-spike', version: '0.0.0' }, maxSubscriptions: 0 });

  const verifyToken = async (_req: Request, token?: string): Promise<AuthInfo | undefined> => {
    if (!token) return undefined;
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: settings.issuer,
        audience: settings.resource,
        algorithms: ['ES256', 'RS256'],
        maxTokenAge: 300,
        requiredClaims: ['sub', 'exp', 'iat', 'client_id', 'github_provider_id'],
      });
      // Only the Auth hook derives this claim from auth.identities; never user_metadata.
      if (payload.client_id !== settings.clientId || payload.github_provider_id !== settings.ownerGithubId ||
          payload.role !== 'authenticated' || payload.is_anonymous !== false ||
          !z.uuid().safeParse(payload.sub).success) return undefined;
      return { token, clientId: settings.clientId, scopes: [], expiresAt: payload.exp };
    } catch {
      return undefined;
    }
  };
  const authenticated = withMcpAuth(handler, verifyToken, {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/api/mcp',
    resourceUrl: settings.resource,
  });
  return async (request: Request) => {
    // Avoid trusting Host/X-Forwarded-Host for OAuth resource identity or challenges.
    const origin = request.headers.get('origin');
    if (origin && origin !== settings.appOrigin) return new Response('Forbidden origin', { status: 403 });
    const response = await authenticated(request);
    if (response.status === 401) {
      response.headers.set('WWW-Authenticate', `Bearer resource_metadata="${settings.metadata}"`);
    }
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
}

export function resourceMetadata(settings: Config) {
  return protectedResourceHandler({ authServerUrls: [settings.issuer], resourceUrl: settings.resource });
}
