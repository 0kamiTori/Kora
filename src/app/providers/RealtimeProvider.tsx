import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ALERTS_QUERY_KEY } from '../../features/incidents/alerts.api';
import type { Position, ReceivedPosition } from '../../features/trips/trip.types';
import { getAccessToken } from '../../shared/api/client';
import { appConfig } from '../../shared/api/config';
import {
  browserSocketFactory,
  type ConnectionStatus,
  type RealtimeEnvelope,
  type SocketFactory,
} from '../../shared/api/wsClient';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

/**
 * PUNTO DE INTEGRACIÓN — Eventos en tiempo real (GPS y alertas).
 * Tipos de evento esperados en el sobre `{ eventId, type, emittedAt, payload }`:
 *  - "position.updated": payload = Position (trip.types.ts).
 *  - "alert.created" | "alert.updated": payload = { id }. El portal vuelve a pedir GET /alerts.
 *  - "trip.updated": payload = { id }. El portal vuelve a pedir los viajes.
 * SUPUESTO: nombres de evento propuestos por el frontend; ajustar aquí al contrato real.
 */

interface RealtimeContextValue {
  status: ConnectionStatus;
  /** Última posición recibida en vivo por viaje, con su instante local de recepción. */
  latestPositions: Readonly<Record<string, ReceivedPosition>>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const mockSocketFactory: SocketFactory = async (url) => {
  const { createMockSocket } = await import('../../mocks/simulator');
  return createMockSocket(url);
};

const socketFactory: SocketFactory = appConfig.useMocks ? mockSocketFactory : browserSocketFactory;

function isPosition(value: unknown): value is Position {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.tripId === 'string' &&
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    typeof candidate.deviceTimestamp === 'string' &&
    typeof candidate.serverTimestamp === 'string' &&
    typeof candidate.accuracyMeters === 'number'
  );
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [latestPositions, setLatestPositions] = useState<Record<string, ReceivedPosition>>({});

  const handleEvent = useCallback(
    (event: RealtimeEnvelope) => {
      switch (event.type) {
        case 'position.updated': {
          const payload = event.payload;
          if (!isPosition(payload)) return;
          const received: ReceivedPosition = { ...payload, clientReceivedAt: Date.now() };
          setLatestPositions((current) => {
            // Una posición repetida (mismo id) no cuenta como dato nuevo.
            if (current[received.tripId]?.id === received.id) return current;
            return { ...current, [received.tripId]: received };
          });
          return;
        }
        case 'alert.created':
        case 'alert.updated':
          void queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
          return;
        case 'trip.updated':
          void queryClient.invalidateQueries({ queryKey: ['trips'] });
          return;
        default:
          return;
      }
    },
    [queryClient],
  );

  const status = useWebSocket({
    enabled: true,
    url: appConfig.wsUrl,
    getToken: getAccessToken,
    socketFactory,
    onEvent: handleEvent,
  });

  const value = useMemo(() => ({ status, latestPositions }), [status, latestPositions]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime debe usarse dentro de <RealtimeProvider>.');
  return context;
}
