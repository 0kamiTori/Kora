import { expect, test } from '@playwright/test';
import { USERS, login, mainNavigation } from './helpers';

/** RF02: aprobar o rechazar conductoras. RF04/RF05: estados de verificación. RNF02: datos sensibles. */
test.describe('driver approval', () => {
  test('a verifier approves a driver whose identity is confirmed', async ({ page }) => {
    await login(page, USERS.verifier);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();

    const row = page.getByRole('row', { name: /Laura Méndez Rojas/ });
    await expect(row).toContainText('Pendiente de revisión');
    await row.getByRole('button', { name: 'Revisar solicitud de Laura Méndez Rojas' }).click();

    const drawer = page.getByRole('dialog', { name: 'Revisión de solicitud' });
    await expect(drawer).toContainText('Identidad confirmada');
    await drawer.getByRole('button', { name: 'Aprobar', exact: true }).click();

    await expect(drawer).toBeHidden();
    await expect(row).toContainText('Aprobada');
    await expect(row.getByRole('button', { name: /Revisar solicitud/ })).toHaveCount(0);
  });

  test('rejecting requires a reason', async ({ page }) => {
    await login(page, USERS.verifier);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();

    const row = page.getByRole('row', { name: /Paola Rincón Díaz/ });
    await row.getByRole('button', { name: 'Revisar solicitud de Paola Rincón Díaz' }).click();

    const drawer = page.getByRole('dialog', { name: 'Revisión de solicitud' });
    await drawer.getByRole('button', { name: 'Rechazar', exact: true }).click();

    const modal = page.getByRole('dialog', { name: 'Rechazar solicitud' });
    await modal.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(modal.getByRole('alert')).toHaveText('Debes escribir el motivo del rechazo.');
    // Sin motivo no se envía nada: la solicitud sigue pendiente.
    await expect(modal).toBeVisible();

    await modal
      .getByLabel(/Motivo del rechazo/)
      .fill('El SOAT presentado no corresponde al vehículo.');
    await modal.getByRole('button', { name: 'Confirmar rechazo' }).click();

    await expect(drawer).toBeHidden();
    await expect(row).toContainText('Rechazada');
  });

  test('a driver with a pending verification cannot be approved', async ({ page }) => {
    await login(page, USERS.verifier);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();
    await page.getByRole('button', { name: 'Revisar solicitud de Paola Rincón Díaz' }).click();

    const drawer = page.getByRole('dialog', { name: 'Revisión de solicitud' });
    await expect(drawer.getByRole('button', { name: 'Aprobar', exact: true })).toBeDisabled();
    await expect(drawer).toContainText('la verificación de identidad no está confirmada');
  });

  test('pending, expired and failed verifications are never shown as confirmed', async ({
    page,
  }) => {
    await login(page, USERS.verifier);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();

    const expectations: Array<[RegExp, string]> = [
      [/Paola Rincón Díaz/, 'Verificación pendiente'],
      [/Yuliana Ortiz Peña/, 'Verificación vencida (pendiente)'],
      [/Carolina Vega Ruiz/, 'Verificación fallida'],
      [/Marcela Gómez Ardila/, 'Verificación diferida (pendiente)'],
    ];
    for (const [name, label] of expectations) {
      const row = page.getByRole('row', { name });
      await expect(row).toContainText(label);
      await expect(row).not.toContainText('Identidad confirmada');
    }
  });

  test('a role without review permission cannot review', async ({ page }) => {
    await login(page, USERS.operator);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();

    await expect(page.getByRole('row', { name: /Laura Méndez Rojas/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisar solicitud/ })).toHaveCount(0);
  });

  test('the reference photo is only fetched after a justification', async ({ page }) => {
    await login(page, USERS.verifier);
    await mainNavigation(page).getByRole('link', { name: 'Conductoras' }).click();
    await page.getByRole('link', { name: 'Laura Méndez Rojas' }).click();

    await expect(page.getByTestId('sensitive-photo')).toHaveCount(0);
    await page.getByRole('button', { name: 'Solicitar acceso a fotografía de referencia' }).click();

    const modal = page.getByRole('dialog', { name: 'Justificación de acceso' });
    await modal.getByRole('button', { name: 'Registrar y consultar' }).click();
    await expect(modal.getByRole('alert')).toHaveText('Debes escribir la justificación.');
    await expect(page.getByTestId('sensitive-photo')).toHaveCount(0);

    await modal.getByLabel(/Justificación/).fill('Revisión manual de la solicitud de ingreso.');
    await modal.getByRole('button', { name: 'Registrar y consultar' }).click();

    await expect(page.getByTestId('sensitive-photo')).toBeVisible();
    await expect(page.getByText(/Consulta registrada en auditoría/)).toBeVisible();
  });
});
