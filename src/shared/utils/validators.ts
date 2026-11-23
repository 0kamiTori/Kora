/** Cada validador devuelve un mensaje de error en español, o null si el valor es válido. */
export type ValidationResult = string | null;

export const JUSTIFICATION_MIN_LENGTH = 15;
export const REASON_MIN_LENGTH = 10;

/**
 * `what` es el nombre del campo en minúscula y con artículo, para que el mensaje
 * concuerde en género y número: "la contraseña", "las notas de resolución".
 */
export function validateRequired(value: string, what: string): ValidationResult {
  return value.trim() ? null : `Debes escribir ${what}.`;
}

export function validateEmail(value: string): ValidationResult {
  if (!value.trim()) return 'Debes escribir el correo.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Escribe un correo válido.';
}

export function validateMinLength(value: string, min: number, what: string): ValidationResult {
  const length = value.trim().length;
  if (length === 0) return `Debes escribir ${what}.`;
  if (length < min) return `Escribe al menos ${min} caracteres en ${what}.`;
  return null;
}

/** Justificación de acceso a datos sensibles (RNF02). */
export function validateJustification(value: string): ValidationResult {
  return validateMinLength(value, JUSTIFICATION_MIN_LENGTH, 'la justificación');
}

/** Motivo obligatorio (rechazos, cambios de parámetros, notas de resolución). */
export function validateReason(value: string, what = 'el motivo'): ValidationResult {
  return validateMinLength(value, REASON_MIN_LENGTH, what);
}

export function validateNumberInRange(
  raw: string,
  min: number,
  max: number,
  label: string,
): ValidationResult {
  if (!raw.trim()) return `${label} es obligatorio.`;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${label} debe ser un número.`;
  if (!Number.isInteger(value)) return `${label} debe ser un número entero.`;
  if (value < min || value > max) return `${label} debe estar entre ${min} y ${max}.`;
  return null;
}
