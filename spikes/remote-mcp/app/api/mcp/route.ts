import { config } from '../../../lib/config';
import { createMcpEndpoint } from '../../../lib/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
let endpoint: ReturnType<typeof createMcpEndpoint>;
const handle = (request: Request) => (endpoint ??= createMcpEndpoint(config()))(request);
export { handle as POST, handle as GET, handle as DELETE };
