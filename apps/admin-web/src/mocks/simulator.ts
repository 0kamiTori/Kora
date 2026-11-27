/**
 * Simulador del canal en tiempo real para el modo mock.
 * Emite posiciones GPS cada 2 s y, una vez por carga de página, una alerta crítica.
 * Reemplaza al WebSocket real; no se usa cuando VITE_USE_MOCKS=false.
 */
import type { Alert } from '../features/incidents/alert.types';
import type { RealtimeEnvelope, SocketFactory, SocketLike } from '../shared/api/wsClient';
import { nearestOnPolyline } from '../shared/utils/geo.utils';
import { db, makePosition, nextId, simulation } from './db';

const TICK_MS = 2_000;
const LIVE_ALERT_DELAY_MS = 6_000;

class MockSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((message: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private closed = false;

  constructor() {
    setTimeout(() => {
      if (this.closed) return;
      sockets.add(this);
      this.onopen?.();
      ensureSimulation();
      scheduleLiveAlert();
    }, 120);
  }

  send(): void {
    // El mock acepta el mensaje de autenticación sin validarlo.
  }

  close(): void {
    this.closed = true;
    sockets.delete(this);
  }

  deliver(data: string): void {
    if (!this.closed) this.onmessage?.({ data });
  }
}

const sockets = new Set<MockSocket>();
let ticker: ReturnType<typeof setInterval> | null = null;
let liveAlertScheduled = false;

function sendEnvelope(envelope: RealtimeEnvelope): void {
  const data = JSON.stringify(envelope);
  for (const socket of sockets) socket.deliver(data);
}

export function broadcast(type: string, payload: unknown): RealtimeEnvelope {
  const envelope: RealtimeEnvelope = {
    eventId: nextId('E'),
    type,
    emittedAt: new Date().toISOString(),
    payload,
  };
  sendEnvelope(envelope);
  return envelope;
}

function deviationThresholdMeters(): number {
  return db.parameters.find((item) => item.key === 'route_deviation_meters')?.value ?? 0;
}

function tick(): void {
  for (const trip of db.trips) {
    const state = simulation[trip.id];
    if (!state || trip.status !== 'in_progress') continue;

    // Ida y vuelta sobre el recorrido para que la demostración no se detenga.
    let next = state.index + state.direction;
    if (next >= state.path.length || next < state.minIndex) {
      state.direction = state.direction === 1 ? -1 : 1;
      next = state.index + state.direction;
    }
    state.index = next;
    const point = state.path[next];
    if (!point) continue;

    const position = makePosition(trip.id, point);
    trip.lastPosition = position;
    const history = db.positions[trip.id] ?? [];
    history.push(position);
    db.positions[trip.id] = history;

    const nearest = nearestOnPolyline(position, trip.route.points);
    const deviated = nearest !== null && nearest.meters > deviationThresholdMeters();
    const hadDeviation = trip.activeDeviation !== null;
    trip.activeDeviation =
      deviated && nearest
        ? {
            meters: Math.round(nearest.meters),
            since: trip.activeDeviation?.since ?? position.serverTimestamp,
          }
        : null;

    broadcast('position.updated', position);
    if (hadDeviation !== deviated) broadcast('trip.updated', { id: trip.id });
  }
}

/** Arranca el movimiento simulado (lo usan el socket mock y la vista pública). */
export function ensureSimulation(): void {
  if (ticker === null) ticker = setInterval(tick, TICK_MS);
}

function scheduleLiveAlert(): void {
  if (liveAlertScheduled) return;
  liveAlertScheduled = true;
  setTimeout(() => {
    const now = new Date().toISOString();
    const alert: Alert = {
      id: 'A-5002',
      tripId: 'T-1001',
      type: 'silent_alert',
      severity: 'critical',
      status: 'open',
      createdAt: now,
      silent: true,
      summary: 'La pasajera activó la alerta silenciosa desde su aplicación.',
      anomaly: null,
      deliveries: [
        {
          id: 'DL-10',
          channel: 'admin_portal',
          destination: 'Portal de administración',
          attempts: 1,
          lastAttemptAt: now,
          status: 'delivered',
          confirmedAt: now,
        },
        {
          id: 'DL-11',
          channel: 'push',
          destination: 'Contacto de confianza ···4821',
          attempts: 1,
          lastAttemptAt: now,
          status: 'sent',
          confirmedAt: null,
        },
      ],
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolution: null,
    };
    db.alerts.unshift(alert);
    const envelope = broadcast('alert.created', { id: alert.id });
    // Reenvío deliberado del MISMO evento: el cliente debe ignorarlo (idempotencia, RNF04).
    setTimeout(() => sendEnvelope(envelope), 1_000);
  }, LIVE_ALERT_DELAY_MS);
}

export const createMockSocket: SocketFactory = () => new MockSocket();
