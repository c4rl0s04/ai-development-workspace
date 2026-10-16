import { metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { config } from '../../../../../lib/config';
import { resourceMetadata } from '../../../../../lib/mcp';

export const dynamic = 'force-dynamic';
export const GET = (request: Request) => resourceMetadata(config())(request);
export const OPTIONS = metadataCorsOptionsRequestHandler();
