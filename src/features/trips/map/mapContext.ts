import { createContext, useContext } from 'react';
import type { DeviationSpec, MarkerSpec } from './MapProvider';

/** Canal por el que DriverMarker y DeviationOverlay registran sus capas en el mapa. */
export interface MapLayerContextValue {
  setMarker: (marker: MarkerSpec | null) => void;
  setDeviation: (deviation: DeviationSpec | null) => void;
}

export const MapLayerContext = createContext<MapLayerContextValue | null>(null);

export function useMapLayers(): MapLayerContextValue {
  const context = useContext(MapLayerContext);
  if (!context) throw new Error('Este componente debe usarse dentro de <TripMonitorMap>.');
  return context;
}
