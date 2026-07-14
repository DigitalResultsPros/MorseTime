/**
 * Safe localStorage helpers for client-only preference/UX state.
 * All access is wrapped so private-mode, disabled storage, or quota errors
 * degrade gracefully (no thrown errors). Authoritative data lives in Redis —
 * never mirror streak/progress/scores here.
 */

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore: storage unavailable or over quota */
  }
}

export function readString(key: string, fallback: string): string {
  const v = safeGet(key);
  return v === null ? fallback : v;
}

export function writeString(key: string, value: string): void {
  safeSet(key, value);
}

export function readNumber(key: string, fallback: number): number {
  const v = safeGet(key);
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function writeNumber(key: string, value: number): void {
  safeSet(key, String(value));
}

export function readFlag(key: string): boolean {
  return safeGet(key) === '1';
}

export function writeFlag(key: string, value: boolean): void {
  safeSet(key, value ? '1' : '0');
}
