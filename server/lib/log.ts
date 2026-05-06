type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'service_role_key',
  'jwt_secret',
  'apikey',
  'api_key',
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v);
  }
  return out;
}

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...(meta ? (redact(meta) as object) : {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};
