import 'server-only';
import { NextResponse } from 'next/server';
import { AccessError } from '../application/auth/owner';
import { WorkspaceError } from '../domain/workspace';
import { privateResponse } from '../infrastructure/auth/supabase';
import { reportFailure, type Operation } from '../infrastructure/diagnostics';

export async function readInput(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new WorkspaceError('validation', 'Send JSON input.');
  const reader = request.body?.getReader();
  if (!reader)
    throw new WorkspaceError('validation', 'Enter the required fields.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw new WorkspaceError('validation', 'Input must be at most 32 KB.');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError('validation', 'Enter valid JSON.');
  } finally {
    reader.releaseLock();
  }
}
export async function respond(
  operation: Operation,
  work: () => Promise<unknown>,
  status = 200,
) {
  try {
    return privateResponse(NextResponse.json(await work(), { status }));
  } catch (error) {
    const correlationId = reportFailure(error, operation);
    const failureResponse = (response: NextResponse) => {
      if (correlationId)
        response.headers.set('X-Correlation-ID', correlationId);
      return privateResponse(response);
    };
    if (error instanceof AccessError)
      return failureResponse(
        NextResponse.json(
          { error: { message: 'Access denied.' } },
          {
            status:
              error.reason === 'unavailable'
                ? 503
                : error.reason === 'unauthenticated'
                  ? 401
                  : 403,
          },
        ),
      );
    if (error instanceof WorkspaceError)
      return failureResponse(
        NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              fields: error.fields,
            },
          },
          {
            status: {
              validation: 400,
              conflict: 409,
              unique_conflict: 409,
              not_found: 404,
              unavailable: 503,
            }[error.code],
          },
        ),
      );
    return failureResponse(
      NextResponse.json(
        { error: { message: 'The request could not be completed.' } },
        { status: 503 },
      ),
    );
  }
}
