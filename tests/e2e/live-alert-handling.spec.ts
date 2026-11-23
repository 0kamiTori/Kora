import { expect, test } from '@playwright/test';
import { USERS, login, mainNavigation } from './helpers';

const SILENT_ALERT = 'Alerta silenciosa de la pasajera';

/** RF09, RF12: alertas visibles hasta registrar la atención. RF08: índice explicable. */
test.describe('live alert handling', () => {
  test('a critical alert stays in the banner until attention is registered', async ({ page }) => {
    await login(page, USERS.operator);
    const banner = page.getByRole('region', { name: 'Alertas en vivo' });

    // El simulador emite la alerta crítica unos segundos después de conectar.
    const item = banner.getByRole('listitem').filter({ hasText: SILENT_ALERT });
    await expect(item).toBeVisible({ timeout: 20_000 });

    // El simulador reenvía el MISMO evento 1 s después: no debe duplicarse (RNF04).
    await page.waitForTimeout(2_500);
    await expect(item).toHaveCount(1);

    // Cambiar de sección no la oculta, y no existe forma de descartarla.
    await mainNavigation(page).getByRole('link', { name: 'Viajes activos' }).click();
    await expect(page.getByRole('heading', { name: 'Viajes activos', level: 1 })).toBeVisible();
    await expect(item).toBeVisible();
    await expect(item.getByRole('button', { name: /Cerrar|Descartar|Ocultar/ })).toHaveCount(0);

    await item.getByRole('button', { name: 'Registrar atención de la alerta A-5002' }).click();
    await expect(item).toHaveCount(0);

    // La atención queda trazada: quién atiende y en qué estado está.
    await mainNavigation(page).getByRole('link', { name: 'Alertas e incidencias' }).click();
    const row = page.getByRole('row', { name: /A-5002/ });
    await expect(row).toContainText('En atención');
    await expect(row).toContainText('Natalia Cárdenas');
  });

  test('the sound control is visible and reacts to a click', async ({ page }) => {
    await login(page, USERS.operator);
    const banner = page.getByRole('region', { name: 'Alertas en vivo' });

    // Sin gesto de la persona usuaria el sonido está desactivado (autoplay).
    const enable = banner.getByRole('button', { name: /Activar sonido de alertas críticas/ });
    await expect(enable).toBeVisible();
    await enable.click();

    // Según el navegador: queda activado o se informa que fue bloqueado. Nunca falla en silencio.
    await expect(banner).toContainText(/Sonido activado|El navegador bloqueó el sonido/);
  });

  test('an incident shows its factors and delivery state, and is resolved with notes', async ({
    page,
  }) => {
    await login(page, USERS.operator);
    await mainNavigation(page).getByRole('link', { name: 'Alertas e incidencias' }).click();
    await page.getByRole('button', { name: 'Desviación de ruta (A-5001)' }).click();

    const detail = page.getByRole('region', { name: 'Detalle de la alerta A-5001' });
    await expect(detail).toContainText('Índice operativo de anomalía');
    await expect(detail).toContainText('No es una probabilidad de delito');
    await expect(detail).toContainText('Desviación de la ruta de referencia');
    // Enviada pero sin confirmación del backend: no se muestra como entregada.
    await expect(detail).toContainText('Enviada, sin confirmación de entrega');

    await detail.getByRole('button', { name: 'Registrar resolución' }).click();
    await expect(detail).toContainText('Selecciona el resultado de la atención.');
    await expect(detail).toContainText('Debes escribir las notas de resolución.');

    await detail.getByLabel('Resultado de la atención').selectOption('contact_established');
    await detail
      .getByLabel(/Notas de resolución/)
      .fill('Se contactó a la pasajera y confirmó el cambio de ruta.');
    await detail.getByRole('button', { name: 'Registrar resolución' }).click();

    await expect(page.getByRole('row', { name: /A-5001/ })).toContainText('Resuelta');
    await expect(detail).toContainText('Contacto establecido, sin novedad');
  });

  test('a role without alert permission neither sees the banner nor the page', async ({ page }) => {
    await login(page, USERS.auditor);
    await expect(page.getByRole('region', { name: 'Alertas en vivo' })).toHaveCount(0);

    await page.goto('/incidents');
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  });
});
