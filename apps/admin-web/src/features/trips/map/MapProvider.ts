/**
 * Interfaz propia de mapas. El portal NO depende de un proveedor concreto:
 * el proveedor y el presupuesto de mapas siguen pendientes de decisión.
 *
 * PUNTO DE INTEGRACIÓN: para añadir otro proveedor (Leaflet, Mapbox…), implementa
 * `MapProvider` en un archivo nuevo y devuélvelo desde `getMapProvider()`.
 */
import { appConfig } from '../../../shared/api/config';
import type { LatLng } from '../../../shared/types/common.types';
import { googleMapProvider } from './GoogleMapProvider';
import { svgMapProvider } from './SvgMapProvider';

export interface MarkerSpec {
  position: LatLng;
  /** true: la posición es antigua (sin señal). Debe verse distinta a una actual. */
  stale: boolean;
  label: string;
}

export interface DeviationSpec {
  /** Posición actual del vehículo. */
  from: LatLng;
  /** Punto más cercano de la ruta de referencia. */
  to: LatLng;
  meters: number;
}

export interface MapScene {
  route: readonly LatLng[];
  trail: readonly LatLng[];
  origin: LatLng | null;
  destination: LatLng | null;
  marker: MarkerSpec | null;
  deviation: DeviationSpec | null;
}

export interface MapHandle {
  /** Redibuja el mapa con la escena completa. */
  update(scene: MapScene): void;
  destroy(): void;
}

export interface MapProvider {
  id: string;
  label: string;
  /** true si no muestra cartografía real (calles), solo un esquema. */
  schematic: boolean;
  mount(container: HTMLElement): Promise<MapHandle>;
}

/** Google Maps solo si hay clave configurada; si no, el mapa esquemático sin red. */
export function getMapProvider(): MapProvider {
  return appConfig.googleMapsKey ? googleMapProvider : svgMapProvider;
}

export function getFallbackMapProvider(): MapProvider {
  return svgMapProvider;
}
