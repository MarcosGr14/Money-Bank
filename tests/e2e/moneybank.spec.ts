import { test, expect } from '@playwright/test';

test('first launch vault creation, account creation, and lock cycle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Crea tu bóveda financiera local')).toBeVisible();

  const inputs = page.locator('input[type="password"]');
  await inputs.nth(0).fill('MiBovedaSegura2026!');
  await inputs.nth(1).fill('MiBovedaSegura2026!');
  await page.getByRole('button', { name: /Crear Bóveda Cifrada/i }).click();

  await expect(page.getByText('Disponible seguro para gastar')).toBeVisible();

  await page.getByRole('button', { name: /Bloquear bóveda/i }).click();
  await expect(page.getByText('La bóveda está bloqueada')).toBeVisible();
});
