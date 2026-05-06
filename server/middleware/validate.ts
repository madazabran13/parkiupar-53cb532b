import type { MiddlewareHandler } from 'hono';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import { AppError } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

export function validate<S extends ZodTypeAny>(schema: S, source: Source = 'body'): MiddlewareHandler {
  return async (c, next) => {
    let raw: unknown;
    if (source === 'body') {
      raw = c.get('parsedBody') ?? (await c.req.json().catch(() => ({})));
    } else if (source === 'query') {
      const params: Record<string, string> = {};
      new URL(c.req.url).searchParams.forEach((v, k) => {
        params[k] = v;
      });
      raw = params;
    } else {
      raw = c.req.param();
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new AppError(
        'UNPROCESSABLE_ENTITY',
        'Validación fallida',
        result.error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })),
      );
    }
    c.set(`validated_${source}` as 'validated_body', result.data as ZodInfer<S>);
    await next();
  };
}
