import { useEffect } from 'react';
import type { LatLng } from '../../../shared/types/common.types';
import { nearestOnPolyline } from '../../../shared/utils/geo.utils';
import { useMapLayers } from './mapContext';

interface DeviationOverlayProps {
  position: LatLng;
  route: readonly LatLng[];
  /** Distancia informada por el backend (la decisión de "hay desviación" es suya). */
  meters: number;
}

/**
 * Dibuja la línea entre el vehículo y el punto más cercano de la ruta de referencia (RF07).
 * Solo es apoyo visual: el portal no decide si existe una desviación.
 */
export function DeviationOverlay({ position, route, meters }: DeviationOverlayProps) {
  const { setDeviation } = useMapLayers();
  const { lat, lng } = position;

  useEffect(() => {
    const nearest = nearestOnPolyline({ lat, lng }, route);
    setDeviation(nearest ? { from: { lat, lng }, to: nearest.point, meters } : null);
    return () => setDeviation(null);
  }, [setDeviation, lat, lng, route, meters]);

  return null;
}
