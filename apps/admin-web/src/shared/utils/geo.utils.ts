import type { LatLng } from '../types/common.types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Punto del segmento a-b más cercano a p (aproximación plana, válida a escala urbana). */
function nearestOnSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const scale = Math.cos(toRad(p.lat));
  const ax = a.lng * scale;
  const bx = b.lng * scale;
  const px = p.lng * scale;
  const dx = bx - ax;
  const dy = b.lat - a.lat;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return a;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (p.lat - a.lat) * dy) / lengthSq));
  return { lat: a.lat + t * dy, lng: a.lng + t * (b.lng - a.lng) };
}

export interface NearestPoint {
  meters: number;
  point: LatLng;
}

/** Distancia de un punto a una polilínea y el punto de la ruta más cercano. */
export function nearestOnPolyline(p: LatLng, line: readonly LatLng[]): NearestPoint | null {
  const first = line[0];
  if (!first) return null;
  let best: NearestPoint = { meters: haversineMeters(p, first), point: first };
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1];
    const b = line[i];
    if (!a || !b) continue;
    const candidate = nearestOnSegment(p, a, b);
    const meters = haversineMeters(p, candidate);
    if (meters < best.meters) best = { meters, point: candidate };
  }
  return best;
}

export function polylineLengthMeters(line: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1];
    const b = line[i];
    if (a && b) total += haversineMeters(a, b);
  }
  return total;
}

export function formatCoordinates(point: LatLng): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
