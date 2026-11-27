import { useEffect, useRef, useState } from 'react';
import {
  RealtimeClient,
  type ConnectionStatus,
  type RealtimeEnvelope,
  type SocketFactory,
} from '../api/wsClient';

interface UseWebSocketOptions {
  enabled: boolean;
  url: string;
  /** Debe ser una referencia estable (función de módulo o memoizada). */
  getToken: () => string | null;
  /** Debe ser una referencia estable. */
  socketFactory: SocketFactory;
  onEvent: (event: RealtimeEnvelope) => void;
}

/** Mantiene una conexión en tiempo real mientras `enabled` sea true y expone su estado. */
export function useWebSocket(options: UseWebSocketOptions): ConnectionStatus {
  const { enabled, url, getToken, socketFactory, onEvent } = options;
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    const client = new RealtimeClient({ url, getToken, socketFactory });
    const offStatus = client.onStatus(setStatus);
    const offEvent = client.onEvent((event) => onEventRef.current(event));
    client.connect();
    return () => {
      offStatus();
      offEvent();
      client.close();
    };
  }, [enabled, url, getToken, socketFactory]);

  return status;
}
