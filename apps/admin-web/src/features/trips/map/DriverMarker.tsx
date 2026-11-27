import { useEffect } from 'react';
import type { LatLng } from '../../../shared/types/common.types';
import { useMapLayers } from './mapContext';

interface DriverMarkerProps {
  position: LatLng;
  /** true cuando no hay señal: el marcador se dibuja atenuado, como dato antiguo. */
  stale: boolean;
  label: string;
}

/** Marcador del vehículo. No renderiza nada por sí mismo: registra su capa en el mapa. */
export function DriverMarker({ position, stale, label }: DriverMarkerProps) {
  const { setMarker } = useMapLayers();
  const { lat, lng } = position;

  useEffect(() => {
    setMarker({ position: { lat, lng }, stale, label });
    return () => setMarker(null);
  }, [setMarker, lat, lng, stale, label]);

  return null;
}
