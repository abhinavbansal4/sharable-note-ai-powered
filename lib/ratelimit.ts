const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= limit) {
    store.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
