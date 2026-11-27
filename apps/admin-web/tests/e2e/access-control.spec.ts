import { expect, test } from '@playwright/test';
import { USERS, login, mainNavigation } from './helpers';

/**
 * RNF01: sin acceso a viajes ni datos fuera de los permisos del rol.
 * Se prueba contra el adaptador mock; la garantía real la debe dar el backend (403).
 */
test.describe('access control', () => {
  test('anonymous visitors are sent to the login page', async ({ page }) => {
    await page.goto('/trips');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an auditor cannot reach trips, by menu or by URL', async ({ page }) => {
    await login(page, USERS.auditor);
    const navigation = mainNavigation(page);
    await expect(navigation.getByRole('link', { name: 'Auditoría' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Viajes activos' })).toHaveCount(0);
    await expect(navigation.getByRole('link', { name: 'Conductoras' })).toHaveCount(0);

    for (const path of ['/trips', '/trips/T-1001', '/drivers/D-01']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/forbidden$/);
      await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
    }
  });

  test('a verifier cannot open governance pages', async ({ page }) => {
    await login(page, USERS.verifier);
    for (const path of ['/governance/audit', '/governance/privacy', '/governance/parameters']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/forbidden$/);
    }
  });

  test('an operator must justify access before reading the historical route', async ({ page }) => {
    await login(page, USERS.operator);
    await mainNavigation(page).getByRole('link', { name: 'Viajes activos' }).click();
    await page.getByRole('link', { name: 'T-1001' }).click();

    await expect(page.getByRole('heading', { name: 'Viaje T-1001' })).toBeVisible();
    // El recorrido histórico no se muestra hasta justificar el acceso.
    await expect(page.getByRole('region', { name: 'Posiciones históricas del viaje' })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Solicitar acceso al recorrido histórico' }).click();
    await expect(page.getByRole('dialog', { name: 'Justificación de acceso' })).toBeVisible();
  });

  test('signing out ends the session', async ({ page }) => {
    await login(page, USERS.admin);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });
});
