/**
 * Proveedor Google Maps (JavaScript API). Solo se usa si VITE_GOOGLE_MAPS_WEB_KEY tiene valor.
 *
 * PUNTO DE INTEGRACIÓN / PENDIENTE DE PRUEBA: este proveedor está implementado pero NO
 * se ha probado con una clave real (no hay clave ni presupuesto decididos).
 * La clave web es visible en el navegador por diseño: restríngela por dominio (HTTP referrer)
 * y por API en la consola de Google Cloud. Nunca la commitees.
 *
 * Se declaran solo los tipos mínimos usados para no añadir dependencias.
 */
import { appConfig } from '../../../shared/api/config';
import type { LatLng } from '../../../shared/types/common.types';
import type { MapHandle, MapProvider, MapScene } from './MapProvider';

interface GBounds {
  extend(point: LatLng): void;
}
interface GMap {
  fitBounds(bounds: GBounds, padding?: number): void;
}
interface GOverlay {
  setMap(map: GMap | null): void;
}
interface GPolyline extends GOverlay {
  setPath(path: LatLng[]): void;
}
interface GMarker extends GOverlay {
  setPosition(position: LatLng): void;
  setTitle(title: string): void;
  setOpacity(opacity: number): void;
}
interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GMap;
  LatLngBounds: new () => GBounds;
  Polyline: new (options: Record<string, unknown>) => GPolyline;
  Marker: new (options: Record<string, unknown>) => GMarker;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

let loading: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!loading) {
    loading = new Promise<GoogleMapsApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(appConfig.googleMapsKey)}&v=weekly`;
      script.async = true;
      script.onload = () => {
        const api = window.google?.maps;
        if (api) resolve(api);
        else reject(new Error('Google Maps no se inicializó.'));
      };
      script.onerror = () => {
        loading = null;
        reject(new Error('No se pudo cargar Google Maps.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export const googleMapProvider: MapProvider = {
  id: 'google',
  label: 'Google Maps',
  schematic: false,
  async mount(container: HTMLElement): Promise<MapHandle> {
    const maps = await loadGoogleMaps();
    const map = new maps.Map(container, {
      zoom: 14,
      center: { lat: 7.1193, lng: -73.1227 },
      disableDefaultUI: true,
      zoomControl: true,
    });
    const route = new maps.Polyline({
      map,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.7,
      strokeWeight: 4,
    });
    const trail = new maps.Polyline({ map, strokeColor: '#6d28d9', strokeWeight: 4 });
    const deviation = new maps.Polyline({ map, strokeColor: '#b91c1c', strokeWeight: 3 });
    const origin = new maps.Marker({ label: 'A' });
    const destination = new maps.Marker({ label: 'B' });
    const vehicle = new maps.Marker({});
    let fitted = false;

    const place = (marker: GMarker, position: LatLng | null) => {
      if (position) {
        marker.setPosition(position);
        marker.setMap(map);
      } else {
        marker.setMap(null);
      }
    };

    return {
      update(scene: MapScene) {
        route.setPath([...scene.route]);
        trail.setPath([...scene.trail]);
        deviation.setPath(scene.deviation ? [scene.deviation.from, scene.deviation.to] : []);
        place(origin, scene.origin);
        place(destination, scene.destination);
        place(vehicle, scene.marker?.position ?? null);
        if (scene.marker) {
          vehicle.setTitle(scene.marker.label);
          // Posición antigua: marcador atenuado para no presentarla como actual.
          vehicle.setOpacity(scene.marker.stale ? 0.45 : 1);
        }
        const points = [...scene.route, ...(scene.marker ? [scene.marker.position] : [])];
        if (!fitted && points.length > 0) {
          const bounds = new maps.LatLngBounds();
          for (const point of points) bounds.extend(point);
          map.fitBounds(bounds, 48);
          fitted = true;
        }
      },
      destroy() {
        for (const overlay of [route, trail, deviation, origin, destination, vehicle]) {
          overlay.setMap(null);
        }
        container.replaceChildren();
      },
    };
  },
};
