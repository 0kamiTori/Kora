/**
 * Proveedor de mapa esquemático en SVG: sin clave, sin red y determinista.
 * Dibuja la ruta, el recorrido y los marcadores a escala, pero SIN calles.
 * Es el proveedor por defecto mientras no se decida el proveedor cartográfico.
 */
import type { LatLng } from '../../../shared/types/common.types';
import { formatDistance } from '../../../shared/utils/geo.utils';
import type { MapHandle, MapProvider, MapScene } from './MapProvider';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 800;
const HEIGHT = 460;
const PADDING = 56;

type Attributes = Record<string, string | number>;

function node(name: string, attributes: Attributes, text?: string): SVGElement {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  // textContent (nunca innerHTML): las etiquetas no pueden inyectar marcado.
  if (text !== undefined) element.textContent = text;
  return element;
}

interface Point {
  x: number;
  y: number;
}

function createProjector(points: readonly LatLng[]): (point: LatLng) => Point {
  if (points.length === 0) return () => ({ x: WIDTH / 2, y: HEIGHT / 2 });

  const lats = points.map((point) => point.lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((point) => point.lng * k);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const spanX = Math.max(maxX - minX, 0.0005);
  const spanY = Math.max(maxY - minY, 0.0005);
  const scale = Math.min((WIDTH - 2 * PADDING) / spanX, (HEIGHT - 2 * PADDING) / spanY);
  const offsetX = (WIDTH - spanX * scale) / 2;
  const offsetY = (HEIGHT - spanY * scale) / 2;

  return (point) => ({
    x: offsetX + (point.lng * k - minX) * scale,
    y: HEIGHT - offsetY - (point.lat - minY) * scale,
  });
}

function polyline(points: readonly Point[], className: string): SVGElement {
  return node('polyline', {
    class: className,
    points: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
    fill: 'none',
  });
}

function draw(svg: SVGElement, scene: MapScene): void {
  const all: LatLng[] = [...scene.route, ...scene.trail];
  if (scene.origin) all.push(scene.origin);
  if (scene.destination) all.push(scene.destination);
  if (scene.marker) all.push(scene.marker.position);
  if (scene.deviation) all.push(scene.deviation.to);
  const project = createProjector(all);

  const children: SVGElement[] = [
    node('rect', { class: 'svg-map__background', x: 0, y: 0, width: WIDTH, height: HEIGHT }),
  ];

  if (scene.route.length > 1) children.push(polyline(scene.route.map(project), 'svg-map__route'));
  if (scene.trail.length > 1) children.push(polyline(scene.trail.map(project), 'svg-map__trail'));

  const endpoints: Array<[LatLng | null, string]> = [
    [scene.origin, 'Origen'],
    [scene.destination, 'Destino'],
  ];
  for (const [place, label] of endpoints) {
    if (!place) continue;
    const { x, y } = project(place);
    children.push(node('circle', { class: 'svg-map__endpoint', cx: x, cy: y, r: 7 }));
    children.push(node('text', { class: 'svg-map__label', x: x + 12, y: y + 5 }, label));
  }

  if (scene.deviation) {
    const from = project(scene.deviation.from);
    const to = project(scene.deviation.to);
    children.push(
      node('line', { class: 'svg-map__deviation', x1: from.x, y1: from.y, x2: to.x, y2: to.y }),
    );
    children.push(
      node(
        'text',
        {
          class: 'svg-map__label svg-map__label--danger',
          // Debajo del vehículo: su propia etiqueta va arriba y así no se pisan.
          x: from.x + 16,
          y: from.y + 30,
        },
        `Desviación ≈ ${formatDistance(scene.deviation.meters)}`,
      ),
    );
  }

  if (scene.marker) {
    const { x, y } = project(scene.marker.position);
    const modifier = scene.marker.stale ? ' svg-map__marker--stale' : '';
    children.push(node('circle', { class: `svg-map__halo${modifier}`, cx: x, cy: y, r: 20 }));
    children.push(node('circle', { class: `svg-map__marker${modifier}`, cx: x, cy: y, r: 9 }));
    children.push(
      node(
        'text',
        { class: 'svg-map__label svg-map__label--strong', x: x + 16, y: y - 14 },
        scene.marker.label,
      ),
    );
  }

  if (all.length === 0) {
    children.push(
      node(
        'text',
        { class: 'svg-map__label', x: WIDTH / 2, y: HEIGHT / 2, 'text-anchor': 'middle' },
        'Sin datos de posición para mostrar',
      ),
    );
  }

  svg.replaceChildren(...children);
}

export const svgMapProvider: MapProvider = {
  id: 'svg',
  label: 'Mapa esquemático',
  schematic: true,
  mount(container: HTMLElement): Promise<MapHandle> {
    const svg = node('svg', {
      class: 'svg-map',
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true',
      focusable: 'false',
    });
    container.replaceChildren(svg);
    return Promise.resolve({
      update: (scene) => draw(svg, scene),
      destroy: () => svg.remove(),
    });
  },
};
