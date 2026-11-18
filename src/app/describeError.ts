export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }

  // JSON.stringify returns undefined for undefined, functions, and symbols, despite its string type.
  const json: string | undefined = JSON.stringify(error);
  return json ?? String(error);
}
