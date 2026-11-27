import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LatLng } from '../../../shared/types/common.types';
import { MapLayerContext } from './mapContext';
import {
  getFallbackMapProvider,
  getMapProvider,
  type DeviationSpec,
  type MapHandle,
  type MarkerSpec,
} from './MapProvider';

interface TripMonitorMapProps {
  /** Descripción del mapa para lectores de pantalla. */
  ariaLabel: string;
  route?: readonly LatLng[];
  trail?: readonly LatLng[];
  origin?: LatLng | null;
  destination?: LatLng | null;
  /** Capas declarativas: <DriverMarker /> y <DeviationOverlay />. */
  children?: ReactNode;
}

interface ProviderInfo {
  label: string;
  schematic: boolean;
  fellBack: boolean;
}

const EMPTY: readonly LatLng[] = [];

/** Mapa de monitoreo (RF11). Dibuja con el proveedor configurado tras la interfaz MapProvider. */
export function TripMonitorMap({
  ariaLabel,
  route = EMPTY,
  trail = EMPTY,
  origin = null,
  destination = null,
  children,
}: TripMonitorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MapHandle | null>(null);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [marker, setMarker] = useState<MarkerSpec | null>(null);
  const [deviation, setDeviation] = useState<DeviationSpec | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const mount = async () => {
      const preferred = getMapProvider();
      let handle: MapHandle;
      let info: ProviderInfo;
      try {
        handle = await preferred.mount(container);
        info = { label: preferred.label, schematic: preferred.schematic, fellBack: false };
      } catch {
        // Si el proveedor externo falla, el monitoreo sigue con el mapa esquemático.
        const fallback = getFallbackMapProvider();
        handle = await fallback.mount(container);
        info = { label: fallback.label, schematic: fallback.schematic, fellBack: true };
      }
      if (cancelled) {
        handle.destroy();
        return;
      }
      handleRef.current = handle;
      setProvider(info);
    };
    void mount();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
      setProvider(null);
    };
  }, []);

  useEffect(() => {
    if (!provider) return;
    handleRef.current?.update({ route, trail, origin, destination, marker, deviation });
  }, [provider, route, trail, origin, destination, marker, deviation]);

  const layers = useMemo(() => ({ setMarker, setDeviation }), []);

  return (
    <figure className="map">
      <div ref={containerRef} className="map__canvas" role="img" aria-label={ariaLabel} />
      <figcaption className="map__caption">
        <ul className="map__legend">
          <li>
            <span className="map__swatch map__swatch--route" aria-hidden="true" /> Ruta de
            referencia
          </li>
          <li>
            <span className="map__swatch map__swatch--trail" aria-hidden="true" /> Recorrido
          </li>
          <li>
            <span className="map__swatch map__swatch--deviation" aria-hidden="true" /> Desviación
          </li>
        </ul>
        {provider?.schematic && (
          <span className="muted small">
            {provider.fellBack
              ? 'No se pudo cargar el proveedor de mapas. Se muestra un esquema sin calles.'
              : 'Mapa esquemático: muestra posiciones a escala, sin calles.'}
          </span>
        )}
      </figcaption>
      <MapLayerContext.Provider value={layers}>{children}</MapLayerContext.Provider>
    </figure>
  );
}
