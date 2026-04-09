import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to create JSON responses
 * @param data - The data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param init - Additional ResponseInit options
 * @returns A Response object with JSON content type
 */
export function json<T>(
  data: T,
  status: number = 200,
  init?: ResponseInit,
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...init?.headers,
      'Content-Type': 'application/json',
    },
    status,
  })
}

export function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause as {} | undefined,
    }
  }

  return {
    name: 'UnknownError',
    message: String(err),
  }
}
