import { test, expect } from "@playwright/test";

test.describe("Landing page (smoke)", () => {
  test("la SPA carga y muestra título de ParkiUpar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Parki\s*Upar|ParkiUpar/i);
  });

  test("hay al menos un CTA o enlace hacia /login", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator('a[href="/login"], a[href*="/login"]').first();
    await expect(loginLink).toBeVisible({ timeout: 10_000 });
  });

  test("ruta inexistente cae en SPA fallback (no 404 del CDN)", async ({ page }) => {
    const response = await page.goto("/_ruta_inexistente_xyz");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
});
