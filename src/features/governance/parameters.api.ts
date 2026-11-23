/**
 * PUNTO DE INTEGRACIÓN — Parámetros versionados (RF07).
 * Los umbrales (desviación, pérdida de señal, parada) se leen SIEMPRE de aquí:
 * no existen como constantes en el código del portal.
 */
import { apiRequest } from '../../shared/api/client';
import type {
  Parameter,
  ParameterKey,
  ParameterVersion,
  UpdateParameterRequest,
} from './audit.types';

export const PARAMETERS_QUERY_KEY = ['parameters'] as const;

/**
 * GET /parameters → Parameter[].
 * SUPUESTO: lectura permitida a cualquier sesión de administración, porque el monitoreo
 * necesita los umbrales vigentes. La pantalla de gestión exige parameters:view.
 */
export function listParameters(): Promise<Parameter[]> {
  return apiRequest<Parameter[]>({ path: '/parameters' });
}

/** GET /parameters/{key}/versions → ParameterVersion[] (más reciente primero). Permiso: parameters:view. */
export function listParameterVersions(key: ParameterKey): Promise<ParameterVersion[]> {
  return apiRequest<ParameterVersion[]>({ path: `/parameters/${key}/versions` });
}

/**
 * PUT /parameters/{key} → Parameter. Permiso: parameters:edit. Cuerpo: { value, reason }.
 * El backend crea una versión nueva (quién, cuándo, valor anterior y nuevo, motivo).
 */
export function updateParameter(
  key: ParameterKey,
  request: UpdateParameterRequest,
): Promise<Parameter> {
  return apiRequest<Parameter>({ method: 'PUT', path: `/parameters/${key}`, body: request });
}
