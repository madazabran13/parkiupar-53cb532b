/**
 * CustomerService — Repository for customer management.
 * Consume `/customers` Edge Function vía `@/lib/api`.
 */
import { api, ApiError } from '@/lib/api';

export const CustomerService = {
  async upsert(_tenantId: string, phone: string, fullName: string): Promise<string> {
    const existing = await api.customers.list({ q: phone, pageSize: 5 });
    const match = existing.items.find((c) => c.phone === phone);

    if (match) {
      if (fullName && fullName !== match.full_name) {
        await api.customers.update(match.id, { full_name: fullName });
      }
      return match.id;
    }

    try {
      const created = await api.customers.create({
        full_name: fullName || 'Sin nombre',
        phone,
      });
      return created.id;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Otra request lo creó en paralelo; releemos.
        const retry = await api.customers.list({ q: phone, pageSize: 5 });
        const found = retry.items.find((c) => c.phone === phone);
        return found?.id ?? '';
      }
      throw err;
    }
  },

  async searchByName(_tenantId: string, query: string, limit = 5) {
    const res = await api.customers.list({ q: query, pageSize: limit });
    return res.items.map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
  },
} as const;
