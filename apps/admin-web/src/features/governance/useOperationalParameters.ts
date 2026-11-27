import { useQuery } from '@tanstack/react-query';
import type { ParameterKey } from './audit.types';
import { PARAMETERS_QUERY_KEY, listParameters } from './parameters.api';

/**
 * Umbrales operativos vigentes, leídos de los parámetros versionados.
 * Devuelve null mientras no hayan cargado: ninguna pantalla debe asumir un valor por defecto.
 */
export function useOperationalParameters() {
  const query = useQuery({
    queryKey: PARAMETERS_QUERY_KEY,
    queryFn: listParameters,
    staleTime: 60_000,
  });

  const valueOf = (key: ParameterKey): number | null =>
    query.data?.find((parameter) => parameter.key === key)?.value ?? null;

  return {
    isLoading: query.isLoading,
    error: query.error,
    routeDeviationMeters: valueOf('route_deviation_meters'),
    signalLossSeconds: valueOf('signal_loss_seconds'),
    prolongedStopSeconds: valueOf('prolonged_stop_seconds'),
  };
}
