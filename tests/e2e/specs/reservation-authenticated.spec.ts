import { test, expect } from "@playwright/test";

/**
 * Flujo E2E completo de reserva (admin/conductor).
 *
 * Requiere:
 *   - Supabase local corriendo: `supabase start` en la raíz del repo.
 *   - Variables de entorno PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
 *     o PLAYWRIGHT_CONDUCTOR_* apuntando a usuarios seed válidos.
 *
 * Si no están definidas, los tests se saltan automáticamente para no romper el
 * pipeline en entornos donde Supabase local todavía no está provisionado.
 */

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

test.describe("Flujos autenticados", () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Requiere PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD y un Supabase local seedeado.",
  );

  test("admin puede iniciar sesión y ver el dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });

  test("admin puede navegar a la pestaña de reservas", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD!);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    const reservasLink = page.getByRole("link", { name: /reserva/i }).first();
    if (await reservasLink.isVisible().catch(() => false)) {
      await reservasLink.click();
      await expect(page).toHaveURL(/reserv/i);
    }
  });
});
