/**
 * Module-level pub/sub for network errors.
 * apiFetch calls notifyNetworkError() → NetworkGuard redirects immediately.
 * Using a module singleton avoids DOM event timing issues.
 */

type Handler = () => void;

let _handler: Handler | null = null;

/** Called by NetworkGuard to register the redirect callback. */
export function setNetworkErrorHandler(fn: Handler): () => void {
  _handler = fn;
  return () => {
    if (_handler === fn) _handler = null;
  };
}

/** Called by apiFetch when any request fails due to network/server issues. */
export function notifyNetworkError(): void {
  _handler?.();
}
