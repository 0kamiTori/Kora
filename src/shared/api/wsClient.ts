/**
 * Cliente WebSocket autenticado con reconexión (RNF04).
 *
 * PUNTO DE INTEGRACIÓN: con VITE_USE_MOCKS=false se abre un WebSocket real contra
 * VITE_WS_URL. Contrato asumido (ver docs/api-contract-requests.md):
 *  - SUPUESTO: tras abrir, el cliente envía { type: "auth", token, lastEventId }.
 *    El token no va en la URL para que no quede en logs de servidores o proxies.
 *  - SUPUESTO: cada mensaje del servidor es un sobre JSON
 *    { eventId, type, emittedAt, payload } con `eventId` único.
 *  - Tras reconectar el servidor puede reenviar eventos: el cliente descarta los
 *    repetidos por `eventId` (eventos idempotentes).
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RealtimeEnvelope {
  eventId: string;
  type: string;
  emittedAt: string;
  payload: unknown;
}

/** Abstracción mínima de socket para poder inyectar el simulador mock. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((message: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export type SocketFactory = (url: string) => SocketLike | Promise<SocketLike>;

export const browserSocketFactory: SocketFactory = (url) => {
  const ws = new WebSocket(url);
  const socket: SocketLike = {
    send: (data) => ws.send(data),
    close: () => ws.close(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
  ws.onopen = () => socket.onopen?.();
  ws.onmessage = (event) => socket.onmessage?.({ data: event.data as unknown });
  ws.onclose = () => socket.onclose?.();
  ws.onerror = () => socket.onerror?.();
  return socket;
};

/** Recuerda los últimos identificadores vistos para ignorar eventos duplicados. */
export function createEventDeduplicator(capacity = 500) {
  const seen = new Set<string>();
  const order: string[] = [];
  return {
    /** Devuelve true si el id ya se había visto; si no, lo registra. */
    isDuplicate(eventId: string): boolean {
      if (seen.has(eventId)) return true;
      seen.add(eventId);
      order.push(eventId);
      if (order.length > capacity) {
        const oldest = order.shift();
        if (oldest !== undefined) seen.delete(oldest);
      }
      return false;
    },
  };
}

export function isRealtimeEnvelope(value: unknown): value is RealtimeEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.emittedAt === 'string' &&
    'payload' in candidate
  );
}

/** Espera exponencial con tope: 1 s, 2 s, 4 s … 30 s. */
export function reconnectDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

export interface RealtimeClientOptions {
  url: string;
  getToken: () => string | null;
  socketFactory: SocketFactory;
}

export class RealtimeClient {
  private socket: SocketLike | null = null;
  private status: ConnectionStatus = 'idle';
  private attempts = 0;
  /** Cambia en cada connect/close para invalidar callbacks de sockets anteriores. */
  private generation = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: string | null = null;
  private readonly deduplicator = createEventDeduplicator();
  private readonly eventListeners = new Set<(event: RealtimeEnvelope) => void>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly options: RealtimeClientOptions;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  connect(): void {
    this.generation += 1;
    this.clearRetry();
    this.attempts = 0;
    void this.open(this.generation);
  }

  close(): void {
    this.generation += 1;
    this.clearRetry();
    this.socket?.close();
    this.socket = null;
    this.setStatus('closed');
  }

  onEvent(listener: (event: RealtimeEnvelope) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private async open(generation: number): Promise<void> {
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    let socket: SocketLike;
    try {
      socket = await this.options.socketFactory(this.options.url);
    } catch {
      this.scheduleRetry(generation);
      return;
    }
    if (generation !== this.generation) {
      socket.close();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (generation !== this.generation) return;
      this.attempts = 0;
      socket.send(
        JSON.stringify({
          type: 'auth',
          token: this.options.getToken(),
          lastEventId: this.lastEventId,
        }),
      );
      this.setStatus('open');
    };
    socket.onmessage = (message) => {
      if (generation !== this.generation) return;
      this.handleMessage(message.data);
    };
    socket.onclose = () => {
      if (generation !== this.generation) return;
      this.socket = null;
      this.scheduleRetry(generation);
    };
    socket.onerror = () => {
      // El cierre posterior dispara la reconexión; aquí no hay nada más que hacer.
    };
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== 'string') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isRealtimeEnvelope(parsed)) return;
    if (this.deduplicator.isDuplicate(parsed.eventId)) return;
    this.lastEventId = parsed.eventId;
    for (const listener of this.eventListeners) listener(parsed);
  }

  private scheduleRetry(generation: number): void {
    if (generation !== this.generation) return;
    this.attempts += 1;
    this.setStatus('reconnecting');
    const jitter = Math.floor(Math.random() * 250);
    this.retryTimer = setTimeout(
      () => {
        this.retryTimer = null;
        void this.open(generation);
      },
      reconnectDelayMs(this.attempts) + jitter,
    );
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
