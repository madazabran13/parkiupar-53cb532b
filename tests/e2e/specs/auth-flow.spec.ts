import { test, expect } from "@playwright/test";

test.describe("Login page (UI smoke)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renderiza inputs de email y password", async ({ page }) => {
    const email = page.locator('input[type="email"], input[name="email"]').first();
    const password = page.locator('input[type="password"], input[name="password"]').first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
  });

  test("muestra botón de submit del formulario de login", async ({ page }) => {
    const submit = page.locator('button[type="submit"]').first();
    await expect(submit).toBeVisible();
  });

  test("validación cliente: submit con campos vacíos no navega al dashboard", async ({ page }) => {
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});

test.describe("Protección de rutas privadas", () => {
  test("acceder a /dashboard sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
