import { expect, type Page } from '@playwright/test';

/** Usuarios del adaptador mock (ver README, sección "Datos de prueba"). */
export const USERS = {
  admin: 'admin@piloto.test',
  operator: 'operadora@piloto.test',
  verifier: 'verificadora@piloto.test',
  auditor: 'auditora@piloto.test',
} as const;

export const MOCK_PASSWORD = 'Piloto-2026';

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(MOCK_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { name: 'Panel', level: 1 })).toBeVisible();
}

export function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación principal' });
}
