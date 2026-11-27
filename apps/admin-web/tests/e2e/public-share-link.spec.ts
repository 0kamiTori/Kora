import { expect, test } from '@playwright/test';

/** Tokens de demostración del adaptador mock (src/mocks/db.ts). */
const TOKENS = {
  active: 'demo-activo-7f3a9c21',
  expired: 'demo-expirado-b81d04e6',
  revoked: 'demo-revocado-2c9e55aa',
};

/** RF10: enlace temporal revocable. RNF02: la vista pública muestra solo lo necesario. */
test.describe('public share link', () => {
  test('an active link shows only status, last position and its time', async ({ page }) => {
    await page.goto(`/track/${TOKENS.active}`);

    await expect(page.getByRole('heading', { name: 'Seguimiento del viaje' })).toBeVisible();
    await expect(page.getByText('Viaje en curso.')).toBeVisible();
    await expect(page.getByText(/Último dato:/)).toBeVisible();
    await expect(page.getByRole('img', { name: /Mapa/ })).toBeVisible();

    // Sin navegación ni datos de administración, y sin datos personales del viaje.
    await expect(page.getByRole('navigation')).toHaveCount(0);
    const body = page.locator('body');
    for (const hidden of ['Diana Pardo', 'Pasajera 1042', 'HTR 908', 'T-1001', 'Conductoras']) {
      await expect(body).not.toContainText(hidden);
    }
  });

  test('an expired link explains it and shows no trip data', async ({ page }) => {
    await page.goto(`/track/${TOKENS.expired}`);
    await expect(page.getByRole('heading', { name: 'Este enlace expiró' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Mapa/ })).toHaveCount(0);
    await expect(page.getByText(/Último dato:/)).toHaveCount(0);
  });

  test('a revoked link explains it and shows no trip data', async ({ page }) => {
    await page.goto(`/track/${TOKENS.revoked}`);
    await expect(page.getByRole('heading', { name: 'Este enlace fue desactivado' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Mapa/ })).toHaveCount(0);
  });

  test('an unknown token is rejected', async ({ page }) => {
    await page.goto('/track/no-existe-000');
    await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
  });

  test('a share link grants no access to the admin area', async ({ page }) => {
    await page.goto(`/track/${TOKENS.active}`);
    await expect(page.getByText('Viaje en curso.')).toBeVisible();

    await page.goto('/trips/T-1001');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Portal administrativo' })).toBeVisible();
  });
});
