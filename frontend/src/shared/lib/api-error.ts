import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { SerializedError } from '@reduxjs/toolkit';

interface NestErrorBody {
  message?: string | string[];
}

function isNestErrorBody(data: unknown): data is NestErrorBody {
  return typeof data === 'object' && data !== null && 'message' in data;
}

// Nest's global ValidationPipe returns { message: string | string[], error, statusCode }.
// Surface that real message instead of a generic "Something went wrong" — it's the
// only way a user finds out *which* URL was wrong instead of just that one was.
export function getApiErrorMessage(
  error: FetchBaseQueryError | SerializedError | undefined,
  fallback: string,
): string {
  if (!error) return fallback;

  if ('data' in error && isNestErrorBody(error.data)) {
    const { message } = error.data;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}
