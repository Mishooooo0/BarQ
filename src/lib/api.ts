import { getLang, t } from '../i18n';
import { messageText } from '../i18n/messages';

// One place for every call to the backend. Failures always become an ApiError with a readable message, so a slow,
// restarting or broken API shows an error state instead of crashing a screen.
export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
  /** True when the server could not be reached at all (offline, restarting, timed out). */
  get offline() { return this.status === 0; }
}

const TOKEN_KEY = 'barq.session';
const TIMEOUT_MS = 10_000;
/** The AI Analyst may wait on Claude-Dev and then the Ring API fallback. */
export const AI_TIMEOUT_MS = 180_000;

export const tokenStore = {
  get(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token: string) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable: session lasts for this tab only */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let memoryToken: string | null = null;
const listeners = new Set<() => void>();
/** Called when the server says the session is no longer valid. */
export function onSessionExpired(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function setToken(token: string | null) { memoryToken = token; if (token) tokenStore.set(token); else tokenStore.clear(); }
export const currentToken = () => memoryToken ?? tokenStore.get();

export async function api<T>(path: string, { method = 'GET', body, signal, timeoutMs = TIMEOUT_MS }: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeoutMs);
  const forward = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forward, { once: true });
  const token = currentToken();
  let response: Response;
  try {
    response = await fetch(path, { method, signal: controller.signal, headers: { accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-barq-language': getLang() }, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? 'The server is taking too long to answer. Please try again.' : "Can't reach the server. Check that it is running, then try again.", 0);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', forward); }
  let data: unknown = null;
  const text = await response.text().catch(() => '');
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!response.ok) {
    if (response.status === 401 && token) listeners.forEach(listener => listener());
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : response.status >= 500 ? 'The server had a problem. Please try again.' : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  if (data === null) throw new ApiError('The server sent an unexpected response.', response.status);
  return data as T;
}

/** A readable message for any failure, in the chosen language. */
export const errorMessage = (error: unknown) => error instanceof ApiError ? messageText(error.message) : t('Something went wrong. Please try again.');
export const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
